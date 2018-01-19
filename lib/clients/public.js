const { Readable } = require('stream');
const superagent = require('superagent');
const agentUse = require('superagent-use');
const agentPrefix = require('superagent-prefix');
const Throttle = require('superagent-throttle');

const {
  DEFAULT_BOOK_LEVEL,
  GDAX_API_URI,
  GDAX_PUBLIC_RATE_LIMIT,
} = require('../constants');

const staticAgent = agentUse(superagent).use(agentPrefix(GDAX_API_URI)).use(
  new Throttle({
    rate: GDAX_PUBLIC_RATE_LIMIT,
    ratePer: 1000,
  }).plugin()
);

const DEFAULT_TIMEOUT = 10 * 1000; // 10 sec

class PublicClient {
  constructor(
    apiURI = GDAX_API_URI,
    { rateLimit = GDAX_PUBLIC_RATE_LIMIT, timeout = DEFAULT_TIMEOUT } = {}
  ) {
    this.productID = 'BTC-USD';
    if (apiURI && !apiURI.startsWith('http')) {
      process.emitWarning(
        '`new PublicClient()` no longer accepts a product ID as the first argument. ',
        'DeprecationWarning'
      );
      this.productID = apiURI;
      apiURI = arguments[1] || 'https://api.gdax.com';
    }
    this._API_LIMIT = 100;
    this.timeout = +timeout > 0 ? +timeout : DEFAULT_TIMEOUT;
    this._agent = agentUse(superagent).use(agentPrefix(apiURI));
    if (rateLimit) {
      this._agent.use(
        new Throttle({
          rate: rateLimit,
          ratePer: 1000,
        }).plugin()
      );
    }
  }

  static _get(opts) {
    return PublicClient._request(Object.assign({ method: 'get' }, opts));
  }

  _get(opts) {
    return this._request(Object.assign({ method: 'get' }, opts));
  }
  _put(opts) {
    return this._request(Object.assign({ method: 'put' }, opts));
  }
  _post(opts) {
    return this._request(Object.assign({ method: 'post' }, opts));
  }
  _delete(opts) {
    return this._request(Object.assign({ method: 'delete' }, opts));
  }

  static _request(arg) {
    return PublicClient.prototype._request.call({ _agent: staticAgent }, arg);
  }

  _request({ method, uri, queries = {}, headers = {}, body = {}, callback }) {
    method = method.toLowerCase();

    const request = this._agent[method](uri);

    request.set('User-Agent', 'gdax-node-client').query(queries).accept('json');

    for (let h in headers) {
      request.set(h, headers[h]);
    }

    if (method === 'put' || method === 'post') {
      request.type('json').send(body);
    }
    
    if (this.timeout) {
       request.timeout(this.timeout);
    }

    let responsePromise = request
      .then(response => {
        if (callback) {
          callback(null, response.body);
        } else {
          return response.body;
        }
      })
      .catch(error => {
        // If GDAX returns an error message, override and make it the primary
        // message of the error object returned to the user.
        // GDAX API returns json body { "message": "<messageString>" }
        if (
          typeof error.response === 'object' &&
          typeof error.response.body === 'object' &&
          error.response.body.message
        ) {
          error.message = error.response.body.message;
        }

        if (callback) {
          callback(error);
        } else {
          throw error;
        }
      });

    if (callback) {
      return undefined;
    } else {
      return responsePromise;
    }
  }

  static _requireParams() {
    return PublicClient.prototype._requireParams(...arguments);
  }

  _requireParams(params, required) {
    for (let param of required) {
      if (params[param] === undefined) {
        throw new Error('parameter `' + param + '` is required');
      }
    }
    return true;
  }

  getProducts(callback) {
    return this._get({ uri: '/products', callback });
  }

