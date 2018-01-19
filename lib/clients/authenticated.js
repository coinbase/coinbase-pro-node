const { signRequest } = require('../../lib/request_signer');
const PublicClient = require('./public');

const { GDAX_AUTHED_RATE_LIMIT } = require('../constants');

class AuthenticatedClient extends PublicClient {
  constructor(key, secret, passphrase, apiURI, options = {}) {
    if (!key || !secret || !passphrase) {
      throw new Error(
        'AuthenticatedClient constructor requires arguments `key`, `secret`, and `passphrase`.'
      );
    }
  
    if (!(+options.rateLimit >= 0)) {
      options.rateLimit = GDAX_AUTHED_RATE_LIMIT;
    }
  
    super(apiURI, options);
    this.key = key;
    this.secret = secret;
    this.passphrase = passphrase;
  }

  _request({ method, uri, queries = {}, headers = {} }) {
    const [arg] = arguments;
    arg.queries = queries;
    arg.headers = headers;
    method = method.toUpperCase();
    Object.assign(headers, this._getSignatureHeaders(method, uri, queries));
    return super._request(arg);
  }

  _getSignatureHeaders(method, relativeURI, queries, body) {
    const sig = signRequest(this, method, relativeURI, queries, body);

    return {
      'CB-ACCESS-KEY': sig.key,
      'CB-ACCESS-SIGN': sig.signature,
      'CB-ACCESS-TIMESTAMP': sig.timestamp,
      'CB-ACCESS-PASSPHRASE': sig.passphrase,
    };
  }

  getCoinbaseAccounts(callback) {
    return this.get(['coinbase-accounts'], callback);
  }

  getPaymentMethods(callback) {
    return this.get(['payment-methods'], callback);
  }

  getAccounts(callback) {
    return this._get({ uri: `/accounts`, callback });
  }

  getAccount(accountID, callback) {
    return this._get({ uri: `/accounts/${accountID}`, callback });
  }

  getAccountHistory(accountID, opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    return this._get({
      uri: `/accounts/${accountID}/ledger`,
      queries: opts,
      callback,
    });
  }

  getAccountHolds(accountID, opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    return this._get({
      uri: `/accounts/${accountID}/holds`,
      queries: opts,
      callback,
    });
  }

  placeOrder(params, callback) {
    let requiredParams = ['side', 'product_id'];
    let needsSize = params.type !== 'market' && params.type !== 'stop';

    if (needsSize) {
      requiredParams.push('price', 'size');
    }

    this._requireParams(params, requiredParams);
    
    if (!needsSize && !params.size && !params.funds) {
      throw new Error('`opts` must include either `size` or `funds`');
    }

    if (params.side !== 'buy' && params.side !== 'sell') {
      throw new Error('`side` must be `buy` or `sell`');
    }

    return this._post({ uri: '/orders', body: params, callback });
  }

  buy(params, callback) {
    params.side = 'buy';
    return this.placeOrder(params, callback);
  }

  sell(params, callback) {
    params.side = 'sell';
    return this.placeOrder(params, callback);
  }

  getTrailingVolume(callback) {
    return this._get({ uri: `/users/self/trailing-volume`, callback });
  }

  cancelOrder(orderID, callback) {
    if (!orderID || typeof orderID === 'function') {
      let err = new Error('must provide an orderID or consider cancelOrders');
      if (typeof orderID === 'function') {
        orderID(err);
      }
      return Promise.reject(err);
    }

    return this._delete({ uri: `/orders/${orderID}`, callback });
  }

  cancelOrders(callback) {
    return this._delete({ uri: `/orders`, callback });
  }

  cancelAllOrders(opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    const totalDeletedOrders = [];

    const deleteNext = () => {
      return this._delete({
        uri: `/orders`,
        queries: opts,
      })
        .then(data => {
          totalDeletedOrders.push(...data);
          if (data.length) {
            return deleteNext();
          } else {
            if (callback) {
              callback(undefined, totalDeletedOrders);
            }
            return totalDeletedOrders;
          }
        })
        .catch(err => {
          if (callback) {
            callback(err);
          }
          throw err;
        });
    };

    return deleteNext();
  }

  getOrders(opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    return this._get({ uri: `/orders`, queries: opts, callback });
  }

  getOrder(orderID, callback) {
    if (!orderID || typeof orderID === 'function') {
      let err = new Error('must provide an orderID or consider getOrders');
      if (typeof orderID === 'function') {
        orderID(err);
      }
      return Promise.reject(err);
    }

    return this._get({ uri: `/orders/${orderID}`, callback });
  }

  getFills(opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    return this._get({ uri: `/fills`, queries: opts, callback });
  }

  getFundings(callback) {
    return this._get({ uri: `/funding`, callback });
  }

  repay(params, callback) {
    this._requireParams(params, ['amount', 'currency']);
    return this._post({ uri: `/funding/repay`, body: params, callback });
  }

  marginTransfer(params, callback) {
    this._requireParams(params, [
      'margin_profile_id',
      'type',
      'currency',
      'amount',
    ]);
    return this._post({
      uri: `/profiles/margin-transfer`,
      body: params,
      callback,
    });
  }

  closePosition(params, callback) {
    this._requireParams(params, ['repay_only']);
    return this._post({ uri: `/position/close`, body: params, callback });
  }

  deposit(params, callback) {
    this._requireParams(params, ['amount', 'currency', 'coinbase_account_id']);
    return this._post(`deposits/coinbase-account`, { body: params }, callback);
  }

  withdraw(params, callback) {
    this._requireParams(params, ['amount', 'currency', 'coinbase_account_id']);
    return this._post(
      `withdrawals/coinbase-account`,
      { body: params },
      callback
    );
  }

  withdrawCrypto(body, callback) {
    this._requireParams(body, ['amount', 'currency', 'crypto_address']);
    return this.post(`withdrawals/crypto`, { body }, callback);
  }

  _requireParams(params, required) {
    for (let param of required) {
      if (params[param] === undefined) {
        throw new Error('`opts` must include param `' + param + '`');
      }
    }
    return true;
  }

  createReport(params, callback) {
    const required = ['type', 'start_date', 'end_date'];
    this._requireParams(params, required);

    if (params.type === 'fills') {
      required.push('product_id');
      this._requireParams(params, required);
    }

    if (params.type === 'account') {
      required.push('account_id');
      this._requireParams(params, required);
    }

    return this.post(['reports'], { body: params }, callback);
  }

  getReportStatus(reportId, callback) {
    return this.get(['reports', reportId], callback);
  }
}

module.exports = exports = AuthenticatedClient;
