'use strict';
const EventEmitter = require('events').EventEmitter;
const Websocket = require('ws');
const util = require('util');
const signRequest = require('../request_signer').signRequest;

const defaultURI = 'wss://ws-feed.gdax.com';

/**
 * Create a new connection to a websocket feed
 * @param productIDs {array} The GDAX products to listen to. Default: ['BTC-USD']
 * @param websocketURI {string} Optional. The websocker URL. Default: The official GDAX feed.
 * @param auth {object} Optional. An object containing your API ket details (key, secret & passphrase)
 */
class WebsocketClient extends EventEmitter {
    constructor (productIDs, websocketURI = defaultURI, auth) {
        super();
        
        if (typeof websocketURI === 'object') {
            auth = websocketURI;
            websocketURI = defaultURI;
        }
        
        if (auth && !(auth.secret && auth.key && auth.passphrase)) {
            throw new Error('Invalid or incomplete authentication credentials. You should either provide all of the secret, key and passphrase fields, or leave auth null');
        }
        
        this.productIDs = this._determineProductIDs(productIDs);
        this.websocketURI = websocketURI;
        this.auth = auth || {};
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
    };

    disconnect() {
        if (!this.socket) {
            throw new Error("Could not disconnect (not connected)");
        }

        this.socket.close();
    };

    onOpen() {
        this.emit('open');

        const subscribeMessage = {
            type: 'subscribe',
            product_ids: this.productIDs
        };

        // Add Signature
        if (this.auth.secret) {
            const sig = signRequest(this.auth, 'GET', '/users/this');
            subscribeMessage.signature = sig.signature
            subscribeMessage.key = sig.key
            subscribeMessage.passphrase = sig.passphrase
            subscribeMessage.timestamp = sig.timestamp
        }

        this.socket.send(JSON.stringify(subscribeMessage));

        // Set a 30 second ping to keep connection alive
        this.pinger = setInterval(() => {
            this.socket.ping("keepalive");
        }, 30000);
    };

    onClose() {
        clearInterval(this.pinger);
        this.socket = null;
        this.emit('close');
    };

    onMessage(data) {
        this.emit('message', JSON.parse(data));
    };

    onError(err) {
        if (!err) {
            return;
        }

        if (err.message === 'unexpected server response (429)') {
            err = new Error('You are connecting too fast and are being throttled! Make sure you subscribe to multiple books on one connection.');
            throw err;
        }

        this.emit('error', err);
    };

    _determineProductIDs(productIDs) {
        if (!productIDs || !productIDs.length) {
            return ['BTC-USD'];
        }

        if (Array.isArray(productIDs)) {
            return productIDs;
        }

        // If we got this far, it means it's a string.
        // Return an array for backwards compatibility.
        return [productIDs];
    }
}
module.exports = WebsocketClient;
