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
    this.productIDs = new Set(Utils.determineProductIDs(productIDs));
    this.websocketURI = websocketURI;
    this.auth = Utils.checkAuth(auth);
    this.channels = new Set(channels || ['full']);
    this.channels.add('heartbeat');
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

  _sendSubscription(
    type,
    productIDs = this.productIDs,
    channels = this.channels
  ) {
    const subscribeMessage = {
      type: type,
      channels: [...channels],
    };

    if (productIDs) {
      subscribeMessage.product_ids = [...productIDs];
    }

    // Add Signature
    if (this.auth.secret) {
      let sig = signRequest(this.auth, 'GET', '/users/self/verify');
      Object.assign(subscribeMessage, sig);
    }

    this.socket.send(JSON.stringify(subscribeMessage));
  }

  subscribeProduct(...productIDs) {
    productIDs.forEach(p => this.productIDs.add(p));

    this._sendSubscription('subscribe');
  }

  subscribeChannel(...channels) {
    channels.forEach(c => this.channels.add(c));

    this._sendSubscription('subscribe');
  }

  unsubscribeProduct(...productIDs) {
    productIDs.forEach(p => this.productIDs.delete(p));

    var channels = [...this.channels].map(c => ({
      name: c,
      product_ids: productIDs,
    }));

    this._sendSubscription('unsubscribe', null, channels);
  }

  unsubscribeChannel(...channels) {
    channels.forEach(c => this.channels.delete(c));

    this._sendSubscription('unsubscribe', null, channels);
  }

  onOpen() {
    this.emit('open');

    this._sendSubscription('subscribe');
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
