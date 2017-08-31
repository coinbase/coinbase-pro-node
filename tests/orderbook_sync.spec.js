const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');

const testserver = require('./lib/ws_testserver');
let port = 56632;

const EXCHANGE_API_URL = 'https://api.gdax.com';

suite('OrderbookSync', () => {
  test('not passes authentication details to websocket', done => {
    const server = testserver(++port, () => {
      new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port
      );
    });

    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.strictEqual(msg.key, undefined);
        assert.strictEqual(msg.passphrase, undefined);

        server.close();
        done();
      });
    });
  });

  test('passes authentication details to websocket (with AuthenticatedClient)', done => {
    const server = testserver(++port, () => {
      const authClient = new Gdax.AuthenticatedClient(
        'suchkey',
        'suchsecret',
        'muchpassphrase'
      );
      new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port,
        authClient
      );
    });

    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.equal(msg.key, 'suchkey');
        assert.equal(msg.passphrase, 'muchpassphrase');

        server.close();
        done();
      });
    });
  });

  test('emits a message event', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
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
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const authClient = new Gdax.AuthenticatedClient('key', 'secret', 'pass');
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
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
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .replyWithError('whoops');

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
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
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .replyWithError('whoops');

    const server = testserver(++port, () => {
      const authClient = new Gdax.AuthenticatedClient('key', 'secret', 'pass');
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
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
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(++port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        ['BTC-USD', 'ETH-USD'],
        EXCHANGE_API_URL,
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
