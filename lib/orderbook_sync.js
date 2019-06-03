const WebsocketClient = require('./clients/websocket.js');
const AuthenticatedClient = require('./clients/authenticated.js');
const PublicClient = require('./clients/public.js');
const Orderbook = require('./orderbook.js');

/**
 * @description OrderbookSync.
 */
class OrderbookSync extends WebsocketClient {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.sandbox] - If set to `true` WebsocketClient will use the sandbox endpoint.
   * @param {(string|string[])} [options.product_ids] - Product ID or an array of product IDs.
   * @param {string} [options.api_uri] - Overrides the default apiuri, if provided.
   * @param {string} [options.key] - The Key.
   * @param {string} [options.secret] - The Secret.
   * @param {string} [options.passphrase] - The Passphrase.
   * @description Create OrderbookSync.
   */
  constructor(options) {
    super(options);
    this._queues = {}; // []
    this._sequences = {}; // -1
    this.books = {};

    if (this.key) {
      this._client = new AuthenticatedClient({
        key: this.key,
        secret: this.secret,
        passphrase: this.passphrase,
        sandbox: this.sandbox,
      });
    } else {
      this._client = new PublicClient({
        sandbox: this.sandbox,
      });
    }

    this.productIDs.forEach(this._newProduct, this);

    this.on('message', this.processMessage.bind(this));
  }

  _newProduct(productID) {
    this._queues[productID] = [];
    this._sequences[productID] = -2;
    this.books[productID] = new Orderbook();
  }

  loadOrderbook(productID) {
    if (!this.books[productID]) {
      return;
    }

    this.emit('sync', productID);

    this._queues[productID] = [];
    this._sequences[productID] = -1;

    const process = data => {
      this.books[productID].state(data);

      this._sequences[productID] = data.sequence;
      this._queues[productID].forEach(this.processMessage, this);
      this._queues[productID] = [];

      this.emit('synced', productID);
    };

    const problems = err => {
      err = err && (err.message || err);
      this.emit('error', new Error('Failed to load orderbook: ' + err));
    };

    this._client
      .getProductOrderBook({ product_id: productID, level: 3 })
      .then(process)
      .catch(problems);
  }

  // subscriptions changed -- possible new products
  _newSubscription(data) {
    const channel = data.channels.find(c => c.name === 'full');
    channel &&
      channel.product_ids
        .filter(productID => !(productID in this.books))
        .forEach(this._newProduct, this);
  }

  processMessage(data) {
    const { type, product_id } = data;

    if (type === 'subscriptions') {
      this._newSubscription(data);
      return;
    }

    if (this._sequences[product_id] < 0) {
      // Orderbook snapshot not loaded yet
      this._queues[product_id].push(data);
    }

    if (this._sequences[product_id] === -2) {
      // Start first sync
      this.loadOrderbook(product_id);
      return;
    }

    if (this._sequences[product_id] === -1) {
      // Resync is in process
      return;
    }

    if (data.sequence <= this._sequences[product_id]) {
      // Skip this one, since it was already processed
      return;
    }

    if (data.sequence !== this._sequences[product_id] + 1) {
      // Dropped a message, start a resync process
      this.loadOrderbook(product_id);
      return;
    }

    this._sequences[product_id] = data.sequence;
    const book = this.books[product_id];

    switch (type) {
      case 'open':
        book.add(data);
        break;

      case 'done':
        book.remove(data.order_id);
        break;

      case 'match':
        book.match(data);
        break;

      case 'change':
        book.change(data);
        break;
    }
  }
}

module.exports = exports = OrderbookSync;
