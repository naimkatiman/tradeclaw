# Public Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `/demo` page shareable with deep-link support, OG social cards, and a "share this" CTA — so users can send TradeClaw to a friend via a clean URL without any setup.

**Architecture:** The demo infrastructure already exists: `/demo` route with `DemoClient.tsx`, `/api/demo/signals` with deterministic daily mock data, demo SVGs, and `LiveDemoEmbed`. This plan adds: (1) deep-link query params (`?symbol=BTCUSD`), (2) dynamic OG image for social sharing, (3) a share button with copy-to-clipboard, and (4) a CTA banner nudging demo visitors to sign up. No auth required for any of this.

**Tech Stack:** Next.js dynamic metadata, OG image route (`ImageResponse`), React client components, existing demo signal API.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/web/app/demo/page.tsx` | Add dynamic metadata with OG image based on symbol param |
| Modify | `apps/web/app/demo/DemoClient.tsx` | Add symbol deep-link filter, share button, signup CTA |
| Create | `apps/web/app/api/og/demo/route.tsx` | Dynamic OG image for demo share links |
| Create | `apps/web/app/components/share-button.tsx` | Reusable share/copy-link button |

---

### Task 1: Share Button Component

**Files:**
- Create: `apps/web/app/components/share-button.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/app/components/share-button.tsx
'use client';

import { useState, useCallback } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  className?: string;
}

export function ShareButton({ url, title, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or share API unavailable — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, [url, title]);

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
        copied
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'
      } ${className}`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/components/share-button.tsx
git commit -m "feat(demo): add reusable ShareButton component"
```

---

### Task 2: Dynamic OG Image for Demo

**Files:**
- Create: `apps/web/app/api/og/demo/route.tsx`

- [ ] **Step 1: Write the OG image route**

```tsx
// apps/web/app/api/og/demo/route.tsx
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'BTCUSD';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontSize: 24, color: '#71717a', marginBottom: 12 }}>
          TRADECLAW LIVE DEMO
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
          {symbol}
        </div>
        <div style={{ fontSize: 20, color: '#a1a1aa' }}>
          AI Trading Signals — No Login Required
        </div>
        <div style={{ fontSize: 16, color: '#52525b', marginTop: 24 }}>
          tradeclaw.win/demo
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
```

- [ ] **Step 2: Smoke test**

Run: `curl -I 'http://localhost:3000/api/og/demo?symbol=BTCUSD'`
Expected: `content-type: image/png`, 200 OK

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/og/demo/route.tsx
git commit -m "feat(demo): add dynamic OG image for demo share links"
```

---

### Task 3: Add Deep-Link Support and Dynamic Metadata

**Files:**
- Modify: `apps/web/app/demo/page.tsx`

- [ ] **Step 1: Convert to dynamic metadata with symbol param**

Replace the current static metadata export with `generateMetadata`:

```tsx
// apps/web/app/demo/page.tsx
import type { Metadata } from 'next';
import DemoClient from './DemoClient';

interface Props {
  searchParams: Promise<{ symbol?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const symbol = params.symbol ?? 'BTCUSD';
  const title = `${symbol} Live Demo — TradeClaw`;
  const description = `See TradeClaw AI trading signals for ${symbol} in action. Live confidence updates. No login required.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og/demo?symbol=${symbol}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/demo?symbol=${symbol}`],
    },
  };
}

export default async function DemoPage({ searchParams }: Props) {
  const params = await searchParams;
  return <DemoClient initialSymbol={params.symbol} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/demo/page.tsx
git commit -m "feat(demo): dynamic OG metadata with symbol deep-link"
```

---

### Task 4: Add Share Button and Signup CTA to DemoClient

**Files:**
- Modify: `apps/web/app/demo/DemoClient.tsx`

- [ ] **Step 1: Read the current DemoClient to find the header section and signal card rendering**

Read `DemoClient.tsx` fully to locate: (a) where the component accepts props, (b) where the signal grid/list is rendered, (c) the existing layout structure.

- [ ] **Step 2: Add initialSymbol prop, symbol filter, share button, and CTA**

At the component level:
- Accept `initialSymbol?: string` prop
- If `initialSymbol` is set, pre-filter signals to that symbol
- Add a `<ShareButton>` in the header area next to the page title
- Add a bottom CTA banner: "Want real signals? Sign up free" linking to `/signin`

The share URL should be constructed as:

```typescript
const shareUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/demo${selectedSymbol ? `?symbol=${selectedSymbol}` : ''}`
  : '/demo';
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/demo?symbol=XAUUSD`
Expected: Demo page opens filtered to XAUUSD, share button visible, clicking it copies URL, CTA banner at bottom.

Navigate to `http://localhost:3000/demo`
Expected: All symbols shown, share button copies base demo URL.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/demo/DemoClient.tsx
git commit -m "feat(demo): add symbol deep-link filter, share button, and signup CTA"
```

---

### Task 5: Build & Verify

- [ ] **Step 1: Run full build**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && npm run build
```
Expected: Build succeeds.

- [ ] **Step 2: Test OG image renders correctly**

Open `https://localhost:3000/api/og/demo?symbol=ETHUSD` in browser — should show a styled card.

- [ ] **Step 3: Final commit if any build fixes were needed**

```bash
git add -A && git commit -m "fix(demo): resolve build issues"
```
