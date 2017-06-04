const assert = require('assert');
const nock = require('nock');

const Gdax = require('../index.js');

const key = 'key';
const secret = 'secret';
const passphrase = 'passphrase';

const testserver = require('./lib/ws_testserver');
let port = 56632;

suite('WebsocketClient', () => {

  test('connects to specified server', function(done) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        ['BTC-EUR'],
        'ws://localhost:' + port
      );
      websocketClient.on('open', function() {
        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if undefined', function(
    done
  ) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        null,
        'ws://localhost:' + port
      );
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
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

  test('subscribes to the default product (BTC-USD) if empty string', function(
    done
  ) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        '',
        'ws://localhost:' + port
      );
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
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

  test('subscribes to the default product (BTC-USD) if empty array passed', function(
    done
  ) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        [],
        'ws://localhost:' + port
      );
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
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

  test('subscribes to the specified products', function(done) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        ['BTC-EUR'],
        'ws://localhost:' + port
      );
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
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

  test('subscribes to the specified product (backward compatibility)', function(
    done
  ) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        'ETH-USD',
        'ws://localhost:' + port
      );
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
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

  test('passes authentication details through', function(done) {
    const server = testserver(++port, function() {
      const websocketClient = new Gdax.WebsocketClient(
        'ETH-USD',
        'ws://localhost:' + port,
        {
          key: 'suchkey',
          secret: 'suchsecret',
          passphrase: 'muchpassphrase',
        }
      );
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
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
