/**
 > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 > IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 > FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 > LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 > OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 > SOFTWARE.
 */

'use strict';

let PublicClient = require('./lib/clients/public.js');
let WebsocketClient = require('./lib/clients/websocket.js');
let AuthenticatedClient = require('./lib/clients/authenticated.js');
let OrderBook = require('./lib/orderbook.js');
let OrderBookSync = require('./lib/orderbook_sync.js');

module.exports = exports = {
  'PublicClient': PublicClient,
  'WebsocketClient': WebsocketClient,
  'AuthenticatedClient': AuthenticatedClient,
  'OrderBook': OrderBook,
  'OrderBookSync': OrderBookSync,
};
