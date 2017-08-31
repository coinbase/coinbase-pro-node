const wss = require('ws').Server;

module.exports = (port, cb) => {
  return new wss({ port }, cb);
};