  getProductOrderBook(productID, opts = {}, callback) {
    [productID, opts, callback] = this._normalizeProductArgs(
      productID,
      opts,
      callback,
      'getProductOrderBook'
    );

    opts.level = opts.level || DEFAULT_BOOK_LEVEL;

    return this._get({
      uri: `/products/${productID}/book`,
      queries: opts,
      callback,
    });
  }

  getProductTicker(productID, callback) {
    [productID, , callback] = this._normalizeProductArgs(
      productID,
      null,
      callback,
      'getProductTicker'
    );
    
    return this._get({ uri: `/products/${this._productID}/ticker`, callback });
  }

  getProductTrades(productID, opts = {}, callback) {
    [productID, opts, callback] = this._normalizeProductArgs(
      productID,
      opts,
      callback,
      'getProductTrades'
    );

    return this._get({
      uri: `/products/${this._productID}/trades`,
      queries: opts,
      callback,
    });
  }

  getProductTradeStream(productID, tradesFrom, tradesTo) {
    let stopFn = () => false;

    if (!productID || typeof productID !== 'string') {
      [tradesFrom, tradesTo] = Array.prototype.slice.call(arguments);
    }

    [productID] = this._normalizeProductArgs(
      productID,
      null,
      null,
      'getProductTradeStream'
    );

    let shouldStop = null;

    if (typeof tradesTo === 'function') {
      stopFn = tradesTo;
      tradesTo = Infinity;
    }

    const stream = new Readable({ objectMode: true });
    let started = false;

    stream._read = () => {
      if (!started) {
        started = true;
        fetchTrades.call(this, tradesFrom, tradesTo);
      }
    };

    return stream;

    function fetchTrades(tradesFrom, tradesTo) {
      let after = tradesFrom + this._API_LIMIT + 1;

      if (tradesTo < after) {
        after = tradesTo;
      }

      let opts = { before: tradesFrom, after: after, limit: this._API_LIMIT };

      this.getProductTrades(productID, opts)
        .then(data => {
          let trade;

          while (data.length) {
            trade = data.pop();
            trade.trade_id = parseInt(trade.trade_id);

            if (stopFn(trade)) {
              stream.push(null);
              return;
            }

            if (trade.trade_id >= tradesTo - 1) {
              stream.push(trade);
              stream.push(null);
              return;
            }

            stream.push(trade);
          }

          fetchTrades.call(this, trade.trade_id, tradesTo);
        })
        .catch(err => stream.emit('error', err));
    }
  }

  getProductHistoricRates(productID, opts, callback) {
    [productID, opts, callback] = this._normalizeProductArgs(
      productID,
      opts,
      callback,
      'getProductHistoricRates'
    );

    return this._get({
      uri: `/products/${this._productID}/candles`,
      queries: opts,
      callback,
    });
  }

  getProduct24HrStats(productID, callback) {
    [productID, , callback] = this._normalizeProductArgs(
      productID,
      null,
      callback,
      'getProduct24HrStats'
    );

    return this._get({ uri: `/products/${this._productID}/stats`, callback });
  }

  getCurrencies(callback) {
    return this._get({ uri: '/currencies', callback });
  }

  getTime(callback) {
    return this._get({ uri: '/time', callback });
  }

  _normalizeProductArgs(productID, args, callback, caller) {
    this._deprecationWarningIfProductIdMissing(productID, caller);

    callback = [callback, args, productID].find(byType('function'));
    args = [args, productID, {}].find(byType('object'));
    productID = [productID, this.productID].find(byType('string'));

    if (!productID) {
      throw new Error('No productID specified.');
    }

    return [productID, args, callback];
  }

  _deprecationWarningIfProductIdMissing(productID, caller) {
    if (!productID || typeof productID !== 'string') {
      process.emitWarning(
        `\`${caller}()\` now requires a product ID as the first argument. ` +
          `Attempting to use PublicClient#productID (${
            this.productID
          }) instead.`,
        'DeprecationWarning'
      );
    }
  }
}

const byType = type => o => o !== null && typeof o === type;

module.exports = exports = PublicClient;
