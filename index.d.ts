import { EventEmitter } from 'events';
import * as request from 'request';
import { Readable } from 'stream';

declare module 'coinbase-pro' {
  export type HttpResponse = request.Response;

  export type callback<T> = (err: any, response: HttpResponse, data: T) => void;

  interface ApiServerTime {
    iso: string;
    epoch: number;
  }

  export type ProductTicker = {
    trade_id: string;
    price: string;
    size: string;
    bid: string;
    ask: string;
    volume: string;
    time: string;
  };

  interface BaseOrder {
    side: 'buy' | 'sell';
    product_id: string;
    client_oid?: string;
    stp?: 'dc' | 'co' | 'cn' | 'cb';
    stop?: 'loss' | 'entry';
    stop_price?: string;
  }

  interface LimitOrder extends BaseOrder {
    type: 'limit';
    price: string;
    size: string;
    time_in_force?: 'GTC' | 'GTT' | 'IOC' | 'FOK';
    cancel_after?: 'min' | 'hour' | 'day';
    post_only?: boolean;
  }

  /**
   * Only one of `size` and `funds` are required for market and limit orders (the other can be explicitly assigned null or undefined). However,
   * it is advisable to include both. If funds is not specified, the entire user balance is placed on hold until the order is filled which
   * will prevent other orders from being placed in the interim. This can cause issues for HFT algorithms for example.
   */
  interface MarketOrder extends BaseOrder {
    type: 'market';
    size: string | null;
    funds: string | null;
  }

  export type OrderParams = MarketOrder | LimitOrder;

  export interface BaseOrderInfo {
    id: string;
    price?: string;
    size?: string;
    product_id: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    created_at: string;
    post_only: boolean;
    fill_fees: string;
    filled_size: string;
    status: 'active' | 'rejected' | 'open' | 'done' | 'pending';
    settled: boolean;
    executed_value: string;
    time_in_force?: 'GTC' | 'GTT' | 'IOC' | 'FOK';
    funds?: string;
    specified_funds?: string;
  }

  export interface OrderResult extends BaseOrderInfo {
    stp: 'dc' | 'co' | 'cn' | 'cb';
  }

  export interface OrderInfo extends BaseOrderInfo {
    done_at?: string;
    done_reason?: string;
  }

  export type PageArgs = {
    before?: number;
    after?: number;
    limit?: number;
  };

  export type ProductID = {
    product_id?: string;
  };

  export type PagProductID = ProductID & PageArgs;

  export type PagFills = {
    order_id?: string;
  } & ProductID &
    PageArgs;

  export type PagOrders = {
    status?: string;
    limit?: number;
    after?: string;
    before?: string;
  } & ProductID;

  export type Account = {
    id: string;
    profile_id: string;
    currency: string;
    balance: string;
    available: string;
    hold: string;
  };

  export type CoinbaseAccount = {
    id: string;
    name: string;
    balance: number;
    currency: string;
    type: 'wallet' | 'fiat';
    primary: boolean;
    active: boolean;
    hold_balance: string;
    hold_currency: string;
    wire_deposit_information?: {
      account_number: string;
      routing_number: string;
      bank_name: string;
      bank_address: string;
      bank_country: {
        code: string;
        name: string;
      };
      account_name: string;
      account_address: string;
      reference: string;
    };
    swift_deposit_information?: string | null;
    destination_tag_name?: string;
    destination_tag_regex?: string;
  };

  export type CurrencyInfo = {
    id: string;
    name: string;
    min_size: string;
  };

  export interface ProductInfo {
    id: string;
    base_currency: string;
    quote_currency: string;
    base_min_size: string;
    base_max_size: string;
    base_increment: string;
    quote_increment: string;
    display_name: string;
    status: string;
    margin_enabled: boolean;
    min_market_funds: string;
    max_market_funds: string;
    post_only: boolean;
    limit_only: boolean;
    cancel_only: boolean;
  }

  export type Candles = {
    granularity: number;
    start?: string;
    end?: string;
  } & ProductID;

  export type OrderBookArgs = {
    level?: number;
  } & ProductID;

  export type AccountID = {
    account_id: string;
  };

