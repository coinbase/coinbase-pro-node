/**
 > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 > SOFTWARE.
 */

/* eslint camelcase: ["error", {properties: "never"}] */

'use strict';

let assert = require('assert');
let nock = require('nock');

let AuthenticatedClient = require('../lib/clients/authenticated');

let key = 'key';
let secret = 'secret';
let passphrase = 'passphrase';

let EXCHANGE_API_URL = 'https://api.gdax.com';

let authClient = new AuthenticatedClient(key, secret, passphrase);
/** @test {AuthenticatedClient} */
describe('AuthenticatedClient', () => {
  /** @test {AuthenticatedClient#_getSignature} */
  test('._getSignature', () => {
    let method = 'PUT';
    let relativeURI = '/orders';
    let opts = {
      method: 'PUT',
      uri: 'https://api.gdax.com/orders',
    };

    let sig = authClient._getSignature(method, relativeURI, opts);

    assert.equal(sig['CB-ACCESS-KEY'], key);
    assert.equal(sig['CB-ACCESS-PASSPHRASE'], passphrase);

    assert(sig['CB-ACCESS-TIMESTAMP']);
    assert(sig['CB-ACCESS-SIGN']);
  });

  /** @test {AuthenticatedClient#getAccount} */
  test('get account', (done) => {
    let expectedResponse = {
      'id': 'a1b2c3d4',
      'balance': '1.100',
      'holds': '0.100',
      'available': '1.00',
      'currency': 'USD',
    };

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id')
      .reply(200, expectedResponse);

    authClient.getAccount('test-id', (err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#getAccounts} */
  test('get accounts', (done) => {
    let expectedResponse = [{
      'id': 'a1b2c3d4',
      'balance': '1.100',
      'holds': '0.100',
      'available': '1.00',
      'currency': 'USD',
    }];

    nock(EXCHANGE_API_URL)
      .get('/accounts')
      .reply(200, expectedResponse);

    authClient.getAccounts((err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#getAccountHistory} */
  test('get account history', (done) => {
    let expectedResponse = [{
      'id': '100',
      'created_at': '2014-11-07T08:19:27.028459Z',
      'amount': '0.001',
      'balance': '239.669',
      'type': 'fee',
      'details': {
        'order_id': 'd50ec984-77a8-460a-b958-66f114b0de9b',
        'trade_id': '74',
        'product_id': 'BTC-USD',
      },
    }];

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/ledger')
      .reply(200, expectedResponse);

    authClient.getAccountHistory('test-id', (err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#getAccountHolds} */
  test('get account holds', (done) => {
    let expectedResponse = [{
      'id': '82dcd140-c3c7-4507-8de4-2c529cd1a28f',
      'account_id': 'e0b3f39a-183d-453e-b754-0c13e5bab0b3',
      'created_at': '2014-11-06T10:34:47.123456Z',
      'updated_at': '2014-11-06T10:40:47.123456Z',
      'amount': '4.23',
      'type': 'order',
      'ref': '0a205de4-dd35-4370-a285-fe8fc375a273',
    }];

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/holds')
      .reply(200, expectedResponse);

    authClient.getAccountHolds('test-id', (err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#buy} */
  test('buy order', (done) => {
    // noinspection Eslint
    let order = {
      size: '10',
      product_id: 'BTC-USD',
      price: '100',
    };

    let expectedOrder = order;
    expectedOrder.side = 'buy';

    let expectedResponse = {
      'id': '0428b97b-bec1-429e-a94c-59992926778d',
    };

    nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .reply(200, expectedResponse);

    authClient.buy(order, (err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#sell} */
  test('sell order', (done) => {
    // noinspection Eslint
    let order = {
      size: '10',
      product_id: 'BTC-USD',
      price: '100',
    };

    let expectedOrder = order;
    expectedOrder.side = 'sell';

    let expectedResponse = {
      'id': '0428b97b-bec1-429e-a94c-59992926778d',
    };

    nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .reply(200, expectedResponse);

    authClient.sell(order, (err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#getProductOrderBook} */
  test('get product orderbook', (done) => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    authClient.getProductOrderBook({level: 3}, 'BTC-USD',
      (err, resp, data) => {
        assert(data);
        done();
      });
  });

  /** @test {AuthenticatedClient#cancelAllOrders} */
  test('cancel all orders', (done) => {
    // nock three requests to delete /orders

    let cancelledOrdersOne = [
      'deleted-id-1',
      'deleted-id-2',
      'deleted-id-3',
      'deleted-id-4',
    ];

    let cancelledOrdersTwo = [
      'deleted-id-5',
      'deleted-id-6',
      'deleted-id-7',
      'deleted-id-8',
    ];

    let totalExpectedDeleted = cancelledOrdersOne.concat(cancelledOrdersTwo);

    // first list of Id's that just got cancelled
    nock(EXCHANGE_API_URL)
      .delete('/orders')
      .reply(200, cancelledOrdersOne);

    // second list of Id's that just got cancelled
    nock(EXCHANGE_API_URL)
      .delete('/orders')
      .reply(200, cancelledOrdersTwo);

    // return empty array signalling the completion of all
    // orders having been cancelled
    nock(EXCHANGE_API_URL)
      .delete('/orders')
      .reply(200, []);

    authClient.cancelAllOrders((err, resp, totalDeletedOrders) => {
      assert.ifError(err);
      assert.deepEqual(totalDeletedOrders, totalExpectedDeleted);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#cancelOrder} */
  test('should require orderID for cancelOrder', (done) => {
    authClient.cancelOrder((err, resp, data) => {
      assert(err);
      done();
    });
  });

  /** @test {AuthenticatedClient#getOrders} */
  test('get orders', (done) => {
    let expectedResponse = [{
      'id': 'd50ec984-77a8-460a-b958-66f114b0de9b',
      'size': '3.0',
      'price': '100.23',
      'product_id': 'BTC-USD',
      'status': 'open',
      'filled_size': '1.23',
      'fill_fees': '0.001',
      'settled': false,
      'side': 'buy',
      'created_at': '2014-11-14T06:39:55.189376Z',
    }];

    nock(EXCHANGE_API_URL)
      .get('/orders')
      .reply(200, expectedResponse);

    authClient.getOrders((err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#getOrder} */
  test('should require orderID for getOrder', (done) => {
    authClient.getOrder((err, resp, data) => {
      assert(err);
      done();
    });
  });

  /** @test {AuthenticatedClient#getFills} */
  test('get fills', (done) => {
    let expectedResponse = [{
      'trade_id': 74,
      'product_id': 'BTC-USD',
      'price': '10.00',
      'size': '0.01',
      'order_id': 'd50ec984-77a8-460a-b958-66f114b0de9b',
      'created_at': '2014-11-07T22:19:28.578544Z',
      'liquidity': 'T',
      'fee': '0.00025',
      'settled': true,
      'side': 'buy',
    }];

    nock(EXCHANGE_API_URL)
      .get('/fills')
      .reply(200, expectedResponse);


    authClient.getFills((err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#deposit} */
  test('deposit', (done) => {
    let transfer = {
      'amount': 10480,
      'coinbase_account_id': 'test-id',
    };

    let expectedTransfer = transfer;
    expectedTransfer.type = 'deposit';

    nock(EXCHANGE_API_URL)
      .post('/transfers', expectedTransfer)
      .reply(200, {});

    authClient.deposit(transfer, (err, resp, data) => {
      assert.ifError(err);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#withdraw} */
  test('withdraw', (done) => {
    let transfer = {
      'amount': 10480,
      'coinbase_account_id': 'test-id',
    };

    let expectedTransfer = transfer;
    expectedTransfer.type = 'withdraw';

    nock(EXCHANGE_API_URL)
      .post('/transfers', expectedTransfer)
      .reply(200, {});

    authClient.withdraw(transfer, (err, resp, data) => {
      assert.ifError(err);

      nock.cleanAll();
      done();
    });
  });

  /** @test {AuthenticatedClient#cancelAllOrders} */
  test('cancel all should be able to handle errors', (done) => {
    nock(EXCHANGE_API_URL)
      .delete('/orders')
      .reply(404, null);

    authClient.cancelAllOrders((err, resp, totalExpectedDeleted) => {
      assert(err);

      nock.cleanAll();
      done();
    });
  });
});
