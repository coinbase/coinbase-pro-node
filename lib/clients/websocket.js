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
    { heartbeat = false, channels = null } = {}
  ) {
    super();
    this.productIDs = Utils.determineProductIDs(productIDs);
    this.websocketURI = websocketURI;
    if (auth && !(auth.secret && auth.key && auth.passphrase)) {
      throw new Error(
        'Invalid or incomplete authentication credentials. You should either provide all of the secret, key and passphrase fields, or leave auth null'
      );
    }
    this.channels = channels;
    this.auth = auth || {};
    this.heartbeat = heartbeat;
    this.connect();
  }

  connect() {
    if (this.socket) {
      clearInterval(this.pinger);
      this.socket.close();
    }

    this.socket = new Websocket(this.websocketURI);

    this.socket.on('message', this.onMessage.bind(this));
    this.socket.on('open', this.onOpen.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.socket.on('error', this.onError.bind(this));
  }

  disconnect() {
    clearInterval(this.pinger);

    if (!this.socket) {
      throw new Error('Could not disconnect (not connected)');
    }
    this.socket.close();
    this.socket = null;
  }

  onOpen() {
    this.emit('open');

    const subscribeMessage = {
      type: 'subscribe',
      product_ids: this.productIDs,
    };

    if (this.channels) {
      subscribeMessage.channels = this.channels;
    }

    // Add Signature
    if (this.auth.secret) {
      let sig = signRequest(
        this.auth,
        'GET',
        this.channels ? '/users/self/verify' : '/users/self'
      );
      Object.assign(subscribeMessage, sig);
    }

    this.socket.send(JSON.stringify(subscribeMessage));

    if (this.heartbeat) {
      // send heartbeat
      const heartbeatMessage = {
        type: 'heartbeat',
        on: true,
      };
      this.socket.send(JSON.stringify(heartbeatMessage));
    } else {
      // Set a 30 second ping to keep connection alive
      this.pinger = setInterval(() => {
        if (this.socket) {
          this.socket.ping('keepalive');
        }
      }, 30000);
    }
  }

  onClose() {
    clearInterval(this.pinger);
    this.socket = null;
    this.emit('close');
  }

  onMessage(data) {
    this.emit('message', JSON.parse(data));
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
