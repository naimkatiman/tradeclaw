import 'server-only';
import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog. The client (posthog-js, lib/analytics.ts) can only see
 * what happens in the browser; revenue and lifecycle truth lives server-side
 * (Stripe webhook, checkout, auth). This module captures those events.
 *
 * Completely optional: if no PostHog key is configured every call is a no-op,
 * and every call is wrapped so analytics can NEVER break a payment/auth path.
 * Reuses the same PostHog project key as the client (NEXT_PUBLIC_POSTHOG_KEY);
 * a server-only POSTHOG_KEY overrides it if set.
 */

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  const key = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    client = null;
    return null;
  }
  const host =
    process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  client = new PostHog(key, { host });
  return client;
}

export type ServerAnalyticsEvent =
  | 'signed_up'
  | 'trial_started'
  | 'subscription_started'
  | 'subscription_paid'
  | 'subscription_churned';

type Props = Record<string, string | number | boolean | null>;

/**
 * Capture a lifecycle event for `distinctId`. Uses captureImmediate so the
 * event is flushed before a serverless function freezes (a plain capture()
 * would be lost). No-op when unconfigured; never throws.
 */
export async function captureServer(
  event: ServerAnalyticsEvent,
  distinctId: string,
  properties?: Props,
): Promise<void> {
  const c = getClient();
  if (!c || !distinctId) return;
  try {
    await c.captureImmediate({ distinctId, event, properties: properties ?? {} });
  } catch {
    // Analytics must never break the request path.
  }
}

/** Attach/refresh person properties for `distinctId`. No-op when unconfigured; never throws. */
export async function identifyServer(distinctId: string, properties?: Props): Promise<void> {
  const c = getClient();
  if (!c || !distinctId) return;
  try {
    c.identify({ distinctId, properties: properties ?? {} });
    await c.flush();
  } catch {
    // never throw
  }
}
