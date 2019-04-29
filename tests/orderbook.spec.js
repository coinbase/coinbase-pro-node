const assert = require('assert');

const CoinbasePro = require('../index.js');

const checkState = (state, exp) => {
  assert.deepEqual(JSON.parse(JSON.stringify(state)), exp);
};

suite('Orderbook', () => {
  test('.add()', () => {
    const state = {
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

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.add(state.bids[0]);
    orderbook.add(state.bids[1]);

    checkState(orderbook.state(), state);
  });

  test('.remove()', () => {
    const apiState = {
      bids: [
        [201, 10, 'super-duper-id-2'],
        [201, 10, 'super-duper-id-3'],
        [200, 10, 'super-duper-id'],
      ],
      asks: [],
    };

    const state = {
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

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.state(apiState);
    checkState(orderbook.state(), state);

    orderbook.remove('super-duper-id-3');
    state.bids.splice(1, 1);
    checkState(orderbook.state(), state);
  });

  test('.get()', () => {
    const apiState = {
      bids: [[201, 10, 'super-duper-id-2'], [200, 10, 'super-duper-id']],
      asks: [],
    };

    const expected = {
      id: 'super-duper-id-2',
      price: 201,
      size: 10,
      side: 'buy',
    };

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.state(apiState);
    const order = orderbook.get('super-duper-id-2');

    assert.deepEqual(JSON.parse(JSON.stringify(order)), expected);
  });

  test('.match() partial match', () => {
    const apiState = {
      bids: [[201, 10, 'super-duper-id-2'], [200, 10, 'super-duper-id']],
      asks: [],
    };

    const match = {
      maker_order_id: 'super-duper-id-2',
      size: 5,
      price: 201,
      side: 'buy',
    };

    const expectedState = {
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

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.state(apiState);
    orderbook.match(match);

    checkState(orderbook.state(), expectedState);
  });

  test('.match() full match', () => {
    const apiState = {
      bids: [[201, 10, 'super-duper-id-2'], [200, 10, 'super-duper-id']],
      asks: [],
    };

    const match = {
      maker_order_id: 'super-duper-id-2',
      size: 10,
      price: 201,
      side: 'buy',
    };

    const expectedState = {
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

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.state(apiState);
    orderbook.match(match);

    checkState(orderbook.state(), expectedState);
  });

  test('.change()', () => {
    const apiState = {
      bids: [[201, 10, 'super-duper-id-2'], [200, 10, 'super-duper-id']],
      asks: [],
    };

    const change = {
      order_id: 'super-duper-id-2',
      old_size: '10.0',
      new_size: 3,
      price: 201,
      side: 'buy',
    };

    const expectedState = {
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

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.state(apiState);
    orderbook.change(change);

    checkState(orderbook.state(), expectedState);
  });

  test('.change() market order', () => {
    const apiState = {
      bids: [[200, 10, 'super-duper-id']],
      asks: [],
    };

    const change = {
      order_id: 'super-duper-id-2',
      side: 'buy',
    };

    const expectedState = {
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

    const orderbook = new CoinbasePro.Orderbook();
    orderbook.state(apiState);
    orderbook.change(change);

    checkState(orderbook.state(), expectedState);
  });
});
