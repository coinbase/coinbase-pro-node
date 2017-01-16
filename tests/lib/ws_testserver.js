var wss = require('ws').Server;
module.exports = function(port, cb) {
  return new wss({ port: port }, cb);
}
