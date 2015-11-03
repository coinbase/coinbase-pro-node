var RBTree = require('bintrees').RBTree;
var num = require('num');
var assert = require('assert');
var _ = {assign: require('lodash.assign')}

var Orderbook = function() {
  var self = this;

  // Orders hashed by ID
  self._ordersByID = {};

  self._bids = new RBTree(function(a, b) {
    return a.price.cmp(b.price);
  });

  self._asks = new RBTree(function(a, b) {
    return a.price.cmp(b.price);
  });
};

_.assign(Orderbook.prototype, new function() {
  var prototype = this;

  prototype._getTree = function(side) {
    return side == 'buy' ? this._bids : this._asks;
  };

  prototype.state = function(book) {
    var self = this;

    if (book) {

      book.bids.forEach(function(order) {
        order = {
          id: order[2],
          side: 'buy',
          price: num(order[0]),
          size: num(order[1])
        }
        self.add(order);
      });

      book.asks.forEach(function(order) {
        order = {
          id: order[2],
          side: 'sell',
          price: num(order[0]),
          size: num(order[1])
        }
        self.add(order);
      });

    } else {

      book = {
        asks: [],
        bids: []
      };

      self._bids.reach(function(bid) {
        bid.orders.forEach(function(order) {
          book.bids.push(order);
        });
      });

      self._asks.each(function(ask) {
        ask.orders.forEach(function(order) {
          book.asks.push(order);
        });
      });

      return book;
    }
  };

  prototype.get = function(orderId) {
    return this._ordersByID[orderId]
  };

  prototype.add = function(order) {
    var self = this;

    order = {
      id: order.order_id || order.id,
      side: order.side,
      price: num(order.price),
      size: num(order.size || order.remaining_size),
    };

    var tree = self._getTree(order.side);
    var node = tree.find({price: order.price});

    if (!node) {
      node = {
        price: order.price,
        orders: []
      }
      tree.insert(node);
    }

    node.orders.push(order);
    self._ordersByID[order.id] = order;
  };

  prototype.remove = function(orderId) {
    var self = this;
    var order = self.get(orderId);

    if (!order) {
      return;
    }

    var tree = self._getTree(order.side);
    var node = tree.find({price: order.price});
    assert(node);
    var orders = node.orders;

    orders.splice(orders.indexOf(order), 1);

    if (orders.length === 0) {
      tree.remove(node);
    }

    delete self._ordersByID[order.id];
  };

  prototype.match = function(match) {
    var self = this;

    var size = num(match.size);
    var price = num(match.price);
    var tree = self._getTree(match.side);
    var node = tree.find({price: price});
    assert(node);

    var order = node.orders[0];
    assert.equal(order.id, match.maker_order_id);

    order.size = order.size.sub(size);
    self._ordersByID[order.id] = order;

    assert(order.size >= 0);

    if (order.size.eq(0)) {
      self.remove(order.id);
    }
  };

  prototype.change = function(change) {
    var self = this;

    var size = num(change.new_size);
    var price = num(change.price);
    var order = self.get(change.order_id)
    var tree = self._getTree(change.side);
    var node = tree.find({price: price});

    if (!node || node.orders.indexOf(order) < 0) {
      return;
    }

    var nodeOrder = node.orders[node.orders.indexOf(order)];

    var newSize = parseFloat(order.size);
    var oldSize = parseFloat(change.old_size);
    
    assert.equal(oldSize, newSize);

    nodeOrder.size = size;
    self._ordersByID[nodeOrder.id] = nodeOrder;
  };

});


module.exports = exports = Orderbook;
