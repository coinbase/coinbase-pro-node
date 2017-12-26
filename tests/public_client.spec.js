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

    client = new Gdax.PublicClient('https://api-public.sandbox.gdax.com');
    assert.equal(client.apiURI, 'https://api-public.sandbox.gdax.com');
  });

  // Delete this test when the deprecation is final
  test('.constructor() (with deprecated signature accepting a product ID)', () => {
    let client = new Gdax.PublicClient('LTC-USD');
    assert.equal(client.apiURI, EXCHANGE_API_URL);
    assert.equal(client.productID, 'LTC-USD');
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

  test('.getProductTrades()', done => {
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
      .get('/products/BTC-USD/trades')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      publicClient.getProductTrades((err, resp, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });
    });

    let promisetest = publicClient
      .getProductTrades()
      .then(data => assert.deepEqual(data, expectedResponse));

    Promise.all([cbtest, promisetest])
      .then(() => done())
      .catch(err => assert.isError(err) || assert.fail());
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
});
