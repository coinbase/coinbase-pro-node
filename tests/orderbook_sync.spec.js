const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');

const testserver = require('./lib/ws_testserver');
let port = 56632;

const { DEFAULT_BOOK_LEVEL, GDAX_API_URI } = require('../lib/constants');

const key = 'key';
const b64secret = 'secret';
const passphrase = 'passphrase';

suite('OrderbookSync', () => {
  test('emits a message event', done => {
    nock(GDAX_API_URI)
      .get(`/products/BTC-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        'ws://localhost:' + port
      );
      orderbookSync.on('message', data => {
        assert.deepEqual(data, {
          test: true,
          product_id: 'BTC-USD',
        });
        server.close();
        done();
      });
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ test: true, product_id: 'BTC-USD' }));
    });
  });

  test('emits a message event (with AuthenticatedClient)', done => {
    nock(GDAX_API_URI)
      .get(`/products/BTC-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const authClient = new Gdax.AuthenticatedClient(
        key,
        b64secret,
        passphrase,
        {
          rateLimit: false,
        }
      );
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        'ws://localhost:' + port,
        authClient
      );
      orderbookSync.on('message', data => {
        assert.deepEqual(data, {
          test: true,
          product_id: 'BTC-USD',
        });
        server.close();
        done();
      });
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ test: true, product_id: 'BTC-USD' }));
    });
  });

  test('emits an error event on error', done => {
    nock(GDAX_API_URI)
      .get(`/products/BTC-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .replyWithError('whoops');

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        'ws://localhost:' + port
      );

      orderbookSync.on('message', () =>
        assert.fail('should not have emitted message')
      );
      orderbookSync.on('error', err =>
        assert.equal(err.message, 'Failed to load orderbook: whoops')
      );
    });

    server.on('connection', () => {
      server.close();
      done();
    });
  });

  test('emits an error event on error (with AuthenticatedClient)', done => {
    nock(GDAX_API_URI)
      .get(`/products/BTC-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .replyWithError('whoops');

    const server = testserver(++port, () => {
      const authClient = new Gdax.AuthenticatedClient(
        key,
        b64secret,
        passphrase,
        undefined,
        undefined,
        {
          rateLimit: false,
        }
      );
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        'ws://localhost:' + port,
        authClient
      );

      orderbookSync.on('message', () =>
        assert.fail('should not have emitted message')
      );
      orderbookSync.on('error', err =>
        assert.equal(err.message, 'Failed to load orderbook: whoops')
      );
    });

    server.on('connection', () => {
      server.close();
      done();
    });
  });

  test('builds specified books', done => {
    nock(GDAX_API_URI)
      .get(`/products/BTC-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    nock(GDAX_API_URI)
      .get(`/products/ETH-USD/book?level=${DEFAULT_BOOK_LEVEL}`)
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        ['BTC-USD', 'ETH-USD'],
        'ws://localhost:' + port
      );
      const btc_usd_state = orderbookSync.books['BTC-USD'].state();
      const eth_usd_state = orderbookSync.books['ETH-USD'].state();

      assert.deepEqual(btc_usd_state, { asks: [], bids: [] });
      assert.deepEqual(eth_usd_state, { asks: [], bids: [] });
      assert.equal(orderbookSync.books['ETH-BTC'], undefined);
    });

    server.on('connection', () => {
      server.close();
      done();
    });
  });
});