  export type PagAccount = AccountID & PageArgs;

  export type OrderID = {
    id: string;
  };

  export type RepayArgs = {
    amount: string;
    currency: string;
  };

  export type MarginAgrs = {
    type: string;
    margin_profile_id: string;
  } & RepayArgs;

  export type ConvertArgs = {
    to: string;
    from: string;
    amount: string;
  };

  export type DepositArgs = {
    coinbase_account_id: string;
  } & RepayArgs;

  export type DepositPayArgs = {
    payment_method_id: string;
  } & RepayArgs;

  export type DepositCryptoArgs = {
    currency: string;
  };

  export type Report = {
    start_date: string;
    end_date: string;
    product_id?: string;
    account_id?: string;
    format?: string;
    email?: string;
  };

  export type ReportID = {
    report_id: string;
  };

  /**
   * If a PublicClient or AuthenticatedClient method that does an
   * HTTP request throws an error, then it will have this shape.
   */
  export interface HttpError extends Error {
    response: HttpResponse;
    data?: any;
  }

  export interface PublicClientOptions {
    product_id?: string;
    sandbox?: boolean;
    api_uri?: string;
    timeout?: number;
  }

  export interface AuthenticatedClientOptions extends PublicClientOptions {
    key: string;
    secret: string;
    passphrase: string;
  }

  export class PublicClient {
    constructor(options?: PublicClientOptions);

    getProducts(callback: callback<ProductInfo[]>): void;
    getProducts(): Promise<ProductInfo[]>;

    getProductOrderBook(callback: callback<any>): void;
    getProductOrderBook(): Promise<any>;

    getProductOrderBook(options: OrderBookArgs, callback: callback<any>): void;
    getProductOrderBook(options: OrderBookArgs): Promise<any>;

    getProductTicker(callback: callback<ProductTicker>): void;
    getProductTicker(): Promise<ProductTicker>;

    getProductTicker(
      options: ProductID,
      callback: callback<ProductTicker>
    ): void;
    getProductTicker(options: ProductID): Promise<ProductTicker>;

    getProductTrades(callback: callback<any>): void;
    getProductTrades(): Promise<any>;

    getProductTrades(options: PagProductID, callback: callback<any>): void;
    getProductTrades(options: PagProductID): Promise<any>;

    getProductTradeStream(options: any): Readable;

    getProductHistoricRates(
      options: Candles,
      callback: callback<any[][]>
    ): void;
    getProductHistoricRates(options: Candles): Promise<any[][]>;

    getProduct24HrStats(options: ProductID, callback: callback<any>): void;
    getProduct24HrStats(options: ProductID): Promise<any>;

    getProduct24HrStats(callback: callback<any>): void;
    getProduct24HrStats(): Promise<any>;

    getCurrencies(callback: callback<CurrencyInfo[]>): void;
    getCurrencies(): Promise<CurrencyInfo[]>;

    getTime(callback: callback<ApiServerTime>): void;
    getTime(): Promise<ApiServerTime>;
  }

  export class AuthenticatedClient extends PublicClient {
    constructor(options: AuthenticatedClientOptions);

    getCoinbaseAccounts(callback: callback<CoinbaseAccount[]>): void;
    getCoinbaseAccounts(): Promise<CoinbaseAccount[]>;

    getPaymentMethods(callback: callback<any>): void;
    getPaymentMethods(): Promise<any>;

    getAccounts(callback: callback<Account[]>): void;
    getAccounts(): Promise<Account[]>;

    getAccount(options: AccountID, callback: callback<Account>): void;
    getAccount(options: AccountID): Promise<Account>;

    getAccountHistory(options: PagAccount, callback: callback<any>): void;
    getAccountHistory(options: PagAccount): Promise<any>;

    getAccountTransfers(options: PagAccount, callback: callback<any>): void;
    getAccountTransfers(options: PagAccount): Promise<any>;

    getAccountHolds(options: PagAccount, callback: callback<any>): void;
    getAccountHolds(options: PagAccount): Promise<any>;

    buy(params: OrderParams, callback: callback<OrderResult>): void;
    buy(params: OrderParams): Promise<OrderResult>;

