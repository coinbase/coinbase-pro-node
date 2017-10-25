const request = require('request');
const { Readable } = require('stream');

class PublicClient {
  constructor(productID = 'BTC-USD', apiURI = 'https://api.gdax.com') {
    this.productID = productID;
    this.apiURI = apiURI;
    this.API_LIMIT = 100;
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
        'User-Agent': 'gdax-node-client',
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
      if (typeof callback === 'function') {
        callback(err, response, data);
        return;
      }
      if (err) {
        reject(err);
      }
      if (data === null) {
        reject(new Error('Response could not be parsed as JSON'));
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

  getProductOrderBook(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this.get(
      ['products', this.productID, 'book'],
      { qs: args },
      callback
    );
  }

  getProductTicker(callback) {
    return this.get(['products', this.productID, 'ticker'], callback);
  }

  getProductTrades(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }
    return this.get(
      ['products', this.productID, 'trades'],
      { qs: args },
      callback
    );
  }

  getProductTradeStream(tradesFrom, tradesTo) {
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
          tradesFrom + this.API_LIMIT,
          tradesTo,
          shouldStop
        );
      });
    }
  }

  getProductHistoricRates(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }
    return this.get(
      ['products', this.productID, 'candles'],
      { qs: args },
      callback
    );
  }

  getProduct24HrStats(callback) {
    return this.get(['products', this.productID, 'stats'], callback);
  }

  getCurrencies(callback) {
    return this.get(['currencies'], callback);
  }

  getTime(callback) {
    return this.get(['time'], callback);
  }
}

module.exports = exports = PublicClient;
