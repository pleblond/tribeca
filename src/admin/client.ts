/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../common/models.ts" />
/// <amd-dependency path="ui.bootstrap"/>

import angular = require("angular");
import Models = require("../common/models");
import moment = require("moment");
import Exchange = require("./exchange");
import OrderList = require("./orderlist");
import Trades = require("./trades");
import Messaging = require("../common/messaging");
import Shared = require("./shared_directives");
import Pair = require("./pair");

interface MainWindowScope extends ng.IScope {
    env : string;
    connected : boolean;
    order : DisplayOrder;
    pair : Pair.DisplayPair;
    exch_name : string;
    pair_name : string;
}

class DisplayOrder {
    side : string;
    price : number;
    quantity : number;
    timeInForce : string;
    orderType : string;

    availableSides : string[];
    availableTifs : string[];
    availableOrderTypes : string[];

    private static getNames<T>(enumObject : T) {
        var names : string[] = [];
        for (var mem in enumObject) {
            if (!enumObject.hasOwnProperty(mem)) continue;
            if (parseInt(mem, 10) >= 0) {
              names.push(enumObject[mem]);
            }
        }
        return names;
    }

    private _fire : Messaging.IFire<Models.OrderRequestFromUI>;
    constructor(fireFactory : Shared.FireFactory, private _log : ng.ILogService) {
        this.availableSides = DisplayOrder.getNames(Models.Side);
        this.availableTifs = DisplayOrder.getNames(Models.TimeInForce);
        this.availableOrderTypes = DisplayOrder.getNames(Models.OrderType);

        this._fire = fireFactory.getFire(Messaging.Topics.SubmitNewOrder);
    }

    public submit = () => {
        var msg = new Models.OrderRequestFromUI(this.side, this.price, this.quantity, this.timeInForce, this.orderType);
        this._log.info("submitting order", msg);
        this._fire.fire(msg);
    };
}

var uiCtrl = ($scope : MainWindowScope,
              $timeout : ng.ITimeoutService,
              $log : ng.ILogService,
              subscriberFactory : Shared.SubscriberFactory,
              fireFactory : Shared.FireFactory) => {
    $scope.order = new DisplayOrder(fireFactory, $log);
    $scope.pair = null;

    var onAdvert = (pa : Models.ProductAdvertisement) => {
        $log.info("advert", pa);
        $scope.connected = true;
        $scope.env = pa.environment;
        $scope.pair_name = Models.Currency[pa.pair.base] + "/" + Models.Currency[pa.pair.quote];
        $scope.exch_name = Models.Exchange[pa.exchange];
        $scope.pair = new Pair.DisplayPair($scope, subscriberFactory, fireFactory);
    };

    var reset = (reason : string) => {
        $log.info("reset", reason);
        $scope.connected = false;
        $scope.pair_name = null;
        $scope.exch_name = null;

        if ($scope.pair !== null)
            $scope.pair.dispose();
        $scope.pair = null;
    };
    reset("startup");

    var sub = subscriberFactory.getSubscriber($scope, Messaging.Topics.ProductAdvertisement)
        .registerSubscriber(onAdvert, a => a.forEach(onAdvert))
        .registerDisconnectedHandler(() => reset("disconnect"));

    $scope.$on('$destroy', () => {
        sub.disconnect();
        $log.info("destroy client");
    });

    $log.info("started client");
};

var requires = ['ui.bootstrap',
                'ngGrid',
                'orderListDirective',
                'tradeListDirective',
                'marketQuotingDirective',
                'marketTradeDirective',
                'messagesDirective', 
                'positionDirective',
                'targetBasePositionDirective',
                'tradeSafetyDirective',
                'sharedDirectives'];

angular.module('projectApp', requires)
       .controller('uiCtrl', uiCtrl);