/**
 * Analytics event tracking — thin wrapper around PostHog.
 *
 * Completely optional: if NEXT_PUBLIC_POSTHOG_KEY is not set, all
 * calls are no-ops so the app works fine without analytics.
 */

import posthog from 'posthog-js';

export type AnalyticsEvent =
  | 'signal_viewed'
  | 'subscription_clicked'
  | 'checkout_started'
  | 'trial_started'
  | 'hero_viewed'
  | 'activated';

export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (!posthog.__loaded) return;

  try {
    posthog.capture(event, properties ?? {});
  } catch {
    // Swallow analytics errors so they never break user-facing features
  }
}

/**
 * Register PostHog super properties — persisted on this browser and attached to
 * EVERY subsequent event. Used to stamp the hero A/B variant onto all downstream
 * events (pageviews, subscription_clicked, checkout_started, activated, …) so
 * the experiment measures conversion + activation by variant, not just hero
 * clicks. No-op when analytics is unconfigured; never throws.
 */
export function registerSuperProperties(
  properties: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (!posthog.__loaded) return;

  try {
    posthog.register(properties);
  } catch {
    // Swallow analytics errors so they never break user-facing features
  }
}