    sell(params: OrderParams, callback: callback<OrderResult>): void;
    sell(params: OrderParams): Promise<OrderResult>;

    getTrailingVolume(callback: callback<any>): void;
    getTrailingVolume(): Promise<any>;

    placeOrder(params: OrderParams, callback: callback<OrderResult>): void;
    placeOrder(params: OrderParams): Promise<OrderResult>;

    cancelOrder(options: OrderID, callback: callback<string[]>): void;
    cancelOrder(options: OrderID): Promise<string[]>;

    cancelAllOrders(callback: callback<string[]>): void;
    cancelAllOrders(): Promise<string[]>;

    cancelAllOrders(options: ProductID, callback: callback<string[]>): void;
    cancelAllOrders(options: ProductID): Promise<string[]>;

    cancelOrders(callback: callback<string[]>): void;
    cancelOrders(): Promise<string[]>;

    cancelOrders(options: ProductID, callback: callback<string[]>): void;
    cancelOrders(options: ProductID): Promise<string[]>;

    getOrders(callback: callback<OrderInfo[]>): void;
    getOrders(): Promise<OrderInfo[]>;

    getOrders(options: PagOrders, callback: callback<OrderInfo[]>): void;
    getOrders(options: PagOrders): Promise<OrderInfo[]>;

    getOrder(options: OrderID, callback: callback<OrderInfo>): void;
    getOrder(options: OrderID): Promise<OrderInfo>;

    getFills(callback: callback<any>): void;
    getFills(): Promise<any>;

    getFills(options: PagFills, callback: callback<any>): void;
    getFills(options: PagFills): Promise<any>;

    getFundings(callback: callback<any>): void;
    getFundings(): Promise<any>;

    repay(options: RepayArgs, callback: callback<any>): void;
    repay(options: RepayArgs): Promise<any>;

    marginTransfer(options: MarginAgrs, callback: callback<any>): void;
    marginTransfer(options: MarginAgrs): Promise<any>;

    closePosition(options: any, callback: callback<any>): void;
    closePosition(options: any): Promise<any>;

    convert(options: ConvertArgs, callback: callback<any>): void;
    convert(options: ConvertArgs): Promise<any>;

    deposit(options: DepositArgs, callback: callback<any>): void;
    deposit(options: DepositArgs): Promise<any>;

    depositPayment(options: DepositPayArgs, callback: callback<any>): void;
    depositPayment(options: DepositPayArgs): Promise<any>;

    depositCrypto(options: DepositCryptoArgs, callback: callback<any>): void;
    depositCrypto(options: DepositCryptoArgs): Promise<any>;

    withdraw(options: DepositArgs, callback: callback<any>): void;
    withdraw(options: DepositArgs): Promise<any>;

    withdrawPayment(options: DepositPayArgs, callback: callback<any>): void;
    withdrawPayment(options: DepositPayArgs): Promise<any>;

    withdrawCrypto(options: DepositCryptoArgs, callback: callback<any>): void;
    withdrawCrypto(options: DepositCryptoArgs): Promise<any>;

    createReport(options: Report, callback: callback<any>): void;
    createReport(options: Report): Promise<any>;

    getReportStatus(options: ReportID, callback: callback<any>): void;
    getReportStatus(options: ReportID): Promise<any>;
  }

  type ChannelName =
    | 'full'
    | 'level2'
    | 'ticker'
    | 'user'
    | 'matches'
    | 'heartbeat';

  type Channel = {
    name: ChannelName;
    product_ids?: string[];
  };

  export namespace WebsocketMessage {
    type Side = 'buy' | 'sell';

    // Heartbeat channel
    export type Heartbeat = {
      type: 'heartbeat';
      sequence: number;
      last_trade_id: number;
      product_id: string;
      time: string; // ISO Date string without time zone
    };

    // Level 2 channel
    export type L2Snapshot = {
      type: 'snapshot';
      product_id: string;
      bids: [string, string][]; // strings are serialized fixed-point numbers
      asks: [string, string][]; // [price, size]
    };

    export type L2Update = {
      type: 'l2update';
      product_id: string;
      time: string;
      changes: [string, string, string][]; // [side, price, new size]
    };

