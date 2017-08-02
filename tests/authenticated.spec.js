const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');

const key = 'key';
const b64secret = 'secret';
const passphrase = 'passphrase';

const { DEFAULT_BOOK_LEVEL, GDAX_API_URI } = require('../lib/constants');

const authClient = new Gdax.AuthenticatedClient(
  key,
  b64secret,
  passphrase,
  undefined,
  undefined,
  {
    rateLimit: Infinity,
  }
);

suite('AuthenticatedClient', () => {
  afterEach(() => nock.cleanAll());

  test('._getSignature()', () => {
    const method = 'PUT';
    const relativeURI = '/orders';
    const opts = {
      method: 'PUT',
      uri: 'https://api.gdax.com/orders',
    };

    const sig = authClient._getSignatureHeaders(method, relativeURI, opts);

    assert.equal(sig['CB-ACCESS-KEY'], key);
    assert.equal(sig['CB-ACCESS-PASSPHRASE'], passphrase);

    assert(sig['CB-ACCESS-TIMESTAMP']);
    assert(sig['CB-ACCESS-SIGN']);
  });

  test('.getAccount()', () => {
    const expectedResponse = {
      id: 'a1b2c3d4',
      balance: '1.100',
      holds: '0.100',
      available: '1.00',
      currency: 'USD',
    };

    nock(GDAX_API_URI)
      .get('/accounts/test-id')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccount('test-id', (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .getAccount('test-id')
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getAccounts()', () => {
    const expectedResponse = [
      {
        id: 'a1b2c3d4',
        balance: '1.100',
        holds: '0.100',
        available: '1.00',
        currency: 'USD',
      },
    ];

    nock(GDAX_API_URI).get('/accounts').times(2).reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccounts((err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .getAccounts()
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getAccountHistory()', () => {
    const expectedResponse = [
      {
        id: '100',
        created_at: '2014-11-07T08:19:27.028459Z',
        amount: '0.001',
        balance: '239.669',
        type: 'fee',
        details: {
          order_id: 'd50ec984-77a8-460a-b958-66f114b0de9b',
          trade_id: '74',
          product_id: 'BTC-USD',
        },
      },
    ];

    nock(GDAX_API_URI)
      .get('/accounts/test-id/ledger')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccountHistory('test-id', (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .getAccountHistory('test-id')
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getAccountHolds()', () => {
    const expectedResponse = [
      {
        id: '82dcd140-c3c7-4507-8de4-2c529cd1a28f',
        account_id: 'e0b3f39a-183d-453e-b754-0c13e5bab0b3',
        created_at: '2014-11-06T10:34:47.123456Z',
        updated_at: '2014-11-06T10:40:47.123456Z',
        amount: '4.23',
        type: 'order',
        ref: '0a205de4-dd35-4370-a285-fe8fc375a273',
      },
    ];

    nock(GDAX_API_URI)
      .get('/accounts/test-id/holds')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.getAccountHolds('test-id', (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient
      .getAccountHolds('test-id')
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.buy()', () => {
    const order = {
      size: '10',
      product_id: 'BTC-USD',
      price: '100',
    };

    const expectedOrder = order;
    expectedOrder.side = 'buy';

    const expectedResponse = {
      id: '0428b97b-bec1-429e-a94c-59992926778d',
    };

    nock(GDAX_API_URI)
      .post('/orders', expectedOrder)
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.buy(order, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient
      .buy(order)
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.buy() market order', () => {
    const order = {
      funds: '20.00',
      product_id: 'BTC-USD',
      type: 'market',
    };

    const expectedOrder = order;
    expectedOrder.side = 'buy';

    const expectedResponse = {
      id: '0428b97b-bec1-429e-a94c-59992926778d',
    };

    nock(GDAX_API_URI)
      .post('/orders', expectedOrder)
      .times(2)
      .reply(200, expectedResponse);

    const cbTest = new Promise((resolve, reject) => {
      authClient.buy(order, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    const promiseTest = cbTest
      .then(() => authClient.buy(order))
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbTest, promiseTest]);
  });

  test('.sell()', () => {
    const order = {
      size: '10',
      product_id: 'BTC-USD',
      price: '100',
    };

    const expectedOrder = order;
    expectedOrder.side = 'sell';

    const expectedResponse = {
      id: '0428b97b-bec1-429e-a94c-59992926778d',
    };

    nock(GDAX_API_URI)
      .post('/orders', expectedOrder)
      .times(2)
      .reply(200, expectedResponse);

    const cbtest = new Promise((resolve, reject) => {
      authClient.sell(order, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    const promisetest = cbtest
      .then(() => authClient.sell(order))
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProductOrderBook()', () => {
    nock(GDAX_API_URI)
      .get(`/products/BTC-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    let cbtest = new Promise((resolve, reject) => {
      authClient.getProductOrderBook({ level: 3 }, 'BTC-USD', (err, data) => {
        if (err) {
          reject(err);
        }
        assert(data);
        resolve();
      });
    });

    let promisetest = authClient
      .getProductOrderBook({ level: 3 }, 'BTC-USD')
      .then(data => assert(data));

    return Promise.all([cbtest, promisetest]);
  });

  suite('.cancelAllOrders()', () => {
    test('cancels all orders', () => {
      const cancelledOrdersOne = [
        'deleted-id-1',
        'deleted-id-2',
        'deleted-id-3',
        'deleted-id-4',
      ];

      const cancelledOrdersTwo = [
        'deleted-id-5',
        'deleted-id-6',
        'deleted-id-7',
        'deleted-id-8',
      ];
      const totalExpectedDeleted = [
        ...cancelledOrdersOne,
        ...cancelledOrdersTwo,
      ];

      const nockSetup = () => {
        // first list of Id's that just got cancelled
        nock(GDAX_API_URI)
          .delete('/orders')
          .reply(200, cancelledOrdersOne)
          // second list of Id's that just got cancelled
          .delete('/orders')
          .reply(200, cancelledOrdersTwo)
          // return empty array signalling the completion of all
          // orders having been cancelled
          .delete('/orders')
          .reply(200, []);
      };

      nockSetup();

      let cbtest = new Promise((resolve, reject) => {
        authClient.cancelAllOrders((err, data) => {
          if (err) {
            reject(err);
          } else {
            assert.deepEqual(data, totalExpectedDeleted);
          }
          resolve();
        });
      });

      return cbtest
        .then(() => {
          nockSetup();
          return authClient.cancelAllOrders();
        })
        .then(data => assert.deepEqual(data, totalExpectedDeleted));
    });

    test('handles errors', () => {
      nock(GDAX_API_URI).delete('/orders').reply(404, null);

      return authClient
        .cancelAllOrders((err, data) => {
          assert(err);
          assert.ifError(data);
        })
        .then(() => assert.fail(`Didn't throw error`))
        .catch(err => assert(err));
    });
  });

  suite('.cancelOrder()', () => {
    test('requires orderID', () => {
      let cbtest = new Promise(resolve => {
        authClient
          .cancelOrder((err, data) => {
            assert(err);
            assert.ifError(data);
            resolve();
          })
          .catch(() => {});
      });

      let promisetest = authClient
        .cancelOrder()
        .catch(err => !assert(err) && true)
        .then(val => assert.strictEqual(val, true));

      return Promise.all([cbtest, promisetest]);
    });

    test('cancels order', () => {
      const expectedResponse = [
        {
          id: 'd50ec984-77a8-460a-b958-66f114b0de9b',
          size: '3.0',
          price: '100.23',
          product_id: 'BTC-USD',
          status: 'open',
          filled_size: '1.23',
          fill_fees: '0.001',
          settled: false,
          side: 'buy',
          created_at: '2014-11-14T06:39:55.189376Z',
        },
      ];

      nock(GDAX_API_URI).get('/orders').times(2).reply(200, expectedResponse);

      let cbtest = new Promise((resolve, reject) => {
        authClient.getOrders((err, data) => {
          if (err) {
            reject(err);
          }
          assert.deepEqual(data, expectedResponse);
          resolve();
        });
      });

      let promisetest = authClient
        .getOrders()
        .then(data => assert.deepEqual(data, expectedResponse));

      return Promise.all([cbtest, promisetest]);
    });
  });

  test('.getFills()', () => {
    const expectedResponse = [
      {
        trade_id: 74,
        product_id: 'BTC-USD',
        price: '10.00',
        size: '0.01',
        order_id: 'd50ec984-77a8-460a-b958-66f114b0de9b',
        created_at: '2014-11-07T22:19:28.578544Z',
        liquidity: 'T',
        fee: '0.00025',
        settled: true,
        side: 'buy',
      },
    ];

    nock(GDAX_API_URI).get('/fills').times(2).reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.getFills((err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient
      .getFills()
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getFundings()', () => {
    const expectedResponse = [
      {
        id: '280c0a56-f2fa-4d3b-a199-92df76fff5cd',
        order_id: '280c0a56-f2fa-4d3b-a199-92df76fff5cd',
        profile_id: 'd881e5a6-58eb-47cd-b8e2-8d9f2e3ec6f6',
        amount: '545.2400000000000000',
        status: 'outstanding',
        created_at: '2017-03-18T00:34:34.270484Z',
        currency: 'USD',
        repaid_amount: '532.7580047716682500',
      },
    ];

    nock(GDAX_API_URI).get('/funding').times(2).reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.getFundings((err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient.getFundings();

    return Promise.all([cbtest, promisetest]);
  });

  test('.repay()', () => {
    const params = {
      amount: 10000,
      currency: 'USD',
    };

    nock(GDAX_API_URI).post('/funding/repay', params).times(2).reply(200, {}); // TODO mock with actual data

    let cbtest = new Promise((resolve, reject) => {
      authClient.repay(params, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, {});
        resolve();
      });
    });

    let promisetest = authClient.repay(params);

    return Promise.all([cbtest, promisetest]);
  });

  test('.marginTransfer()', () => {
    const params = {
      margin_profile_id: '45fa9e3b-00ba-4631-b907-8a98cbdf21be',
      type: 'deposit',
      currency: 'USD',
      amount: 2,
    };
    const expectedResponse = {
      created_at: '2017-01-25T19:06:23.415126Z',
      id: '80bc6b74-8b1f-4c60-a089-c61f9810d4ab',
      user_id: '521c20b3d4ab09621f000011',
      profile_id: 'cda95996-ac59-45a3-a42e-30daeb061867',
      margin_profile_id: '45fa9e3b-00ba-4631-b907-8a98cbdf21be',
      type: 'deposit',
      amount: '2',
      currency: 'USD',
      account_id: '23035fc7-0707-4b59-b0d2-95d0c035f8f5',
      margin_account_id: 'e1d9862c-a259-4e83-96cd-376352a9d24d',
      margin_product_id: 'BTC-USD',
      status: 'completed',
      nonce: 25,
    };

    nock(GDAX_API_URI)
      .post('/profiles/margin-transfer', params)
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.marginTransfer(params, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient.marginTransfer(params);

    return Promise.all([cbtest, promisetest]);
  });

  test('.closePosition()', () => {
    const params = {
      repay_only: false,
    };

    nock(GDAX_API_URI).post('/position/close', params).times(2).reply(200, {}); // TODO mock with real data

    let cbtest = new Promise((resolve, reject) => {
      authClient.closePosition(params, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, {});
        resolve();
      });
    });

    let promisetest = authClient.closePosition(params);

    return Promise.all([cbtest, promisetest]);
  });

  test('.deposit()', () => {
    const transfer = {
      amount: 10480,
      coinbase_account_id: 'test-id',
    };

    const expectedTransfer = transfer;
    expectedTransfer.type = 'deposit';

    nock(GDAX_API_URI)
      .post('/transfers', expectedTransfer)
      .times(2)
      .reply(200, {}); // TODO mock with real data;

    let cbtest = new Promise((resolve, reject) => {
      authClient.deposit(transfer, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, {});
        resolve();
      });
    });

    let promisetest = authClient.deposit(transfer);

    return Promise.all([cbtest, promisetest]);
  });

  test('.withdraw()', () => {
    const transfer = {
      amount: 10480,
      coinbase_account_id: 'test-id',
    };

    const expectedTransfer = transfer;
    expectedTransfer.type = 'withdraw';

    nock(GDAX_API_URI)
      .post('/transfers', expectedTransfer)
      .times(2)
      .reply(200, {}); // TODO mock with real data

    let cbtest = new Promise((resolve, reject) => {
      authClient.withdraw(transfer, (err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, {});
        resolve();
      });
    });

    let promisetest = authClient.withdraw(transfer);

    return Promise.all([cbtest, promisetest]);
  });
});
