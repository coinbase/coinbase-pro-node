var request = require('request');
var _ = {
  'forEach': require('lodash.foreach'),
  'assign': require('lodash.assign'),
  'partial': require('lodash.partial'),
};


var PublicClient = function(productID, apiURI) {
  var self = this;
  self.productID = productID || 'BTC-USD';
  self.apiURI = apiURI || 'https://api.exchange.coinbase.com';
};

_.assign(PublicClient.prototype, new function() {
  var prototype = this;

  prototype.addHeaders = function(obj, additional) {
    obj.headers = obj.headers || {};
    return _.assign(obj.headers, {
      'User-Agent': 'coinbase-node-client',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }, additional);
  };

  prototype.makeRelativeURI = function(parts) {
    return '/' + parts.join('/');
  };

  prototype.makeAbsoluteURI = function(relativeURI) {
    return this.apiURI + relativeURI;
  };

  prototype.makeRequestCallback = function(callback) {
    return function(err, response, data) {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = null
      }
      callback(err, response, data);
    };
  };

  prototype.request = function(method, uriParts, opts, callback) {
    var self = this;
    opts = opts || {};
    if (!callback && (typeof opts === 'function')) {
      callback = opts;
      opts = {};
    }
    if (!callback) {
      throw "Must supply a callback."
    }
    _.assign(opts, {
      'method': method.toUpperCase(),
      'uri': self.makeAbsoluteURI(self.makeRelativeURI(uriParts)),
    });
    self.addHeaders(opts);
    request(opts, self.makeRequestCallback(callback));
  };

  _.forEach(['get', 'post', 'put', 'delete'], function(method) {
    prototype[method] = _.partial(prototype.request, method);
  });

  prototype.getProducts = function(callback) {
    var self = this;
    return prototype.get.call(self, ['products'], callback);
  };

  prototype.getProductOrderBook = function(args, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };
    return prototype.get.call(
        self, ['products', self.productID, 'book'], opts, callback);
  };

  prototype.getProductTicker = function(callback) {
    var self = this;
    return prototype.get.call(self, ['products', self.productID, 'ticker'], callback);
  };

  prototype.getProductTrades = function(args, callback) {
    var self = this;
    var opts = {'qs': args};
    return prototype.get.call(self, ['products', self.productID, 'trades'], opts, callback);
  };

  prototype.getProductHistoricRates = function(args, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = {'qs': args};
    return prototype.get.call(self, ['products', self.productID, 'candles'], opts, callback);
  };

  prototype.getProduct24HrStats = function(callback) {
    var self = this;
    return prototype.get.call(self, ['products', self.productID, 'stats'], callback);
  };

  prototype.getCurrencies = function(callback) {
    var self = this;
    return prototype.get.call(self, ['currencies'], callback);
  };

  prototype.getTime = function(callback) {
    var self = this;
    return prototype.get.call(self, ['time'], callback);
  };
});

module.exports = exports = PublicClient;