    // Full channel
    export type Received = {
      type: 'received';
      time: string;
      product_id: string;
      sequence: number;
      order_id: string;
      side: Side;
      client_oid: string;
      user_id?: string;
      profile_id?: string;
    } & (ReceivedLimit | ReceivedMarket);
    type ReceivedLimit = {
      order_type: 'limit';
      size: string;
      price: string;
    };
    type ReceivedMarket = {
      order_type: 'market';
      funds?: string;
      size?: string;
    };
    export type Open = {
      type: 'open';
      price: string;
      order_id: string;
      product_id: string;
      profile_id?: string;
      sequence: number;
      side: Side;
      time: string;
      user_id?: string;
      remaining_size: string;
    };
    export type Match = {
      type: 'match' | 'last_match';
      trade_id: number;
      sequence: number;
      maker_order_id: string;
      taker_order_id: string;
      time: string;
      product_id: string;
      size: string;
      price: string;
      side: Side;
      profile_id?: string;
      user_id?: string;
      maker_profile_id?: string;
      maker_user_id?: string;
      taker_profile_id?: string;
      taker_user_id?: string;
    };
    export type Change = {
      type: 'change';
      time: string;
      sequence: number;
      order_id: string;
      product_id: string;
      price?: string;
      side: Side;
      new_size?: string;
      old_size?: string;
      new_funds?: string;
      old_funds?: string;
      user_id: string;
      profile_id: string;
    };
    export type Done = {
      type: 'done';
      side: Side;
      order_id: string;
      reason: 'filled' | 'canceled';
      product_id: string;
      time: string;
      sequence: number;
      price?: string;
      remaining_size?: string;
      user_id?: string;
      profile_id?: string;
    };
    export type Activate = {
      type: 'activate';
      product_id: string;
      time: string;
      user_id: string;
      profile_id: string;
      order_id: string;
      client_oid: string;
      stop_type: string;
      side: Side;
      stop_price: string;
      size: string;
      limit_price: string;
      taker_fee_rate: string;
    };

    // Ticker channel
    type BaseTicker = {
      type: 'ticker';
      sequence: number;
      product_id: string;
      price: string;
      open_24h: string;
      volume_24h: string;
      low_24h: string;
      high_24h: string;
      volume_30d: string;
      best_bid: string;
      best_ask: string;
    };
    type FullTicker = BaseTicker & {
      trade_id: number;
      side: Side; // Taker side
      time: string;
      last_size: string;
    };
    export type Ticker = BaseTicker | FullTicker;

    // Subscription
    export type Subscription = {
      type: 'subscriptions';
      channels: Channel[];
    };

    // Error
    export type Error = {
      type: 'error';
      message: string;
      reason: string;
    };
  }
  export type WebsocketMessage =
    | WebsocketMessage.Heartbeat
    | WebsocketMessage.L2Snapshot
    | WebsocketMessage.L2Update
    | WebsocketMessage.Received
    | WebsocketMessage.Open
    | WebsocketMessage.Match
    | WebsocketMessage.Change
    | WebsocketMessage.Done
    | WebsocketMessage.Activate
    | WebsocketMessage.Ticker
    | WebsocketMessage.Subscription
    | WebsocketMessage.Error;

  interface WebsocketClientOptions {
    product_ids?: string | string[];
    channels?: string | string[];
    sandbox?: boolean;
    api_uri?: string;
    key?: string;
    secret?: string;
    passphrase?: string;
  }

  type SubscriptionOptions = { channels?: Channel[]; product_ids?: string[] };

  export class WebsocketClient extends EventEmitter {
    constructor(options?: WebsocketClientOptions);

    on(event: 'message', eventHandler: (data: WebsocketMessage) => void): this;
    on(event: 'error', eventHandler: (err: any) => void): this;
    on(event: 'open', eventHandler: () => void): this;
    on(event: 'close', eventHandler: () => void): this;

    connect(): void;
    disconnect(): void;

    subscribe(options?: SubscriptionOptions): void;
    unsubscribe(options?: SubscriptionOptions): void;
  }
}
