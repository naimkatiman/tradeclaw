export interface NavItem {
  href: string;
  label: string;
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { href: '/docs', label: 'Overview', description: 'What TradeClaw is and what you can do with it' },
      { href: '/docs/installation', label: 'Installation', description: 'Docker, npm, Railway, and Vercel deploy guides' },
      { href: '/docs/configuration', label: 'Configuration', description: 'Environment variables and config options' },
      { href: '/docs/self-hosting', label: 'Self-Hosting', description: 'Production deployment with nginx and SSL' },
    ],
  },
  {
    title: 'Core Features',
    items: [
      { href: '/docs/signals', label: 'Trading Signals', description: 'How signals are generated and scored' },
      { href: '/docs/paper-trading', label: 'Paper Trading', description: 'Risk-free trading simulation' },
      { href: '/docs/strategy-builder', label: 'Strategy Builder', description: 'Visual strategy creation and backtesting' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { href: '/docs/api', label: 'API Reference', description: 'Full REST API documentation' },
      { href: '/docs/webhooks', label: 'Webhooks', description: 'Real-time event delivery with HMAC signing' },
      { href: '/docs/telegram', label: 'Telegram Bot', description: 'Bot setup and command reference' },
      { href: '/docs/plugins', label: 'Plugins', description: 'Custom indicator development' },
      { href: '/docs/embedding', label: 'Embedding', description: 'Embeddable widget for any website' },
    ],
  },
  {
    title: 'Project',
    items: [
      { href: '/docs/contributing', label: 'Contributing', description: 'Dev setup and architecture overview' },
      { href: '/docs/changelog', label: 'Changelog', description: 'Release history and recent changes' },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(s => s.items);

export function getPrevNext(currentHref: string): { prev: NavItem | null; next: NavItem | null } {
  const idx = ALL_NAV_ITEMS.findIndex(item => item.href === currentHref);
  return {
    prev: idx > 0 ? ALL_NAV_ITEMS[idx - 1] : null,
    next: idx < ALL_NAV_ITEMS.length - 1 ? ALL_NAV_ITEMS[idx + 1] : null,
  };
}
