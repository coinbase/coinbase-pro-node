const WebsocketClient = require('./clients/websocket.js');
const AuthenticatedClient = require('./clients/authenticated.js');
const PublicClient = require('./clients/public.js');
const Orderbook = require('./orderbook.js');
const Utils = require('./utilities.js');

const { GDAX_WEBSOCKET_URI } = require('./constants');

// Orderbook syncing
class OrderbookSync extends WebsocketClient {
  constructor(
    productIDs,
    apiURI = GDAX_API_URI,
    websocketURI = GDAX_WEBSOCKET_URI,
    auth = null
  ) {
    super(productIDs, websocketURI, auth);
    this.apiURI = apiURI;
    this.auth = Utils.checkAuth(auth);

    this._queues = {}; // []
    this._sequences = {}; // -1
    this.books = {};

    if (this.auth.secret) {
      this._client = new AuthenticatedClient(
        this.auth.key,
        this.auth.secret,
        this.auth.passphrase,
        this.apiURI
      );
    } else {
      this._client = new PublicClient(this.apiURI);
    }

    this.productIDs.forEach(productID => {
      this._queues[productID] = [];
      this._sequences[productID] = -2;
      this.books[productID] = new Orderbook();
    });
  }

  onMessage(data) {
    data = JSON.parse(data);
    this.emit('message', data);

    const { product_id } = data;

    if (this._sequences[product_id] < 0) {
      // Orderbook snapshot not loaded yet
      this._queues[product_id].push(data);

      if (this._sequences[product_id] === -2) {
        // Start first resync
        this._sequences[product_id] = -1;
        this.loadOrderbook(product_id);
      }
    } else {
      this.processMessage(data);
    }
  }

  loadOrderbook(productID, opts = {}) {
    if (!this.books[productID]) {
      return;
    }

    this._client
      .getProductOrderBook(productID, { level: 3 })
      .then(onData.bind(this))
      .catch(onError.bind(this));

    const onData = data => {
      this.books[productID].state(data);
      this._sequences[productID] = data.sequence;
      this._queues[productID].forEach(message => this._processMessage(message));
      this._queues[productID] = [];
    };

    const onError = err => {
      err = err ? (err.message ? err.message : err) : '';
      this.emit('error', new Error('Failed to load orderbook: ' + err));
    };

    this._client.getProductOrderBook(opts).then(onData).catch(onError);
  }

  _processMessage(data) {
    const { product_id } = data;

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
      this._queues[product_id] = [];
      this._sequences[product_id] = -1;

      this.loadOrderbook(product_id);
      return;
    }

    this._sequences[product_id] = data.sequence;
    const book = this.books[product_id];

    switch (data.type) {
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
