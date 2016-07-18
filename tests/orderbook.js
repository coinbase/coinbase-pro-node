var assert = require('assert');

var Gdax = require('../index.js');

var checkState = function(state, exp) {
  assert.deepEqual(JSON.parse(JSON.stringify(state)), exp);
};

test('add new orders', function() {
  var state = {
    bids: [
     { id: 'super-duper-id-2',
       side: 'buy',
       price: 201,
       size: 10 },
      { id: 'super-duper-id',
        side: 'buy',
        price: 200,
        size: 10 }
    ],
    asks: []
  };

  var orderbook = new Gdax.Orderbook();
  orderbook.add(state.bids[0]);
  orderbook.add(state.bids[1]);

  checkState(orderbook.state(), state);
});

test('remove order', function() {
  var apiState = {
    bids: [
     [201, 10, 'super-duper-id-2'],
     [201, 10, 'super-duper-id-3'],
     [200, 10, 'super-duper-id']
    ],
    asks: []
  };

  var state = {
    bids: [
     { id: 'super-duper-id-2',
       side: 'buy',
       price: 201,
       size: 10 },
     { id: 'super-duper-id-3',
       side: 'buy',
       price: 201,
       size: 10 },
      { id: 'super-duper-id',
        side: 'buy',
        price: 200,
        size: 10 }
    ],
    asks: []
  };

  var orderbook = new Gdax.Orderbook();
  orderbook.state(apiState);
  checkState(orderbook.state(), state);

  orderbook.remove('super-duper-id-3');
  state.bids.splice(1, 1);
  checkState(orderbook.state(), state);
});

test('get order', function() {
  var apiState = {
    bids: [
      [201, 10, 'super-duper-id-2'],
      [200, 10, 'super-duper-id']
    ],
    asks: []
  };

  var expected = {
    id: 'super-duper-id-2',
    price: 201,
    size: 10,
    side: 'buy'
  };

  var orderbook = new Gdax.Orderbook();
  orderbook.state(apiState);
  var order = orderbook.get('super-duper-id-2');

  assert.deepEqual(JSON.parse(JSON.stringify(order)), expected);
});

test('partial order match', function() {
  var apiState = {
    bids: [
      [201, 10, 'super-duper-id-2'],
      [200, 10, 'super-duper-id']
    ],
    asks: []
  };

  var match = {
    maker_order_id: 'super-duper-id-2',
    size: 5,
    price: 201,
    side: 'buy',
  };

  var expectedState = {
    bids: [
     { id: 'super-duper-id-2',
       side: 'buy',
       price: 201,
       size: 5 },
      { id: 'super-duper-id',
        side: 'buy',
        price: 200,
        size: 10 }
    ],
    asks: []
  };

  var orderbook = new Gdax.Orderbook();
  orderbook.state(apiState);
  orderbook.match(match);

  checkState(orderbook.state(), expectedState);
});

test('full order match', function() {
  var apiState = {
    bids: [
      [201, 10, 'super-duper-id-2'],
      [200, 10, 'super-duper-id']
    ],
    asks: []
  };

  var match = {
    maker_order_id: 'super-duper-id-2',
    size: 10,
    price: 201,
    side: 'buy',
  };

  var expectedState = {
    bids: [
      { id: 'super-duper-id',
        side: 'buy',
        price: 200,
        size: 10 }
    ],
    asks: []
  };

  var orderbook = new Gdax.Orderbook();
  orderbook.state(apiState);
  orderbook.match(match);

  checkState(orderbook.state(), expectedState);
});

test('order change', function() {
  var apiState = {
    bids: [
      [201, 10, 'super-duper-id-2'],
      [200, 10, 'super-duper-id']
    ],
    asks: []
  };

  var change = {
    order_id: 'super-duper-id-2',
    old_size: '10.0',
    new_size: 3,
    price: 201,
    side: 'buy',
  };

  var expectedState = {
    bids: [
     { id: 'super-duper-id-2',
       side: 'buy',
       price: 201,
       size: 3 },
      { id: 'super-duper-id',
        side: 'buy',
        price: 200,
        size: 10 }
    ],
    asks: []
  };

  var orderbook = new Gdax.Orderbook();
  orderbook.state(apiState);
  orderbook.change(change);

  checkState(orderbook.state(), expectedState);
});

