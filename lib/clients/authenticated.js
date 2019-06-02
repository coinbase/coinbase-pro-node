const { signRequest } = require('../request_signer');

const PublicClient = require('./public.js');
const { PAGE_ARGS, ORDER_FIELDS } = require('../utilities');

class AuthenticatedClient extends PublicClient {
  constructor(options) {
    super(options);
    this._requireParams(options, 'key', 'secret', 'passphrase');

    this.key = options.key;
    this.secret = options.secret;
    this.passphrase = options.passphrase;
  }

  request(method, uriParts, opts, callback) {
    [opts, callback] = this._normalizeParams(opts, callback);

    this.addHeaders(
      opts,
      this._getSignature(method.toUpperCase(), '/' + uriParts.join('/'), opts)
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

  getAccount(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(['accounts', options.account_id], callback);
  }

  getAccountHistory(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(
      ['accounts', options.account_id, 'ledger'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  getAccountTransfers(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(
      ['accounts', options.account_id, 'transfers'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  getAccountHolds(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(
      ['accounts', options.account_id, 'holds'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  placeOrder(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let requiredParams = ['side'];
    options.product_id = options.product_id || this.productID;

    options.type = !options.price ? 'market' : 'limit';

    if (options.type === 'limit') {
      requiredParams.push('price', 'size');
    }

    this._requireParams(options, ...requiredParams);

    if (options.side !== 'buy' && options.side !== 'sell') {
      throw new Error('`side` must be `buy` or `sell`');
    }

    if (options.type === 'market' && !options.size && !options.funds) {
      throw new Error('`options` must include either `size` or `funds`');
    }

    return this.post(
      ['orders'],
      {
        body: this._normalizeQS(options, ...ORDER_FIELDS),
      },
      callback
    );
  }

  buy(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    options.side = 'buy';
    return this.placeOrder(options, callback);
  }

  sell(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    options.side = 'sell';
    return this.placeOrder(options, callback);
  }

  getTrailingVolume(callback) {
    return this.get(['users', 'self', 'trailing-volume'], {}, callback);
  }

  cancelOrder(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'id');

    return this.delete(['orders', options.id], callback);
  }

  cancelOrders(callback) {
    return this.delete(['orders'], callback);
  }

  cancelAllOrders(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    const totalDeletedOrders = [];
    const opts = { qs: this._normalizeQS(options, 'product_id') };

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

  getOrders(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['orders'],
      {
        qs: this._normalizeQS(options, 'status', 'product_id', ...PAGE_ARGS),
      },
      callback
    );
  }

  getOrder(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'id');

    return this.get(['orders', options.id], callback);
  }

  getFills(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    if (!options.order_id && !options.product_id) {
      options.product_id = this.productID;
    }

    return this.get(
      ['fills'],
      {
        qs: this._normalizeQS(options, 'order_id', 'product_id', ...PAGE_ARGS),
      },
      callback
    );
  }

  getFundings(callback) {
    return this.get(['funding'], callback);
  }

  repay(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'amount', 'currency');

    return this.post(['funding/repay'], { body: options }, callback);
  }

  marginTransfer(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['margin_profile_id', 'type', 'currency', 'amount'];
    this._requireParams(options, ...reqParams);

    return this.post(
      ['profiles/margin-transfer'],
      {
        body: options,
      },
      callback
    );
  }

  closePosition(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.post(['position/close'], { body: options }, callback);
  }

  convert(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'from', 'to', 'amount');

    return this.post(
      ['conversions'],
      { body: this._normalizeQS(options, 'from', 'to', 'amount') },
      callback
    );
  }

  deposit(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['amount', 'currency', 'coinbase_account_id'];
    this._requireParams(options, ...reqParams);

    return this.post(
      ['deposits/coinbase-account'],
      { body: this._normalizeQS(options, ...reqParams) },
      callback
    );
  }

  depositPayment(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['amount', 'currency', 'payment_method_id'];
    this._requireParams(options, ...reqParams);

    return this.post(
      ['deposits/payment-method'],
      { body: this._normalizeQS(options, ...reqParams) },
      callback
    );
  }

  depositCrypto(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, ['currency']);

    return this.getCoinbaseAccounts()
      .then(coinbaseAccounts => {
        let account = coinbaseAccounts.find(
          a => a.currency === options.currency
        );
        return this.post(
          ['coinbase-accounts', account.id, 'addresses'],
          callback
        );
      })
      .catch(callback);
  }

  withdraw(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['amount', 'currency', 'coinbase_account_id'];
    this._requireParams(options, ...reqParams);

    return this.post(
      ['withdrawals/coinbase-account'],
      { body: this._normalizeQS(options, ...reqParams) },
      callback
    );
  }

  withdrawPayment(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['amount', 'currency', 'payment_method_id'];
    this._requireParams(options, ...reqParams);

    return this.post(
      ['withdrawals/payment-method'],
      { body: this._normalizeQS(options, ...reqParams) },
      callback
    );
  }

  withdrawCrypto(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['amount', 'currency', 'crypto_address'];
    this._requireParams(options, ...reqParams);

    return this.post(
      ['withdrawals/crypto'],
      {
        body: this._normalizeQS(
          options,
          ...reqParams,
          'destination_tag',
          'no_destination_tag'
        ),
      },
      callback
    );
  }

  createReport(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    let reqParams = ['type', 'start_date', 'end_date'];

    options.type = options.product_id ? 'fills' : 'account';

    reqParams.push(options.product_id ? 'product_id' : 'account_id');

    this._requireParams(options, ...reqParams);

    return this.post(
      ['reports'],
      { body: this._normalizeQS(options, ...reqParams, 'format', 'email') },
      callback
    );
  }

  getReportStatus(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options.report_id);

    return this.get(['reports', options.report_id], callback);
  }
}

module.exports = exports = AuthenticatedClient;
