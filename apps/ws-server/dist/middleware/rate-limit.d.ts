export declare function checkConnectionRate(ip: string): boolean;
export declare class MessageRateLimiter {
    private counts;
    check(clientId: string): boolean;
    remove(clientId: string): void;
}
