var util = require('util');
var crypto = require('crypto');

var _ = {
  'forEach': require('lodash.foreach'),
  'assign': require('lodash.assign'),
  'partial': require('lodash.partial'),
};
var request = require('request');

var PublicClient = require('./public.js');


var AuthenticatedClient = function(key, b64secret, passphrase, apiURI) {
  var self = this;
  PublicClient.call(self, apiURI);
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
    method = method.toUpperCase();
    if (!callback && (opts instanceof Function)) {
      callback = opts;
      opts = {};
    }
    if (!callback) {
      throw "Must supply a callback"
    }
    var relativeURI = self.makeRelativeURI(uriParts);
    _.assign(opts, {
      'method': method,
      'uri': self.makeAbsoluteURI(relativeURI),
    });
    if (opts.body && (typeof opts.body !== 'string')) {
      opts.body = JSON.stringify(opts.body);
    }
    var timestamp = Date.now() / 1000;
    var what = timestamp + method + relativeURI + (opts.body || '');
    var key = Buffer(self.b64secret, 'base64');
    var hmac = crypto.createHmac('sha256', key);
    var signature = hmac.update(what).digest('base64');
    self.addHeaders(opts, {
      'CB-ACCESS-KEY': self.key,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': self.passphrase,
    });
    request(opts, self.makeRequestCallback(callback));
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

  prototype.getAccountHistory = function(accountID, callback) {
    var self = this;
    return prototype.get.call(self, ['accounts', accountID, 'ledger'], callback);
  };

  prototype.getAccountHolds = function(accountID, callback) {
    var self = this;
    return prototype.get.call(self, ['accounts', accountID, 'holds'], callback);
  };

  prototype._placeOrder = function(params, callback) {
    var self = this;
    _.forEach(['price', 'size', 'side', 'product_id'], function(param) {
      if (params[param] === undefined) {
        throw "`opts` must include param `" + param + "`";
      }
    });
    opts = {'body': params};
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

  prototype.cancelOrder = function(orderID, callback) {
    var self = this;
    return prototype.delete.call(self, ['orders', orderID], callback);
  };

  prototype.getOrders = function(callback) {
    var self = this;
    return prototype.get.call(self, ['orders'], callback);
  };

  prototype.getOrder = function(orderID, callback) {
    var self = this;
    return prototype.get.call(self, ['orders', orderID], callback);
  };

  prototype.getFills = function(callback) {
    var self = this;
    return prototype.get.call(self, ['fills'], callback);
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
    opts = {'body': params};
    return prototype.post.call(self, ['transfers'], opts, callback);
  };

});

module.exports = exports = AuthenticatedClient;
