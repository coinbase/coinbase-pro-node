var EventEmitter = require('events').EventEmitter;
var util = require('util');

var WebSocket = require('ws');
var _ = {
  'forEach': require('lodash.foreach'),
  'assign': require('lodash.assign'),
};
var request = require('request');


var OrderBook = function(productID, websocketURI) {
  var self = this;
  EventEmitter.call(self);

  self.productID = productID || 'BTC-USD';
  self.websocketURI = websocketURI || 'wss://ws-feed.exchange.coinbase.com';
  self.state = self.STATES.closed;
  self.queue = [];
  self.book = {
    'sequence': -1,
    'bids': {},
    'asks': {},
  };
  self.connect();
};

util.inherits(OrderBook, EventEmitter);
_.assign(OrderBook.prototype, new function() {
  var prototype = this;

  prototype.STATES = {
    'closed': 'closed',
    'open': 'open',
    'syncing': 'syncing',
    'processing': 'processing',
    'error': 'error',
  };

  prototype.connect = function() {
    var self = this;
    if (self.socket) {
      self.socket.close();
    }
    self.socket = new WebSocket(self.websocketURI);
    self.socket.on('message', self.onMessage.bind(self));
    self.socket.on('open', self.onOpen.bind(self));
    self.socket.on('close', self.onClose.bind(self));
  };

  prototype.disconnect = function() {
    var self = this;
    if (!self.socket) {
      throw "Could not disconnect (not connected)"
    }
    self.socket.close();
    self.onClose();
  };

  prototype.changeState = function(stateName) {
    var self = this;
    var newState = self.STATES[stateName];
    if (newState === undefined) {
      throw "Unrecognized state: " + stateName;
    }
    var oldState = self.state;
    self.state = newState;
    if (self.state === self.STATES.error) {
      self.socket.close();
    };
    self.emit('statechange', {'old': oldState, 'new': newState});
  };

  prototype.onOpen = function() {
    var self = this;
    self.changeState(self.STATES.open);
    self.sync();
  };

  prototype.onClose = function() {
    var self = this;
    self.changeState(self.STATES.closed);
  };

  prototype.onMessage = function(datastr) {
    var self = this;
    var data = JSON.parse(datastr);
    if (self.state !== self.STATES.processing) {
      self.queue.push(data);
    } else {
      self.processMessage(data);
    }
  };

  prototype.sync = function() {
    var self = this;
    self.changeState(self.STATES.syncing);
    var subscribeMessage = {
      'type': 'subscribe',
      'product_id': self.productID,
    };
    self.socket.send(JSON.stringify(subscribeMessage));
    self.loadSnapshot();
  };

  prototype.loadSnapshot = function(snapshotData) {
    var self = this;

    var load = function(data) {
      var i;
      var convertSnapshotArray = function(array) {
        return {'price': array[0], 'size': array[1], 'id': array[2]}
      };

      for (i = 0; data.bids && i < data.bids.length; i++) {
        bid = convertSnapshotArray(data.bids[i]);
        self.book.bids[bid.id] = bid;
      };
      for (i = 0; data.asks && i < data.asks.length; i++) {
        ask = convertSnapshotArray(data.asks[i]);
        self.book.asks[ask.id] = ask;
      };
      self.book.sequence = data.sequence
      _.forEach(self.queue, self.processMessage.bind(self));
      self.queue = [];
      self.changeState(self.STATES.processing);
    };

    if (snapshotData) {
      load(data);
    } else {
      request({
        'url': 'https://api.exchange.coinbase.com/products/BTC-USD/book?level=3',
        'headers': {'User-Agent': 'coinbase-node-client'},
      }, function(err, response, body) {
        if (err) {
          self.changeState(self.STATES.error);
          throw "Failed to load snapshot: " + err;
        }
        if (response.statusCode !== 200) {
          self.changeState(self.STATES.error);
          throw "Failed to load snapshot: " + response.statusCode;
        }
        load(JSON.parse(body));
      });
    }
  };

  prototype.processMessage = function(message) {
    var self = this;
    if (message.sequence <= self.book.sequence) {
      self.emit('ignored', message);
      return;
    }
    if (message.sequence != self.book.sequence + 1) {
      self.changeState(self.STATES.error);
      throw "Received message out of order: " + message.sequence;
    }
    self.book.sequence = message.sequence;
    if (message.type === 'open' ||
        message.type === 'received' ||
        message.type === 'change') {
      var dataset = message.side === 'buy' ? self.book.bids : self.book.asks;
      var newData = {
        'size': message.size || message.remaining_size || message.new_size,
        'price': message.price,
        'id': message.order_id,
      };
      dataset[newData.id] = newData;

    } else if (message.type === 'match') {
      var makerDataset = message.side === 'buy' ? self.book.bids : self.book.asks;
      var takerDataset = message.side === 'buy' ? self.book.asks : self.book.bids;
      var makerSize = makerDataset[message.maker_order_id].size;
      var takerSize = takerDataset[message.taker_order_id].size;
      makerDataset[message.maker_order_id].size = '' + (makerSize - message.size);
      takerDataset[message.taker_order_id].size = '' + (takerSize - message.size);

    } else if (message.type === 'done') {
      var dataset = message.side === 'buy' ? self.book.bids : self.book.asks;
      var id = message.order_id;
      delete dataset[id];

    } else if (message.type === 'error') {
      self.changeState(self.STATES.error);
      self.emit(message.type, message);
      throw "Received error: " + message.message

    } else {
      self.changeState(self.STATES.error);
      self.emit('unknown', data);
      throw "Received unknown message type: " + message.type;
    }

    self.emit(message.type, message);
  };
});

module.exports = exports = OrderBook;
