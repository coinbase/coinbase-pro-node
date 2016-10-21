/**
 > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 > SOFTWARE.
 */

'use strict';

const RBTree = require('bintrees').RBTree;
const num = require('num');
const assert = require('assert');

/**
 * OrderBook
 */
class OrderBook {
  /**
   * Create a new OrderBook
   */
  constructor() {
    // Orders hashed by ID
    this._ordersByID = {};

    this._bids = new RBTree((a, b) => {
      return a.price.cmp(b.price);
    });

    this._asks = new RBTree((a, b) => {
      return a.price.cmp(b.price);
    });
  }

  /**
   * _getTree
   * @param {string} side which side of the trade
   * @return {RBTree} The RBTree
   * @private
   */
  _getTree(side) {
    return side == 'buy' ? this._bids : this._asks;
  }

  /**
   * state
   * @param {OrderBook} book The OrderBook
   * @return {OrderBook} book A OrderBook
   */
  state(book) {
    if (book) {
      book.bids.forEach((order) => {
        order = {
          id: order[2],
          side: 'buy',
          price: num(order[0]),
          size: num(order[1]),
        };
        this.add(order);
      });

      book.asks.forEach((order) => {
        order = {
          id: order[2],
          side: 'sell',
          price: num(order[0]),
          size: num(order[1]),
        };
        this.add(order);
      });
    } else {
      book = {
        asks: [],
        bids: [],
      };
      this._bids.reach((bid) => {
        bid.orders.forEach((order) => {
          book.bids.push(order);
        });
      });

      this._asks.each((ask) => {
        ask.orders.forEach((order) => {
          book.asks.push(order);
        });
      });

      return book;
    }
  }

  /**
   * get Order by OrderId
   * @param {string} orderId
   * @return {object} order based on id
   */
  get(orderId) {
    return this._ordersByID[orderId];
  }

  /**
   * Add order
   * @param {object} order The Order
   */
  add(order) {
    order = {
      id: order.order_id || order.id,
      side: order.side,
      price: num(order.price),
      size: num(order.size || order.remaining_size),
    };

    let tree = this._getTree(order.side);
    let node = tree.find({price: order.price});

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

  /**
   * Remove Order by OrderId
   * @param {string} orderId The OrderID
   */
  remove(orderId) {
    let order = this.get(orderId);

    if (!order) {
      return;
    }

    let tree = this._getTree(order.side);
    let node = tree.find({price: order.price});
    assert(node);
    let orders = node.orders;

    orders.splice(orders.indexOf(order), 1);

    if (orders.length === 0) {
      tree.remove(node);
    }

    delete this._ordersByID[order.id];
  }

  /**
   * match parameter
   * @param {object} match Object Match
   */
  match(match) {
    let size = num(match.size);
    let price = num(match.price);
    let tree = this._getTree(match.side);
    let node = tree.find({price: price});
    assert(node);

    let order = node.orders[0];
    assert.equal(order.id, match.maker_order_id);

    order.size = order.size.sub(size);
    this._ordersByID[order.id] = order;

    assert(order.size >= 0);

    if (order.size.eq(0)) {
      this.remove(order.id);
    }
  }

  /**
   * change
   * @param {Object} change The changed object
   */
  change(change) {
    let size = num(change.new_size);
    let price = num(change.price);
    let order = this.get(change.order_id);
    let tree = this._getTree(change.side);
    let node = tree.find({price: price});

    if (!node || node.orders.indexOf(order) < 0) {
      return;
    }

    let nodeOrder = node.orders[node.orders.indexOf(order)];

    let newSize = parseFloat(order.size);
    let oldSize = parseFloat(change.old_size);
    assert.equal(oldSize, newSize);

    nodeOrder.size = size;
    this._ordersByID[nodeOrder.id] = nodeOrder;
  }
}

/**
 *
 * @type {OrderBook}
 */
module.exports = OrderBook;
