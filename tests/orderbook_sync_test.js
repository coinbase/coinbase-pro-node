const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');

const testserver = require('./lib/ws_testserver');
let port = 56632;

const EXCHANGE_API_URL = 'https://api.gdax.com';

suite('OrderbookSync');

describe('OrderbookSync', function() {
  test('emits a message event', function(done) {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port
      );
      orderbookSync.on('message', data => {
        assert.deepEqual(data, {
          test: true,
        });
        server.close();
        done();
      });
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ test: true }));
    });
  });

  test('builds specified books', function(done) {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, function() {
      const orderbookSync = new Gdax.OrderbookSync(
        ['BTC-USD', 'ETH-USD'],
        EXCHANGE_API_URL,
        'ws://localhost:' + port
      );
      const btc_usd_state = orderbookSync.books['BTC-USD'].state();
      const eth_usd_state = orderbookSync.books['ETH-USD'].state();

      assert.deepEqual(btc_usd_state, { asks: [], bids: [] });
      assert.deepEqual(eth_usd_state, { asks: [], bids: [] });
      assert.equal(orderbookSync.books['ETH-BTC'], undefined);
    });

    server.on('connection', () => {
      server.close();
      done();
    });
  });
});
