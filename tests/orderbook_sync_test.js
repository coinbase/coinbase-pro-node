var assert = require('assert');
var nock = require('nock');

var Gdax = require('../index.js');

var testserver = require('./lib/ws_testserver');
var port = 56632;

var EXCHANGE_API_URL = 'https://api.gdax.com';

suite('OrderbookSync');

describe('OrderbookSync', function() {
  test('emits a message event', function(done) {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: []
      });

    var server = testserver(++port, function() {
      var orderbookSync = new Gdax.OrderbookSync('BTC-USD', EXCHANGE_API_URL, 'ws://localhost:' + port);
      orderbookSync.on('message', function(data) {
        assert.deepEqual(data, {
          test: true,
        });
        server.close();
        done();
      })
    });

    server.on('connection', function(socket) {
      socket.send(JSON.stringify({test: true}));
    });
  });

  test('builds specified books', function(done) {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: []
      });

    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: []
      });

    var server = testserver(++port, function() {
      var orderbookSync = new Gdax.OrderbookSync(['BTC-USD', 'ETH-USD'], EXCHANGE_API_URL, 'ws://localhost:' + port);
      var btc_usd_state = orderbookSync.books['BTC-USD'].state();
      var eth_usd_state = orderbookSync.books['ETH-USD'].state();

      assert.deepEqual(btc_usd_state, { asks: [], bids: [] });
      assert.deepEqual(eth_usd_state, { asks: [], bids: [] });
      assert.equal(orderbookSync.books['ETH-BTC'], undefined);
    });

    server.on('connection', function(socket) {
      server.close();
      done();
    });
  });
});
