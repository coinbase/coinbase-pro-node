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

  test('subscribes to the default product (BTC-USD) and default channel (full) if undefined', done => {
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(null, 'ws://localhost:' + port);
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
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('', 'ws://localhost:' + port);
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
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient([], 'ws://localhost:' + port);
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
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient(['BTC-EUR'], 'ws://localhost:' + port);
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
    const server = testserver(++port, () => {
      new Gdax.WebsocketClient('ETH-USD', 'ws://localhost:' + port);
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

  test('passes channels through with heartbeat added', done => {
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
        assert.deepEqual(msg.channels, ['user', 'ticker', 'heartbeat']);
        assert(msg.timestamp);
        assert(msg.signature);
        server.close();
        done();
      });
    });
  });
});
