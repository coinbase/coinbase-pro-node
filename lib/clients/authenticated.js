const { signRequest } = require('../request_signer');

const PublicClient = require('./public.js');
const { PAGE_ARGS, ORDER_FIELDS } = require('../utilities');

/**
 * @description AuthenticatedClient.
 */
class AuthenticatedClient extends PublicClient {
  /**
   * @param {Object} options
   * @param {string} options.key - The Key.
   * @param {boolean} options.secret - The Secret.
   * @param {string} options.passphrase - The Passphrase.
   * @param {string} [options.product_id] - If `product_id` is provided then it will be used in all future requests that requires `product_id` but it is omitted (not applied to requests where `product_id` is optional).
   * @param {boolean} [options.sandbox] - If set to `true` AuthenticatedClient will use the sandbox endpoint.
   * @param {string} [options.api_uri] - Overrides the default apiuri, if provided.
   * @param {number} [options.timeout] - Overrides the default timeout, if provided.
   * @throws Will throw an error if incomplete authentication credentials are provided.
   * @description Create AuthenticatedClient.
   */
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

  /**
   * @param [callback]
   * @description Get a list of your coinbase accounts.
   */
  getCoinbaseAccounts(callback) {
    return this.get(['coinbase-accounts'], callback);
  }

  /**
   * @param [callback]
   * @description Get a list of your payment methods.
   */
  getPaymentMethods(callback) {
    return this.get(['payment-methods'], callback);
  }

  /**
   * @param [callback]
   * @description Get a list of trading accounts.
   */
  getAccounts(callback) {
    return this.get(['accounts'], callback);
  }

  /**
   * @param {Object} options
   * @param {string} options.account_id
   * @param [callback]
   * @throws Will throw an error if `account_id` is undefined.
   * @description Information for a single account.
   */
  getAccount(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(['accounts', options.account_id], callback);
  }

