/**
 > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 > SOFTWARE.
 */

/* eslint camelcase: ["error", {properties: "never"}] */

'use strict';

const isNode = require('detect-node');
const queryString = require('querystring');
const async = require('async');
/**
 * @ignore
 * @type {PublicClient}
 */
const PublicClient = require('./public.js');

const _ = {
  'forEach': require('lodash.foreach'),
};

let request = isNode ? require('request') : require('browser-request');
let crypto = isNode ? require('crypto') : require('crypto-browserify');

/**
 * Authenticated Client
 */
class AuthenticatedClient extends PublicClient {
  /**
   * Create new Authenticated Client
   * @param {string} key super secret key
   * @param {string} b64secret super secret
   * @param {string} passphrase super secret password
   * @param {string} apiURI URi of the webservice
   */
  constructor(key, b64secret, passphrase, apiURI) {
    super('', apiURI);
    this.key = key;
    this.b64secret = b64secret;
    this.passphrase = passphrase;
  }

  /**
   * Get request
   * @param {...object} args The arguments to send
   */
  get(...args) {
    this.request('get', ...args);
  }

  /**
   * Post request
   * @param {...object} args The arguments to send
   */
  post(...args) {
    this.request('post', ...args);
  }

  /**
   * Put request
   * @param {...object} args The arguments to send
   */
  put(...args) {
    this.request('put', ...args);
  }

  /**
   * Delete request
   * @param {...object} args The arguments to send
   */
  delete(...args) {
    this.request('delete', ...args);
  }

  /**
   * Request
   * @param {string} method Which type of request
   * @param {array|string} uriParts A route or collection of routes
   * @param {object|function} opts The options for this request
   * @param {function|null} callback Callback function
   */
  request(method, uriParts, opts, callback) {
    opts = opts || {};
    if (!callback && (typeof opts === 'function')) {
      callback = opts;
      opts = {};
    }

    if (!callback) {
      throw new Error('Must supply a callback');
    }
    let relativeURI = this.makeRelativeURI(uriParts);
    method = method.toUpperCase();

    Object.assign(opts, {
      'method': method,
      'uri': this.makeAbsoluteURI(relativeURI),
    });

    this.addHeaders(opts, this._getSignature(method, relativeURI, opts));
    request(opts, this.makeRequestCallback(callback));
  }

  /**
   * _getSignature
   * @param {string} method Type of request
   * @param {string} relativeURI URI for resource
   * @param {object} opts Options
   * @return {object} The Signature
   * @private
   */
  _getSignature(method, relativeURI, opts) {
    let body = '';

    if (opts.body) {
      body = JSON.stringify(opts.body);
      opts.body = body;
    } else if (opts.qs && Object.keys(opts.qs).length !== 0) {
      body = '?' + queryString.stringify(opts.qs);
    }
    let timestamp = Date.now() / 1000;
    let what = timestamp + method + relativeURI + body;
    let key = new Buffer(this.b64secret, 'base64');
    let hmac = crypto.createHmac('sha256', key);
    let signature = hmac.update(what).digest('base64');
    return {
      'CB-ACCESS-KEY': this.key,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-PASSPHRASE': this.passphrase,
    };
  }

  /**
   * getAccounts
   * @param {function} callback The callback function
   * @return {Object} The Response
   */
  getAccounts(callback) {
    return this.get('accounts', callback);
  };

  /**
   * getAccount
   * @param {string} accountID The Account
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getAccount(accountID, callback) {
    return this.get(['accounts', accountID], callback);
  }

  /**
   * getAccountHistory
   * @param {string} accountID The Account
   * @param {object|function} args The args or callback
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getAccountHistory(accountID, args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get(['accounts', accountID, 'ledger'], opts, callback);
  }

  /**
   * getAccountHolds
   * @param {string} accountID The Account
   * @param {object|function} args The args or callback
   * @param {function} callback The callback function
   * @return {object} The Response
   */
  getAccountHolds(accountID, args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get(['accounts', accountID, 'holds'], opts, callback);
  }

  /**
   * placeOrder
   * @param {object} params The options for this order
   * @param {function} callback The callback function
   * @return {object} The Response
   * @private
   */
  _placeOrder(params, callback) {
    let requiredParams = ['size', 'side', 'product_id'];

    if (params.type !== 'market') {
      requiredParams.push('price');
    }

    _.forEach(requiredParams, (param) => {
      if (params[param] === undefined) {
        throw new Error(`"opts" must include param "${param}"`);
      }
    });
    let opts = {'body': params};
    return this.post('orders', opts, callback);
  }

