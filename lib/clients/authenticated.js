const { signRequest } = require('../../lib/request_signer');
const PublicClient = require('./public');

const { GDAX_AUTHED_RATE_LIMIT } = require('../constants');

class AuthenticatedClient extends PublicClient {
  constructor(
    key,
    b64secret,
    passphrase,
    productID,
    apiURI,
    { rateLimit = GDAX_AUTHED_RATE_LIMIT } = {}
  ) {
    if (!key || !b64secret || !passphrase) {
      throw new Error(
        'AuthenticatedClient constructor requires arguments `key`, `b64secret`, and `passphrase`.'
      );
    }

    super(productID, apiURI, { rateLimit });
    this._key = key;
    this._b64secret = b64secret;
    this._passphrase = passphrase;
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
    const auth = {
      key: this._key,
      secret: this._b64secret,
      passphrase: this._passphrase,
    };
    const sig = signRequest(auth, method, relativeURI, queries, body);
    return {
      'CB-ACCESS-KEY': sig.key,
      'CB-ACCESS-SIGN': sig.signature,
      'CB-ACCESS-TIMESTAMP': sig.timestamp,
      'CB-ACCESS-PASSPHRASE': sig.passphrase,
    };
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

  _placeOrder(params, callback) {
    let requiredParams = ['side', 'product_id'];
    let needsSize = params.type !== 'market' && params.type !== 'stop';

    if (needsSize) {
      requiredParams.push('price', 'size');
    }

    this._requireParams(params, requiredParams);

    return this._post({ uri: '/orders', body: params, callback });
  }

  buy(params, callback) {
    params.side = 'buy';
    return this._placeOrder(params, callback);
  }

  sell(params, callback) {
    params.side = 'sell';
    return this._placeOrder(params, callback);
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

  // temp over ride public call to get Product Orderbook
  getProductOrderBook(opts = {}, productId, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    return this._get({
      uri: `/products/${productId}/book`,
      queries: opts,
      callback,
    });
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
    params.type = 'deposit';
    return this._transferFunds(params, callback);
  }

  withdraw(params, callback) {
    params.type = 'withdraw';
    return this._transferFunds(params, callback);
  }

  _transferFunds(params, callback) {
    this._requireParams(params, ['type', 'amount', 'coinbase_account_id']);
    return this._post({ uri: `/transfers`, body: params, callback });
  }
}

module.exports = exports = AuthenticatedClient;
