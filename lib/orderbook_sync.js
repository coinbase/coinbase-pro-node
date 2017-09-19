const WebsocketClient = require('./clients/websocket.js');
const PublicClient = require('./clients/public.js');
const Orderbook = require('./orderbook.js');

// Orderbook syncing
class OrderbookSync extends WebsocketClient {
  constructor(
    productIDs,
    apiURI = 'https://api.gdax.com',
    websocketURI = 'wss://ws-feed.gdax.com',
    authenticatedClient = null,
    { heartbeat = false } = {}
  ) {
    let auth = null;
    if (authenticatedClient) {
      auth = {
        key: authenticatedClient.key,
        secret: authenticatedClient.b64secret,
        passphrase: authenticatedClient.passphrase,
      };
    }

    super(productIDs, websocketURI, auth, { heartbeat });
    this.apiURI = apiURI;
    this.authenticatedClient = authenticatedClient;

    this._queues = {}; // []
    this._sequences = {}; // -1
    this._public_clients = {};
    this.books = {};

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

  loadOrderbook(productID) {
    if (!this.books[productID]) {
      return;
    }

    const bookLevel = 3;
    const args = { level: bookLevel };

    if (this.authenticatedClient) {
      this.authenticatedClient
        .getProductOrderBook(args, productID)
        .then(onData.bind(this))
        .catch(onError.bind(this));
    } else {
      if (!this._public_clients[productID]) {
        this._public_clients[productID] = new PublicClient(
          productID,
          this.apiURI
        );
      }
      this._public_clients[productID]
        .getProductOrderBook(args)
        .then(onData.bind(this))
        .catch(onError.bind(this));
    }

    function onData(data) {
      this.books[productID].state(data);

      this._sequences[productID] = data.sequence;
      this._queues[productID].forEach(this.processMessage.bind(this));
      this._queues[productID] = [];
    }

    function onError(err) {
      err = err ? (err.message ? err.message : err) : '';
      this.emit('error', new Error('Failed to load orderbook: ' + err));
    }
  }

  processMessage(data) {
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
