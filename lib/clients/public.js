const request = require('request');
const { Readable } = require('stream');
const {
  EXCHANGE_API_URL,
  SANDBOX_API_URL,
  DEFAULT_PAIR,
  DEFAULT_TIMEOUT,
  API_LIMIT,
  PAGE_ARGS,
} = require('../utilities');

/**
 * @description PublicClient.
 */
class PublicClient {
  /**
   * @param {Object} [options] - The object containing the connection details .
   * @param {string} [options.product_id] - If `product_id` is provided then it will be used in all future requests that requires `product_id` but it is omitted (not applied to requests where `product_id` is optional).
   * @param {boolean} [options.sandbox] - If set to `true` PublicClient will use the sandbox endpoint.
   * @param {string} [options.api_uri] - Overrides the default apiuri, if provided.
   * @param {number} [options.timeout] - Overrides the default timeout, if provided.
   * @description Create PublicClient.
   */
  constructor(options = {}) {
    this.productID = options.product_id || DEFAULT_PAIR;
    this.sandbox = options.sandbox || false;
    this.apiURI = options.api_uri
      ? options.api_uri
      : options.sandbox
      ? SANDBOX_API_URL
      : EXCHANGE_API_URL;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  get(...args) {
    return this.request('get', ...args);
  }
  put(...args) {
    return this.request('put', ...args);
  }
  post(...args) {
    return this.request('post', ...args);
  }
  delete(...args) {
    return this.request('delete', ...args);
  }

  addHeaders(obj, additional) {
    obj.headers = obj.headers || {};
    return Object.assign(
      obj.headers,
      {
        'User-Agent': 'coinbase-pro-node-client',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      additional
    );
  }

  makeRequestCallback(callback, resolve, reject) {
    return (err, response, data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = null;
      }

      if (err) {
        err.response = response;
        err.data = data;
      } else if (response.statusCode > 299) {
        err = new Error(
          `HTTP ${response.statusCode} Error: ${data && data.message}`
        );
        err.response = response;
        err.data = data;
      } else if (data === null) {
        err = new Error('Response could not be parsed as JSON');
        err.response = response;
        err.data = data;
      }

      if (typeof callback === 'function') {
        if (err) {
          callback(err);
        } else {
          callback(null, response, data);
        }
        return;
      }

      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    };
  }

  request(method, uriParts, opts, callback) {
    [opts, callback] = this._normalizeParams(opts, callback);

    Object.assign(opts, {
      method: method.toUpperCase(),
      uri: this.apiURI + '/' + uriParts.join('/'),
      qsStringifyOptions: { arrayFormat: 'repeat' },
      timeout: this.timeout,
    });
    this.addHeaders(opts);
    const p = new Promise((resolve, reject) => {
      request(opts, this.makeRequestCallback(callback, resolve, reject));
    });

    if (callback) {
      p.catch(() => {});
      return undefined;
    } else {
      return p;
    }
  }

  /**
   * @param [callback]
   * @returns Get a list of available currency pairs for trading.
   */
  getProducts(callback) {
    return this.get(['products'], callback);
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param {number} [options.level] - The level field must be one of the following values: 1, 2, 3.
   * @param [callback]
   * @description Get a list of open orders for a product. The amount of detail shown can be customized with the `level` parameter.
   */
  getProductOrderBook(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'book'],
      { qs: this._normalizeQS(options, 'level') },
      callback
    );
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param [callback]
   * @description Snapshot information about the last trade (tick), best bid/ask and 24h volume.
   */
  getProductTicker(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'ticker'],
      callback
    );
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param {number} [options.after] - Request page after (older) this pagination id.
   * @param {number} [options.before] - Request page before (newer) this pagination id.
   * @param {number} [options.limit] - Number of results per request. Maximum 100.
   * @param [callback]
   * @description List the latest trades for a product.
   */
  getProductTrades(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'trades'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

  /**
   * @param {Object} options
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param options.tradesTo - `options.tradesTo` can also be a function.
   * @param {number} options.tradesFrom
   * @param [callback]
   * @description fetches all trades with IDs >= `options.tradesFrom` and <= `options.tradesTo`.
   */
  getProductTradeStream(options) {
    options.product_id = options.product_id || this.productID;

    let shouldStop = null;

    if (typeof options.tradesTo === 'function') {
      shouldStop = options.tradesTo;
      options.tradesTo = null;
    }

    const rs = new Readable({ objectMode: true });
    let started = false;

    rs._read = () => {
      if (!started) {
        started = true;
        fetchTrades.call(
          this,
          rs,
          options.tradesFrom,
          options.tradesTo,
          shouldStop,
          0
        );
      }
    };

    return rs;

    function fetchTrades(stream, tradesFrom, tradesTo, shouldStop) {
      let after = tradesFrom + API_LIMIT + 1;
      let loop = true;

      if (tradesTo && tradesTo <= after) {
        after = tradesTo;
        loop = false;
      }

      let opts = {
        product_id: options.product_id,
        before: tradesFrom,
        after: after,
        limit: API_LIMIT,
      };

      this.getProductTrades(opts, (err, resp, data) => {
        if (err) {
          stream.emit('error', err);
          return;
        }

        if (resp.statusCode === 429) {
          // rate-limited, try again
          setTimeout(() => {
            fetchTrades.call(this, stream, tradesFrom, tradesTo, shouldStop);
          }, 900);
          return;
        }

        if (resp.statusCode !== 200) {
          stream.emit(
            'error',
            new Error('Encountered status code ' + resp.statusCode)
          );
        }

        for (let i = data.length - 1; i >= 0; i--) {
          if (shouldStop && shouldStop(data[i])) {
            stream.push(null);
            return;
          }

          stream.push(data[i]);
        }

        if (!loop || data.length === 0) {
          stream.push(null);
          return;
        }

        fetchTrades.call(
          this,
          stream,
          tradesFrom + API_LIMIT,
          tradesTo,
          shouldStop
        );
      });
    }
  }

  /**
   * @param {Object} options
   * @param {number} options.granularity - The granularity field must be one of the following values: 60, 300, 900, 3600, 21600, 86400.
   * @param {string} [options.product_id] - If `product_id` is not provided then the default product_id will be used.
   * @param {string} [options.start] - Start time in ISO 8601.
   * @param {string} [options.end] - End time in ISO 8601.
   * @param [callback]
   * @throws Will throw an error if `granularity` property is undefined.
   * @description Historic rates for a product.
   */
  getProductHistoricRates(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'granularity');

    return this.get(
      ['products', options.product_id || this.productID, 'candles'],
      { qs: this._normalizeQS(options, 'start', 'end', 'granularity') },
      callback
    );
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.product_id] -
   * @param [callback]
   * @description Get 24 hr stats for the product. If `product_id` is not provided then the default product_id will be used.
   */
  getProduct24HrStats(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'stats'],
      callback
    );
  }

  /**
   * @param [callback]
   * @description List known currencies.
   */
  getCurrencies(callback) {
    return this.get(['currencies'], callback);
  }

  /**
   * @param [callback]
   * @description Get the API server time.
   */
  getTime(callback) {
    return this.get(['time'], callback);
  }

  /**
   * @private
   * @param [options]
   * @param [callback]
   * @description Normalizes the arguments `options` and `callback`.
   */
  _normalizeParams(options, callback) {
    callback = [callback, options].find(byType('function'));
    options = [options, {}].find(byType('object'));
    return [options, callback];
  }

  /**
   * @private
   * @param {Object} options
   * @param {...string} keys
   * @returns {Object} - The object that has `keys` properties copied from `options`.
   */
  _normalizeQS(options, ...keys) {
    let args = {};
    for (let key of keys) {
      if (options[key]) {
        args[key] = options[key];
      }
    }
    return args;
  }

  /**
   * @private
   * @param {Object} params
   * @param {...string} required
   * @throws Will throw an error if one of the required properties is undefined.
   * @description Check that all required properties are not undefined.
   */
  _requireParams(params, ...required) {
    for (let param of required) {
      if (params[param] === undefined) {
        throw new Error('`options` must include property `' + param + '`');
      }
    }
  }
}

const byType = type => o => o !== null && typeof o === type;

module.exports = exports = PublicClient;
