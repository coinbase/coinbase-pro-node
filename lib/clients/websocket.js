var EventEmitter = require('events').EventEmitter;
var Websocket = require('ws');
var util = require('util');
var _  = {assign: require('lodash.assign')};
var crypto = require('crypto');
var signRequest = require('../../lib/request_signer').signRequest;

/**
 * Create a new connection to a websocket feed
 * @param productID {string} Options. The GDAX product to connect to. Default: 'BTC-USD'
 * @param websocketURI {string} Optional. The websocker URL. Default: The official GDAX feed.
 * @param auth {object} Optional. An object containing your API ket details (key, secret & passphrase)
 */
var WebsocketClient = function(productID, websocketURI, auth) {
  var self = this;
  self.productID = productID || 'BTC-USD';
  self.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
  if (auth && !(auth.secret && auth.key && auth.passphrase)) {
    throw new Error('Invalid or incomplete authentication credentials. You should either provide all of the secret, key and passphrase fields, or leave auth null');
  }
  self.auth = auth || {};
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
    var auth = self.getSignature(self.auth);

    var subscribeMessage = {
      type: 'subscribe',
      product_id: self.productID,
      signature: auth.signature,
      key: auth.key,
      passphrase: auth.passphrase,
      timestamp: auth.timestamp
    };
    self.socket.send(JSON.stringify(subscribeMessage));

    // Set a 30 second ping to keep connection alive
    self.pinger = setInterval(function() {
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

  prototype.getSignature = function(auth) {
    return signRequest(auth, 'GET', '/users/self');
  };
});
module.exports = exports = WebsocketClient;
