const request = require('request');
const { Readable } = require('stream');
const {
  DEFAULT_TIMEOUT,
  API_LIMIT,
  PAGE_ARGS,
} = require('../utilities');
class PublicClient {
  constructor(apiURI = 'https://api.pro.coinbase.com', options = {}) {
    this.productID = 'BTC-USD';
    if (apiURI && !apiURI.startsWith('http')) {
      process.emitWarning(
        '`new PublicClient()` no longer accepts a product ID as the first argument. ',
        'DeprecationWarning'
      );
      this.productID = apiURI;
      apiURI = arguments[1] || 'https://api.pro.coinbase.com';
    }

    this.apiURI = apiURI;
    this.API_LIMIT = 100;
    this.timeout = +options.timeout > 0 ? options.timeout : DEFAULT_TIMEOUT;
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

  getProducts(callback) {
    return this.get(['products'], callback);
  }

  getProductOrderBook(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'book'],
      { qs: this._normalizeQS(options, 'level') },
      callback
    );
  }

  getProductTicker(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'ticker'],
      callback
    );
  }

  getProductTrades(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'trades'],
      { qs: this._normalizeQS(options, ...PAGE_ARGS) },
      callback
    );
  }

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

  getProductHistoricRates(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);
    this._requireParams(options, 'granularity');

    return this.get(
      ['products', options.product_id || this.productID, 'candles'],
      { qs: this._normalizeQS(options, 'start', 'end', 'granularity') },
      callback
    );
  }

  getProduct24HrStats(options, callback) {
    [options, callback] = this._normalizeParams(options, callback);

    return this.get(
      ['products', options.product_id || this.productID, 'stats'],
      callback
    );
  }

  getCurrencies(callback) {
    return this.get(['currencies'], callback);
  }

  getTime(callback) {
    return this.get(['time'], callback);
  }

  _normalizeParams(options, callback) {
    callback = [callback, options].find(byType('function'));
    options = [options, {}].find(byType('object'));
    return [options, callback];
  }

  _normalizeQS(options, ...keys) {
    let args = {};
    for (let key of keys) {
      if (options[key]) {
        args[key] = options[key];
      }
    }
    return args;
  }

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
