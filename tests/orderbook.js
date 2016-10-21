/**
 > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 > SOFTWARE.
 */

/* eslint camelcase: ["error", {properties: "never"}] */

'use strict';

let assert = require('assert');

let OrderBook = require('../lib/orderbook');

let checkState = (state, exp) => {
  assert.deepEqual(JSON.parse(JSON.stringify(state)), exp);
};
/** @test {OrderBook} */
describe('OrderBook', () => {
  /** @test {OrderBook#add} */
  test('add new orders', () => {
    let state = {
      bids: [
        {
          id: 'super-duper-id-2',
          side: 'buy',
          price: 201,
          size: 10,
        },
        {
          id: 'super-duper-id',
          side: 'buy',
          price: 200,
          size: 10,
        },
      ],
      asks: [],
    };

    let orderbook = new OrderBook();
    orderbook.add(state.bids[0]);
    orderbook.add(state.bids[1]);

    checkState(orderbook.state(), state);
  });

  /** @test {OrderBook#remove} */
  test('remove order', () => {
    let apiState = {
      bids: [
        [201, 10, 'super-duper-id-2'],
        [201, 10, 'super-duper-id-3'],
        [200, 10, 'super-duper-id'],
      ],
      asks: [],
    };

    let state = {
      bids: [
        {
          id: 'super-duper-id-2',
          side: 'buy',
          price: 201,
          size: 10,
        },
        {
          id: 'super-duper-id-3',
          side: 'buy',
          price: 201,
          size: 10,
        },
        {
          id: 'super-duper-id',
          side: 'buy',
          price: 200,
          size: 10,
        },
      ],
      asks: [],
    };

    let orderbook = new OrderBook();
    orderbook.state(apiState);
    checkState(orderbook.state(), state);

    orderbook.remove('super-duper-id-3');
    state.bids.splice(1, 1);
    checkState(orderbook.state(), state);
  });

  /** @test {OrderBook#get} */
  test('get order', () => {
    let apiState = {
      bids: [
        [201, 10, 'super-duper-id-2'],
        [200, 10, 'super-duper-id'],
      ],
      asks: [],
    };

    let expected = {
      id: 'super-duper-id-2',
      price: 201,
      size: 10,
      side: 'buy',
    };

    let orderbook = new OrderBook();
    orderbook.state(apiState);
    let order = orderbook.get('super-duper-id-2');

    assert.deepEqual(JSON.parse(JSON.stringify(order)), expected);
  });

  /** @test {OrderBook#match} */
  test('partial order match', () => {
    let apiState = {
      bids: [
        [201, 10, 'super-duper-id-2'],
        [200, 10, 'super-duper-id'],
      ],
      asks: [],
    };

    // noinspection Eslint
    let match = {
      maker_order_id: 'super-duper-id-2',
      size: 5,
      price: 201,
      side: 'buy',
    };

    let expectedState = {
      bids: [
        {
          id: 'super-duper-id-2',
          side: 'buy',
          price: 201,
          size: 5,
        },
        {
          id: 'super-duper-id',
          side: 'buy',
          price: 200,
          size: 10,
        },
      ],
      asks: [],
    };

    let orderbook = new OrderBook();
    orderbook.state(apiState);
    orderbook.match(match);

    checkState(orderbook.state(), expectedState);
  });

  /** @test {OrderBook#change} */
  test('full order match', () => {
    let apiState = {
      bids: [
        [201, 10, 'super-duper-id-2'],
        [200, 10, 'super-duper-id'],
      ],
      asks: [],
    };

    // noinspection Eslint
    let match = {
      maker_order_id: 'super-duper-id-2',
      size: 10,
      price: 201,
      side: 'buy',
    };

    let expectedState = {
      bids: [
        {
          id: 'super-duper-id',
          side: 'buy',
          price: 200,
          size: 10,
        },
      ],
      asks: [],
    };

    let orderbook = new OrderBook();
    orderbook.state(apiState);
    orderbook.match(match);

    checkState(orderbook.state(), expectedState);
  });

  /** @test {OrderBook#add} */
  test('order change', () => {
    let apiState = {
      bids: [
        [201, 10, 'super-duper-id-2'],
        [200, 10, 'super-duper-id'],
      ],
      asks: [],
    };

    // noinspection Eslint
    let change = {
      order_id: 'super-duper-id-2',
      old_size: '10.0',
      new_size: 3,
      price: 201,
      side: 'buy',
    };

    let expectedState = {
      bids: [
        {
          id: 'super-duper-id-2',
          side: 'buy',
          price: 201,
          size: 3,
        },
        {
          id: 'super-duper-id',
          side: 'buy',
          price: 200,
          size: 10,
        },
      ],
      asks: [],
    };

    let orderbook = new OrderBook();
    orderbook.state(apiState);
    orderbook.change(change);

    checkState(orderbook.state(), expectedState);
  });
});
