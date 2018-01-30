# GDAX [![CircleCI](https://circleci.com/gh/coinbase/gdax-node.svg?style=svg)](https://circleci.com/gh/coinbase/gdax-node) [![npm version](https://badge.fury.io/js/gdax.svg)](https://badge.fury.io/js/gdax)

The official Node.js library for Coinbase's [GDAX API](https://docs.gdax.com/).

## Features

* Easy functionality to use in programmatic trading
* A customizable, websocket-synced Order Book implementation
* API clients with convenient methods for every API endpoint
* Abstracted interfaces – don't worry about HMAC signing or JSON formatting; the
  library does it for you

## Installation

```bash
npm install gdax
```

You can learn about the API responses of each endpoint [by reading our
documentation](https://docs.gdax.com/#market-data).

## Quick Start

The GDAX API has both public and private endpoints. If you're only interested in
the public endpoints, you should use a `PublicClient`.

```js
const Gdax = require('gdax');
const publicClient = new Gdax.PublicClient();
```

All methods, unless otherwise specified, can be used with either a promise or
callback API.

### Using Promises

```js
publicClient
  .getProducts()
  .then(data => {
    // work with data
  })
  .catch(error => {
    // handle the error
  });
```

The promise API can be used as expected in `async` functions in ES2017+
environments:

```js
async function yourFunction() {
  try {
    const products = await publicClient.getProducts();
  } catch (error) {
    /* ... */
  }
}
```

### Using Callbacks

Your callback should accept two arguments:

* `error`: contains an error message (`string`), or `null` if no was error
  encountered
* `response`: a generic HTTP response abstraction created by the [`request`
  library](https://github.com/request/request)
* `data`: contains data returned by the GDAX API, or `undefined` if an error was
  encountered

```js
publicClient.getProducts((error, response, data) => {
  if (error) {
    // handle the error
  } else {
    // work with data
  }
});
```

**NOTE:** if you supply a callback, no promise will be returned. This is to
prevent potential `UnhandledPromiseRejectionWarning`s, which will cause future
versions of Node to terminate.

```js
const myCallback = (err, response, data) => {
  /* ... */
};

const result = publicClient.getProducts(myCallback);

result.then(() => {
  /* ... */
}); // TypeError: Cannot read property 'then' of undefined
```

### Optional Parameters

Some methods accept optional parameters, e.g.

```js
publicClient.getProductOrderBook('BTC-USD', { level: 3 }).then(book => {
  /* ... */
});
```

To use optional parameters with callbacks, supply the options as the first
parameter(s) and the callback as the last parameter:

```js
publicClient.getProductOrderBook(
  'ETH-USD',
  { level: 3 },
  (error, response, book) => {
    /* ... */
  }
);
```

### The Public API Client

```js
const publicClient = new Gdax.PublicClient(endpoint);
```

* `productID` _optional_ - defaults to 'BTC-USD' if not specified.
* `endpoint` _optional_ - defaults to 'https://api.gdax.com' if not specified.

#### Public API Methods

* [`getProducts`](https://docs.gdax.com/#get-products)

```js
publicClient.getProducts(callback);
```

* [`getProductOrderBook`](https://docs.gdax.com/#get-product-order-book)

```js
// Get the order book at the default level of detail.
publicClient.getProductOrderBook('BTC-USD', callback);

// Get the order book at a specific level of detail.
publicClient.getProductOrderBook('LTC-USD', { level: 3 }, callback);
```

* [`getProductTicker`](https://docs.gdax.com/#get-product-ticker)

```js
publicClient.getProductTicker('ETH-USD', callback);
```

* [`getProductTrades`](https://docs.gdax.com/#get-trades)

```js
publicClient.getProductTrades('BTC-USD', callback);

// To make paginated requests, include page parameters
publicClient.getProductTrades('BTC-USD', { after: 1000 }, callback);
```

* [`getProductTradeStream`](https://docs.gdax.com/#get-trades)

Wraps around `getProductTrades`, fetches all trades with IDs `>= tradesFrom` and
`<= tradesTo`. Handles pagination and rate limits.

```js
const trades = publicClient.getProductTradeStream('BTC-USD', 8408000, 8409000);

// tradesTo can also be a function
const trades = publicClient.getProductTradeStream(
  'BTC-USD',
  8408000,
  trade => Date.parse(trade.time) >= 1463068e6
);
```

* [`getProductHistoricRates`](https://docs.gdax.com/#get-historic-rates)

```js
publicClient.getProductHistoricRates('BTC-USD', callback);

// To include extra parameters:
publicClient.getProductHistoricRates(
  'BTC-USD',
  { granularity: 3600 },
  callback
);
```

* [`getProduct24HrStats`](https://docs.gdax.com/#get-24hr-stats)

```js
publicClient.getProduct24HrStats('BTC-USD', callback);
```

* [`getCurrencies`](https://docs.gdax.com/#get-currencies)

```js
publicClient.getCurrencies(callback);
```

* [`getTime`](https://docs.gdax.com/#time)

```js
publicClient.getTime(callback);
```

### The Authenticated API Client

The [private exchange API endpoints](https://docs.gdax.com/#private) require you
to authenticate with a GDAX API key. You can create a new API key [in your
exchange account's settings](https://gdax.com/settings). You can also specify
the API URI (defaults to `https://api.gdax.com`).

```js
const key = 'your_api_key';
const secret = 'your_b64_secret';
const passphrase = 'your_passphrase';

const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';

const authedClient = new Gdax.AuthenticatedClient(
  key,
  secret,
  passphrase,
  apiURI
);
```

Like `PublicClient`, all API methods can be used with either callbacks or will
return promises.

`AuthenticatedClient` inherits all of the API methods from
`PublicClient`, so if you're hitting both public and private API endpoints you
only need to create a single client.

#### Private API Methods

* [`getCoinbaseAccounts`](https://docs.gdax.com/#coinbase-accounts)

```javascript
authedClient.getCoinbaseAccounts(callback);
```

* [`getPaymentMethods`](https://docs.gdax.com/#payment-methods)

```javascript
authedClient.getPaymentMethods(callback);
```

* [`getAccounts`](https://docs.gdax.com/#list-accounts)

```js
authedClient.getAccounts(callback);
```

* [`getAccount`](https://docs.gdax.com/#get-an-account)

```js
const accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccount(accountID, callback);
```

* [`getAccountHistory`](https://docs.gdax.com/#get-account-history)

```js
const accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountHistory(accountID, callback);

// For pagination, you can include extra page arguments
authedClient.getAccountHistory(accountID, { before: 3000 }, callback);
```

* [`getAccountTransfers`](https://docs.gdax.com/#get-account-transfers)

```js
const accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountTransfers(accountID, callback);

// For pagination, you can include extra page arguments
authedClient.getAccountTransfers(accountID, { before: 3000 }, callback);
```

* [`getAccountHolds`](https://docs.gdax.com/#get-holds)

```js
const accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountHolds(accountID, callback);

// For pagination, you can include extra page arguments
authedClient.getAccountHolds(accountID, { before: 3000 }, callback);
```

* [`buy`, `sell`](https://docs.gdax.com/#place-a-new-order)

```js
// Buy 1 BTC @ 100 USD
const buyParams = {
  price: '100.00', // USD
  size: '1', // BTC
  product_id: 'BTC-USD',
};
authedClient.buy(buyParams, callback);

// Sell 1 BTC @ 110 USD
const sellParams = {
  price: '110.00', // USD
  size: '1', // BTC
  product_id: 'BTC-USD',
};
authedClient.sell(sellParams, callback);
```

* [`placeOrder`](https://docs.gdax.com/#place-a-new-order)

```js
// Buy 1 LTC @ 75 USD
const params = {
  side: 'buy',
  price: '75.00', // USD
  size: '1', // LTC
  product_id: 'LTC-USD',
};
authedClient.placeOrder(params, callback);
```

* [`cancelOrder`](https://docs.gdax.com/#cancel-an-order)

```js
const orderID = 'd50ec984-77a8-460a-b958-66f114b0de9b';
authedClient.cancelOrder(orderID, callback);
```

* [`cancelOrders`](https://docs.gdax.com/#cancel-all)

```js
authedClient.cancelOrders(callback);
```

* [`cancelAllOrders`](https://docs.gdax.com/#cancel-all)

```js
// `cancelOrders` may require you to make the request multiple times until
// all of the orders are deleted.

// `cancelAllOrders` will handle making these requests for you asynchronously.
// Also, you can add a `product_id` param to only delete orders of that product.

// The data will be an array of the order IDs of all orders which were cancelled
authedClient.cancelAllOrders({ product_id: 'BTC-USD' }, callback);
```

* [`getOrders`](https://docs.gdax.com/#list-open-orders)

```js
authedClient.getOrders(callback);
// For pagination, you can include extra page arguments
// Get all orders of 'open' status
authedClient.getOrders({ after: 3000, status: 'open' }, callback);
```

* [`getOrder`](https://docs.gdax.com/#get-an-order)

```js
const orderID = 'd50ec984-77a8-460a-b958-66f114b0de9b';
authedClient.getOrder(orderID, callback);
```

* [`getFills`](https://docs.gdax.com/#list-fills)

```js
authedClient.getFills(callback);
// For pagination, you can include extra page arguments
authedClient.getFills({ before: 3000 }, callback);
```

* [`getFundings`](https://docs.gdax.com/#list-fundings)

```js
authedClient.getFundings({}, callback);
```

* [`repay`](https://docs.gdax.com/#repay)

```js
const params = {
  amount: '2000.00',
  currency: 'USD',
};
authedClient.repay(params, callback);
```

* [`marginTransfer`](https://docs.gdax.com/#margin-transfer)

```js
const params =
  'margin_profile_id': '45fa9e3b-00ba-4631-b907-8a98cbdf21be',
  'type': 'deposit',
  'currency': 'USD',
  'amount': 2
};
authedClient.marginTransfer(params, callback);
```

* [`closePosition`](https://docs.gdax.com/#close)

```js
const params = {
  repay_only: false,
};
authedClient.closePosition(params, callback);
```

* [`deposit`, `withdraw`](https://docs.gdax.com/#deposits)

```js
// Deposit to your Exchange USD account from your Coinbase USD account.
const depositParamsUSD = {
  amount: '100.00',
  currency: 'USD',
  coinbase_account_id: '60680c98bfe96c2601f27e9c', // USD Coinbase Account ID
};
authedClient.deposit(depositParamsUSD, callback);

// Withdraw from your Exchange USD account to your Coinbase USD account.
const withdrawParamsUSD = {
  amount: '100.00',
  currency: 'USD',
  coinbase_account_id: '60680c98bfe96c2601f27e9c', // USD Coinbase Account ID
};
authedClient.withdraw(withdrawParamsUSD, callback);

// Deposit to your Exchange BTC account from your Coinbase BTC account.
const depositParamsBTC = {
  amount: '2.0',
  currency: 'BTC',
  coinbase_account_id: '536a541fa9393bb3c7000023', // BTC Coinbase Account ID
};
authedClient.deposit(depositParamsBTC, callback);

// Withdraw from your Exchange BTC account to your Coinbase BTC account.
const withdrawParamsBTC = {
  amount: '2.0',
  currency: 'BTC',
  coinbase_account_id: '536a541fa9393bb3c7000023', // BTC Coinbase Account ID
};
authedClient.withdraw(withdrawParamsBTC, callback);

// Withdraw from your Exchange BTC account to another BTC address.
const withdrawAddressParams = {
  amount: 10.0,
  currency: 'BTC',
  crypto_address: '15USXR6S4DhSWVHUxXRCuTkD1SA6qAdy',
};
authedClient.withdrawCrypto(withdrawAddressParams, callback);
```

* [`getTrailingVolume`](https://docs.gdax.com/#user-account)

```js
// Get your 30 day trailing volumes
authedClient.getTrailingVolume(callback);
```

### Websocket Client

The `WebsocketClient` allows you to connect and listen to the [exchange
websocket messages](https://docs.gdax.com/#messages).

```js
const websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD']);

websocket.on('message', data => {
  /* work with data */
});
websocket.on('error', err => {
  /* handle error */
});
websocket.on('close', () => {
  /* ... */
});
```

The client will automatically subscribe to the `heartbeat` channel. By
default, the `full` channel will be subscribed to unless other channels are
requested.

```javascript
const websocket = new Gdax.WebsocketClient(
  ['BTC-USD', 'ETH-USD'],
  'https://api-public.sandbox.gdax.com',
  {
    key: 'suchkey',
    secret: 'suchsecret',
    passphrase: 'muchpassphrase',
  },
  { channels: ['full', 'level2'] }
);

```

Optionally, [change subscriptions at runtime](https://docs.gdax.com/#subscribe):

```javascript
websocket.unsubscribe({ channels: ['full'] });

websocket.subscribe({ product_ids: ['LTC-USD'], channels: ['ticker', 'user'] });

websocket.subscribe({
  channels: [{
    name: 'user',
    product_ids: ['ETH-USD']
  }]
});

websocket.unsubscribe({
  channels: [{
    name: 'user',
    product_ids: ['LTC-USD']
  }, {
    name: 'user',
    product_ids: ['ETH-USD']
  }]
});
```

The following events can be emitted from the `WebsocketClient`:

* `open`
* `message`
* `close`
* `error`

### Orderbook

`Orderbook` is a data structure that can be used to store a local copy of the
orderbook.

```js
const orderbook = new Gdax.Orderbook();
```

The orderbook has the following methods:

* `state(book)`
* `get(orderId)`
* `add(order)`
* `remove(orderId)`
* `match(match)`
* `change(change)`

### Orderbook Sync

`OrderbookSync` creates a local mirror of the orderbook on GDAX using
`Orderbook` and `WebsocketClient` as described
[here](https://docs.gdax.com/#real-time-order-book).

```js
const orderbookSync = new Gdax.OrderbookSync(['BTC-USD', 'ETH-USD']);
console.log(orderbookSync.books['ETH-USD'].state());
```

## Testing

```bash
npm test

# test for known vulnerabilities in packages
npm install -g nsp
nsp check --output summary
```
