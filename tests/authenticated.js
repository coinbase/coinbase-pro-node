var assert = require('assert');
var nock = require('nock');

var CoinbaseExchange = require('../index.js');

var key = 'key';
var secret = 'secret';
var passphrase = 'passphrase';

var authClient = new CoinbaseExchange.AuthenticatedClient(key, secret, passphrase);

test('get product orderbook', function(done) {

  nock('https://api.exchange.coinbase.com')
    .get('/products/BTC-USD/book?level=3')
    .reply(200,  {
      asks : [],
      bids: []
    });

  authClient.getProductOrderBook({level : 3}, 'BTC-USD', function(err, resp, data) {
    assert(data);
    done();
  });
}) 

test('cancel all orders', function(done) {
  // nock three requests to delete /orders

  var cancelledOrdersOne = [
    'deleted-id-1',
    'deleted-id-2',
    'deleted-id-3',
    'deleted-id-4'
  ];

  var cancelledOrdersTwo = [
    'deleted-id-5',
    'deleted-id-6',
    'deleted-id-7',
    'deleted-id-8'
  ];

  var totalExpectedDeleted = cancelledOrdersOne.concat(cancelledOrdersTwo);

  // first list of Id's that just got cancelled
  nock('https://api.exchange.coinbase.com')
  .delete('/orders')
  .reply(200, cancelledOrdersOne);

  // second list of Id's that just got cancelled
  nock('https://api.exchange.coinbase.com')
  .delete('/orders')
  .reply(200, cancelledOrdersTwo);

  // return empty array signalling the completion of all
  // orders having been cancelled
  nock('https://api.exchange.coinbase.com')
  .delete('/orders')
  .reply(200, []);

  authClient.cancelAllOrders(function(err, resp, totalDeletedOrders) {
    assert.ifError(err);
    assert.deepEqual(totalDeletedOrders, totalExpectedDeleted);

    nock.cleanAll();

    done();
  });
});

test('cancel all should be able to handle errors', function(done) {
  nock('https://api.exchange.coinbase.com')
  .delete('/orders')
  .reply(404, null);

  authClient.cancelAllOrders(function(err, resp, totalExpectedDeleted) {
    assert(err);

    nock.cleanAll();

    done();
  });
});
