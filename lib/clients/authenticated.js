'use strict';
const util = require('util');
const querystring = require('querystring');
const async = require('async');
const request = require('request');
const signRequest = require('../request_signer').signRequest;
const PublicClient = require('./public');

function verifyParams(params, needed) {
    needed.forEach(param => {
        if (params[param] === undefined) {
            throw new Error("`opts` must include param `" + param + "`");
        }
    });
}

class AuthenticatedClient extends PublicClient {
    constructor(key, b64secret, passphrase, apiURI) {
        super('', apiURI);
        this.key = key;
        this.b64secret = b64secret;
        this.passphrase = passphrase;
    }

    request(method, uriParts, opts, callback) {
        opts = opts || {};
        if (!callback && (typeof opts === 'function')) {
            callback = opts;
            opts = {};
        }

        if (!callback) {
            throw new Error("Must supply a callback");
        }

        const relativeURI = this.makeRelativeURI(uriParts);
        method = method.toUpperCase();
        Object.assign(opts, {
            'method': method,
            'uri': this.makeAbsoluteURI(relativeURI)
        });

        this.addHeaders(opts, this._getSignature(method, relativeURI, opts));
        request(opts, this.makeRequestCallback(callback));
    };

    _getSignature(method, relativeURI, opts) {
        const auth = {
            key: this.key,
            secret: this.b64secret,
            passphrase: this.passphrase
        };
        const sig = signRequest(auth, method, relativeURI, opts);
        if (opts.body) {
            opts.body = JSON.stringify(opts.body);
        }
        return {
            'CB-ACCESS-KEY': sig.key,
            'CB-ACCESS-SIGN': sig.signature,
            'CB-ACCESS-TIMESTAMP': sig.timestamp,
            'CB-ACCESS-PASSPHRASE': sig.passphrase,
        };
    };

    getAccounts(callback) {
        return this.get(['accounts'], callback);
    };

    getAccount(accountID, callback) {
        return this.get(['accounts', accountID], callback);
    };

    getAccountHistory(accountID, args, callback) {
        args = args || {}
        if (!callback && (typeof args === 'function')) {
            callback = args;
            args = {};
        }

        const opts = { qs: args };
        return this.get(['accounts', accountID, 'ledger'], opts, callback);
    };

    getAccountHolds(accountID, args, callback) {
        args = args || {}
        if (!callback && (typeof args === 'function')) {
            callback = args;
            args = {};
        }

        const opts = { qs: args };
        return this.get(['accounts', accountID, 'holds'], opts, callback);
    };

    _placeOrder(params, callback) {
        const requiredParams = ['size', 'side', 'product_id'];

        if (params.type !== 'market') {
            requiredParams.push('price');
        }

        verifyParams(params, requiredParams);
        const opts = { body: params };
        return this.post(['orders'], opts, callback);
    };

    buy(params, callback) {
        params.side = 'buy';
        return this._placeOrder(params, callback);
    };

    sell(params, callback) {
        params.side = 'sell';
        return this._placeOrder(params, callback);
    };

    getTrailingVolume(callback) {
        return this.get(['users', 'this', 'trailing-volume'], {}, callback);
    };

    cancelOrder(orderID, callback) {
        if (!callback && (typeof orderID === 'function')) {
            callback = orderID;
            callback(new Error('must provide an orderID or consider cancelOrders'));
            return;
        }

        return this.delete(['orders', orderID], callback);
    };

    cancelOrders(callback) {
        return this.delete(['orders'], callback);
    };

    // temp over ride public call to get Product Orderbook
    getProductOrderBook(args, productId, callback) {
        args = args || {}
        if (!callback && (typeof args === 'function')) {
            callback = args;
            args = {};
        }

        const opts = { qs: args };
        return this.get(['products', productId, 'book'], opts, callback);
    };


    cancelAllOrders(args, callback) {
        let currentDeletedOrders = [];
        let totalDeletedOrders = [];
        let query = true;
        let response;

        args = args || {}
        if (!callback && (typeof args === 'function')) {
            callback = args;
            args = {};
        }

        const opts = { qs: args };

        const deleteOrders = done => {
            this.delete(['orders'], opts, (err, resp, data) => {
                if (err) {
                    done(err);
                    return;
                }

                if ((resp && resp.statusCode != 200) || !data) {
                    const err = new Error('Failed to cancel all orders');
                    query = false;
                    done(err);
                    return;
                }

                currentDeletedOrders = data;
                totalDeletedOrders = totalDeletedOrders.concat(currentDeletedOrders);
                response = resp;

                done();
            });
        }

        const untilEmpty = () => {
            return currentDeletedOrders.length > 0 && query;
        }

        const completed = err => {
            callback(err, response, totalDeletedOrders);
        }
        
        async.doWhilst(
            deleteOrders,
            untilEmpty,
            completed
        );
    };

    getOrders(args, callback) {
        args = args || {}
        if (!callback && (typeof args === 'function')) {
            callback = args;
            args = {};
        }

        const opts = { qs: args };
        return this.get(['orders'], opts, callback);
    };

    getOrder(orderID, callback) {
        if (!callback && (typeof orderID === 'function')) {
            callback = orderID;
            callback(new Error('must provide an orderID or consider getOrders'));
            return;
        }

        return this.get(['orders', orderID], callback);
    };

    getFills(args, callback) {
        args = args || {}
        if (!callback && (typeof args === 'function')) {
            callback = args;
            args = {};
        }

        const opts = { qs: args };
        return this.get(['fills'], opts, callback);
    };

    getFundings(callback) {
        return this.get(['funding'], callback);
    };

    repay(params, callback) {
        verifyParams(params, ['amount', 'currency']);
        const opts = { body: params };
        return this.post(['funding/repay'], opts, callback);
    };

    marginTransfer(params, callback) {
        verifyParams(params, ['margin_profile_id', 'type', 'currency', 'amount']);
        const opts = { body: params };
        return this.post(['profiles/margin-transfer'], opts, callback);
    };

    closePosition(params, callback) {
        verifyParams(params, ['repay_only']);
        const opts = { body: params };
        return this.post(['position/close'], opts, callback);
    };

    deposit(params, callback) {
        params.type = 'deposit';
        return this._transferFunds(params, callback);
    };

    withdraw(params, callback) {
        params.type = 'withdraw';
        return this._transferFunds(params, callback);
    };

    _transferFunds(params, callback) {
        verifyParams(params, ['type', 'amount', 'coinbase_account_id']);
        const opts = { body: params };
        return this.post(['transfers'], opts, callback);
    };
}

module.exports = AuthenticatedClient;
