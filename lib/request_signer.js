'use strict';
const crypto = require('crypto');
const querystring = require('querystring');
/**
 Signs request messages for authenticated requests to GDAX
 * @param {object} auth - hash containing key, secret and passphrase
 * @param {string} method - The REST method to use
 * @param {string} path - The request path, e.g. /products/BTC-USD/ticker
 * @param {object} queries - An optional object containing one of
 * @param {object} body - An object used as JSON payload for a POST or PUT request
 * @returns {{key: string, signature: *, timestamp: number, passphrase: string}}
 */
module.exports.signRequest = (auth, method, path, queries, body) => {
  let queriesString = '';
  let bodyString = '';

  if (queries && typeof queries === 'object') {
    queriesString = '?' + querystring.stringify(queries);
  }
  if (body && typeof body === 'object') {
    bodyString = JSON.stringify(body);
  }

  const timestamp = Date.now() / 1000;

  const what =
    timestamp + method.toUpperCase() + path + queriesString + bodyString;
  const key = Buffer(auth.secret, 'base64');
  const hmac = crypto.createHmac('sha256', key);
  const signature = hmac.update(what).digest('base64');

  return {
    key: auth.key,
    signature: signature,
    timestamp: timestamp,
    passphrase: auth.passphrase,
  };
};
