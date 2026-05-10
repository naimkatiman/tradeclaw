/**
 * /welcome page server-component tests. Pins the verified-vs-unverified copy
 * branch — the gate that shows "You're in. Let's finish setup." only when
 * Stripe confirms the checkout session belongs to the signed-in user.
 *
 * Stripe's checkout.sessions.retrieve runs server-side during SSR, so it
 * cannot be mocked from a Playwright test. This test mocks the route-level
 * collaborators (session, Stripe SDK, redirect) and renders the RSC by
 * invoking it as an async function, then walks the returned React tree to
 * read the H1.
 */

import * as React from 'react';

const mockRedirect = jest.fn((to: string) => {
  // Match next/navigation behavior: redirect throws a NEXT_REDIRECT error
  // synchronously so the rest of the function never runs.
  const err = new Error('NEXT_REDIRECT') as Error & { digest: string };
  err.digest = `NEXT_REDIRECT;replace;${to};307;`;
  throw err;
});

jest.mock('next/navigation', () => ({
  redirect: (to: string) => mockRedirect(to),
}));

jest.mock('../../../lib/user-session', () => ({
  readSessionFromCookies: jest.fn(),
}));

jest.mock('../../../lib/stripe', () => ({
  getStripe: jest.fn(),
}));

// /welcome polls getUserTier until the webhook flips the user off 'free'.
// Default the mock to 'pro' so the verified-copy test resolves on the first
// poll instead of spinning the full 5s wait window.
jest.mock('../../../lib/tier', () => ({
  getUserTier: jest.fn().mockResolvedValue('pro'),
}));

// Heavy client components — out of scope for this test. Stub to identifiable
// nulls so the only meaningful node in the returned tree is the H1.
jest.mock('../../components/navbar', () => ({
  Navbar: () => null,
}));
jest.mock('../../../components/landing/site-footer', () => ({
  SiteFooter: () => null,
}));
jest.mock('../WelcomeClient', () => ({
  WelcomeClient: () => null,
}));

import { readSessionFromCookies } from '../../../lib/user-session';
import { getStripe } from '../../../lib/stripe';
import WelcomePage from '../page';

const mockedReadSession = readSessionFromCookies as jest.MockedFunction<typeof readSessionFromCookies>;
const mockedGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;

interface ReactElementLike {
  type: unknown;
  props: { children?: unknown };
}

function isElement(node: unknown): node is ReactElementLike {
  return typeof node === 'object' && node !== null && 'type' in node && 'props' in node;
}

function findElementByType(node: unknown, tagName: string): ReactElementLike | null {
  if (!isElement(node)) return null;
  if (node.type === tagName) return node;
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findElementByType(child, tagName);
      if (found) return found;
    }
  } else if (children !== undefined) {
    return findElementByType(children, tagName);
  }
  return null;
}

function textOf(el: ReactElementLike | null): string {
  if (!el) return '';
  const c = el.props?.children;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter((x) => typeof x === 'string').join('');
  return '';
}

describe('/welcome RSC — verified vs unverified copy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /signin when no session cookie present (preserving session_id in next param)', async () => {
    mockedReadSession.mockResolvedValueOnce(null);

    await expect(
      WelcomePage({
        searchParams: Promise.resolve({ session_id: 'cs_test_redirect' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const target = mockRedirect.mock.calls[0][0];
    expect(target).toContain('/signin?next=');
    expect(target).toContain(encodeURIComponent('cs_test_redirect'));
  });

  it('renders verified copy when Stripe confirms checkout session belongs to the signed-in user', async () => {
    mockedReadSession.mockResolvedValueOnce({ userId: 'user-1', issuedAt: Date.now() });
    const retrieve = jest.fn().mockResolvedValue({
      id: 'cs_test_match',
      client_reference_id: 'user-1',
    });
    mockedGetStripe.mockReturnValue({
      checkout: { sessions: { retrieve } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const tree = await WelcomePage({
      searchParams: Promise.resolve({ session_id: 'cs_test_match' }),
    });

    const h1 = findElementByType(tree, 'h1');
    expect(textOf(h1)).toMatch(/You're in\. Let's finish setup\./);
    expect(retrieve).toHaveBeenCalledWith('cs_test_match');
  });

  it('renders unverified copy when client_reference_id does NOT match the signed-in user', async () => {
    // Defense against URL tampering: someone forwards a stranger's session_id
    // to a logged-in user's browser. We must not flip them to "verified".
    mockedReadSession.mockResolvedValueOnce({ userId: 'user-1', issuedAt: Date.now() });
    mockedGetStripe.mockReturnValue({
      checkout: {
        sessions: {
          retrieve: jest.fn().mockResolvedValue({
            id: 'cs_test_other',
            client_reference_id: 'someone-else',
          }),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const tree = await WelcomePage({
      searchParams: Promise.resolve({ session_id: 'cs_test_other' }),
    });

    const h1 = findElementByType(tree, 'h1');
    expect(textOf(h1)).toMatch(/Finish setting up your account\./);
    expect(textOf(h1)).not.toMatch(/You're in/);
  });

  it('renders unverified copy when Stripe retrieve throws (network error / unknown session id)', async () => {
    mockedReadSession.mockResolvedValueOnce({ userId: 'user-1', issuedAt: Date.now() });
    mockedGetStripe.mockReturnValue({
      checkout: {
        sessions: {
          retrieve: jest.fn().mockRejectedValue(new Error('No such checkout session')),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const tree = await WelcomePage({
      searchParams: Promise.resolve({ session_id: 'cs_unknown' }),
    });

    const h1 = findElementByType(tree, 'h1');
    expect(textOf(h1)).toMatch(/Finish setting up your account\./);
  });

  it('renders unverified copy when no session_id is present (Stripe never called)', async () => {
    mockedReadSession.mockResolvedValueOnce({ userId: 'user-1', issuedAt: Date.now() });
    const retrieve = jest.fn();
    mockedGetStripe.mockReturnValue({
      checkout: { sessions: { retrieve } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const tree = await WelcomePage({
      searchParams: Promise.resolve({}),
    });

    const h1 = findElementByType(tree, 'h1');
    expect(textOf(h1)).toMatch(/Finish setting up your account\./);
    expect(retrieve).not.toHaveBeenCalled();
    expect(mockedGetStripe).not.toHaveBeenCalled();
  });
});
