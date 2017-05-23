var WebsocketClient = require('./clients/websocket.js');
var PublicClient = require('./clients/public.js');
var Orderbook = require('./orderbook.js');
var Utils = require('./utilities.js');
var util = require('util');
var _ = {
  forEach: require('lodash.foreach'),
  assign: require('lodash.assign'),
};

// Orderbook syncing
var OrderbookSync = function(productIDs, apiURI, websocketURI, authenticatedClient) {
  var self = this;

  self.productIDs = Utils.determineProductIDs(productIDs);
  self.apiURI = apiURI || 'https://api.gdax.com';
  self.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
  self.authenticatedClient = authenticatedClient;

  self._queues = {}; // []
  self._sequences = {}; // -1
  self._public_clients = {};
  self.books = {}

  _.forEach(self.productIDs, function(productID) {
    self._queues[productID] = [];
    self._sequences[productID] = -1;
    self.books[productID] = new Orderbook();
    self.loadOrderbook(productID);
  });

  WebsocketClient.call(self, self.productIDs, self.websocketURI);
};

util.inherits(OrderbookSync, WebsocketClient);

_.assign(OrderbookSync.prototype, new function() {
  var prototype = this;

  prototype.onMessage = function(data) {
    var self = this;
    data = JSON.parse(data);
    self.emit('message', data);

    var product_id = data.product_id;

    if (self._sequences[product_id] ===  -1) {
      // Orderbook snapshot not loaded yet
      self._queues[product_id].push(data);
    } else {
      self.processMessage(data);
    }
  };

  prototype.loadOrderbook = function(productID) {
    var self = this;
    var bookLevel = 3;
    var args = { 'level': bookLevel };

    if (self.authenticatedClient) {
      self.authenticatedClient.getProductOrderBook(args, productID, cb);
    }
    else {
      if (!self._public_clients[productID]) {
        self._public_clients[productID] = new PublicClient(productID, self.apiURI);
      }
      self._public_clients[productID].getProductOrderBook(args, cb);
    }

    function cb(err, response, body) {
      if (err) {
        throw 'Failed to load orderbook: ' + err;
      }

      if (response.statusCode !== 200) {
        throw 'Failed to load orderbook: ' + response.statusCode;
      }

      if (!self.books[productID]) {
        return;
      }

      var data = JSON.parse(response.body);
      self.books[productID].state(data);

      self._sequences[productID] = data.sequence;
      _.forEach(self._queues[productID], self.processMessage.bind(self));
      self._queues[productID] = [];
    };
  };

  prototype.processMessage = function(data) {
    var self = this;
    var product_id = data.product_id;

    if (self._sequences[product_id] == -1) {
      // Resync is in process
      return;
    }
    if (data.sequence <= self._sequences[product_id]) {
      // Skip this one, since it was already processed
      return;
    }

    if (data.sequence != self._sequences[product_id] + 1) {
      // Dropped a message, start a resync process
      self._queues[product_id] = [];
      self._sequences[product_id] = -1;

      self.loadOrderbook(product_id);
      return;
    }

    self._sequences[product_id] = data.sequence;
    var book = self.books[product_id];

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
  };
});

module.exports = exports = OrderbookSync;
