export { TradeclawClient } from './client.js';
import { TradeclawClient } from './client.js';
/** Convenience factory — same as `new TradeclawClient(options)` */
export function createClient(options) {
    return new TradeclawClient(options);
}
