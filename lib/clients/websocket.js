var EventEmitter = require('events').EventEmitter;
var Websocket = require('ws');
var util = require('util');
var _  = {assign: require('lodash.assign')};

var WebsocketClient = function(productID, websocketURI) {
  var self = this;
  self.productID = productID || 'BTC-USD';
  self.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
  EventEmitter.call(self);
  self.connect();
};

util.inherits(WebsocketClient, EventEmitter);

_.assign(WebsocketClient.prototype, new function() {
  var prototype = this;

  prototype.connect = function() {
    var self = this;

    if (self.socket) {
      self.socket.close();
    }

    self.socket = new Websocket(self.websocketURI);

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
  };

  prototype.onOpen = function() {
    var self = this;
    self.emit('open');
    var subscribeMessage = {
      type: 'subscribe',
      product_id: self.productID,
    };
    self.socket.send(JSON.stringify(subscribeMessage));

    // Set a 30 second ping to keep connection alive
    self.pinger = setInterval(function(){
      self.socket.ping("keepalive");
    }, 30000);

  };

  prototype.onClose = function() {
    var self = this;
    clearInterval(self.pinger);
    self.socket = null;
    self.emit('close');
  };

  prototype.onMessage = function(data) {
    var self = this;
    self.emit('message', JSON.parse(data));
  };
});

module.exports = exports = WebsocketClient;
