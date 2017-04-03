var util = require('util');
var querystring = require('querystring');
var async = require('async');
var signRequest = require('../../lib/request_signer').signRequest;

var _ = {
  'forEach': require('lodash.foreach'),
  'assign': require('lodash.assign'),
  'partial': require('lodash.partial'),
};
var request = require('request');

var PublicClient = require('./public.js');


var AuthenticatedClient = function(key, b64secret, passphrase, apiURI) {
  var self = this;

  PublicClient.call(self, '', apiURI);
  self.key = key;
  self.b64secret = b64secret;
  self.passphrase = passphrase;
};

util.inherits(AuthenticatedClient, PublicClient);

_.assign(AuthenticatedClient.prototype, new function() {
  var prototype = this;

  prototype.request = function(method, uriParts, opts, callback) {
    var self = this;

    opts = opts || {};
    if (!callback && (typeof opts === 'function')) {
      callback = opts;
      opts = {};
    }

    if (!callback) {
      throw "Must supply a callback"
    }

    var relativeURI = self.makeRelativeURI(uriParts);
    method = method.toUpperCase();
    _.assign(opts, {
      'method': method,
      'uri': self.makeAbsoluteURI(relativeURI)
    });

    self.addHeaders(opts, self._getSignature(method, relativeURI, opts));
    request(opts, self.makeRequestCallback(callback));
  };

  prototype._getSignature = function(method, relativeURI, opts) {
    var auth = {
      key: this.key,
      secret: this.b64secret,
      passphrase: this.passphrase
    };
    var sig = signRequest(auth, method, relativeURI, opts);
    if (opts.body) {
      opts.body = JSON.stringify(opts.body);
    }
    return {
      'CB-ACCESS-KEY': sig.key,
      'CB-ACCESS-SIGN': sig.signature,
      'CB-ACCESS-TIMESTAMP': sig.timestamp,
      'CB-ACCESS-PASSPHRASE': sig.passphrase,
    };
  };

  _.forEach(['get', 'post', 'put', 'delete'], function(method) {
    prototype[method] = _.partial(prototype.request, method);
  });

  prototype.getAccounts = function(callback) {
    var self = this;
    return prototype.get.call(self, ['accounts'], callback);
  };

  prototype.getAccount = function(accountID, callback) {
    var self = this;
    return prototype.get.call(self, ['accounts', accountID], callback);
  };

  prototype.getAccountHistory = function(accountID, args, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };
    return prototype.get.call(self, ['accounts', accountID, 'ledger'], opts, callback);
  };

  prototype.getAccountHolds = function(accountID, args, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };
    return prototype.get.call(self, ['accounts', accountID, 'holds'], opts, callback);
  };

  prototype._placeOrder = function(params, callback) {
    var self = this;

    var requiredParams = ['size', 'side', 'product_id'];

    if (params.type !== 'market') {
      requiredParams.push('price');
    }

    _.forEach(requiredParams, function(param) {
      if (params[param] === undefined) {
        throw "`opts` must include param `" + param + "`";
      }
    });
    var opts = { 'body': params };
    return prototype.post.call(self, ['orders'], opts, callback);
  };

  prototype.buy = function(params, callback) {
    var self = this;
    params.side = 'buy';
    return self._placeOrder(params, callback);
  };

  prototype.sell = function(params, callback) {
    var self = this;
    params.side = 'sell';
    return self._placeOrder(params, callback);
  };

  prototype.getTrailingVolume = function(callback) {
    var self = this;
    return prototype.get.call(self, ['users', 'self', 'trailing-volume'], {}, callback);
  };

  prototype.cancelOrder = function(orderID, callback) {
    var self = this;

    if (!callback && (typeof orderID === 'function')) {
      callback = orderID;
      callback(new Error('must provide an orderID or consider cancelOrders'));
      return;
    }

    return prototype.delete.call(self, ['orders', orderID], callback);
  };

  prototype.cancelOrders = function(callback) {
    var self = this;
    return prototype.delete.call(self, ['orders'], callback);
  };

  // temp over ride public call to get Product Orderbook
  prototype.getProductOrderBook = function(args, productId, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };
    return prototype.get.call(self, ['products', productId, 'book'], opts, callback);
  };


  prototype.cancelAllOrders = function(args, callback) {
    var self = this;
    var currentDeletedOrders = [];
    var totalDeletedOrders = [];
    var query = true;
    var response;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };

    async.doWhilst(
      deleteOrders,
      untilEmpty,
      completed
    );

    function deleteOrders(done) {
      prototype.delete.call(self, ['orders'], opts, function(err, resp, data) {

        if (err) {
          done(err);
          return;
        }

        if ((resp && resp.statusCode != 200) || !data) {
          var err = new Error('Failed to cancel all orders');
          query = false;
          done(err);
          return;
        }

        currentDeletedOrders = data;
        totalDeletedOrders = totalDeletedOrders.concat(currentDeletedOrders);
        response = resp;

        done();
      });
    }

    function untilEmpty() {
      return (currentDeletedOrders.length > 0 && query)
    }

    function completed(err) {
      callback(err, response, totalDeletedOrders);
    }
  };

  prototype.getOrders = function(args, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };
    return prototype.get.call(self, ['orders'], opts, callback);
  };

  prototype.getOrder = function(orderID, callback) {
    var self = this;

    if (!callback && (typeof orderID === 'function')) {
      callback = orderID;
      callback(new Error('must provide an orderID or consider getOrders'));
      return;
    }

    return prototype.get.call(self, ['orders', orderID], callback);
  };

  prototype.getFills = function(args, callback) {
    var self = this;

    args = args || {}
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    var opts = { 'qs': args };
    return prototype.get.call(self, ['fills'], opts, callback);
  };

  prototype.getFundings = function(callback) {
    var self = this;
    return prototype.get.call(self, ['funding'], callback);
  };

  prototype.repay = function(params, callback) {
    var self = this;
    _.forEach(['amount', 'currency'], function(param) {
      if (params[param] === undefined) {
        throw "`opts` must include param `" + param + "`";
      }
    });
    var opts = { 'body': params };
    return prototype.post.call(self, ['funding/repay'], opts, callback);
  };

  prototype.marginTransfer = function(params, callback) {
    var self = this;
    _.forEach(['margin_profile_id', 'type', 'currency', 'amount'], function(param) {
      if (params[param] === undefined) {
        throw "`opts` must include param `" + param + "`";
      }
    });
    var opts = { 'body': params };
    return prototype.post.call(self, ['profiles/margin-transfer'], opts, callback);
  };

  prototype.closePosition = function(params, callback) {
    var self = this;
    _.forEach(['repay_only'], function(param) {
      if (params[param] === undefined) {
        throw "`opts` must include param `" + param + "`";
      }
    });
    var opts = { 'body': params };
    return prototype.post.call(self, ['position/close'], opts, callback);
  };

  prototype.deposit = function(params, callback) {
    var self = this;
    params.type = 'deposit';
    return self._transferFunds(params, callback);
  };

  prototype.withdraw = function(params, callback) {
    var self = this;
    params.type = 'withdraw';
    return self._transferFunds(params, callback);
  };

  prototype._transferFunds = function(params, callback) {
    var self = this;
    _.forEach(['type', 'amount', 'coinbase_account_id'], function(param) {
      if (params[param] === undefined) {
        throw "`opts` must include param `" + param + "`";
      }
    });
    var opts = { 'body': params };
    return prototype.post.call(self, ['transfers'], opts, callback);
  };

});

module.exports = exports = AuthenticatedClient;
