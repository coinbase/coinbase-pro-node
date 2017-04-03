'use strict';
const WebsocketClient = require('./clients/websocket');
const PublicClient = require('./clients/public');
const Orderbook = require('./orderbook');
const util = require('util');

// Orderbook syncing
class OrderbookSync extends WebsocketClient {
    constructor(productID, apiURI, websocketURI, authenticatedClient) {
        productID = productID || 'BTC-USD';
        websocketURI = websocketURI || 'wss://ws-feed.gdax.com'
        
        super(productID, websocketURI);
        
        this.productID = productID;
        this.apiURI = apiURI || 'https://api.gdax.com';
        this.websocketURI = websocketURI;
        this.authenticatedClient = authenticatedClient;

        this._queue = [];
        this._sequence = -1;
        this.loadOrderbook();
    }

    onMessage(data) {
        data = JSON.parse(data);
        this.emit('message', data);

        if (this._sequence === -1) {
            // Orderbook snapshot not loaded yet
            this._queue.push(data);
        } else {
            this.processMessage(data);
        }
    }

    loadOrderbook() {
        const bookLevel = 3;
        const args = { level: bookLevel };

        this.book = new Orderbook();
        
        const cb = (err, response, body) => {
            if (err) {
                throw 'Failed to load orderbook: ' + err;
            }

            if (response.statusCode !== 200) {
                throw 'Failed to load orderbook: ' + response.statusCode;
            }

            const data = JSON.parse(response.body);
            this.book.state(data);

            this._sequence = data.sequence;
            this._queue.forEach(this.processMessage.bind(this));
            this._queue = [];
        };

        if (this.authenticatedClient) {
            this.authenticatedClient.getProductOrderBook(args, this.productID, cb);
        }
        else {
            if (!this.publicClient) {
                this.publicClient = new PublicClient(this.productID, this.apiURI);
            }
            this.publicClient.getProductOrderBook(args, cb);
        }
    }

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

            this.loadOrderbook();
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

module.exports = OrderbookSync;
