interface WebSocketRuntimeConfig {
  nodeEnv: string | undefined;
  configuredUrl?: string;
  pageProtocol?: string;
  pageHostname?: string;
}

/**
 * Resolve the browser WebSocket endpoint without weakening relay auth.
 *
 * The relay requires a signed token outside local development, and the web app
 * does not currently issue a browser-safe, short-lived WebSocket token. Keep
 * browser WebSockets disabled for every non-development build so the caller can
 * use the credential-independent SSE price stream instead. AUTH_SECRET must
 * never be placed in a NEXT_PUBLIC_* variable.
 */
export function resolveWebSocketEndpoint({
  nodeEnv,
  configuredUrl,
  pageProtocol,
  pageHostname,
}: WebSocketRuntimeConfig): string | null {
  if (nodeEnv !== 'development') {
    return null;
  }

  const rawUrl = configuredUrl?.trim();
  if (rawUrl) {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      return null;
    }

    // Browsers block ws:// from an HTTPS page as mixed content.
    if (pageProtocol === 'https:' && url.protocol !== 'wss:') {
      return null;
    }

    // Static credentials or tokens do not belong in a public build-time URL.
    if (url.username || url.password || url.search || url.hash) {
      return null;
    }

    // Preserve an explicit reverse-proxy path. A bare origin retains the
    // existing convention of serving the relay at /ws.
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = '/ws';
    } else {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  }

  // Plain-HTTP local/Compose development exposes the relay on port 4000.
  // HTTPS needs an explicitly configured TLS reverse-proxy endpoint; guessing
  // wss://<host>:4000 would target Compose's plaintext port and always fail.
  if (pageProtocol === 'http:' && pageHostname) {
    return `ws://${pageHostname}:4000/ws`;
  }

  return null;
}

export function getWebSocketEndpoint(): string | null {
  return resolveWebSocketEndpoint({
    nodeEnv: process.env.NODE_ENV,
    configuredUrl: process.env.NEXT_PUBLIC_WS_URL,
    pageProtocol: typeof window === 'undefined' ? undefined : window.location.protocol,
    pageHostname: typeof window === 'undefined' ? undefined : window.location.hostname,
  });
}
