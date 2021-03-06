/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="../common/models.ts" />
/// <reference path="../common/messaging.ts" />
/// <amd-dependency path="ui.bootstrap"/>

import angular = require("angular");
import Models = require("../common/models");
import io = require("socket.io-client");
import moment = require("moment");
import Messaging = require("../common/messaging");
import Pair = require("./pair");
import Shared = require("./shared_directives");

interface PositionScope extends ng.IScope {
    baseCurrency : string;
    basePosition : number;
    quoteCurrency : string;
    quotePosition : number;
    baseHeldPosition : number;
    quoteHeldPosition : number;
    value : number;
}

var PositionController = ($scope : PositionScope, $log : ng.ILogService, subscriberFactory : Shared.SubscriberFactory) => {
    var clearPosition = () => {
        $scope.baseCurrency = null;
        $scope.quoteCurrency = null;
        $scope.basePosition = null;
        $scope.quotePosition = null;
        $scope.baseHeldPosition = null;
        $scope.quoteHeldPosition = null;
        $scope.value = null;
    };

    var updatePosition = (position : Models.PositionReport) => {
        $scope.baseCurrency = Models.Currency[position.pair.base];
        $scope.quoteCurrency = Models.Currency[position.pair.quote];
        $scope.basePosition = position.baseAmount;
        $scope.quotePosition = position.quoteAmount;
        $scope.baseHeldPosition = position.baseHeldAmount;
        $scope.quoteHeldPosition = position.quoteHeldAmount;
        $scope.value = position.value;
    };

    var positionSubscriber = subscriberFactory.getSubscriber($scope, Messaging.Topics.Position)
        .registerDisconnectedHandler(clearPosition)
        .registerSubscriber(updatePosition, us => us.forEach(updatePosition));

    $scope.$on('$destroy', () => {
        positionSubscriber.disconnect();
        $log.info("destroy position grid");
    });

    $log.info("started position grid");
};

angular
    .module("positionDirective", ['ui.bootstrap', 'sharedDirectives'])
    .directive("positionGrid", () => {
        return {
            restrict: 'E',
            replace: true,
            transclude: false,
            templateUrl: "positions.html",
            controller: PositionController,
            scope: {
              exch: '='
            }
          }
    });

// ===================

interface TargetBasePositionScope extends ng.IScope {
    targetBasePosition : number;
}

var TargetBasePositionController = ($scope : TargetBasePositionScope, $log : ng.ILogService, subscriberFactory : Shared.SubscriberFactory) => {

    var update = (value : Models.TargetBasePositionValue) => {
        $scope.targetBasePosition = value.data;
    };

    var subscriber = subscriberFactory.getSubscriber($scope, Messaging.Topics.TargetBasePosition)
        .registerDisconnectedHandler(() => $scope.targetBasePosition = null)
        .registerSubscriber(update, us => us.forEach(update));

    $scope.$on('$destroy', () => {
        subscriber.disconnect();
        $log.info("destroy target base position");
    });

    $log.info("started target base position");
};

angular
    .module("targetBasePositionDirective", ['sharedDirectives'])
    .directive("targetBasePosition", () => {
        var template = '<span>{{ targetBasePosition|number:2 }}</span>';

        return {
            restrict: 'E',
            replace: true,
            transclude: false,
            template: template,
            controller: TargetBasePositionController
        }
    });

// ===================

interface TradeSafetyScope extends ng.IScope {
    buySafety: number;
    sellSafety: number;
    tradeSafetyValue : number;
}

var TradeSafetyController = ($scope : TradeSafetyScope, $log : ng.ILogService, subscriberFactory : Shared.SubscriberFactory) => {

    var updateValue = (value : Models.TradeSafety) => {
        $scope.tradeSafetyValue = value.combined;
        $scope.buySafety = value.buy;
        $scope.sellSafety = value.sell;
    };

    var clear = () => {
        $scope.tradeSafetyValue = null;
        $scope.buySafety = null;
        $scope.sellSafety = null;
    };

    var subscriber = subscriberFactory.getSubscriber($scope, Messaging.Topics.TradeSafetyValue)
        .registerDisconnectedHandler(clear)
        .registerSubscriber(updateValue, us => us.forEach(updateValue));

    $scope.$on('$destroy', () => {
        subscriber.disconnect();
        $log.info("destroy trade safety");
    });

    $log.info("started trade safety");
};

angular
    .module("tradeSafetyDirective", ['sharedDirectives'])
    .directive("tradeSafety", () => {
        var template = '<span>BuyTS: {{ buySafety|number:2 }}, SellTS: {{ sellSafety|number:2 }}, TotalTS: {{ tradeSafetyValue|number:2 }}</span>';

        return {
            restrict: 'E',
            replace: true,
            transclude: false,
            template: template,
            controller: TradeSafetyController
        }
    });