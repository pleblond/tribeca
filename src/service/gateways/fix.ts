/// <reference path="../../../typings/tsd.d.ts" />
/// <reference path="../utils.ts" />
/// <reference path="../../common/models.ts" />

try {
    var zeromq = require("zmq");
}
catch (e) {
    console.warn("no zmq could be loaded");
}

import Models = require("../../common/models");
import Utils = require("../utils");
import util = require("util");
import Interfaces = require("../interfaces");

export class FixGateway {
    ConnectChanged = new Utils.Evt<Models.ConnectivityStatus>();

    sendEvent = (evt: string, obj: any) => {
        this._sock.send(JSON.stringify({ evt: evt, obj: obj }));
    };

    _lastHeartbeatTime: moment.Moment = null;
    _handlers: { [channel: string]: (newMsg: Models.Timestamped<any>) => void } = {};
    _log: Utils.Logger = Utils.log("tribeca:gateway:FixBridge");
    _sock: any;
    constructor() {
        this._sock = zeromq.socket("pair");
        this._sock.connect("ipc:///tmp/tribecafix");
        this.subscribe("ConnectionStatus", this.onConnectionStatus);
        this._sock.on("message", rawMsg => {
            var msg = JSON.parse(rawMsg);

            var handler = this._handlers[msg.evt];
            if (typeof handler !== "undefined") {
                handler(new Models.Timestamped(msg.obj, Utils.date(msg.ts)));
            }
            else {
                this._log("no handler registered for inbound FIX message: %o", msg);
            }
        });

        setInterval(this.checkMissedHeartbeats, 100);
    }

    private checkMissedHeartbeats = () => {
        if (this._lastHeartbeatTime == null) {
            this.ConnectChanged.trigger(Models.ConnectivityStatus.Disconnected);
            return;
        }

        if (Utils.date().diff(this._lastHeartbeatTime) > 10000) {
            this.ConnectChanged.trigger(Models.ConnectivityStatus.Disconnected);
        }
    };

    private onConnectionStatus = (tsMsg: Models.Timestamped<string>) => {
        if (tsMsg.data == "Logon") {
            this._lastHeartbeatTime = Utils.date();
            this.ConnectChanged.trigger(Models.ConnectivityStatus.Connected);
        }
        else if (tsMsg.data == "Logout") {
            this.ConnectChanged.trigger(Models.ConnectivityStatus.Disconnected);
        }
        else {
            throw new Error(util.format("unknown connection status raised by FIX socket : %o", tsMsg));
        }
    };

    subscribe<T>(channel: string, handler: (newMsg: Models.Timestamped<T>) => void) {
        this._handlers[channel] = handler;
    }
}