const assert = require('assert');
const CoinbasePro = require('../index.js');
const testserver = require('./lib/ws_testserver');
const {
  EXCHANGE_WS_URL,
  SANDBOX_WS_URL,
  DEFAULT_PAIR,
  DEFAULT_CHANNELS,
} = require('../lib/utilities');

let port = 56632;

suite('WebsocketClient', () => {
  test('connects to specified server', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        product_ids: ['BTC-EUR'],
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('.constructor() (with sandbox option)', () => {
    let client = new CoinbasePro.WebsocketClient();
    assert.equal(client.websocketURI, EXCHANGE_WS_URL);
    client = new CoinbasePro.WebsocketClient({ sandbox: true });
    assert.equal(client.websocketURI, SANDBOX_WS_URL);
  });

  test('subscribes to the default product (BTC-USD) and default channel (full) if undefined', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, [DEFAULT_PAIR]);
        assert.deepEqual(msg.channels, DEFAULT_CHANNELS);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if empty array passed', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        product_ids: [],
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, [DEFAULT_PAIR]);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if empty string passed', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        product_ids: '',
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, [DEFAULT_PAIR]);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default channels if empty string passed', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        channels: '',
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.channels, DEFAULT_CHANNELS);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified product if string passed', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        product_ids: 'ETH-BTC',
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.deepEqual(msg.product_ids, ['ETH-BTC']);

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified products', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        product_ids: ['BTC-EUR'],
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
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

  test('subscribes to additional products', done => {
    let client;
    const server = testserver(port, () => {
      client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
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
      client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
      });
      client.connect();
    });
    server.on('connection', socket => {
      socket.once('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');

        socket.on('message', data => {
          const msg = JSON.parse(data);
          assert.equal(msg.type, 'unsubscribe');
          assert.deepEqual(msg.product_ids, [DEFAULT_PAIR]);
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
      client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
        channels: ['heartbeat'],
      });
      client.connect();
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
      client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
        channels: ['ticker'],
      });
      client.connect();
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
      let client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
        product_ids: ['ETH-USD'],
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase',
      });
      client.connect();
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

  test('emits errors when receiving an error message', done => {
    const server = testserver(port, () => {
      let client = new CoinbasePro.WebsocketClient({
        api_uri: 'ws://localhost:' + port,
      });

      client.once('error', err => {
        assert.equal(err.message, 'test error');
        assert.equal(err.reason, 'because error');
      });
      client.connect();
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
