'use strict'
const dns = require('dns')

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

function sleep (ms){
  return new Promise(resolve=>{
      setTimeout(resolve,ms)
  })
}

function checkInternet(url) {
  return new Promise((resolve, reject) => { 
      dns.lookup(url, function (err) {
          if (err && err.code == "ENOTFOUND") return resolve(false);                                 
          else return resolve(true)                 
      })
  })
  
};




module.exports = {
  determineProductIDs,
  checkAuth,
  sleep, 
  checkInternet
};
