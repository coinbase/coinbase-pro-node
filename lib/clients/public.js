var request = require('request');
var _ = {
  'forEach': require('lodash.foreach'),
  'assign': require('lodash.assign'),
  'partial': require('lodash.partial'),
};


var PublicClient = function(apiURI) {
  var self = this;
  self.apiURI = apiURI || 'https://api.exchange.coinbase.com';
};

PublicClient.prototype = new function() {
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
    var self = this;
    return self.apiURI + relativeURI;
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
    if (!callback && (opts instanceof Function)) {
      callback = opts;
      opts = {};
    }
    if (!callback) {
      throw "Must supply a callback."
    }
    _.assign(opts, {
      'method': method.toUpperCase(),
      'uri': self.makeAbsoluteURI(self.makeRelativeURI(uriParts)),
      'json': true,
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

  prototype.getProductOrderBook = function(productID, level, callback) {
    var self = this;
    if (!callback && (level instanceof Function)) {
      callback = level;
      level = null;
    }
    var opts = level && {'qs': {'level': level}};
    return prototype.get.call(
        self, ['products', productID, 'book'], opts, callback);
  };

  prototype.getProductTicker = function(productID, callback) {
    var self = this;
    return prototype.get.call(self, ['products', productID, 'ticker'], callback);
  };

  prototype.getProductTrades = function(productID, callback) {
    var self = this;
    return prototype.get.call(self, ['products', productID, 'trades'], callback);
  };

  prototype.getProductHistoricRates = function(productID, callback) {
    var self = this;
    return prototype.get.call(self, ['products', productID, 'candles'], callback);
  };

  prototype.getProduct24HrStats = function(productID, callback) {
    var self = this;
    return prototype.get.call(self, ['products', productID, 'stats'], callback);
  };

  prototype.getCurrencies = function(callback) {
    var self = this;
    return prototype.get.call(self, ['currencies'], callback);
  };

  prototype.getTime = function(callback) {
    var self = this;
    return prototype.get.call(self, ['time'], callback);
  };
};

module.exports = exports = PublicClient;
