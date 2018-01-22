const { EventEmitter } = require('events');
const Websocket = require('ws');
const Utils = require('../utilities.js');
const { signRequest } = require('../../lib/request_signer');

/**
 * Create a new connection to a websocket feed
 * @param {String[]} [productIDs] - The GDAX products to listen to. Default: ['BTC-USD']
 * @param {String} [websocketURI] - Optional websocket URL. Default: The official GDAX feed.
 * @param {Object} [auth] - An optional object containing your API key details (key, secret & passphrase)
 */
class WebsocketClient extends EventEmitter {
  constructor(
    productIDs,
    websocketURI = 'wss://ws-feed.gdax.com',
    auth = null,
    { channels = null } = {}
  ) {
    super();
    this.productIDs = Utils.determineProductIDs(productIDs);
    this.websocketURI = websocketURI;
    this.auth = Utils.checkAuth(auth);
    this.channels = channels || ['full'];
    if (!this.channels.includes('heartbeat')) {
      this.channels.push('heartbeat');
    }
    this.connect();
  }

  connect() {
    if (this.socket) {
      this.socket.close();
    }

    this.socket = new Websocket(this.websocketURI);

    this.socket.on('message', this.onMessage.bind(this));
    this.socket.on('open', this.onOpen.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.socket.on('error', this.onError.bind(this));
  }

  disconnect() {
    if (!this.socket) {
      throw new Error('Could not disconnect (not connected)');
    }
    this.socket.close();
    this.socket = null;
  }

  _sendSubscription(type, { product_ids, channels }) {
    const message = { type };

    if (channels) {
      message.channels = channels;
    }

    if (product_ids) {
      message.product_ids = product_ids;
    }

    // Add Signature
    if (this.auth.secret) {
      const sig = signRequest(this.auth, 'GET', '/users/self/verify');
      Object.assign(message, sig);
    }

    this.socket.send(JSON.stringify(message));
  }

  subscribe({ product_ids, channels }) {
    this._sendSubscription('subscribe', { product_ids, channels });
  }

  unsubscribe({ product_ids, channels }) {
    this._sendSubscription('unsubscribe', { product_ids, channels });
  }

  onOpen() {
    this.emit('open');
    this.subscribe({ product_ids: this.productIDs, channels: this.channels });
  }

  onClose() {
    this.socket = null;
    this.emit('close');
  }

  onMessage(data) {
    const message = JSON.parse(data);
    if (message.type === 'error') {
      this.onError(message);
    } else {
      this.emit('message', message);
    }
  }

  onError(err) {
    if (!err) {
      return;
    }

    if (err.message === 'unexpected server response (429)') {
      throw new Error(
        'You are connecting too fast and are being throttled! Make sure you subscribe to multiple books on one connection.'
      );
    }

    this.emit('error', err);
  }
}

module.exports = exports = WebsocketClient;
