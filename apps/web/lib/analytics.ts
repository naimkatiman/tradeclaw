/**
 * Optional client analytics.
 *
 * Keep PostHog out of the initial application bundle. When analytics is not
 * configured, these helpers remain synchronous no-ops and the SDK is never
 * requested by the browser.
 */

export type AnalyticsEvent =
  | 'signal_viewed'
  | 'hero_viewed'
  | 'activated'
  | 'artifact_downloaded'
  | 'record_inspected'
  | 'methodology_viewed'
  | 'screener_scan_completed'
  | 'backtest_completed';

type AnalyticsProperties = Record<string, string | number | boolean | null>;
type PostHogClient = typeof import('posthog-js').default;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let clientPromise: Promise<PostHogClient | null> | null = null;

function getClient(): Promise<PostHogClient | null> {
  if (typeof window === 'undefined' || !POSTHOG_KEY) {
    return Promise.resolve(null);
  }

  if (!clientPromise) {
    clientPromise = import('posthog-js')
      .then(({ default: posthog }) => {
        if (!posthog.__loaded) {
          posthog.init(POSTHOG_KEY, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
            capture_pageview: false,
          });
        }
        return posthog;
      })
      .catch(() => null);
  }

  return clientPromise;
}

function withClient(action: (client: PostHogClient) => void): void {
  void getClient().then((client) => {
    if (!client) return;
    try {
      action(client);
    } catch {
      // Analytics must never break a user-facing action.
    }
  });
}

export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  withClient((client) => client.capture(event, properties ?? {}));
}

export function trackPageView(currentUrl: string): void {
  withClient((client) => client.capture('$pageview', { $current_url: currentUrl }));
}

export function registerSuperProperties(properties: AnalyticsProperties): void {
  withClient((client) => client.register(properties));
}
