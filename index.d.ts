declare module 'gdax' {
    export type callback<T> = (err, response, data: T) => void;

    export type ProductTicker = {
        trade_id: string,
        price: string,
        size: string,
        bid: string,
        ask: string,
        volume: string,
        time: Date
    }

    interface BaseOrder {
        type: string;
        side: 'buy' | 'sell';
        product_id: string;
        client_oid?: string;
        stp?: 'dc' | 'co' | 'cn' | 'cb';
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
        size: string;
        funds: string;
    }

    interface StopOrder extends BaseOrder {
        type: 'stop';
        size: string;
        funds: string;
    }

    export type OrderParams = MarketOrder | LimitOrder | StopOrder;

    export interface BaseOrderInfo {
        id: string;
        price: number;
        size: number;
        product_id: string;
        side: 'buy' | 'sell';
        stp: 'dc' | 'co' | 'cn' | 'cb';
        type: 'limit' | 'market' | 'stop';
        created_at: string;
        post_only: boolean;
        fill_fees: number;
        filled_size: number;
        status: 'received' | 'open' | 'done' | 'pending';
        settled: boolean;
        executed_value: number;
    }

    export interface OrderResult extends BaseOrderInfo {
        time_in_force: 'GTC' | 'GTT' | 'IOC' | 'FOK';
        status: 'received' | 'open' | 'done';
    }

    export interface OrderInfo extends BaseOrderInfo {
        status: 'received' | 'open' | 'done' | 'pending';
        funds: number;
        specified_funds: number;
        done_at: string;
        executed_value: number;
    }

    export type PageArgs = {
        before: number;
        after?: number;
        limit?: number;
    } |
        {
            before?: number;
            after: number;
            limit?: number;
        } |
        {
            before?: number;
            after?: number;
            limit: number;
        };


    export type Account = {
        id: string,
        profile_id: string,
        currency: CurrencyType,
        balance: number,
        available: number,
        hold: number
    };

    export type CoinbaseAccount = {
        id: string,
        name: string,
        balance: number,
        currency: CurrencyType,
        type: 'wallet' | 'fiat',
        primary: boolean,
        active: boolean
    };

    export type CurrencyType = 'USD' | 'BTC' | 'LTC' | 'ETH' | 'B2X';

    export type CurrencyInfo = {
        id: CurrencyType,
        name: string,
        min_size: string
    };

    export interface ProductInfo {
        id: string;
        base_currency: string;
        quote_currency: string;
        base_min_size: string;
        base_max_size: string;
        quote_increment: string;
        display_name: string;
        margin_enabled: boolean;
    }

    export class PublicClient {
        constructor(productId?: string, apiURI?: string);

        getProducts(callback: callback<ProductInfo[]>);
        getProducts(): Promise<ProductInfo[]>;

        getProductOrderBook(options: any, callback: callback<any>);
        getProductOrderBook(options: any): Promise<any>;

        getProductTicker(callback: callback<ProductTicker>);
        getProductTicker(): Promise<ProductTicker>;

        getProductTrades(callback: callback<any>);
        getProductTrades(): Promise<any>;

        getProductTradeStream(callback: callback<any>);
        getProductTradeStream(): Promise<any>;

        getProductHistoricRates(args: any, callback: callback<any[][]>);
        getProductHistoricRates(args: any): Promise<any[][]>;

        getProduct24HrStats(callback: callback<any>);
        getProduct24HrStats(): Promise<any>;

        getCurrencies(callback: callback<CurrencyInfo[]>);
        getCurrencies(): Promise<CurrencyInfo[]>;

        getTime(callback: callback<any>);
        getTime(): Promise<any>;
    }

    export class AuthenticatedClient {
        constructor(key: string, b64secret: string, passphrase: string, apiURI: string);

        getCoinbaseAccounts(callback: callback<CoinbaseAccount[]>)
        getCoinbaseAccounts(): Promise<CoinbaseAccount[]>;

        getAccounts(callback: callback<Account[]>);
        getAccounts(): Promise<Account[]>;

        getAccount(accountID: string, callback: callback<Account>);
        getAccount(accountID: string): Promise<Account>;

        getAccountHistory(accountID: string, callback: callback<any>);
        getAccountHistory(accountID: string): Promise<any>;

        getAccountHistory(accountID: string, pageArgs: PageArgs, callback: callback<any>)
        getAccountHistory(accountID: string, pageArgs: PageArgs): Promise<any>;

        getAccountHolds(accountID: string, callback: callback<any>);
        getAccountHolds(accountID: string): Promise<any>;

        getAccountHolds(accountID: string, pageArgs: PageArgs, callback: callback<any>);
        getAccountHolds(accountID: string, pageArgs: PageArgs): Promise<any>;

        buy(params: OrderParams, callback: callback<OrderResult>);
        buy(params: OrderParams): Promise<OrderResult>;

        sell(params: OrderParams, callback: callback<OrderResult>);
        sell(params: OrderParams): Promise<OrderResult>;

        cancelOrder(orderID, callback: callback<any>);
        cancelOrder(orderID): Promise<any>;

        cancelAllOrders(args: { product_id: string }, callback: callback<any>);
        cancelAllOrders(args: { product_id: string }): Promise<any>;

        getOrders(callback: callback<any>);
        getOrders(): Promise<any>;

        getOrders(pageArgs: PageArgs, callback: callback<any>);
        getOrders(pageArgs: PageArgs): Promise<any>;

        getOrder(orderID, callback: callback<OrderInfo>);
        getOrder(orderID): Promise<OrderInfo>;

        getFills(callback: callback<any>);
        getFills(): Promise<any>;

        getFills(pageArgs: PageArgs, callback: callback<any>);
        getFills(pageArgs: PageArgs): Promise<any>;

        getFundings(params, callback: callback<any>);
        getFundings(params): Promise<any>;

        repay(params, callback: callback<any>);
        repay(params): Promise<any>;

        marginTransfer(params, callback: callback<any>);
        marginTransfer(params): Promise<any>;

        closePosition(params, callback: callback<any>);
        closePosition(params): Promise<any>;

        deposit(params, callback: callback<any>);
        deposit(params): Promise<any>;

        withdraw(params, callback: callback<any>);
        withdraw(params): Promise<any>;

        withdrawCrypto(params, callback: callback<any>);
        withdrawCrypto(params): Promise<any>;

        getTrailingVolume(callback: callback<any>);
        getTrailingVolume(): Promise<any>;
    }

    export class WebsocketClient {
        constructor(productIds: string[]);

        on(event: 'message', eventHandler: (data) => void);
        on(event: 'error', eventHandler: (err) => void);
        on(event: 'open', eventHandler: () => void);
        on(event: 'close', eventHandler: () => void);
    }
}
