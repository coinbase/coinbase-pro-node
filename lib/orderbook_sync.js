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

const WebSocketClient = require('./clients/websocket.js');
const PublicClient = require('./clients/public.js');
const OrderBook = require('./orderbook.js');

let _ = {
  forEach: require('lodash.foreach'),
};

/**
 *
 * @type {OrderBookSync}
 */
class OrderBookSync extends WebSocketClient {
  /**
   * OrderBookSync constructor
   * @param {string} productID The product
   * @param {string} apiURI URI for api resource
   * @param {string} websocketURI URI for socket resource
   * @param {AuthenticatedClient} authenticatedClient A authorized client
   */
  constructor(productID, apiURI, websocketURI, authenticatedClient) {
    super();
    this.productID = productID || 'BTC-USD';
    this.apiURI = apiURI || 'https://api.gdax.com';
    this.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
    this.authenticatedClient = authenticatedClient;

    this._queue = [];
    this._sequence = -1;
    this.loadOrderBook();
  }

  /**
   * onMessage
   * @param {object} data The Response
   */
  onMessage(data) {
    data = JSON.parse(data.data);

    if (this._sequence === -1) {
      // OrderBook snapshot not loaded yet
      this._queue.push(data);
    } else {
      this.processMessage(data);
    }
  };

  /**
   * loadOrderBook
   */
  loadOrderBook() {
    let bookLevel = 3;
    let args = {'level': bookLevel};

    this.book = new OrderBook();

    const cb = (err, response, body) => {
      if (err) throw new Error(`Failed to load orderbook: ${err}`);

      if (response.statusCode !== 200)
        throw new Error(`Failed to load orderbook: ${response.statusCode}`);

      let data = JSON.parse(response.body);
      this.book.state(data);
      this._sequence = data.sequence;
      _.forEach(this._queue, (data) => this.processMessage(data));
      this._queue = [];
    };

    if (this.authenticatedClient) {
      this.authenticatedClient.getProductOrderBook(args, this.productID, cb);
    } else {
      if (!this.publicClient) {
        this.publicClient = new PublicClient(this.productID, this.apiURI);
      }
      this.publicClient.getProductOrderBook(args, cb);
    }
  };

  /**
   * processMessage
   * @param {object} data A Response
   */
  processMessage(data) {
    if (this._sequence == -1) {
      // Resync is in process
      return;
    }
    if (data.sequence <= this._sequence) {
      // Skip this one, since it was already processed
      return;
    }

    if (data.sequence != this._sequence + 1) {
      // Dropped a message, start a resync process
      this._queue = [];
      this._sequence = -1;

      this.loadOrderBook();
      return;
    }

    this._sequence = data.sequence;

    switch (data.type) {
      case 'open':
        this.book.add(data);
        break;

      case 'done':
        this.book.remove(data.order_id);
        break;

      case 'match':
        this.book.match(data);
        break;

      case 'change':
        this.book.change(data);
        break;
    }
  }
}

module.exports = OrderBookSync;
