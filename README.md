# GDAX [![CircleCI](https://circleci.com/gh/coinbase/gdax-node.svg?style=svg)](https://circleci.com/gh/coinbase/gdax-node) [![npm version](https://badge.fury.io/js/gdax.svg)](https://badge.fury.io/js/gdax)
The official Node.js library for the [GDAX
API](https://docs.gdax.com/) (formerly Coinbase Exchange).

*Note: this library may be subtly broken or buggy. The code is released under
the MIT License – please take the following message to heart:*

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.
*

## Features
* Easy programmatic trading.
* A customizable, websocket-synced Order Book implementation.
* API clients with convenient methods for every API endpoint.
* Abstracted interfaces – don't worry about HMAC signing or JSON formatting,
  the library does it for you.
* Semantic versioning.

## Installation
```bash
# From NPM
npm install gdax
# From Github
npm install coinbase/gdax-node
```

## Quick Start

### The Public API Client
The GDAX API has both public and private endpoints. If you're only
interested in the public endpoints, you should use a `PublicClient`.

```javascript
var Gdax = require('gdax');
var publicClient = new Gdax.PublicClient();
```

All API methods are callback based. Your callback should accept three arguments:

```
var callback = function(err, response, data) {
  // your code here.
};
```

This callback will be passed directly to [the underlying `request` library's
`request` method](https://github.com/request/request).  `err` will be either
`null` or an `Error`. `response` will be a generic HTTP response abstraction
created by the `request` library. `data` will be the result of JSON-decoding
the server's response, or `null` if the response was not parseable. You can
learn about the API responses of each endpoint [by reading our
documentation](https://docs.gdax.com/#market-data).

#### Public API Methods

* [`getProducts`](https://docs.gdax.com/#get-products)
```javascript
publicClient.getProducts(callback);
```

* [`getProductOrderBook`](https://docs.gdax.com/#get-product-order-book)
```javascript
// Get the order book at the default level of detail.
publicClient.getProductOrderBook(callback);
// Get the order book at a specific level of detail.
publicClient.getProductOrderBook({'level': 3}, callback);
```

* [`getProductTicker`](https://docs.gdax.com/#get-product-ticker)
```javascript
publicClient.getProductTicker(callback);
```

* [`getProductTrades`](https://docs.gdax.com/#get-trades)
```javascript
publicClient.getProductTrades(callback);
// To make paginated requests, include page parameters
publicClient.getProductTrades({'after': 1000}, callback);
```

* [`getProductTradeStream`](https://docs.gdax.com/#get-trades)
Wraps around `getProductTrades`, fetches all trades with IDs `>= tradesFrom` and `<= tradesTo`.
Handles pagination and rate limits.

```javascript
var trades = publicClient.getProductTradeStream(8408000, 8409000);
// tradesTo can also be a function
var trades publicClient.getProductTradeStream(8408000, function(trade) {
    return Date.parse(trade.time) >= 1463068e6
})
```

* [`getProductHistoricRates`](https://docs.gdax.com/#get-historic-rates)
```javascript
publicClient.getProductHistoricRates(callback);
// To include extra parameters:
publicClient.getProductHistoricRates({'granularity': 3000}, callback);
```

* [`getProduct24HrStats`](https://docs.gdax.com/#get-24hr-stats)
```javascript
publicClient.getProduct24HrStats(callback);
```

* [`getCurrencies`](https://docs.gdax.com/#get-currencies)
```javascript
publicClient.getCurrencies(callback);
```

* [`getTime`](https://docs.gdax.com/#time)
```javascript
publicClient.getTime(callback);
```

### The Authenticated API Client
The [private exchange API
endpoints](https://docs.gdax.com/#private) require you to
authenticate with an API key. You can create a new API key [in your exchange
account's settings](https://gdax.com/settings). You can also specify the 
API uri.

```javascript
var Gdax = require('gdax');
var apiURI = 'https://api.gdax.com';
var sandboxURI = 'https://api-public.sandbox.gdax.com';

// Defaults to https://api.gdax.com if apiURI omitted
var authedClient = new Gdax.AuthenticatedClient(
  key, b64secret, passphrase, apiURI);
```

Like the `PublicClient`, all API methods are callback based. The callback
should be in the same format:

```
var callback = function(err, response, data) {
  // your code here.
};
```

The `AuthenticatedClient` inherits all of the API methods defined by the
`PublicClient`, so if you're hitting both public and private API endpoints you
only need to create a single client.

#### Private API Methods

* [`getAccounts`](https://docs.gdax.com/#list-accounts)
```javascript
authedClient.getAccounts(callback);
```

* [`getAccount`](https://docs.gdax.com/#get-an-account)
```javascript
var accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccount(accountID, callback);
```

* [`getAccountHistory`](https://docs.gdax.com/#get-account-history)
```javascript
var accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountHistory(accountID, callback);
// For pagination, you can include extra page arguments
authedClient.getAccountHistory(accountID, {'before': 3000}, callback);
```

* [`getAccountHolds`](https://docs.gdax.com/#get-holds)
```javascript
var accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountHolds(accountID, callback);
// For pagination, you can include extra page arguments
authedClient.getAccountHolds(accountID, {'before': 3000}, callback);
```

* [`buy`, `sell`](https://docs.gdax.com/#place-a-new-order)
```javascript
// Buy 1 BTC @ 100 USD
var buyParams = {
  'price': '100.00', // USD
  'size': '1',  // BTC
  'product_id': 'BTC-USD',
};
authedClient.buy(buyParams, callback);

// Sell 1 BTC @ 110 USD
var sellParams = {
  'price': '110.00', // USD
  'size': '1', // BTC
  'product_id': 'BTC-USD',
};
authedClient.sell(sellParams, callback);
```

* [`cancelOrder`](https://docs.gdax.com/#cancel-an-order)
```javascript
var orderID = 'd50ec984-77a8-460a-b958-66f114b0de9b';
authedClient.cancelOrder(orderID, callback);
```

* [`cancelOrders`](https://docs.gdax.com/#cancel-all)
```javascript
authedClient.cancelOrders(callback);
```

* [`cancelAllOrders`](https://docs.gdax.com/#cancel-all)
```javascript
// `cancelOrders` may require you to make the request multiple times until
// all the orders are deleted.

// `cancelAllOrders` will handle making these requests for you asyncronously.
// Also you can add a product_id param to only delete orders of that product

// The response will be the response of the last call and the data will
// have the order ID's of all your deleted orders
authedClient.cancelAllOrders({product_id: 'BTC-USD'}, callback);
```

* [`getOrders`](https://docs.gdax.com/#list-open-orders)
```javascript
authedClient.getOrders(callback);
// For pagination, you can include extra page arguments
authedClient.getOrders({'after': 3000}, callback);
```

* [`getOrder`](https://docs.gdax.com/#get-an-order)
```javascript
var orderID = 'd50ec984-77a8-460a-b958-66f114b0de9b';
authedClient.getOrder(orderID, callback);
```

* [`getFills`](https://docs.gdax.com/#list-fills)
```javascript
authedClient.getFills(callback);
// For pagination, you can include extra page arguments
authedClient.getFills({'before': 3000}, callback);
```

* [`getFundings`](https://docs.gdax.com/#list-fundings)
```javascript
authedClient.getFundings({}, callback);
```

* [`repay`](https://docs.gdax.com/#repay)
```javascript
var params = {
  'amount': '2000.00',
  'currency': 'USD'
};
authedClient.repay(params, callback);
```

* [`marginTransfer`](https://docs.gdax.com/#margin-transfer)
```javascript
var params =
  'margin_profile_id': '45fa9e3b-00ba-4631-b907-8a98cbdf21be',
  'type': 'deposit',
  'currency': 'USD',
  'amount': 2
};
authedClient.marginTransfer(params, callback);
```

* [`closePosition`](https://docs.gdax.com/#close)
```javascript
var params = {
  'repay_only': false
};
authedClient.closePosition(params, callback);
```

* [`deposit`, `withdraw`](https://docs.gdax.com/#list-fills)
```javascript
// Deposit to your Exchange USD account from your Coinbase USD account.
var depositParamsUSD = {
  'amount': '100.00', // USD,
  'coinbase_account_id': '60680c98bfe96c2601f27e9c', // USD Coinbase Account ID
};
authedClient.deposit(depositParamsUSD, callback);
// Withdraw from your Exchange USD account to your Coinbase USD account.
var withdrawParamsUSD = {
  'amount': '100.00', // USD,
  'coinbase_account_id': '60680c98bfe96c2601f27e9c', // USD Coinbase Account ID
};
authedClient.withdraw(withdrawParamsUSD, callback);

// Deposit to your Exchange BTC account from your Coinbase BTC account.
var depositParamsBTC = {
  'amount': '2.0', // BTC,
  'coinbase_account_id': '536a541fa9393bb3c7000023', // BTC Coinbase Account ID
};
authedClient.deposit(depositParamsBTC, callback);
// Withdraw from your Exchange BTC account to your Coinbase BTC account.
var withdrawParamsBTC = {
  'amount': '2.0', // BTC,
  'coinbase_account_id': '536a541fa9393bb3c7000023', // BTC Coinbase Account ID
};
authedClient.withdraw(withdrawParamsBTC, callback);
```

* [`getTrailingVolume`](https://docs.gdax.com/#user-account)
```javascript
// Get your 30 day trailing volumes
authedClient.getTrailingVolume(callback);
```

### Websocket client
The `WebsocketClient` allows you to connect and listen to the
[exchange websocket messages](https://docs.gdax.com/#messages).
```javascript
var Gdax = require('gdax');
var websocket = new Gdax.WebsocketClient(['BTC-USD', 'ETH-USD']);
websocket.on('message', function(data) { console.log(data); });
```
The following events can be emitted from the `WebsocketClient`:
* `open`
* `message`
* `close`
* `error`

### Orderbook
`Orderbook` is a data structure that can be used to store a local copy of the orderbook.
```javascript
var Gdax = require('gdax');
var orderbook = new Gdax.Orderbook();
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
`Orderbook` and `WebsocketClient` as described [here](https://docs.gdax.com/#real-time-order-book).

```javascript
var Gdax = require('gdax');
var orderbookSync = new Gdax.OrderbookSync();
console.log(orderbookSync.book.state());
```

## Testing

```bash
npm run test

# test for known vulnerabilities in packages
npm install -g nsp
nsp check --output summary
```
