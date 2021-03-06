/// <reference path="utils.ts" />
/// <reference path="../common/models.ts" />
/// <reference path="../common/messaging.ts" />
/// <reference path="../../typings/tsd.d.ts" />

import Models = require("../common/models");
import Messaging = require("../common/messaging");
import Utils = require("./utils");
import Interfaces = require("./interfaces");
import Agent = require("./arbagent");
import _ = require("lodash");
import P = require("./persister");
import Broker = require("./broker");
import mongodb = require('mongodb');
import Web = require("./web");

var loader = (d: Models.ExchangePairMessage<Models.MarketTrade>) => {
    if (d instanceof Models.MarketTrade) {
        P.timeLoader(d);
        return;
    }
    
    if (d.data === null) return;
    P.timeLoader(d.data);

    if (d.data.quote === null) return;
    P.timeLoader(d.data.quote);
};

var saver = (d: Models.ExchangePairMessage<Models.MarketTrade>) => {
    if (d instanceof Models.MarketTrade) {
        P.timeSaver(d);
        return;
    }
    
    if (d.data === null) return;
    P.timeSaver(d.data);

    if (d.data.quote === null) return;
    P.timeSaver(d.data.quote);
};

export class MarketTradePersister extends P.Persister<Models.MarketTrade> {
    constructor(db: Q.Promise<mongodb.Db>) {
        super(db, "mt", P.timeLoader, P.timeSaver);
    }
}

export class MarketTradeBroker implements Interfaces.IMarketTradeBroker {
    _log: Utils.Logger = Utils.log("tribeca:mtbroker");

    // TOOD: is this event needed?
    MarketTrade = new Utils.Evt<Models.MarketTrade>();
    public get marketTrades() { return this._marketTrades; }

    private _marketTrades: Models.MarketTrade[] = [];
    private handleNewMarketTrade = (u: Models.GatewayMarketTrade) => {
        var qt = u.onStartup ? null : this._quoteEngine.latestQuote;
        var mkt = u.onStartup ? null : this._mdBroker.currentBook;

        var t = new Models.MarketTrade(this._base.exchange(), this._base.pair, u.price, u.size, u.time, qt, 
            mkt === null ? null : mkt.bids[0], mkt === null ? null : mkt.asks[0], u.make_side);

        if (u.onStartup) {
            for (var i = 0; i < this.marketTrades.length; i++) {
                var existing = this.marketTrades[i];

                var dt = Math.abs(existing.time.diff(u.time, 'minutes'));
                if (Math.abs(existing.size - u.size) < 1e-4 && Math.abs(existing.price - u.price) < 1e-4 && dt < 1)
                    return;
            }
        }

        this.marketTrades.push(t);
        this.MarketTrade.trigger(t);
        this._marketTradePublisher.publish(t);
        this._persister.persist(t);
    };

    constructor(private _mdGateway: Interfaces.IMarketDataGateway,
        private _marketTradePublisher: Messaging.IPublish<Models.MarketTrade>,
        private _mdBroker: Interfaces.IMarketDataBroker,
        private _quoteEngine: Agent.QuotingEngine,
        private _base: Broker.ExchangeBroker,
        private _persister: P.IPersist<Models.MarketTrade>,
        initMkTrades: Array<Models.ExchangePairMessage<Models.MarketTrade> | Models.MarketTrade>) {
        initMkTrades.forEach(t => {
            if (t instanceof Models.MarketTrade)
                this.marketTrades.push(t);
            else
                this.marketTrades.push((<any>t).data);
        });
        this._log("loaded %d market trades", this.marketTrades.length);

        _marketTradePublisher.registerSnapshot(() => _.last(this.marketTrades, 50));
        this._mdGateway.MarketTrade.on(this.handleNewMarketTrade);
    }
}