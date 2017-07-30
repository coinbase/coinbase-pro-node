const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');
const publicClient = new Gdax.PublicClient(undefined, undefined, {
  rateLimit: Infinity,
});

const EXCHANGE_API_URL = 'https://api.gdax.com';

suite('PublicClient', () => {
  afterEach(() => nock.cleanAll());

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
      .get('/products/BTC-USD/trades')
      .times(2)
      .reply(200, expectedResponse);

    let cbtest = new Promise((resolve, reject) => {
      const p = publicClient.getProductTrades((err, data) => {
        if (err) {
          reject(err);
        }
        assert.deepEqual(data, expectedResponse);
        resolve();
      });

      if (typeof p !== 'undefined') {
        reject('Should not return Promise when callback provided.');
      }
    });

    let promisetest = publicClient
      .getProductTrades()
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProductTicker() should return values', () => {
    nock(EXCHANGE_API_URL).get('/products/BTC-USD/ticker').times(2).reply(200, {
      trade_id: 'test-id',
      price: '9.00',
      size: '5',
    });

    let cbtest = new Promise((resolve, reject) => {
      publicClient.getProductTicker((err, data) => {
        if (err) {
          reject(err);
        }

        assert.equal(data.trade_id, 'test-id');
        assert(data.price, '9.00');
        assert(data.size, '5');

        resolve();
      });
    });

    let promisetest = publicClient.getProductTicker().then(data => {
      assert.equal(data.trade_id, 'test-id');
      assert.equal(data.price, '9.00');
      assert.equal(data.size, '5');
    });

    return Promise.all([cbtest, promisetest]);
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
        .on('data', trade => {
          current = trade.trade_id;
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
  });
});
