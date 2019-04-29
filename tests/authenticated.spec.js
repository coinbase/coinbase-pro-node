const assert = require('assert');
const nock = require('nock');

const CoinbasePro = require('../index.js');

const key = 'key';
const secret = 'secret';
const passphrase = 'passphrase';

const EXCHANGE_API_URL = 'https://api.pro.coinbase.com';

const authClient = new CoinbasePro.AuthenticatedClient(key, secret, passphrase);

suite('AuthenticatedClient', () => {
  afterEach(() => nock.cleanAll());

  test('._getSignature()', () => {
    const method = 'PUT';
    const relativeURI = '/orders';
    const opts = {
      method: 'PUT',
      uri: 'https://api.pro.coinbase.com/orders',
    };

    const sig = authClient._getSignature(method, relativeURI, opts);

    assert.equal(sig['CB-ACCESS-KEY'], key);
    assert.equal(sig['CB-ACCESS-PASSPHRASE'], passphrase);

    assert(sig['CB-ACCESS-TIMESTAMP']);
    assert(sig['CB-ACCESS-SIGN']);
  });

  test('.getCoinbaseAccounts()', done => {
    const expectedResponse = [
      {
        id: 'fc3a8a57-7142-542d-8436-95a3d82e1622',
        name: 'ETH Wallet',
        balance: '0.00000000',
        currency: 'ETH',
        type: 'wallet',
        primary: false,
        active: true,
      },
    ];

    nock(EXCHANGE_API_URL)
      .get('/coinbase-accounts')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getCoinbaseAccounts((err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .getCoinbaseAccounts()
      .then(data => assert.deepEqual(data, expectedResponse));

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getAccount()', done => {
    const expectedResponse = {
      id: 'a1b2c3d4',
      balance: '1.100',
      holds: '0.100',
      available: '1.00',
      currency: 'USD',
    };

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccount('test-id', (err, resp, data) => {
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

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getAccounts()', done => {
    const expectedResponse = [
      {
        id: 'a1b2c3d4',
        balance: '1.100',
        holds: '0.100',
        available: '1.00',
        currency: 'USD',
      },
    ];

    nock(EXCHANGE_API_URL)
      .get('/accounts')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccounts((err, resp, data) => {
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

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getAccountHistory()', done => {
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

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/ledger')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccountHistory('test-id', (err, resp, data) => {
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

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getAccountTransfers()', done => {
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

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/transfers')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getAccountTransfers('test-id', (err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .getAccountTransfers('test-id')
      .then(data => assert.deepEqual(data, expectedResponse));

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getAccountHolds()', done => {
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

    nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/holds')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.getAccountHolds('test-id', (err, resp, data) => {
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

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.placeOrder()', done => {
    const order = {
      side: 'buy',
      funds: '20.00',
      product_id: 'ETH-USD',
      type: 'market',
    };

    const expectedOrder = order;

    const expectedResponse = {
      id: '0428b97b-bec1-429e-a94c-59992926778d',
    };

    nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .reply(200, expectedResponse);

    authClient.placeOrder(order, (err, resp, data) => {
      assert.ifError(err);
      assert.deepEqual(data, expectedResponse);

      nock.cleanAll();
      done();
    });
  });

  test('.buy()', done => {
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

    nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.buy(order, (err, resp, data) => {
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

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.buy() market order', done => {
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

  test('.sell()', done => {
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

    nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.sell(order, (err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient
      .sell(order)
      .then(data => assert.deepEqual(data, expectedResponse));

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
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
      const totalExpectedDeleted = cancelledOrdersOne.concat(
        cancelledOrdersTwo
      );

      const nockSetup = () => {
        // first list of Id's that just got cancelled
        nock(EXCHANGE_API_URL)
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
        const p = authClient.cancelAllOrders((err, resp, data) => {
          if (err) {
            reject(err);
          } else {
            assert.deepEqual(data, totalExpectedDeleted);
          }
          resolve();
        });

        if (p !== undefined) {
          reject();
        }
      });

      return cbtest
        .then(() => {
          nockSetup();
          return authClient.cancelAllOrders();
        })
        .then(data => assert.deepEqual(data, totalExpectedDeleted));
    });

    test('handles errors', () => {
      nock(EXCHANGE_API_URL)
        .delete('/orders')
        .times(2)
        .reply(400, { message: 'some error' });

      const cbtest = new Promise((resolve, reject) => {
        authClient.cancelAllOrders(err => {
          if (err) {
            assert.equal(err.response.statusCode, 400);
            assert.equal(err.data.message, 'some error');
            resolve();
          } else {
            reject();
          }
        });
      });

      const promisetest = authClient
        .cancelAllOrders()
        .then(() => assert.fail('should have thrown an error'))
        .catch(err => {
          assert.equal(err.response.statusCode, 400);
          assert.equal(err.data.message, 'some error');
        });

      return Promise.all([cbtest, promisetest]);
    });
  });

  suite('.cancelOrder()', () => {
    test('requires orderID', done => {
      let cbtest = new Promise(resolve => {
        authClient
          .cancelOrder(err => {
            assert(err);
            resolve();
          })
          .catch(() => {});
      });

      let promisetest = authClient
        .cancelOrder()
        .catch(err => !assert(err) && true)
        .then(val => assert.strictEqual(val, true));

      Promise.all([cbtest, promisetest])
        .then(() => done())
        .catch(err => assert.ifError(err) || assert.fail());
    });

    test('cancels order', done => {
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

      nock(EXCHANGE_API_URL)
        .get('/orders')
        .times(2)
        .reply(200, expectedResponse);

      let cbtest = new Promise((resolve, reject) => {
        authClient.getOrders((err, resp, data) => {
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

      Promise.all([cbtest, promisetest])
        .then(() => done())
        .catch(err => assert.ifError(err) || assert.fail());
    });
  });

  test('.getFills()', done => {
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

    nock(EXCHANGE_API_URL)
      .get('/fills')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.getFills((err, response, data) => {
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

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getFundings()', done => {
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

    nock(EXCHANGE_API_URL)
      .get('/funding')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.getFundings((err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient.getFundings();

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.repay()', done => {
    const params = {
      amount: 10000,
      currency: 'USD',
    };

    nock(EXCHANGE_API_URL)
      .post('/funding/repay', params)
      .reply(200, {});
    nock(EXCHANGE_API_URL)
      .post('/funding/repay', params)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.repay(params, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.repay(params);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.marginTransfer()', done => {
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

    nock(EXCHANGE_API_URL)
      .post('/profiles/margin-transfer', params)
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.marginTransfer(params, (err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = authClient.marginTransfer(params);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.closePosition()', done => {
    const params = {
      repay_only: false,
    };

    nock(EXCHANGE_API_URL)
      .post('/position/close', params)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.closePosition(params, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.closePosition(params);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.convert()', done => {
    const transfer = {
      from: 'USD',
      to: 'USDC',
      amount: '100',
    };

    const expectedTransfer = transfer;

    nock(EXCHANGE_API_URL)
      .post('/conversions', expectedTransfer)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.convert(transfer, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.convert(transfer);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.deposit()', done => {
    const transfer = {
      amount: 10480,
      currency: 'USD',
      coinbase_account_id: 'test-id',
    };

    const expectedTransfer = transfer;

    nock(EXCHANGE_API_URL)
      .post('/deposits/coinbase-account', expectedTransfer)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.deposit(transfer, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.deposit(transfer);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.depositPayment()', done => {
    const transfer = {
      amount: 10480,
      currency: 'USD',
      payment_method_id: 'test-id',
    };

    const expectedTransfer = transfer;

    nock(EXCHANGE_API_URL)
      .post('/deposits/payment-method', expectedTransfer)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.depositPayment(transfer, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.depositPayment(transfer);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.depositCrypto()', done => {
    const params = {
      currency: 'BTC',
    };
    const expectedAccountsRespons = [
      {
        id: 'test-id',
        name: 'BTC Wallet',
        balance: '0.00000000',
        currency: 'BTC',
        type: 'wallet',
        primary: true,
        active: true,
      },
    ];
    const expectedAddressResponse = {
      id: 'test-id',
      address: 'test-address',
      name: 'New exchange deposit address',
      created_at: '2018-02-18T06:26:10Z',
      updated_at: '2018-02-18T06:26:10Z',
      network: 'bitcoin',
      uri_scheme: 'bitcoin',
      resource: 'address',
      resource_path: '/v2/accounts/test-account-id/addresses/test-id',
      warning_title: 'Only send Bitcoin (BTC) to this address',
      warning_details:
        'Sending any other digital asset, including Bitcoin Cash (BCH), will result in permanent loss.',
      callback_url: null,
      exchange_deposit_address: true,
    };

    nock(EXCHANGE_API_URL)
      .get('/coinbase-accounts')
      .times(2)
      .reply(200, expectedAccountsRespons);
    nock(EXCHANGE_API_URL)
      .post('/coinbase-accounts/test-id/addresses')
      .times(2)
      .reply(200, expectedAddressResponse);

    let cbtest = new Promise((resolve, reject) => {
      authClient.depositCrypto(params, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.depositCrypto(params);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.withdraw()', done => {
    const transfer = {
      amount: 10480,
      currency: 'USD',
      coinbase_account_id: 'test-id',
    };

    const expectedTransfer = transfer;

    nock(EXCHANGE_API_URL)
      .post('/withdrawals/coinbase-account', expectedTransfer)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.withdraw(transfer, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.withdraw(transfer);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.withdrawPayment()', done => {
    const transfer = {
      amount: 10480,
      currency: 'USD',
      payment_method_id: 'test-id',
    };

    const expectedTransfer = transfer;

    nock(EXCHANGE_API_URL)
      .post('/withdrawals/payment-method', expectedTransfer)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.withdrawPayment(transfer, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.withdrawPayment(transfer);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.createReport()', done => {
    const params = {
      type: 'fills',
      start_date: '2014-11-01T00:00:00.000Z',
      end_date: '2014-11-30T23:59:59.000Z',
      product_id: 'BTC-USD',
      format: 'pdf',
    };
    const expectedResponse = {
      id: 'test-id',
      type: 'fills',
      status: 'pending',
      created_at: '2015-01-06T10:34:47.000Z',
      completed_at: 'undefined',
      expires_at: '2015-01-13T10:35:47.000Z',
      file_url: 'undefined',
      params: {
        start_date: '2014-11-01T00:00:00.000Z',
        end_date: '2014-11-30T23:59:59.000Z',
      },
    };

    nock(EXCHANGE_API_URL)
      .post('/reports', params)
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.createReport(params, (err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .createReport(params)
      .then(data => assert.deepEqual(data, expectedResponse));

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.getReportStatus()', done => {
    const expectedResponse = {
      id: 'test-id',
      type: 'fills',
      status: 'ready',
      created_at: '2015-01-06T10:34:47.000Z',
      completed_at: '2015-01-06T10:35:47.000Z',
      expires_at: '2015-01-13T10:35:47.000Z',
      file_url: 'https://example.com/0428b97b.../fills.pdf',
      params: {
        start_date: '2014-11-01T00:00:00.000Z',
        end_date: '2014-11-30T23:59:59.000Z',
      },
    };

    nock(EXCHANGE_API_URL)
      .get('/reports/test-id')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) =>
      authClient.getReportStatus('test-id', (err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      })
    );

    let promisetest = authClient
      .getReportStatus('test-id')
      .then(data => assert.deepEqual(data, expectedResponse));

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });

  test('.withdrawCrypto()', done => {
    const withdrawParams = {
      amount: 10480,
      currency: 'BTC',
      crypto_address: 'test-address',
    };

    nock(EXCHANGE_API_URL)
      .post('/withdrawals/crypto', withdrawParams)
      .times(2)
      .reply(200, {});

    let cbtest = new Promise((resolve, reject) => {
      authClient.withdrawCrypto(withdrawParams, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    let promisetest = authClient.withdrawCrypto(withdrawParams);

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.ifError(err) || assert.fail());
  });
});
