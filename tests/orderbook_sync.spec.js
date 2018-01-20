const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');

const testserver = require('./lib/ws_testserver');
let port = 56632;

const EXCHANGE_API_URL = 'https://api.gdax.com';

suite('OrderbookSync', () => {
  afterEach(() => nock.cleanAll());

  test('not passes authentication details to websocket', done => {
    const server = testserver(port, () => {
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

  test('passes authentication details to websocket', done => {
    const server = testserver(port, () => {
      new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port,
        { key: 'suchkey', secret: 'suchsecret', passphrase: 'muchpassphrase' }
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

  test('passes authentication details to websocket (via AuthenticationClient for backwards compatibility)', done => {
    const server = testserver(port, () => {
      new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port,
        new Gdax.AuthenticatedClient('mykey', 'mysecret', 'mypassphrase')
      );
    });

    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.equal(msg.key, 'mykey');
        assert.equal(msg.passphrase, 'mypassphrase');

        server.close();
        done();
      });
    });
  });

  test('emits a message event', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
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

  test('emits a message event (with auth)', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port,
        { key: 'key', secret: 'secret', passphrase: 'pass' }
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

    const server = testserver(port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port
      );

      orderbookSync.on('error', err => {
        assert.equal(err.message, 'Failed to load orderbook: whoops');
        server.close();
        done();
      });
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
    });
  });

  test('emits an error event on error (with auth)', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .replyWithError('whoops');

    const server = testserver(port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        'BTC-USD',
        EXCHANGE_API_URL,
        'ws://localhost:' + port,
        { key: 'key', secret: 'secret', passphrase: 'pass' }
      );

      orderbookSync.on('error', err => {
        assert.equal(err.message, 'Failed to load orderbook: whoops');
        server.close();
        done();
      });
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
    });
  });

  test('builds specified books', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    let count = 0;
    const server = testserver(port, () => {
      const orderbookSync = new Gdax.OrderbookSync(
        ['BTC-USD', 'ETH-USD'],
        EXCHANGE_API_URL,
        'ws://localhost:' + port
      );

      orderbookSync.on('message', data => {
        const state = orderbookSync.books[data.product_id].state();

        assert.deepEqual(state, { asks: [], bids: [] });
        assert.equal(orderbookSync.books['ETH-BTC'], undefined);

        if (++count >= 2) {
          server.close();
          done();
        }
      });
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
      socket.send(JSON.stringify({ product_id: 'ETH-USD' }));
    });
  });
});
