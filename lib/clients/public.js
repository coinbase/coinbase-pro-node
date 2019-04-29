const request = require('request');
const { Readable } = require('stream');
const DEFAULT_TIMEOUT = 10 * 1000; // 10 sec

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

  makeRelativeURI(parts) {
    return '/' + parts.join('/');
  }

  makeAbsoluteURI(relativeURI) {
    return this.apiURI + relativeURI;
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

  request(method, uriParts, opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    Object.assign(opts, {
      method: method.toUpperCase(),
      uri: this.makeAbsoluteURI(this.makeRelativeURI(uriParts)),
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

  getProductOrderBook(productID, args, callback) {
    [productID, args, callback] = this._normalizeProductArgs(
      productID,
      args,
      callback,
      'getProductOrderBook'
    );

    const path = ['products', productID, 'book'];
    return this.get(path, { qs: args }, callback);
  }

  getProductTicker(productID, callback) {
    [productID, , callback] = this._normalizeProductArgs(
      productID,
      null,
      callback,
      'getProductTicker'
    );

    const path = ['products', productID, 'ticker'];
    return this.get(path, callback);
  }

  getProductTrades(productID, args, callback) {
    [productID, args, callback] = this._normalizeProductArgs(
      productID,
      args,
      callback,
      'getProductTrades'
    );

    const path = ['products', productID, 'trades'];
    return this.get(path, { qs: args }, callback);
  }

  getProductTradeStream(productID, tradesFrom, tradesTo) {
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
      shouldStop = tradesTo;
      tradesTo = null;
    }

    const rs = new Readable({ objectMode: true });
    let started = false;

    rs._read = () => {
      if (!started) {
        started = true;
        fetchTrades.call(this, rs, tradesFrom, tradesTo, shouldStop, 0);
      }
    };

    return rs;

    function fetchTrades(stream, tradesFrom, tradesTo, shouldStop) {
      let after = tradesFrom + this.API_LIMIT + 1;
      let loop = true;

      if (tradesTo && tradesTo <= after) {
        after = tradesTo;
        loop = false;
      }

      let opts = { before: tradesFrom, after: after, limit: this.API_LIMIT };

      this.getProductTrades(productID, opts, (err, resp, data) => {
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
          tradesFrom + this.API_LIMIT,
          tradesTo,
          shouldStop
        );
      });
    }
  }

  getProductHistoricRates(productID, args, callback) {
    [productID, args, callback] = this._normalizeProductArgs(
      productID,
      args,
      callback,
      'getProductHistoricRates'
    );

    const path = ['products', productID, 'candles'];
    return this.get(path, { qs: args }, callback);
  }

  getProduct24HrStats(productID, callback) {
    [productID, , callback] = this._normalizeProductArgs(
      productID,
      null,
      callback,
      'getProduct24HrStats'
    );

    const path = ['products', productID, 'stats'];
    return this.get(path, callback);
  }

  getCurrencies(callback) {
    return this.get(['currencies'], callback);
  }

  getTime(callback) {
    return this.get(['time'], callback);
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
