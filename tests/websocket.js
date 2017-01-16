var assert = require('assert');
var nock = require('nock');

var Gdax = require('../index.js');

var key = 'key';
var secret = 'secret';
var passphrase = 'passphrase';

var testserver = require('./lib/ws_testserver');
var port = 56632;

suite('WebsocketClient');

describe('WebsocketClient', function() {
  test('connects to specified server', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient(['BTC-EUR'], 'ws://localhost:' + port);
      websocketClient.on('open', function() {
        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if undefined', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient(null, 'ws://localhost:' + port);
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-USD']
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if empty string', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient('', 'ws://localhost:' + port);
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-USD']
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if empty array passed', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient([], 'ws://localhost:' + port);
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-USD']
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified products', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient(['BTC-EUR'], 'ws://localhost:' + port);
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['BTC-EUR']
        });

        server.close();
        done();
      });
    });
  });

  test('subscribes to the specified product (backward compatibility)', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient('ETH-USD', 'ws://localhost:' + port);
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg = JSON.parse(data);
        assert.deepEqual(msg, {
          type: 'subscribe',
          product_ids: ['ETH-USD']
        });

        server.close();
        done();
      });
    });
  });

  test('passes authentication details through', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient('ETH-USD', 'ws://localhost:' + port, {
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase'
      });
    });
    server.on('connection', function(socket) {
      socket.on('message', function(data) {
        var msg = JSON.parse(data);
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
