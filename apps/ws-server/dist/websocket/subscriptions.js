import { getAllSymbols } from '@tradeclaw/signals';
const validSymbols = new Set(getAllSymbols());
export class SubscriptionManager {
    // symbol -> set of client IDs
    symbolToClients = new Map();
    // client ID -> set of symbols
    clientToSymbols = new Map();
    subscribe(clientId, symbols) {
        const subscribed = [];
        for (const raw of symbols) {
            const symbol = raw.toUpperCase();
            if (!validSymbols.has(symbol))
                continue;
            // Add to symbol -> clients
            let clients = this.symbolToClients.get(symbol);
            if (!clients) {
                clients = new Set();
                this.symbolToClients.set(symbol, clients);
            }
            clients.add(clientId);
            // Add to client -> symbols
            let syms = this.clientToSymbols.get(clientId);
            if (!syms) {
                syms = new Set();
                this.clientToSymbols.set(clientId, syms);
            }
            syms.add(symbol);
            subscribed.push(symbol);
        }
        return subscribed;
    }
    unsubscribe(clientId, symbols) {
        const unsubscribed = [];
        for (const raw of symbols) {
            const symbol = raw.toUpperCase();
            const clients = this.symbolToClients.get(symbol);
            if (clients) {
                clients.delete(clientId);
                if (clients.size === 0)
                    this.symbolToClients.delete(symbol);
            }
            const syms = this.clientToSymbols.get(clientId);
            if (syms) {
                syms.delete(symbol);
                if (syms.size === 0)
                    this.clientToSymbols.delete(clientId);
            }
            unsubscribed.push(symbol);
        }
        return unsubscribed;
    }
    removeClient(clientId) {
        const syms = this.clientToSymbols.get(clientId);
        if (syms) {
            for (const symbol of syms) {
                const clients = this.symbolToClients.get(symbol);
                if (clients) {
                    clients.delete(clientId);
                    if (clients.size === 0)
                        this.symbolToClients.delete(symbol);
                }
            }
            this.clientToSymbols.delete(clientId);
        }
    }
    getSubscribers(symbol) {
        return this.symbolToClients.get(symbol.toUpperCase()) ?? new Set();
    }
    getClientSymbols(clientId) {
        const syms = this.clientToSymbols.get(clientId);
        return syms ? Array.from(syms) : [];
    }
    getActiveSymbols() {
        return Array.from(this.symbolToClients.keys());
    }
    getClientCount() {
        return this.clientToSymbols.size;
    }
    getStats() {
        let total = 0;
        for (const syms of this.clientToSymbols.values()) {
            total += syms.size;
        }
        return {
            clients: this.clientToSymbols.size,
            activeSymbols: this.symbolToClients.size,
            totalSubscriptions: total,
        };
    }
}
//# sourceMappingURL=subscriptions.js.map