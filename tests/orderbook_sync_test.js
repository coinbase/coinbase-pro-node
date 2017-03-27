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
});
