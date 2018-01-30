const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');
const publicClient = new Gdax.PublicClient();

const EXCHANGE_API_URL = 'https://api.gdax.com';

suite('PublicClient', () => {
  afterEach(() => nock.cleanAll());

  test('.constructor()', () => {
    let client = new Gdax.PublicClient();
    assert.equal(client.apiURI, EXCHANGE_API_URL);
    assert.equal(client.API_LIMIT, 100);
    assert.equal(client.productID, 'BTC-USD'); // deprecated
    assert.equal(client.timeout, 10000);

    client = new Gdax.PublicClient('https://api-public.sandbox.gdax.com');
    assert.equal(client.apiURI, 'https://api-public.sandbox.gdax.com');
  });

  // Delete this test when the deprecation is final
  test('.constructor() (with deprecated signature accepting a product ID)', () => {
    let client = new Gdax.PublicClient('LTC-USD');
    assert.equal(client.apiURI, EXCHANGE_API_URL);
    assert.equal(client.productID, 'LTC-USD');
  });

  suite('.request()', () => {
    test('handles errors', () => {
      nock(EXCHANGE_API_URL)
        .get('/some/path')
        .times(2)
        .reply(400, { message: 'some error' });

      const cbtest = new Promise((resolve, reject) => {
        publicClient.request('get', ['some', 'path'], {}, err => {
          if (err) {
            assert.equal(err.message, 'HTTP 400 Error: some error');
            assert.equal(err.response.statusCode, 400);
            assert.equal(err.data.message, 'some error');
            resolve();
          } else {
            reject();
          }
        });
      });

      const promisetest = publicClient
        .request('get', ['some', 'path'])
        .then(() => assert.fail('should have thrown an error'))
        .catch(err => {
          assert.equal(err.message, 'HTTP 400 Error: some error');
          assert.equal(err.response.statusCode, 400);
          assert(err.data.message, 'some error');
        });

      return Promise.all([cbtest, promisetest]);
    });
  });

  test('.getProductOrderBook()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/LTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductOrderBook(
        'LTC-USD',
        { level: 3 },
        (err, resp, data) => {
          if (err) {
            reject(err);
          }
          assert(data);
          resolve();
        }
      );
    });

    const promisetest = publicClient
      .getProductOrderBook('LTC-USD', { level: 3 })
      .then(data => assert(data));

    return Promise.all([cbtest, promisetest]);
  });

  // Delete this test when the deprecation is final
  test('.getProductOrderBook() (with deprecated signature implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=2')
      .reply(200, {
        asks: [],
        bids: [],
      });

    return publicClient
      .getProductOrderBook({ level: 2 })
      .then(data => assert(data));
  });

  test('.getProductTrades()', () => {
    const expectedResponse = [
      {
        time: '2014-11-07T22:19:28.578544Z',
        trade_id: 74,
        price: '10.00000000',
        size: '0.01000000',
        side: 'buy',
      },
      {
        time: '2014-11-07T01:08:43.642366Z',
        trade_id: 73,
        price: '100.00000000',
        size: '0.01000000',
        side: 'sell',
      },
    ];

    nock(EXCHANGE_API_URL)
      .get('/products/LTC-USD/trades')
      .times(2)
      .reply(200, expectedResponse);

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductTrades('LTC-USD', (err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    const promisetest = publicClient
      .getProductTrades('LTC-USD')
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  // Delete this test when the deprecation is final
  test('.getProductTrades() (with deprecated signature implying default product ID)', () => {
    const expectedResponse = [
      {
        time: '2014-11-07T22:19:28.578544Z',
        trade_id: 74,
        price: '10.00000000',
        size: '0.01000000',
        side: 'buy',
      },
    ];

    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/trades')
      .reply(200, expectedResponse);

    return publicClient
      .getProductTrades()
      .then(data => assert.deepEqual(data, expectedResponse));
  });

  test('.getProductTicker()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/ticker')
      .times(2)
      .reply(200, {
        trade_id: 'test-id',
        price: '9.00',
        size: '5',
      });

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductTicker('ETH-USD', (err, resp, data) => {
        if (err) {
          reject(err);
        }

        assert.equal(data.trade_id, 'test-id');
        assert(data.price, '9.00');
        assert(data.size, '5');

        resolve();
      });
    });

    const promisetest = publicClient.getProductTicker('ETH-USD').then(data => {
      assert.equal(data.trade_id, 'test-id');
      assert.equal(data.price, '9.00');
      assert.equal(data.size, '5');
    });

    return Promise.all([cbtest, promisetest]);
  });

  // Delete this test when the deprecation is final
  test('.getProductTicker() (with deprecated signature implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/ticker')
      .reply(200, {
        trade_id: 'test-id',
        price: '90.00',
        size: '2',
      });

    return publicClient.getProductTicker().then(data => {
      assert.equal(data.trade_id, 'test-id');
      assert.equal(data.price, '90.00');
      assert.equal(data.size, '2');
    });
  });

  suite('.getProductTradeStream()', () => {
    const from = 8408014;
    const to = 8409426;

    test('streams trades', done => {
      nock.load('./tests/mocks/pubclient_stream_trades.json');

      let last = from;
      let current;

      publicClient
        .getProductTradeStream('BTC-USD', from, to)
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert((current = to - 1));
          done();
        })
        .on('error', err => {
          assert.fail(err);
        });
    });

    // Delete this test when the deprecation is final
    test('streams trades (with deprecated signature implying default product ID)', done => {
      nock.load('./tests/mocks/pubclient_stream_trades.json');

      let last = from;
      let current;

      publicClient
        .getProductTradeStream(from, to)
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert((current = to - 1));
          done();
        })
        .on('error', err => {
          assert.fail(err);
        });
    });

    test('.getProductTradeStream() with function', done => {
      nock.load('./tests/mocks/pubclient_stream_trades_function.json');
      let last = from;
      let current;

      publicClient
        .getProductTradeStream(
          'BTC-USD',
          from,
          trade => Date.parse(trade.time) >= 1463068800000
        )
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert.equal(last, 8409426, last);
          done();
        });
    });

    test('.getProductTradeStream() with current date function', done => {
      nock.load('./tests/mocks/pubclient_stream_trades_function.json');
      let last = from;
      let current;

      publicClient
        .getProductTradeStream(
          'BTC-USD',
          from,
          trade => Date.parse(trade.time) >= Date.now()
        )
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert.equal(last, 8409514, last);
          done();
        });
    });
  });

  test('.getProductHistoricRates()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/candles')
      .times(2)
      .reply(200, [
        [1514273340, 759.75, 759.97, 759.75, 759.97, 8.03891157],
        [1514273280, 758.99, 759.74, 758.99, 759.74, 17.36616621],
        [1514273220, 758.99, 759, 759, 759, 10.6524787],
      ]);

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductHistoricRates('ETH-USD', (err, resp, data) => {
        if (err) {
          reject(err);
        }

        assert.equal(data[0][0], 1514273340);
        assert.equal(data[0][1], 759.75);
        assert.equal(data[2][0], 1514273220);

        resolve();
      });
    });

    const promisetest = publicClient
      .getProductHistoricRates('ETH-USD')
      .then(data => {
        assert.equal(data[0][0], 1514273340);
        assert.equal(data[0][1], 759.75);
        assert.equal(data[2][0], 1514273220);
      });

    return Promise.all([cbtest, promisetest]);
  });

  // Delete this test when the deprecation is final
  test('.getProductHistoricRates() (with deprecated signature implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/candles')
      .reply(200, [
        [1514273220, 15399.99, 15400, 15399, 15399, 0.369797],
        [1514273160, 15399.99, 15400, 15400, 15400, 0.673643],
        [1514273100, 15399.99, 15400, 15400, 15400, 0.849436],
      ]);

    return publicClient.getProductHistoricRates().then(data => {
      assert.equal(data[0][0], 1514273220);
      assert.equal(data[0][1], 15399.99);
      assert.equal(data[2][0], 1514273100);
    });
  });

  test('.getProduct24HrStats()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/stats')
      .times(2)
      .reply(200, {
        open: '720',
        high: '770',
        low: '710',
        volume: '110000',
        last: '760',
        volume_30day: '9800000',
      });

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProduct24HrStats('ETH-USD', (err, resp, data) => {
        if (err) {
          reject(err);
        }

        assert.equal(data.open, 720);
        assert.equal(data.high, 770);
        assert.equal(data.volume, 110000);

        resolve();
      });
    });

    const promisetest = publicClient
      .getProduct24HrStats('ETH-USD')
      .then(data => {
        assert.equal(data.open, 720);
        assert.equal(data.high, 770);
        assert.equal(data.volume, 110000);
      });

    return Promise.all([cbtest, promisetest]);
  });

  // Delete this test when the deprecation is final
  test('.getProduct24HrStats() (with deprecated signature implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/stats')
      .reply(200, {
        open: '14000',
        high: '15700',
        low: '13800',
        volume: '17400',
        last: '15300',
        volume_30day: '1100000',
      });

    return publicClient.getProduct24HrStats().then(data => {
      assert.equal(data.open, 14000);
      assert.equal(data.high, 15700);
      assert.equal(data.volume, 17400);
    });
  });
});
