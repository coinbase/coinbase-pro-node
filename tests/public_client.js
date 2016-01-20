var assert = require('assert');
var nock = require('nock');

var CoinbaseExchange = require('../index.js');
var publicClient = new CoinbaseExchange.PublicClient();

var EXCHANGE_API_URL = 'https://api.exchange.coinbase.com';

test('get product trades', function(done) {
  var expectedRepsonse = [{
    "time": "2014-11-07T22:19:28.578544Z",
    "trade_id": 74,
    "price": "10.00000000",
    "size": "0.01000000",
    "side": "buy"
  }, {
    "time": "2014-11-07T01:08:43.642366Z",
    "trade_id": 73,
    "price": "100.00000000",
    "size": "0.01000000",
    "side": "sell"
  }];

  nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/trades')
      .reply(200, expectedRepsonse);

  publicClient.getProductTrades(function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedRepsonse);

    nock.cleanAll();
    done();
  });
});

test('public client should return values', function(done) {
  
  nock(EXCHANGE_API_URL)
  .get('/products/BTC-USD/ticker')
  .reply(200, {
    trade_id: 'test-id',
    price: '9.00',
    size: '5'
  });

  publicClient.getProductTicker(function(err, resp, data) {
    assert.ifError(err);

    assert.equal(data.trade_id, 'test-id');
    assert(data.price, '9.00');
    assert(data.size, '5');
  
    nock.cleanAll();    
    done();
  });
});
