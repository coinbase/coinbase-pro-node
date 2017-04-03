'use strict';
const request = require('request');
const Readable = require('stream').Readable;
const API_LIMIT = 100;

class PublicClient {
    constructor(productID, apiURI) {
        this.productID = productID || 'BTC-USD';
        this.apiURI = apiURI || 'https://api.gdax.com';
    }

    addHeaders(obj, additional) {
        obj.headers = obj.headers || {};

        return Object.assign(obj.headers, {
            'User-Agent': 'gdax-node-client',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }, additional);
    }

    makeRelativeURI(parts) {
        return '/' + parts.join('/');
    }

    makeAbsoluteURI(relativeURI) {
        return this.apiURI + relativeURI;
    }

    makeRequestCallback(callback) {
        return (err, response, data) => {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = null
            }
            callback(err, response, data);
        };
    }

    request(method, uriParts, opts, callback) {
        opts = opts || {};
        if (!callback && typeof opts === 'function') {
            callback = opts;
            opts = {};
        }
        if (!callback) {
            throw new Error("Must supply a callback.");
        }
        Object.assign(opts, {
            method: method.toUpperCase(),
            uri: this.makeAbsoluteURI(this.makeRelativeURI(uriParts)),
        });
        this.addHeaders(opts);
        request(opts, this.makeRequestCallback(callback));
    }

    get(...args) {
        this.request('get', ...args);
    }
    post(...args) {
        this.request('post', ...args);
    }
    put(...args) {
        this.request('put', ...args);
    }
    delete(...args) {
        this.request('delete', ...args);
    }

    getProducts(callback) {
        return this.get(['products'], callback);
    }

    getProductOrderBook(args, callback) {
        if (!args) {
            args = {};
        }
        
        if (!callback && typeof args === 'function') {
          callback = args;
          args = {};
        }

        const opts = { 'qs': args };
        return this.get(['products', this.productID, 'book'], opts, callback);
    }

    getProductTicker(callback) {
        return this.get(['products', this.productID, 'ticker'], callback);
    }

    getProductTrades(args, callback) {
        if (!args) {
            args = {};
        }
        
        if (!callback && typeof args === 'function') {
          callback = args;
          args = {};
        }

        const opts = { qs: args};
        return this.get(['products', this.productID, 'trades'], opts, callback);
    }

    getProductTradeStream(tradesFrom, tradesTo) {
        let shouldStop = null;

        if (typeof tradesTo === 'function') {
          shouldStop = tradesTo;
          tradesTo = null;
        }

        const rs = new Readable({objectMode: true});
        let started = false;

        rs._read = () => {
          if (!started) {
            started = true;
            this._fetchTrades(rs, tradesFrom, tradesTo, shouldStop, 0);
          }
        };

        return rs;
    }

    _fetchTrades(stream, tradesFrom, tradesTo, shouldStop) {
        let after = tradesFrom + API_LIMIT + 1;
        let loop = true;

        if (tradesTo && tradesTo <= after) {
          after = tradesTo;
          loop = false;
        }

        const opts = { before: tradesFrom, after: after, limit: API_LIMIT };

        this.getProductTrades(opts, (err, resp, data) => {
                if (err) {
                    stream.emit('error', err);
                    return;
                }
      
                if (resp.statusCode === 429) {
                    // rate-limited, try again
                    setTimeout(() => {
                        this._fetchTrades(stream, tradesFrom, tradesTo, shouldStop);
                    }, 900);
                    return;
                }
      
                if (resp.statusCode !== 200) {
                  stream.emit('error', new Error('Encountered status code ' + resp.statusCode));
                }
      
                for (let i = data.length - 1; i >= 0; i--) {
                  if (shouldStop && shouldStop(data[i])) {
                    stream.push(null);
                    return;
                  }
      
                  stream.push(data[i]);
                }
      
                if (!loop) {
                  stream.push(null);
                  return;
                }
      
                this._fetchTrades(stream, tradesFrom + API_LIMIT, tradesTo, shouldStop);
            });
    }

    getProductHistoricRates(args, callback) {
        if (!args) { 
            args = {};
        }
        
        if (!callback && typeof args === 'function') {
            callback = args;
            args = {};
        }

        const opts = { qs: args};
        return this.get(['products', this.productID, 'candles'], opts, callback);
    }

    getProduct24HrStats(callback) {
        return this.get(['products', this.productID, 'stats'], callback);
    }

    getCurrencies(callback) {
        return this.get(['currencies'], callback);
    }

    getTime(callback) {
        return this.get(['time'], callback);
    }
};

module.exports = PublicClient;
