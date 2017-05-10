var WebsocketClient = require('./clients/websocket.js');
var PublicClient = require('./clients/public.js');
var Orderbook = require('./orderbook.js');
var util = require('util');
var _ = {
  forEach: require('lodash.foreach'),
  assign: require('lodash.assign'),
};

// Orderbook syncing
var OrderbookSync = function(productID, apiURI, websocketURI, authenticatedClient) {
  var self = this;

  self.productID = productID || 'BTC-USD';
  self.apiURI = apiURI || 'https://api.gdax.com';
  self.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
  self.authenticatedClient = authenticatedClient;

  self._queue = [];
  self._sequence = -1;

  WebsocketClient.call(self, self.productID, self.websocketURI);
  self.loadOrderbook();
};

util.inherits(OrderbookSync, WebsocketClient);

_.assign(OrderbookSync.prototype, new function() {
  var prototype = this;

  prototype.onMessage = function(data) {
    var self = this;
    data = JSON.parse(data);
    self.emit('message', data);

    if (self._sequence ===  -1) {
      // Orderbook snapshot not loaded yet
      self._queue.push(data);
    } else {
      self.processMessage(data);
    }
  };

  prototype.loadOrderbook = function() {
    var self = this;
    var bookLevel = 3;
    var args = { 'level': bookLevel };

    self.book = new Orderbook();

    if (self.authenticatedClient) {
      self.authenticatedClient.getProductOrderBook(args, self.productID, cb);
    }
    else {
      if (!self.publicClient) {
        self.publicClient = new PublicClient(self.productID, self.apiURI);
      }
      self.publicClient.getProductOrderBook(args, cb);
    }

    function cb(err, response, body) {
      if (err) {
        throw 'Failed to load orderbook: ' + err;
      }

      if (response.statusCode !== 200) {
        throw 'Failed to load orderbook: ' + response.statusCode;
      }

      var data = JSON.parse(response.body);
      self.book.state(data);

      self._sequence = data.sequence;
      _.forEach(self._queue, self.processMessage.bind(self));
      self._queue = [];
    };
  };

  prototype.processMessage = function(data) {
    var self = this;

    if (self._sequence == -1) {
      // Resync is in process
      return;
    }
    if (data.sequence <= self._sequence) {
      // Skip this one, since it was already processed
      return;
    }

    if (data.sequence != self._sequence + 1) {
      // Dropped a message, start a resync process
      self._queue = [];
      self._sequence = -1;

      self.loadOrderbook();
      return;
    }

    self._sequence = data.sequence;

    switch (data.type) {
      case 'open':
        self.book.add(data);
        break;

      case 'done':
        self.book.remove(data.order_id);
        break;

      case 'match':
        self.book.match(data);
        break;

      case 'change':
        self.book.change(data);
        break;
    }
  };

});

module.exports = exports = OrderbookSync;
