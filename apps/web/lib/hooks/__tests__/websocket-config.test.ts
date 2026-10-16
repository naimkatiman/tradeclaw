import { resolveWebSocketEndpoint } from '../websocket-config';

describe('resolveWebSocketEndpoint', () => {
  it('disables browser WebSockets in production even when a URL is configured', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'production',
      configuredUrl: 'wss://tradeclaw.example/ws',
      pageProtocol: 'https:',
      pageHostname: 'tradeclaw.example',
    })).toBeNull();
  });

  it('fails closed for unknown non-development environments', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: undefined,
      pageProtocol: 'http:',
      pageHostname: 'tradeclaw.example',
    })).toBeNull();
  });

  it('auto-detects the plaintext Compose relay only from an HTTP development page', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'development',
      pageProtocol: 'http:',
      pageHostname: 'localhost',
    })).toBe('ws://localhost:4000/ws');
  });

  it('does not guess that the plaintext Compose port supports TLS', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'development',
      pageProtocol: 'https:',
      pageHostname: 'tradeclaw.example',
    })).toBeNull();
  });

  it('accepts an explicit TLS reverse-proxy endpoint on HTTPS', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'development',
      configuredUrl: 'wss://tradeclaw.example/realtime/',
      pageProtocol: 'https:',
      pageHostname: 'tradeclaw.example',
    })).toBe('wss://tradeclaw.example/realtime');
  });

  it('adds the relay path to a configured bare origin', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'development',
      configuredUrl: 'ws://localhost:4000',
      pageProtocol: 'http:',
      pageHostname: 'localhost',
    })).toBe('ws://localhost:4000/ws');
  });

  it.each([
    'https://tradeclaw.example/ws',
    'ws://tradeclaw.example/ws?token=static-secret',
    'ws://user:password@tradeclaw.example/ws',
    'not a URL',
  ])('rejects unsafe or invalid public configuration: %s', (configuredUrl) => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'development',
      configuredUrl,
      pageProtocol: 'http:',
      pageHostname: 'tradeclaw.example',
    })).toBeNull();
  });

  it('rejects mixed-content configuration on an HTTPS page', () => {
    expect(resolveWebSocketEndpoint({
      nodeEnv: 'development',
      configuredUrl: 'ws://tradeclaw.example/ws',
      pageProtocol: 'https:',
      pageHostname: 'tradeclaw.example',
    })).toBeNull();
  });
});
