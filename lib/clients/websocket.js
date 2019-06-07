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
 * @description WebsocketClient.
 */
class WebsocketClient extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.sandbox] - If set to `true` WebsocketClient will use the sandbox endpoint.
   * @param {string} [options.api_uri] - Overrides the default apiuri, if provided.
   * @param {(string|string[])} [options.product_ids] - Product ID or an array of product IDs.
   * @param {(string|string[])} [options.channels] - Channel name or an array of channels.
   * @param {string} [options.key] - The Key.
   * @param {string} [options.secret] - The Secret.
   * @param {string} [options.passphrase] - The Passphrase.
   * @description Create WebsocketClient.
   */
  constructor(options = {}) {
    super();
    if (typeof options.channels === 'string') {
      options.channels = options.channels
        ? [options.channels]
        : DEFAULT_CHANNELS;
    }
    if (typeof options.product_ids === 'string') {
      options.product_ids = options.product_ids
        ? [options.product_ids]
        : [DEFAULT_PAIR];
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
  }

  /**
   * @description Connect to the websocket.
   * @throws Will throw an error if it is not disconnected.
   */
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

  /**
   * @description Disconnect from the websocket.
   * @throws Will throw an error if it is not connected.
   */
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

  /**
   * @param {(string[]|Object[])} channels - An array of channels.
   * @param {sting[]} [product_ids] - An array of product IDs.
   * @description Subscribes to the `channels`.
   */
  subscribe({ product_ids, channels }) {
    this._sendSubscription('subscribe', { product_ids, channels });
  }

  /**
   * @param {(string[]|Object[])} channels - An array of channels.
   * @param {sting[]} [product_ids] - An array of product IDs.
   * @description Unsubscribes from the `channels`.
   */
  unsubscribe({ product_ids, channels }) {
    this._sendSubscription('unsubscribe', { product_ids, channels });
  }

  onOpen() {
    this.emit('open');
    this.channels.push('heartbeat');
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
