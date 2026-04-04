import { getAllSymbols } from '@tradeclaw/signals';

const validSymbols = new Set(getAllSymbols());

export class SubscriptionManager {
  // symbol -> set of client IDs
  private symbolToClients: Map<string, Set<string>> = new Map();
  // client ID -> set of symbols
  private clientToSymbols: Map<string, Set<string>> = new Map();

  subscribe(clientId: string, symbols: string[]): string[] {
    const subscribed: string[] = [];

    for (const raw of symbols) {
      const symbol = raw.toUpperCase();
      if (!validSymbols.has(symbol)) continue;

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

  unsubscribe(clientId: string, symbols: string[]): string[] {
    const unsubscribed: string[] = [];

    for (const raw of symbols) {
      const symbol = raw.toUpperCase();

      const clients = this.symbolToClients.get(symbol);
      if (clients) {
        clients.delete(clientId);
        if (clients.size === 0) this.symbolToClients.delete(symbol);
      }

      const syms = this.clientToSymbols.get(clientId);
      if (syms) {
        syms.delete(symbol);
        if (syms.size === 0) this.clientToSymbols.delete(clientId);
      }

      unsubscribed.push(symbol);
    }

    return unsubscribed;
  }

  removeClient(clientId: string): void {
    const syms = this.clientToSymbols.get(clientId);
    if (syms) {
      for (const symbol of syms) {
        const clients = this.symbolToClients.get(symbol);
        if (clients) {
          clients.delete(clientId);
          if (clients.size === 0) this.symbolToClients.delete(symbol);
        }
      }
      this.clientToSymbols.delete(clientId);
    }
  }

  getSubscribers(symbol: string): Set<string> {
    return this.symbolToClients.get(symbol.toUpperCase()) ?? new Set();
  }

  getClientSymbols(clientId: string): string[] {
    const syms = this.clientToSymbols.get(clientId);
    return syms ? Array.from(syms) : [];
  }

  getActiveSymbols(): string[] {
    return Array.from(this.symbolToClients.keys());
  }

  getClientCount(): number {
    return this.clientToSymbols.size;
  }

  getStats(): { clients: number; activeSymbols: number; totalSubscriptions: number } {
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
