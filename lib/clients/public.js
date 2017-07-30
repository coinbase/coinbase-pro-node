const { Readable } = require('stream');
const superagent = require('superagent');
const agentUse = require('superagent-use');
const agentPrefix = require('superagent-prefix');
const Throttle = require('superagent-throttle');

class PublicClient {
  constructor(
    productID = 'BTC-USD',
    apiURI = 'https://api.gdax.com',
    { rateLimit = 3 } = {}
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

  _get(args) {
    return this._request(Object.assign({ method: 'get' }, args));
  }
  _put(args) {
    return this._request(Object.assign({ method: 'put' }, args));
  }
  _post(args) {
    return this._request(Object.assign({ method: 'post' }, args));
  }
  _delete(args) {
    return this._request(Object.assign({ method: 'delete' }, args));
  }

  _requestParamsToObj(...args) {
    if (args.length === 1 && typeof args[0] === 'object') {
      return args[0];
    }

    let obj = {};
    ['uri', 'queries', 'headers', 'body', 'callback'].forEach((param, i) => {
      obj[param] = args[i];
    });
    return obj;
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

  getProducts(callback) {
    return this._get({ uri: '/products', callback });
  }

  getProductOrderBook(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }

    return this._get({
      uri: `/products/${this._productID}/book`,
      queries: args,
      callback,
    });
  }

  getProductTicker(callback) {
    return this._get({ uri: `/products/${this._productID}/ticker`, callback });
  }

  getProductTrades(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }
    return this._get({
      uri: `/products/${this._productID}/trades`,
      queries: args,
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

  getProductHistoricRates(args = {}, callback) {
    if (!callback && typeof args === 'function') {
      callback = args;
      args = {};
    }
    return this._get({
      uri: `/products/${this._productID}/candles`,
      queries: args,
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
