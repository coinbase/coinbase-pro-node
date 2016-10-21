/**
 > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 > SOFTWARE.
 */

'use strict';

const isNode = require('detect-node');
const request = isNode ? require('request') : require('browser-request');
const Readable = require('stream').Readable;

const API_LIMIT = 100;

/**
 * PublicClient
 */
class PublicClient {
  /**
   * Create new Public Client
   * @param {string} productID The Product
   * @param {string} apiURI URI of the resource
   */
  constructor(productID, apiURI) {
    this.productID = productID || 'BTC-USD';
    this.apiURI = apiURI || 'https://api.gdax.com';
  }

  /**
   * get
   * @param {...object} args The arguments
   */
  get(...args) {
    this.request('get', ...args);
  }

  /**
   * post
   * @param {...object} args The arguments
   */
  post(...args) {
    this.request('post', ...args);
  }

  /**
   * put
   * @param {...object} args The arguments
   */
  put(...args) {
    this.request('put', ...args);
  }

  /**
   * delete
   * @param {...object} args The arguments
   */
  delete(...args) {
    this.request('delete', ...args);
  }

  /**
   * addHeaders
   * @param {object} obj The headers to add
   * @param {object} additional Extra headers
   * @return {object} The header object
   */
  addHeaders(obj, additional) {
    obj.headers = obj.headers || {};
    return Object.assign(obj.headers, {
      'User-Agent': 'gdax-node-client',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }, additional);
  }

  /**
   * makeRelativeURI
   * @param {array|string} parts The URI parts
   * @return {string} Joined parts
   */
  makeRelativeURI(parts) {
    if (!Array.isArray(parts)) parts = [parts];
    return `/${parts.join('/')}`;
  }

  /**
   * makeAbsoluteURI
   * @param {string} relativeURI A relative path
   * @return {string} The Absolute path
   */
  makeAbsoluteURI(relativeURI) {
    return `${this.apiURI}${relativeURI}`;
  }

  /**
   * makeRequestCallback
   * @param {function} callback The callback function
   * @return {function} A callback function
   */
  makeRequestCallback(callback) {
    return (err, response, data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = null;
      }
      callback(err, response, data);
    };
  }

  /**
   * request
   * @param {string} method Type of Request
   * @param {array|string} uriParts URI array or string
   * @param {object|function} opts The options or callback
   * @param {function|null} callback The callback function
   */
  request(method, uriParts, opts, callback) {
    opts = opts || {};
    if (!callback && (typeof opts === 'function')) {
      callback = opts;
      opts = {};
    }
    if (!callback) {
      throw new Error('Must supply a callback.');
    }
    Object.assign(opts, {
      'method': method.toUpperCase(),
      'uri': this.makeAbsoluteURI(this.makeRelativeURI(uriParts)),
    });
    this.addHeaders(opts);
    request(opts, this.makeRequestCallback(callback));
  }

  /**
   * getProducts
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getProducts(callback) {
    return this.get('products', callback);
  }

  /**
   * getProductOrderBook
   * @param {object|function} args The args or callback
   * @param {function|null} callback The callback function
   * @return {object} The Response
   */
  getProductOrderBook(args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get(['products', this.productID, 'book'], opts, callback);
  }

  /**
   * getProductTicker
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getProductTicker(callback) {
    return this.get(['products', this.productID, 'ticker'], callback);
  }

  /**
   * getProductTrades
   * @param {object|function} args The args or callback
   * @param {function|null} callback The callback function
   * @return {object} The Response
   */
  getProductTrades(args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get(['products', this.productID, 'trades'], opts, callback);
  }

  /**
   * getProductTradeStream
   * @param {number} tradesFrom Number of Trades from
   * @param {number|function} tradesTo Number of Trades to or callback
   * @return {object} Stream of trades
   */
  getProductTradeStream(tradesFrom, tradesTo) {
    let shouldStop = null;

    if (typeof tradesTo === 'function') {
      shouldStop = tradesTo;
      tradesTo = null;
    }

    let rs = new Readable({objectMode: true});
    let started = false;

    rs._read = () => {
      if (!started) {
        started = true;
        this.fetchTrades(this, rs, tradesFrom, tradesTo, shouldStop, 0);
      }
    };

    return rs;
  }

  /**
   * fetchTrades
   * @param {object} ctx The context
   * @param {object} stream The Stream
   * @param {number} tradesFrom Number of trades from
   * @param {number} tradesTo Number of trades to
   * @param {boolean|function} shouldStop Should it stop
   */
  fetchTrades(ctx, stream, tradesFrom, tradesTo, shouldStop) {
    let after = tradesFrom + API_LIMIT + 1;
    let loop = true;

    if (tradesTo && tradesTo <= after) {
      after = tradesTo;
      loop = false;
    }

    let opts = {before: tradesFrom, after: after, limit: API_LIMIT};

    this.getProductTrades(opts, (err, resp, data) => {
      if (err) {
        stream.emit('error', err);
        return;
      }

      if (resp.statusCode === 429) {
        // rate-limited, try again
        setTimeout(() => {
          this.fetchTrades(ctx, stream, tradesFrom, tradesTo, shouldStop);
        }, 900);
        return;
      }

      if (resp.statusCode !== 200) {
        stream.emit('error',
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

      if (!loop) {
        stream.push(null);
        return;
      }
      let currentFrom = tradesFrom + API_LIMIT;
      this.fetchTrades(ctx, stream, currentFrom, tradesTo, shouldStop);
    });
  }

  /**
   * getProductHistoricRates
   * @param {object|function} args The args or callback
   * @param {function|null} callback The callback function
   * @return {object} The Response
   */
  getProductHistoricRates(args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get(['products', this.productID, 'candles'], opts, callback);
  }

  /**
   * getProduct24HrStats
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getProduct24HrStats(callback) {
    return this.get(['products', this.productID, 'stats'], callback);
  }

  /**
   * getCurrencies
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getCurrencies(callback) {
    return this.get('currencies', callback);
  }

  /**
   * getTime
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getTime(callback) {
    return this.get('time', callback);
  }
}

module.exports = PublicClient;