  /**
   * buy
   * @param {object} params The buy parameters
   * @param {function} callback The callback function
   * @return {object} Response from order
   */
  buy(params, callback) {
    params.side = 'buy';
    return this._placeOrder(params, callback);
  }

  /**
   * sell
   * @param {object} params The sell parameters
   * @param {function} callback The callback function
   * @return {object} Response from order
   */
  sell(params, callback) {
    params.side = 'sell';
    return this._placeOrder(params, callback);
  }

  /**
   * cancelOrder
   * @param {string|function} orderID The order or callback
   * @param {function|null} callback The callback function
   * @return {object} Response from delete
   */
  cancelOrder(orderID, callback) {
    if (!callback && (typeof orderID === 'function')) {
      callback = orderID;
      callback(new Error('must provide an orderID or consider cancelOrders'));
      return;
    }

    return this.delete(['orders', orderID], callback);
  }

  /**
   * cancelOrders
   * @param {function} callback The callback function
   * @return {object} Response from delete
   */
  cancelOrders(callback) {
    return this.delete('orders', callback);
  }

  /**
   * getProductOrderBook
   * temp over ride public call to get Product OrderBook
   * @param {object|function} args The args or callback
   * @param {string} productId The Product to get
   * @param {function|null} callback The callback function
   * @return {OrderBook} The Products order Book
   */
  getProductOrderBook(args, productId, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get(['products', productId, 'book'], opts, callback);
  }

  /**
   * cancelAllOrders
   * @param {object|function} args The args or callback
   * @param {function} callback The callback function
   */
  cancelAllOrders(args, callback) {
    let currentDeletedOrders = [];
    let totalDeletedOrders = [];
    let query = true;
    let response;

    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};

    /**
     * deleteOrders
     * @param {function} done The callback function
     */
    const deleteOrders = (done) => {
      this.delete('orders', opts, (err, resp, data) => {
        if (err) {
          done(err);
          return;
        }

        if ((resp && resp.statusCode != 200) || !data) {
          let err = new Error('Failed to cancel all orders');
          query = false;
          done(err);
          return;
        }

        currentDeletedOrders = data;
        totalDeletedOrders = totalDeletedOrders.concat(currentDeletedOrders);
        response = resp;

        done();
      });
    };

    async.doWhilst(
      deleteOrders,
      untilEmpty,
      completed
    );

    /**
     * untilEmpty
     * @return {boolean} Filter check for empty
     */
    function untilEmpty() {
      return (currentDeletedOrders.length > 0 && query);
    }

    /**
     * Completed
     * @param {error} err The Error
     */
    function completed(err) {
      callback(err, response, totalDeletedOrders);
    }
  }

  /**
   * getOrders
   * @param {object|function} args The args or Callback
   * @param {function|null} callback The callback function
   * @return {object} The Orders
   */
  getOrders(args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get('orders', opts, callback);
  }

  /**
   * getOrder by OrderId
   * @param {string|function} orderID The OrderId or Callback
   * @param {function|null} callback The Callback function
   * @return {object} The Order
   */
  getOrder(orderID, callback) {
    if (!callback && (typeof orderID === 'function')) {
      callback = orderID;
      callback(new Error('must provide an orderID or consider getOrders'));
      return;
    }

    return this.get(['orders', orderID], callback);
  }

  /**
   * getFills
   * @param {object|function} args Arguments or Callback
   * @param {function|null} callback A callback Function
   * @return {object} The fills
   */
  getFills(args, callback) {
    args = args || {};
    if (!callback && (typeof args === 'function')) {
      callback = args;
      args = {};
    }

    let opts = {'qs': args};
    return this.get('fills', opts, callback);
  }

  /**
   * deposit
   * @param {object} params A list of parameters
   * @param {function} callback The callback function
   * @return {object} Response from post
   */
  deposit(params, callback) {
    params.type = 'deposit';
    return this._transferFunds(params, callback);
  }

  /**
   * withdraw
   * @param {object} params A list of Parameters
   * @param {function} callback A callback function
   * @return {object} Response from post
   */
  withdraw(params, callback) {
    params.type = 'withdraw';
    return this._transferFunds(params, callback);
  }

  /**
   * transferFunds
   * @param {object} params A list of parameters
   * @param {function} callback A Callback Function
   * @return {object} The request response
   * @private
   */
  _transferFunds(params, callback) {
    _.forEach(['type', 'amount', 'coinbase_account_id'], (param) => {
      if (params[param] === undefined) {
        throw new Error(`"opts" must include param "${param}"`);
      }
    });
    let opts = {'body': params};
    return this.post('transfers', opts, callback);
  }
}

module.exports = AuthenticatedClient;
