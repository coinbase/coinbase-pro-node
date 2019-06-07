const DEFAULT_TIMEOUT = 10 * 1000;
const API_LIMIT = 100;
const DEFAULT_PAIR = 'BTC-USD';
const DEFAULT_CHANNELS = ['full'];
const EXCHANGE_API_URL = 'https://api.pro.coinbase.com';
const SANDBOX_API_URL = 'https://api-public.sandbox.pro.coinbase.com';
const EXCHANGE_WS_URL = 'wss://ws-feed.pro.coinbase.com';
const SANDBOX_WS_URL = 'wss://ws-feed-public.sandbox.pro.coinbase.com';
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

module.exports = {
  DEFAULT_TIMEOUT,
  API_LIMIT,
  DEFAULT_PAIR,
  DEFAULT_CHANNELS,
  EXCHANGE_API_URL,
  SANDBOX_API_URL,
  EXCHANGE_WS_URL,
  SANDBOX_WS_URL,
  PAGE_ARGS,
  ORDER_FIELDS,
};
