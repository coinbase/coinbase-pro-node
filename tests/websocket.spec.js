const assert = require('assert');
const Gdax = require('../index.js');
const testserver = require('./lib/ws_testserver');

let port = 56632;

suite('WebsocketClient', () => {
  test('connects to specified server', done => {
    const server = testserver(++port, () => {
      const websocketClient = new Gdax.WebsocketClient(
        ['BTC-EUR'],
        'ws://localhost:' + port
      );
      websocketClient.on('open', () => {
        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if undefined', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(null, 'ws://localhost:' + port);
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

  test('subscribes to the default product (BTC-USD) if empty string', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('', 'ws://localhost:' + port);
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

  test('subscribes to the default product (BTC-USD) if empty array passed', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient([], 'ws://localhost:' + port);
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

  test('subscribes to the specified products', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(['BTC-EUR'], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-EUR'],
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified product (backward compatibility)', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('ETH-USD', 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['ETH-USD'],
        });

        server.close();
        done();
      });
    });
  });

  test('passes authentication details through', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('ETH-USD', 'ws://localhost:' + port, {
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

  test('passes channels through', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(
        'ETH-USD',
        'ws://localhost:' + port,
        {
          key: 'suchkey',
          secret: 'suchsecret',
          passphrase: 'muchpassphrase',
        },
        { channels: ['user', 'ticker'] }
      );
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.equal(msg.key, 'suchkey');
        assert.equal(msg.passphrase, 'muchpassphrase');
        assert.deepEqual(msg.channels, ['user', 'ticker']);
        assert(msg.timestamp);
        assert(msg.signature);
        server.close();
        done();
      });
    });
  });
});

test('passes heartbeat details through', done => {
  let calls = 0;
  const server = testserver(++port, () => {
    new Gdax.WebsocketClient(
      'ETH-USD',
      'ws://localhost:' + port,
      {
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase',
      },
      { heartbeat: true }
    );
  });
  server.on('connection', socket => {
    socket.on('message', data => {
      const msg = JSON.parse(data);
      calls++;

      if (msg.type === 'subscribe') {
        assert.equal(msg.key, 'suchkey');
        assert.equal(msg.passphrase, 'muchpassphrase');
        assert(msg.timestamp);
        assert(msg.signature);
      } else {
        assert.equal(msg.type, 'heartbeat');
        assert.equal(msg.on, true);
      }

      if (calls > 1) {
        server.close();
        done();
      }
    });
  });
});

test('passes heartbeat details through without authentication details', done => {
  let calls = 0;
  const server = testserver(++port, () => {
    new Gdax.WebsocketClient(
      ['BTC-USD', 'ETH-USD'],
      'ws://localhost:' + port,
      null,
      { heartbeat: true }
    );
  });
  server.on('connection', socket => {
    socket.on('message', data => {
      const msg = JSON.parse(data);
      calls++;

      if (msg.type === 'subscribe') {
        assert.deepEqual(msg.product_ids, ['BTC-USD', 'ETH-USD']);
      } else {
        assert.equal(msg.type, 'heartbeat');
        assert.equal(msg.on, true);
      }

      if (calls > 1) {
        server.close();
        done();
      }
    });
  });
});
