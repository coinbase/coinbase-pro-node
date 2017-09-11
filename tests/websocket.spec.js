const assert = require('assert');
const Gdax = require('../index.js');
const testserver = require('./lib/ws_testserver');

let port = 56632;

suite('WebsocketClient', () => {
  test('connects to specified server', done => {
    const server = testserver(++port, () => {
      const websocketClient = new Gdax.WebsocketClient(
        ['BTC-EUR'],
        'full',
        'ws://localhost:' + port
      );
      websocketClient.on('open', () => {
        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) and channel (full) if undefined', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(null, null, 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-USD'],
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) and channel (full) if empty string', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('', '', 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-USD'],
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) and channel (full) if empty array passed', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient([], [], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-USD'],
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified products and channels', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(['BTC-EUR'], ['ticker'], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-EUR'],
          channels: ['tikcer'],
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified product and channel (backward compatibility)', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('ETH-USD', 'ticker', 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['ETH-USD'],
          channels: ['ticker'],
        });

        server.close();
        done();
      });
    });
  });

  test('passes authentication details through', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('ETH-USD', 'full', 'ws://localhost:' + port, {
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase',
      });
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.equal(msg.key, 'suchkey');
        assert.equal(msg.passphrase, 'muchpassphrase');
        assert(msg.timestamp);
        assert(msg.signature);

        server.close();
        done();
      });
    });
  });
});
