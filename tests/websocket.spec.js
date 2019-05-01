const assert = require('assert');
const CoinbasePro = require('../index.js');
const testserver = require('./lib/ws_testserver');

let port = 56632;

suite('WebsocketClient', () => {
  test('connects to specified server', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient(['BTC-EUR'], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) and default channel (full) if undefined', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient(null, 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, ['BTC-USD']);
        assert.deepEqual(msg.channels, ['full', 'heartbeat']);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if empty string', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient('', 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, ['BTC-USD']);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if empty array passed', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient([], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, ['BTC-USD']);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified products', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient(['BTC-EUR'], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, ['BTC-EUR']);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified product (backward compatibility)', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient('ETH-USD', 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, ['ETH-USD']);

        server.close();
        done();
      });
    });
  });

  test('subscribes to additional products', done => {
    let client;
    const server = testserver(port, () => {
      client = new CoinbasePro.WebsocketClient([], 'ws://localhost:' + port);
    });
    server.on('connection', socket => {
      socket.once('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');

        socket.on('message', data => {
          const msg = JSON.parse(data);
          assert.equal(msg.type, 'subscribe');
          assert.ok(msg.product_ids.includes('ETH-BTC'));
          assert.ok(msg.product_ids.includes('ETH-USD'));

          server.close();
          done();
        });
        client.subscribe({ product_ids: ['ETH-BTC', 'ETH-USD'] });
      });
    });
  });

  test('unsubscribes from product', done => {
    let client;
    const server = testserver(port, () => {
      client = new CoinbasePro.WebsocketClient(
        ['BTC-USD'],
        'ws://localhost:' + port
      );
    });
    server.on('connection', socket => {
      socket.once('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');

        socket.on('message', data => {
          const msg = JSON.parse(data);
          assert.equal(msg.type, 'unsubscribe');
          assert.deepEqual(msg.product_ids, ['BTC-USD']);
          assert.deepEqual(msg.channels, ['full']);

          server.close();
          done();
        });
        client.unsubscribe({ product_ids: ['BTC-USD'], channels: ['full'] });
      });
    });
  });

  test('subscribes to additional channels', done => {
    let client;
    const server = testserver(port, () => {
      client = new CoinbasePro.WebsocketClient(
        ['BTC-USD'],
        'ws://localhost:' + port,
        null,
        { channels: ['heartbeat'] }
      );
    });
    server.on('connection', socket => {
      socket.once('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');

        socket.on('message', data => {
          const msg = JSON.parse(data);
          assert.equal(msg.type, 'subscribe');
          assert.deepEqual(msg.channels, [
            {
              name: 'ticker',
              product_ids: ['LTC-USD'],
            },
          ]);

          server.close();
          done();
        });
        client.subscribe({
          channels: [{ name: 'ticker', product_ids: ['LTC-USD'] }],
        });
      });
    });
  });

  test('unsubscribes from channel', done => {
    let client;
    const server = testserver(port, () => {
      client = new CoinbasePro.WebsocketClient(
        ['BTC-USD'],
        'ws://localhost:' + port,
        null,
        { channels: ['ticker'] }
      );
    });
    server.on('connection', socket => {
      socket.once('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');

        socket.on('message', data => {
          const msg = JSON.parse(data);
          assert.equal(msg.type, 'unsubscribe');
          assert.deepEqual(msg.channels, ['ticker']);

          server.close();
          done();
        });
        client.unsubscribe({ channels: ['ticker'] });
      });
    });
  });

  test('passes authentication details through', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient('ETH-USD', 'ws://localhost:' + port, {
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

  test('passes channels through with heartbeat added', done => {
    const server = testserver(port, () => {
      new CoinbasePro.WebsocketClient(
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
        assert.deepEqual(msg.channels, ['user', 'ticker', 'heartbeat']);
        assert(msg.timestamp);
        assert(msg.signature);

        server.close();
        done();
      });
    });
  });

  test('emits errors when receiving an error message', done => {
    const server = testserver(port, () => {
      const client = new CoinbasePro.WebsocketClient(
        null,
        'ws://localhost:' + port
      );

      client.once('error', err => {
        assert.equal(err.message, 'test error');
        assert.equal(err.reason, 'because error');
      });
    });

    server.once('connection', socket => {
      socket.send(
        JSON.stringify({
          type: 'error',
          message: 'test error',
          reason: 'because error',
        })
      );
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });
});
