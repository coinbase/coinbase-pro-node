var assert = require('assert');

var CoinbaseExchange = require('../index.js');

test('public client should return values', function(done) {
  var publicClient = new CoinbaseExchange.PublicClient();

  publicClient.getProductTicker(function(err, resp, data) {
    assert(data);
    assert(data.trade_id);
    assert(data.price);
    assert(data.size);
    done();
  });
});
