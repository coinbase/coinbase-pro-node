var request = require('request');
var _ = {
  'forEach': require('lodash.foreach'),
  'assign': require('lodash.assign'),
  'partial': require('lodash.partial'),
};

var Readable = require('stream').Readable;

var PublicClient = function(productID, apiURI) {
  var self = this;
  self.productID = productID || 'BTC-USD';
  self.apiURI = apiURI || 'https://api.gdax.com';
};

var API_LIMIT = 100;

_.assign(PublicClient.prototype, new function() {
  var prototype = this;

  prototype.addHeaders = function(obj, additional) {
    obj.headers = obj.headers || {};
    return _.assign(obj.headers, {
      'User-Agent': 'gdax-node-client',
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

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = {'qs': args};
    return prototype.get.call(self, ['products', self.productID, 'trades'], opts, callback);
  };

  prototype.getProductTradeStream = function(tradesFrom, tradesTo) {
    var self = this;
    var shouldStop = null;

    if (typeof tradesTo === 'function') {
      shouldStop = tradesTo;
      tradesTo = null;
    }

    var rs = new Readable({objectMode: true});
    var started = false;

    rs._read = function() {
      if (!started) {
        started = true;
        fetchTrades(self, rs, tradesFrom, tradesTo, shouldStop, 0);
      }
    };

    return rs;
  }

  function fetchTrades(ctx, stream, tradesFrom, tradesTo, shouldStop) {
    var after = tradesFrom + API_LIMIT + 1;
    var loop = true;

    if (tradesTo && tradesTo <= after) {
      after = tradesTo;
      loop = false;
    }

    var opts = { before: tradesFrom, after: after, limit: API_LIMIT };

    prototype.getProductTrades.call(ctx, opts, function(err, resp, data) {
      if (err) {
        stream.emit('error', err);
        return;
      }

      if (resp.statusCode === 429) {
        // rate-limited, try again
        setTimeout(function() {
          fetchTrades(ctx, stream, tradesFrom, tradesTo, shouldStop);
        }, 900);
        return;
      }

      if (resp.statusCode !== 200) {
        stream.emit('error', new Error('Encountered status code ' + resp.statusCode));
      }

      for (var i = data.length - 1; i >= 0; i--) {
        if (shouldStop && shouldStop(data[i])) {
          stream.push(null);
          return;
        }

        stream.push(data[i]);
      }

      if (!loop) {
        stream.push(null);
        return;
      }

      fetchTrades(ctx, stream, tradesFrom + API_LIMIT, tradesTo, shouldStop);
    });
  }

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
