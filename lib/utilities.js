const DEFAULT_TIMEOUT = 10 * 1000;
const API_LIMIT = 100;
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
  PAGE_ARGS,
  ORDER_FIELDS,
};
