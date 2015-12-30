var assert = require('assert');
var nock = require('nock');

var CoinbaseExchange = require('../index.js');
var publicClient = new CoinbaseExchange.PublicClient();

test('public client should return values', function(done) {
  
  nock('https://api.exchange.coinbase.com')
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
    
    done();
  });
});
