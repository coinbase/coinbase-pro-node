# Coinbase Exchange
The official Node.js library for the [Coinbase Exchange
API](https://docs.exchange.coinbase.com/).

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
npm install coinbase-exchange
# From Github
npm install coinbase/coinbase-exchange-node
```

## Quick Start

### The Public API Client
The Coinbase Exchange API has both public and private endpoints. If you're only
interested in the public endpoints, you should use a `PublicClient`.

```javascript
var CoinbaseExchange = require('coinbase-exchange');
var publicClient = new CoinbaseExchange.PublicClient();
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
documentation](https://docs.exchange.coinbase.com/#market-data).

#### Public API Methods

* [`getProducts`](https://docs.exchange.coinbase.com/#get-products)
```javascript
publicClient.getProducts(callback);
```

* [`getProductOrderBook`](https://docs.exchange.coinbase.com/#get-product-order-book)
```javascript
// Get the order book at the default level of detail.
publicClient.getProductOrderBook('BTC-USD', callback);
// Get the order book at a specific level of detail.
publicClient.getProductOrderBook('BTC-USD', 3, callback);
```

* [`getProductTicker`](https://docs.exchange.coinbase.com/#get-product-ticker)
```javascript
publicClient.getProductTicker('BTC-USD', callback);
```

* [`getProductTrades`](https://docs.exchange.coinbase.com/#get-trades)
```javascript
publicClient.getProductTrades('BTC-USD', callback);
```

* [`getProductHistoricRates`](https://docs.exchange.coinbase.com/#get-historic-rates)
```javascript
publicClient.getProductHistoricRates('BTC-USD', callback);
```

* [`getProduct24HrStats`](https://docs.exchange.coinbase.com/#get-24hr-stats)
```javascript
publicClient.getProduct24HrStats('BTC-USD', callback);
```

* [`getCurrencies`](https://docs.exchange.coinbase.com/#get-currencies)
```javascript
publicClient.getCurrencies(callback);
```

* [`getTime`](https://docs.exchange.coinbase.com/#time)
```javascript
publicClient.getTime(callback);
```

### The Authenticated API Client
The [private exchange API
endpoints](https://docs.exchange.coinbase.com/#private) require you to
authenticate with an API key. You can create a new API key [in your exchange
account's settings](https://exchange.coinbase.com/settings).

```javascript
var CoinbaseExchange = require('coinbase-exchange');
var authedClient = new CoinbaseExchange.AuthenticatedClient(
  key, b64secret, passphrase);
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

* [`getAccounts`](https://docs.exchange.coinbase.com/#list-accounts)
```javascript
authedClient.getAccounts(callback);
```

* [`getAccount`](https://docs.exchange.coinbase.com/#get-an-account)
```javascript
var accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccount(accountID, callback);
```

* [`getAccountHistory`](https://docs.exchange.coinbase.com/#get-account-history)
```javascript
var accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountHistory(accountID, callback);
```

* [`getAccountHolds`](https://docs.exchange.coinbase.com/#get-holds)
```javascript
var accountID = '7d0f7d8e-dd34-4d9c-a846-06f431c381ba';
authedClient.getAccountHolds(accountID, callback);
```

* [`buy`, `sell`](https://docs.exchange.coinbase.com/#place-a-new-order)
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

* [`cancelOrder`](https://docs.exchange.coinbase.com/#cancel-an-order)
```javascript
var orderID = 'd50ec984-77a8-460a-b958-66f114b0de9b';
authedClient.cancelOrder(orderID, callback);
```

* [`getOrders`](https://docs.exchange.coinbase.com/#list-open-orders)
```javascript
authedClient.getOrders(callback);
```

* [`getOrder`](https://docs.exchange.coinbase.com/#get-an-order)
```javascript
var orderID = 'd50ec984-77a8-460a-b958-66f114b0de9b';
authedClient.getOrder(orderID, callback);
```

* [`getFills`](https://docs.exchange.coinbase.com/#list-fills)
```javascript
authedClient.getFills(callback);
```

* [`deposit`, `withdraw`](https://docs.exchange.coinbase.com/#list-fills)
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

### The Order Book
The `OrderBook` is a local mirror of the Coinbase Exchange's order book, synced
via WebSockets.

##### Setup
```javascript
var CoinbaseExchange = require('coinbase-exchange');
var orderBook = new CoinbaseExchange.OrderBook();
```

##### Listening to Events
The order book is a type of
[`EventEmitter`](http://nodejs.org/api/events.html#events_events). For the
following events, the data emitted is always in the same form as the messages
received over WebSocket – you can [learn more about those message types
here](https://docs.exchange.coinbase.com/#messages).

* [`"received"`](https://docs.exchange.coinbase.com/#received)
* [`"open"`](https://docs.exchange.coinbase.com/#open)
* [`"done"`](https://docs.exchange.coinbase.com/#done)
* [`"match"`](https://docs.exchange.coinbase.com/#match)
* [`"error"`](https://docs.exchange.coinbase.com/#match)

These events are emitted immediately after the OrderBook has been updated to
include the message's contents. So by the time your code is notified, the book
will already reflect the changes described by the message.

*Example: listening to order matches:*

```javascript
orderBook.on('match', function(message) {
  console.log("Order",
              message.maker_order_id,
              "matched with order",
              message.taker_order_id);
  console.log(message.size, "BTC  @", message.price, "USD");
});
```

There are other events to which you can listen:

* `"ignored"`: Emitted as part of the order book syncing process, once for
  every out-of-date message that is ignored. The data is the original message
  sent over the websocket, one of the types listed above.
* `"unknown"`: Emitted when a message is received with a type that the
  OrderBook doesn't know how to handle. The data is the original message sent
  over the websocket.
* `"statechange"`: Emitted any time the order book instance changes state. A
  hash with two keys, `"old"` mapping to the previous state, `"new"` mapping to
  the new, current state of the order book.

*Example: listening for all errors*
```javascript
orderBook.on('statechange', function(state) {
  if (state.new === orderBook.STATES.error) {
    console.log("Was", state.old, "now in state", state.new);
    // clean up things here
  }
});
```

#### States of the order book
An instance of the order book can be in the following states:

* `"closed"`: the WebSocket connection has been closed and no new messages are
  being processed.
* `"open"`: the WebSocket connection is open, but no new messages are being
  processed.
* `"syncing"`: the WebSocket connection is open, new messages are being queued,
  and the order book snapshot is being loaded.
* `"processing"`: the WebSocket connection is open, the order book is in sync,
  and new messages are being processed as they're received.
* `"error"`: an error has occurred and an exception has been thrown. The
  WebSocket connection is closed and no new messages are being received or
  processed.

