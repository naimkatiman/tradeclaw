export declare class SubscriptionManager {
    private symbolToClients;
    private clientToSymbols;
    subscribe(clientId: string, symbols: string[]): string[];
    unsubscribe(clientId: string, symbols: string[]): string[];
    removeClient(clientId: string): void;
    getSubscribers(symbol: string): Set<string>;
    getClientSymbols(clientId: string): string[];
    getActiveSymbols(): string[];
    getClientCount(): number;
    getStats(): {
        clients: number;
        activeSymbols: number;
        totalSubscriptions: number;
    };
}
