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

function determineChannels(channels) {
  if (!channels || !channels.length) {
    return ['full'];
  }

  if (Array.isArray(channels)) {
    return channels;
  }

  // If we got this far, it means it's a string.
  // Return an array for backwards compatibility.
  return [channels];
}

module.exports = {
  determineProductIDs,
  determineChannels,
};
