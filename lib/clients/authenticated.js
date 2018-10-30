const { signRequest } = require('../../lib/request_signer');

const PublicClient = require('./public.js');

class AuthenticatedClient extends PublicClient {
  constructor(key, secret, passphrase, apiURI, options = {}) {
    super(apiURI, options);
    this.key = key;
    this.secret = secret;
    this.passphrase = passphrase;
  }

  request(method, uriParts, opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    this.addHeaders(
      opts,
      this._getSignature(
        method.toUpperCase(),
        this.makeRelativeURI(uriParts),
        opts
      )
    );

    return super.request(method, uriParts, opts, callback);
  }

  _getSignature(method, relativeURI, opts) {
    const sig = signRequest(this, method, relativeURI, opts);

    if (opts.body) {
      opts.body = JSON.stringify(opts.body);
    }
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
    return this.get(['accounts'], callback);
  }

  getAccount(accountID, callback) {
    return this.get(['accounts', accountID], callback);
  }

  getAccountHistory(accountID, args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this.get(['accounts', accountID, 'ledger'], { qs: args }, callback);
  }

  getAccountTransfers(accountID, args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this.get(
      ['accounts', accountID, 'transfers'],
      { qs: args },
      callback
    );
  }

  getAccountHolds(accountID, args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this.get(['accounts', accountID, 'holds'], { qs: args }, callback);
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

    return this.post(['orders'], { body: params }, callback);
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
    return this.get(['users', 'self', 'trailing-volume'], {}, callback);
  }

  cancelOrder(orderID, callback) {
    if (!orderID || typeof orderID === 'function') {
      let err = new Error('must provide an orderID or consider cancelOrders');
      if (typeof orderID === 'function') {
        orderID(err);
      }
      return Promise.reject(err);
    }

    return this.delete(['orders', orderID], callback);
  }

  cancelOrders(callback) {
    return this.delete(['orders'], callback);
  }

  cancelAllOrders(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    const opts = { qs: args };
    const totalDeletedOrders = [];

    const p = function deleteNext() {
      return new Promise((resolve, reject) => {
        this.delete(['orders'], opts, (err, response, data) => {
          if (err) {
            reject(err);
          } else {
            resolve([response, data]);
          }
        });
      })
        .then(values => {
          let [response, data] = values;
          totalDeletedOrders.push(...data);
          if (data.length) {
            return deleteNext.call(this);
          } else {
            return response;
          }
        })
        .then(response => {
          if (callback) {
            callback(undefined, response, totalDeletedOrders);
          }
          return totalDeletedOrders;
        })
        .catch(err => {
          if (callback) {
            callback(err);
          }
          throw err;
        });
    }.call(this);

    if (callback) {
      p.catch(() => {});
      return undefined;
    } else {
      return p;
    }
  }

  getOrders(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this.get(['orders'], { qs: args }, callback);
  }

  getOrder(orderID, callback) {
    if (!orderID || typeof orderID === 'function') {
      let err = new Error('must provide an orderID or consider getOrders');
      if (typeof orderID === 'function') {
        orderID(err);
      }
      return Promise.reject(err);
    }

    return this.get(['orders', orderID], callback);
  }

  getFills(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this.get(['fills'], { qs: args }, callback);
  }

  getFundings(callback) {
    return this.get(['funding'], callback);
  }

  repay(params, callback) {
    this._requireParams(params, ['amount', 'currency']);
    return this.post(['funding/repay'], { body: params }, callback);
  }

  marginTransfer(params, callback) {
    this._requireParams(params, [
      'margin_profile_id',
      'type',
      'currency',
      'amount',
    ]);
    return this.post(['profiles/margin-transfer'], { body: params }, callback);
  }

  closePosition(params, callback) {
    this._requireParams(params, ['repay_only']);
    return this.post(['position/close'], { body: params }, callback);
  }
  
  convert(params, callback) {
    this._requireParams(params, ['from', 'to', 'amount']);
    return this.post(['conversions'], { body: params }, callback);
  }

  deposit(params, callback) {
    this._requireParams(params, ['amount', 'currency', 'coinbase_account_id']);
    return this.post(['deposits/coinbase-account'], { body: params }, callback);
  }

  depositPayment(params, callback) {
    this._requireParams(params, ['amount', 'currency', 'payment_method_id']);
    return this.post(['deposits/payment-method'], { body: params }, callback);
  }


  depositCrypto(params, callback) {
    this._requireParams(params, ['currency']);
    return this.getCoinbaseAccounts()
      .then(coinbaseAccounts => {
        let account = coinbaseAccounts.find(
          a => a.currency === params.currency
        );
        return this.post(
          ['coinbase-accounts', account.id, 'addresses'],
          callback
        );
      })
      .catch(callback);
  }

  withdraw(params, callback) {
    this._requireParams(params, ['amount', 'currency', 'coinbase_account_id']);
    return this.post(
      ['withdrawals/coinbase-account'],
      { body: params },
      callback
    );
  }

  withdrawPayment(params, callback) {
    this._requireParams(params, ['amount', 'currency', 'payment_method_id']);
    return this.post(['withdrawals/payment-method'], { body: params }, callback);
  }

  withdrawCrypto(body, callback) {
    this._requireParams(body, ['amount', 'currency', 'crypto_address']);
    return this.post(['withdrawals/crypto'], { body }, callback);
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
