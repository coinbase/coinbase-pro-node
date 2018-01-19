# Change Log

## Unreleased

### Changed

* Modify `lib/orderbook_sync` to be initialized with an array of product IDs instead of one product ID, and have it keep track of multiple books for these products in `orderbookSync.books`. `orderbookSync.book` is removed.
