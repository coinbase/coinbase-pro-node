'use strict';
const crypto = require('crypto');
const querystring = require('querystring');
const Utils = require('./utilities.js');

/**
 Signs request messages for authenticated requests to Coinbase Pro
 * @param auth {object} hash containing key, secret and passphrase
 * @param method {string} The REST method to use
 * @param path {string} The request path, e.g. /products/BTC-USD/ticker
 * @param [options] {object} An optional object containing one of
 * @param options.body {object} A hash of body properties
 * @param options.qs {object} A hash of query string parameters
 * @returns {{key: string, signature: *, timestamp: number, passphrase: string}}
 */
module.exports.signRequest = (auth, method, path, options = {}) => {
  Utils.checkAuth(auth);
  const timestamp = Date.now() / 1000;
  let body = '';
  if (options.body) {
    body = JSON.stringify(options.body);
  } else if (options.qs && Object.keys(options.qs).length !== 0) {
    body = '?' + querystring.stringify(options.qs);
  }
  const what = timestamp + method.toUpperCase() + path + body;
  const key = Buffer.from(auth.secret, 'base64');
  const hmac = crypto.createHmac('sha256', key);
  const signature = hmac.update(what).digest('base64');
  return {
    key: auth.key,
    signature: signature,
    timestamp: timestamp,
    passphrase: auth.passphrase,
  };
};
