const { EventEmitter } = require('events');
const Websocket = require('ws');
const { signRequest } = require('../request_signer');
const {
  EXCHANGE_WS_URL,
  SANDBOX_WS_URL,
  DEFAULT_PAIR,
  DEFAULT_CHANNELS,
} = require('../utilities');

/**
 * Create a new connection to a websocket feed
 * @param {String[]} [productIDs] - The Coinbase Pro products to listen to. Default: ['BTC-USD']
 * @param {String} [websocketURI] - Optional websocket URL. Default: The official Coinbase Pro feed.
 * @param {Object} [auth] - An optional object containing your API key details (key, secret & passphrase)
 */
class WebsocketClient extends EventEmitter {
  constructor(options = {}) {
    super();
    if (typeof options.channels === 'string') {
      options.channels = [options.channels];
    }
    if (typeof options.product_ids === 'string') {
      options.product_ids = [options.product_ids];
    }
    this.productIDs =
      options.product_ids && options.product_ids.length
        ? options.product_ids
        : [DEFAULT_PAIR];
    this.sandbox = options.sandbox;
    this.websocketURI = options.api_uri
      ? options.api_uri
      : this.sandbox
      ? SANDBOX_WS_URL
      : EXCHANGE_WS_URL;
    this.channels =
      options.channels && options.channels.length
        ? options.channels
        : DEFAULT_CHANNELS;
    if (options.key && options.secret && options.passphrase) {
      this.key = options.key;
      this.secret = options.secret;
      this.passphrase = options.passphrase;
    }
    this.connect();
  }

  connect() {
    if (
      this.socket &&
      (this.socket.readyState !== Websocket.CLOSED &&
        this.socket.readyState !== Websocket.CLOSING)
    ) {
      throw new Error('Could not connect (not disconnected)');
    }

    this.socket = new Websocket(this.websocketURI);

    this.socket.on('message', this.onMessage.bind(this));
    this.socket.on('open', this.onOpen.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.socket.on('error', this.onError.bind(this));
  }

  disconnect() {
    if (!this.socket || this.socket.readyState !== Websocket.OPEN) {
      throw new Error('Could not disconnect (not connected)');
    }
    this.socket.close();
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
    if (this.key) {
      let sig = signRequest(
        {
          key: this.key,
          secret: this.secret,
          passphrase: this.passphrase,
        },
        'GET',
        '/users/self/verify'
      );
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
