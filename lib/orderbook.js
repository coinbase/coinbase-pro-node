const { RBTree } = require('bintrees');
const num = require('num');
const assert = require('assert');

class Orderbook {
  constructor() {
    this._ordersByID = {};
    this._bids = new RBTree((a, b) => a.price.cmp(b.price));
    this._asks = new RBTree((a, b) => a.price.cmp(b.price));
  }

  _getTree(side) {
    return side === 'buy' ? this._bids : this._asks;
  }

  state(book) {
    if (book) {
      book.bids
        .map(order => ({
          id: order[2],
          side: 'buy',
          price: num(order[0]),
          size: num(order[1]),
        }))
        .forEach(order => this.add(order));

      book.asks
        .map(order => ({
          id: order[2],
          side: 'sell',
          price: num(order[0]),
          size: num(order[1]),
        }))
        .forEach(order => this.add(order));
    } else {
      book = { asks: [], bids: [] };

      this._bids.reach(bid => book.bids.push(...bid.orders));
      this._asks.each(ask => book.asks.push(...ask.orders));

      return book;
    }
  }

  get(orderId) {
    return this._ordersByID[orderId];
  }

  add(order) {
    order = {
      id: order.order_id || order.id,
      side: order.side,
      price: num(order.price),
      size: num(order.size || order.remaining_size),
    };

    const tree = this._getTree(order.side);
    let node = tree.find({ price: order.price });

    if (!node) {
      node = {
        price: order.price,
        orders: [],
      };
      tree.insert(node);
    }

    node.orders.push(order);
    this._ordersByID[order.id] = order;
  }

  remove(orderId) {
    const order = this.get(orderId);

    if (!order) {
      return;
    }

    const tree = this._getTree(order.side);
    const node = tree.find({ price: order.price });
    assert(node);
    const { orders } = node;

    orders.splice(orders.indexOf(order), 1);

    if (orders.length === 0) {
      tree.remove(node);
    }

    delete this._ordersByID[order.id];
  }

  match(match) {
    const size = num(match.size);
    const price = num(match.price);
    const tree = this._getTree(match.side);
    const node = tree.find({ price: price });
    assert(node);

    const order = node.orders.find(order => order.id === match.maker_order_id);

    assert(order);

    order.size = order.size.sub(size);
    this._ordersByID[order.id] = order;

    assert(order.size >= 0);

    if (order.size.eq(0)) {
      this.remove(order.id);
    }
  }

  change(change) {
    const size = num(change.new_size);
    const price = num(change.price);
    const order = this.get(change.order_id);
    const tree = this._getTree(change.side);
    const node = tree.find({ price });

    if (!node || node.orders.indexOf(order) < 0) {
      return;
    }

    const nodeOrder = node.orders[node.orders.indexOf(order)];

    const newSize = parseFloat(order.size);
    const oldSize = parseFloat(change.old_size);

    assert.equal(oldSize, newSize);

    nodeOrder.size = size;
    this._ordersByID[nodeOrder.id] = nodeOrder;
  }
}

module.exports = exports = Orderbook;
