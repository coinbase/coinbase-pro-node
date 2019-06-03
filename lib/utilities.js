const DEFAULT_TIMEOUT = 10 * 1000;
const API_LIMIT = 100;
const DEFAULT_PAIR = 'BTC-USD';
const EXCHANGE_API_URL = 'https://api.pro.coinbase.com';
const SANDBOX_API_URL = 'https://api-public.sandbox.pro.coinbase.com';
const PAGE_ARGS = ['after', 'before', 'limit'];
const ORDER_FIELDS = [
  'client_oid',
  'type',
  'side',
  'product_id',
  'stp',
  'stop',
  'stop_price',
  'price',
  'size',
  'time_in_force',
  'cancel_after',
  'post_only',
  'size',
  'funds',
];

function determineProductIDs(productIDs) {
  if (!productIDs || !productIDs.length) {
    return ['BTC-USD'];
  }

  if (Array.isArray(productIDs)) {
    return productIDs;
  }

  // If we got this far, it means it's a string.
  // Return an array for backwards compatibility.
  return [productIDs];
}

function checkAuth(auth) {
  if (auth && !(auth.key && auth.secret && auth.passphrase)) {
    throw new Error(
      'Invalid or incomplete authentication credentials. Please provide all of the key, secret, and passphrase fields.'
    );
  }
  return auth || {};
}

module.exports = {
  determineProductIDs,
  checkAuth,
  DEFAULT_TIMEOUT,
  API_LIMIT,
  DEFAULT_PAIR,
  EXCHANGE_API_URL,
  SANDBOX_API_URL,
  PAGE_ARGS,
  ORDER_FIELDS,
};
