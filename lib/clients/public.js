const { Readable } = require('stream');
const superagent = require('superagent');
const agentUse = require('superagent-use');
const agentPrefix = require('superagent-prefix');
const Throttle = require('superagent-throttle');

const { GDAX_API_URI, GDAX_PUBLIC_RATE_LIMIT } = require('../constants');

const staticAgent = agentUse(superagent).use(agentPrefix(GDAX_API_URI)).use(
  new Throttle({
    rate: GDAX_PUBLIC_RATE_LIMIT,
    ratePer: 1000,
  }).plugin()
);

class PublicClient {
  constructor(
    productID = 'BTC-USD',
    apiURI = GDAX_API_URI,
    { rateLimit = GDAX_PUBLIC_RATE_LIMIT } = {}
  ) {
    this._productID = productID;
    this._API_LIMIT = 100;

    this._agent = agentUse(superagent).use(agentPrefix(apiURI)).use(
      new Throttle({
        rate: rateLimit,
        ratePer: 1000,
      }).plugin()
    );
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

  static getProductOrderBook(opts = {}, callback) {
    PublicClient._requireParams(opts, ['productID']);
    let { productID } = opts;
    delete opts.productID;

    return PublicClient._get({
      uri: `/products/${productID}/book`,
      queries: opts,
      callback,
    });
  }

  getProductOrderBook(opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }

    const productID = opts.productID || this._productID;
    delete opts.productID;

    return this._get({
      uri: `/products/${productID}/book`,
      queries: opts,
      callback,
    });
  }

  getProductTicker(callback) {
    return this._get({ uri: `/products/${this._productID}/ticker`, callback });
  }

  getProductTrades(opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    return this._get({
      uri: `/products/${this._productID}/trades`,
      queries: opts,
      callback,
    });
  }

  getProductTradeStream(tradesFrom, tradesTo) {
    let stopFn = () => false;

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

      this.getProductTrades(opts)
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

  getProductHistoricRates(opts = {}, callback) {
    if (!callback && typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    return this._get({
      uri: `/products/${this._productID}/candles`,
      queries: opts,
      callback,
    });
  }

  getProduct24HrStats(callback) {
    return this._get({ uri: `/products/${this._productID}/stats`, callback });
  }

  getCurrencies(callback) {
    return this._get({ uri: '/currencies', callback });
  }

  getTime(callback) {
    return this._get({ uri: '/time', callback });
  }
}

module.exports = exports = PublicClient;
