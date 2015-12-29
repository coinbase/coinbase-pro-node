var assert = require('assert');

var CoinbaseExchange = require('../index.js');

test('should require ordeId for cancelOrder', function(done) {
  var authClient = new CoinbaseExchange.AuthenticatedClient();

  authClient.cancelOrder(null, function(err, resp, data) {
    assert(err);
    done();
  });
});