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
      var websocketClient = new Gdax.WebsocketClient(['BTC-EUR'], {websocketURI: 'ws://localhost:' + port});
      websocketClient.on('open', function() {
        server.close();
        done();
      });
    });
  });

  test('subscribes to the default product (BTC-USD) if undefined', function(done) {
    var server = testserver(++port, function() {
      var websocketClient = new Gdax.WebsocketClient(null, {websocketURI: 'ws://localhost:' + port});
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
      var websocketClient = new Gdax.WebsocketClient('', {websocketURI: 'ws://localhost:' + port});
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
      var websocketClient = new Gdax.WebsocketClient([], {websocketURI: 'ws://localhost:' + port});
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
      var websocketClient = new Gdax.WebsocketClient(['BTC-EUR'], {websocketURI: 'ws://localhost:' + port});
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
      var websocketClient = new Gdax.WebsocketClient('ETH-USD', {websocketURI: 'ws://localhost:' + port});
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
      var websocketClient = new Gdax.WebsocketClient('ETH-USD', { 
        websocketURI: 'ws://localhost:' + port,
        auth: {
          key: 'suchkey',
          secret: 'suchsecret',
          passphrase: 'muchpassphrase'
        }
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

  test('passes heartbeat details through', function (done) {
    var calls = {heartbeat: false, subscribe: false};

    var server = testserver(++port, function () {
      var websocketClient = new Gdax.WebsocketClient('ETH-USD', {
        websocketURI: 'ws://localhost:' + port,
        heartbeat: true,
        auth: {
          key: 'suchkey',
          secret: 'suchsecret',
          passphrase: 'muchpassphrase'
        }        
      });
    });
    server.on('connection', function (socket) {
      socket.on('message', function (data) {
        console.log();
        console.log(data);
        var msg = JSON.parse(data);
        
        calls[msg.type] = true;

        assert.equal(msg.key, 'suchkey');
        assert.equal(msg.passphrase, 'muchpassphrase');
        assert(msg.timestamp);
        assert(msg.signature);


        if(msg.type === 'heartbeat') {
          // assert both (heartbeat and subscribe) calls were made
          assert.deepEqual(calls, { heartbeat: true, subscribe: true });
          server.close();
          done();
        }
      });
    });
  });  
});
