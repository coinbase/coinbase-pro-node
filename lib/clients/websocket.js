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

/**
 * Event model
 * @ignore
 */
const EventEmitter = require('eventemitter2').EventEmitter2;
const isNode = require('detect-node');
const WebSockets = require('websocket');

/**
 * WebSocket Client
 */
class WebSocketClient extends EventEmitter {
  /**
   * Create WebSocket Client
   * @param {string} productID The Product
   * @param {string} websocketURI URI to the websocket resource
   */
  constructor(productID, websocketURI) {
    super();
    this.productID = productID || 'BTC-USD';
    this.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
    this.connect();
  }

  /**
   * connect
   */
  connect() {
    if (this.socket) {
      this.socket.close();
    }

    let WSClient = isNode ? WebSockets.client : WebSockets.w3cwebsocket;
    this.socket = new WSClient(this.websocketURI);
    this.socket.onmessage = (...args) => this.onMessage(...args);
    this.socket.onopen = (...args) => this.onOpen(...args);
    this.socket.onclose = (...args) => this.onClose(...args);
  };

  /**
   * disconnect
   */
  disconnect() {
    if (!this.socket) {
      throw new Error('Could not disconnect (not connected)');
    }

    this.socket.close();
  }

  /**
   * onOpen
   */
  onOpen() {
    this.emit('open');
    // noinspection Eslint
    let subscribeMessage = {
      type: 'subscribe',
      product_id: this.productID,
    };
    this.socket.send(JSON.stringify(subscribeMessage));

    // Set a 30 second ping to keep connection alive
    this.pinger = setInterval(() => {
      if (typeof this.socket.ping !== 'undefined')
        this.socket.ping('keepalive');
    }, 30000);
  }

  /**
   * onClose
   */
  onClose() {
    clearInterval(this.pinger);
    this.socket = null;
    this.emit('close');
  }

  /**
   * onMessage
   * @param {object} data A Response
   */
  onMessage(data) {
    this.emit('message', JSON.parse(data.data));
  }

}

module.exports = WebSocketClient;