  /**
   * @param {Object} options
   * @param {string} options.account_id
   * @param {string} [options.after] - Request page after (older) this pagination id.
   * @param {string} [options.before] - Request page before (newer) this pagination id.
   * @param {number} [options.limit] - Number of results per request. Maximum 100.
   * @param [callback]
   * @throws Will throw an error if `account_id` is undefined.
   * @description List account activity.
   */
  getAccountHistory(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(
      ['accounts', options.account_id, 'ledger'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  /**
   * @param {Object} options
   * @param {string} options.account_id
   * @param {string} [options.after] - Request page after (older) this pagination id.
   * @param {string} [options.before] - Request page before (newer) this pagination id.
   * @param {number} [options.limit] - Number of results per request. Maximum 100.
   * @param [callback]
   * @throws Will throw an error if `account_id` is undefined.
   * @description List transfers to/from Coinbase to Coinbase Pro.
   */
  getAccountTransfers(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(
      ['accounts', options.account_id, 'transfers'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  /**
   * @param {Object} options
   * @param {string} options.account_id
   * @param {string} [options.after] - Request page after (older) this pagination id.
   * @param {string} [options.before] - Request page before (newer) this pagination id.
   * @param {number} [options.limit] - Number of results per request. Maximum 100.
   * @param [callback]
   * @throws Will throw an error if `account_id` is undefined.
   * @description Get holds.
   */
  getAccountHolds(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'account_id');

    return this.get(
      ['accounts', options.account_id, 'holds'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  /**
   * @param {Object} options
   * @param {string} options.side - buy or sell.
   * @param {string} [options.client_oid] - Order ID selected by you to identify your order.
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param {string} [options.stp] - Self-trade prevention flag.
   * @param {string} [options.stop] - Either loss or entry. Requires `stop_price` to be defined.
   * @param {string} [options.stop_price] - Only if `stop` is defined. Sets trigger price for stop order.
   * @param {string} [options.price] - Price (required for limit orders).
   * @param {string} [options.size] - Amount to buy/sell (required for limit orders).
   * @param {string} [options.time_in_force] - GTC, GTT, IOC, or FOK (default is GTC) (for limit orders).
   * @param {string} [options.cancel_after] - min, hour, day (for limit orders).
   * @param {boolean} [options.post_only] - Post only flag (for limit orders).
   * @param {boolean} [options.funds] - Desired amount of quote currency to use (either `funds` or `size` is required for market orders).
   * @description Place a new order.
   */
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

  /**
   * @param {Object} options
   * @param {string} [options.client_oid] - Order ID selected by you to identify your order.
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param {string} [options.stp] - Self-trade prevention flag.
   * @param {string} [options.stop] - Either loss or entry. Requires `stop_price` to be defined.
   * @param {string} [options.stop_price] - Only if `stop` is defined. Sets trigger price for stop order.
   * @param {string} [options.price] - Price (required for limit orders).
   * @param {string} [options.size] - Amount to buy/sell (required for limit orders).
   * @param {string} [options.time_in_force] - GTC, GTT, IOC, or FOK (default is GTC) (for limit orders).
   * @param {string} [options.cancel_after] - min, hour, day (for limit orders).
   * @param {boolean} [options.post_only] - Post only flag (for limit orders).
   * @param {boolean} [options.funds] - Desired amount of quote currency to use (either `funds` or `size` is required for market orders).
   * @description Place a new buy order.
   */
  buy(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    options.side = 'buy';
    return this.placeOrder(options, callback);
  }

  /**
   * @param {Object} options
   * @param {string} [options.client_oid] - Order ID selected by you to identify your order.
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param {string} [options.stp] - Self-trade prevention flag.
   * @param {string} [options.stop] - Either loss or entry. Requires `stop_price` to be defined.
   * @param {string} [options.stop_price] - Only if `stop` is defined. Sets trigger price for stop order.
   * @param {string} [options.price] - Price (required for limit orders).
   * @param {string} [options.size] - Amount to buy/sell (required for limit orders).
   * @param {string} [options.time_in_force] - GTC, GTT, IOC, or FOK (default is GTC) (for limit orders).
   * @param {string} [options.cancel_after] - min, hour, day (for limit orders).
   * @param {boolean} [options.post_only] - Post only flag (for limit orders).
   * @param {boolean} [options.funds] - Desired amount of quote currency to use (either `funds` or `size` is required for market orders).
   * @description Place a new sell order.
   */
  sell(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    options.side = 'sell';
    return this.placeOrder(options, callback);
  }

  /**
   * @param [callback]
   * @description Get your 30-day trailing volume for all products.
   */
  getTrailingVolume(callback) {
    return this.get(['users', 'self', 'trailing-volume'], {}, callback);
  }

  /**
   * @param {Object} options
   * @param {string} options.id - Only cancel orders open for a specific product.
   * @param [callback]
   * @throws Will throw an error if `id` is undefined.
   * @description Cancel a previously placed order.
   */
  cancelOrder(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'id');

    return this.delete(['orders', options.id], callback);
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.product_id] - Only cancel orders open for a specific product.
   * @param [callback]
   * @description With best effort, cancel all open orders. The response is a list of ids of the canceled orders.
   */
  cancelOrders(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.delete(
      ['orders'],
      { qs: this._normalizeQS(options, 'product_id') },
      callback
    );
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.product_id] - Only cancel orders open for a specific product.
   * @param [callback]
   * @description Cancels all orders. It may require you to make the request multiple times until all of the 'open' orders are deleted.
   */
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

  /**
   * @param {Object} [options]
   * @param {string} [options.status] - `options.status` must be on of the following values: open, pending, active.
   * @param {string} [options.product_id] - Only list orders for a specific product.
   * @param {string} [options.after] - Request page after (older) this pagination id.
   * @param {string} [options.before] - Request page before (newer) this pagination id.
   * @param {number} [options.limit] - Number of results per request. Maximum 100.
   * @param [callback]
   * @description List your current open orders.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.id - Order ID.
   * @param [callback]
   * @throws Will throw an error if `id` is undefined.
   * @description Get a single order by order `id`.
   */
  getOrder(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'id');

    return this.get(['orders', options.id], callback);
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.order_id] - Limit list of fills to this `order_id`.
   * @param {string} [options.product_id] - If `order_id` and `product_id` are not provided then the default product_id will be used.
   * @param {number} [options.after] - Request page after (older) this pagination id.
   * @param {number} [options.before] - Request page before (newer) this pagination id.
   * @param {number} [options.limit] - Number of results per request. Maximum 100.
   * @param [callback]
   * @description Get a list of recent fills.
   */
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

  /**
   * @param [callback]
   */
  getFundings(callback) {
    return this.get(['funding'], callback);
  }

  /**
   * @param {Object} options
   * @param {string} options.amount
   * @param {string} options.currency
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`.
   * @param [callback]
   */
  repay(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'amount', 'currency');

    return this.post(['funding/repay'], { body: options }, callback);
  }

  /**
   * @param {Object} options
   * @param {string} options.margin_profile_id
   * @param {string} options.type
   * @param {string} options.currency
   * @param {string} options.amount
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`, `type`, `margin_profile_id`.
   * @param [callback]
   */
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

  /**
   * @param {Object} [options]
   * @param [callback]
   */
  closePosition(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.post(['position/close'], { body: options }, callback);
  }

  /**
   * @param {Object} options
   * @param {string} options.from - A valid currency id.
   * @param {string} options.to - A valid currency id.
   * @param {string} options.amount - Amount of `from` to convert to `to`.
   * @throws Will throw an error if one of the following properties are undefined: `from`, `to`, `amount`.
   * @param [callback]
   * @description Stablecoin Conversions.
   */
  convert(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'from', 'to', 'amount');

    return this.post(
      ['conversions'],
      { body: this._normalizeQS(options, 'from', 'to', 'amount') },
      callback
    );
  }

  /**
   * @param {Object} options
   * @param {string} options.amount - The amount to withdraw.
   * @param {string} options.currency - The type of currency.
   * @param {string} options.coinbase_account_id - ID of the coinbase account.
   * @param [callback]
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`, `coinbase_account_id`.
   * @description Deposit funds from a coinbase account.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.amount - The amount to withdraw.
   * @param {string} options.currency - The type of currency.
   * @param {string} options.payment_method_id - ID of the payment method.
   * @param [callback]
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`, `payment_method_id`.
   * @description Deposit funds from a payment method.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.currency - Crypto currency.
   * @param [callback]
   * @throws Will throw an error if one of the following properties are undefined: `currency`.
   * @description Get a deposit address.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.amount - The amount to withdraw.
   * @param {string} options.currency - The type of currency.
   * @param {string} options.coinbase_account_id - ID of the coinbase account.
   * @param [callback]
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`, `coinbase_account_id`.
   * @description Withdraw funds to a coinbase account.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.amount - The amount to withdraw.
   * @param {string} options.currency - The type of currency.
   * @param {string} options.payment_method_id - ID of the payment method.
   * @param [callback]
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`, `payment_method_id`.
   * @description Withdraw funds to a payment method.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.amount - The amount to withdraw.
   * @param {string} options.currency - The type of currency.
   * @param {string} options.crypto_address - A crypto address of the recipient.
   * @param {string} [options.destination_tag] - A destination tag for currencies that support one.
   * @param {string} [options.no_destination_tag] - A boolean flag to opt out of using a destination tag for currencies that support one. This is required when not providing a destination tag.
   * @param [callback]
   * @throws Will throw an error if one of the following properties are undefined: `amount`, `currency`, `crypto_address`.
   * @description Withdraws funds to a crypto address.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.start_date - Starting date for the report (inclusive).
   * @param {string} options.end_date - Ending date for the report (inclusive).
   * @param {string} [options.product_id] - ID of the product to generate a fills report for. Required if `type` is `fills`.
   * @param {string} [options.account_id] - ID of the account to generate an account report for. Required if `type` is `account`.
   * @param {string} [options.format] - `pdf` or `csv` (defualt is `pdf`).
   * @param {string} [options.email] - Email address to send the report to (optional).
   * @param [callback]
   * @description Create a new report.
   */
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

  /**
   * @param {Object} options
   * @param {string} options.report_id - Report id.
   * @param [callback]
   * @throws Will throw an error if `report_id` is undefined.
   * @description Get report status.
   */
  getReportStatus(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options.report_id);

    return this.get(['reports', options.report_id], callback);
  }
}

module.exports = exports = AuthenticatedClient;
