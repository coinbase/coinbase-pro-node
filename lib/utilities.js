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
  if (auth && !(auth.secret && auth.key && auth.passphrase)) {
    throw new Error(
      'Invalid or incomplete authentication credentials. You should either provide all of the secret, key and passphrase fields, or leave auth null'
    );
  }
  return auth || {};
}

module.exports = {
  determineProductIDs,
  checkAuth,
};
