import type { Locale } from '../translations';
import { getTranslations } from '../translations';
import { getAppShellTranslations } from './app-shell';

export type MarketingNavGroupKey = 'trading' | 'tools' | 'community';

export type MarketingNavLinkKey =
  | 'dashboard'
  | 'screener'
  | 'trackRecord'
  | 'research'
  | 'heatmap'
  | 'paperTrading'
  | 'alerts'
  | 'multiTimeframe'
  | 'replay'
  | 'portfolio'
  | 'strategyBuilder'
  | 'indicators'
  | 'apiKeys'
  | 'apiUsage'
  | 'strategyComparison'
  | 'marketplace'
  | 'strategyLeaderboard'
  | 'plugins'
  | 'chromeExtension'
  | 'status'
  | 'costBenchmark'
  | 'liveFeed'
  | 'profileWidget'
  | 'supabaseSetup'
  | 'blog'
  | 'weeklyReport'
  | 'starHistory'
  | 'share'
  | 'contribute'
  | 'contributors'
  | 'discord'
  | 'productHunt'
  | 'weeklyDigest'
  | 'setupGuide'
  | 'sponsors'
  | 'pledgeWall'
  | 'smsAlerts'
  | 'howItWorks';

export interface MarketingNavTranslations {
  language: string;
  actions: {
    more: string;
    liveSignals: string;
    star: string;
    openApp: string;
  };
  aria: {
    mainNavigation: string;
    mobileNavigation: string;
    openMenu: string;
    closeMenu: string;
    starCount: string;
    starPage: string;
  };
  groups: Record<MarketingNavGroupKey, string>;
  links: Record<MarketingNavLinkKey, string>;
}

interface MarketingNavExtras {
  actions: Pick<MarketingNavTranslations['actions'], 'liveSignals' | 'star'>;
  aria: Pick<MarketingNavTranslations['aria'], 'mobileNavigation' | 'starCount' | 'starPage'>;
  links: Pick<
    MarketingNavTranslations['links'],
    | 'profileWidget'
    | 'supabaseSetup'
    | 'blog'
    | 'weeklyReport'
    | 'starHistory'
    | 'share'
    | 'contribute'
    | 'contributors'
    | 'weeklyDigest'
    | 'sponsors'
    | 'costBenchmark'
    | 'howItWorks'
  >;
}

const extras = {
  en: {
    actions: { liveSignals: 'Live signals', star: 'Star' },
    aria: {
      mobileNavigation: 'Mobile navigation',
      starCount: 'GitHub stars: {count}. View star page',
      starPage: 'View GitHub star page',
    },
    links: {
      profileWidget: 'Profile Widget',
      supabaseSetup: 'Supabase Setup',
      blog: 'Blog',
      weeklyReport: 'Weekly Report',
      starHistory: 'Star History',
      share: 'Share',
      contribute: 'Contribute',
      contributors: 'Contributors',
      weeklyDigest: 'Weekly Digest',
      sponsors: 'Sponsors',
      costBenchmark: 'Cost Benchmark',
      howItWorks: 'How it works',
    },
  },
  es: {
    actions: { liveSignals: 'Señales en vivo', star: 'Dar estrella' },
    aria: {
      mobileNavigation: 'Navegación móvil',
      starCount: 'Estrellas de GitHub: {count}. Ver página de estrellas',
      starPage: 'Ver página de estrellas de GitHub',
    },
    links: {
      profileWidget: 'Widget de perfil',
      supabaseSetup: 'Configuración de Supabase',
      blog: 'Blog',
      weeklyReport: 'Informe semanal',
      starHistory: 'Historial de estrellas',
      share: 'Compartir',
      contribute: 'Contribuir',
      contributors: 'Colaboradores',
      weeklyDigest: 'Resumen semanal',
      sponsors: 'Patrocinadores',
      costBenchmark: 'Comparativa de costes',
      howItWorks: 'Cómo funciona',
    },
  },
  zh: {
    actions: { liveSignals: '实时信号', star: '加星' },
    aria: {
      mobileNavigation: '移动导航',
      starCount: 'GitHub 星标数：{count}。查看星标页面',
      starPage: '查看 GitHub 星标页面',
    },
    links: {
      profileWidget: '个人资料组件',
      supabaseSetup: 'Supabase 设置',
      blog: '博客',
      weeklyReport: '周报',
      starHistory: '加星历史',
      share: '分享',
      contribute: '参与贡献',
      contributors: '贡献者',
      weeklyDigest: '每周摘要',
      sponsors: '赞助者',
      costBenchmark: '成本基准',
      howItWorks: '工作原理',
    },
  },
  ms: {
    actions: { liveSignals: 'Isyarat langsung', star: 'Bintang' },
    aria: {
      mobileNavigation: 'Navigasi mudah alih',
      starCount: 'Bintang GitHub: {count}. Lihat halaman bintang',
      starPage: 'Lihat halaman bintang GitHub',
    },
    links: {
      profileWidget: 'Widget Profil',
      supabaseSetup: 'Persediaan Supabase',
      blog: 'Blog',
      weeklyReport: 'Laporan Mingguan',
      starHistory: 'Sejarah Bintang',
      share: 'Kongsi',
      contribute: 'Sumbang',
      contributors: 'Penyumbang',
      weeklyDigest: 'Ringkasan Mingguan',
      sponsors: 'Penaja',
      costBenchmark: 'Penanda Aras Kos',
      howItWorks: 'Cara ia berfungsi',
    },
  },
  ar: {
    actions: { liveSignals: 'إشارات مباشرة', star: 'أضف نجمة' },
    aria: {
      mobileNavigation: 'التنقل عبر الهاتف',
      starCount: 'نجوم GitHub: {count}. عرض صفحة النجوم',
      starPage: 'عرض صفحة نجوم GitHub',
    },
    links: {
      profileWidget: 'أداة الملف الشخصي',
      supabaseSetup: 'إعداد Supabase',
      blog: 'المدونة',
      weeklyReport: 'التقرير الأسبوعي',
      starHistory: 'سجل النجوم',
      share: 'مشاركة',
      contribute: 'المساهمة',
      contributors: 'المساهمون',
      weeklyDigest: 'الملخص الأسبوعي',
      sponsors: 'الرعاة',
      costBenchmark: 'معيار التكلفة',
      howItWorks: 'كيف يعمل',
    },
  },
} satisfies Record<Locale, MarketingNavExtras>;

function buildDictionary(locale: Locale): MarketingNavTranslations {
  const shell = getAppShellTranslations(locale);
  const landing = getTranslations(locale);
  const extra = extras[locale];

  return {
    language: shell.language,
    actions: {
      more: shell.more,
      liveSignals: extra.actions.liveSignals,
      star: extra.actions.star,
      openApp: landing.nav.openApp,
    },
    aria: {
      mainNavigation: shell.aria.primaryNavigation,
      mobileNavigation: extra.aria.mobileNavigation,
      openMenu: shell.aria.openMenu,
      closeMenu: shell.aria.closeMenu,
      starCount: extra.aria.starCount,
      starPage: extra.aria.starPage,
    },
    groups: {
      trading: shell.groups.trading,
      tools: shell.groups.tools,
      community: shell.groups.community,
    },
    links: {
      dashboard: shell.links.dashboard,
      screener: shell.links.screener,
      trackRecord: shell.links.trackRecord,
      research: shell.links.research,
      heatmap: shell.links.heatmap,
      paperTrading: shell.links.paperTrading,
      alerts: shell.links.alerts,
      multiTimeframe: shell.links.multiTimeframe,
      replay: shell.links.replay,
      portfolio: shell.links.portfolio,
      strategyBuilder: shell.links.strategyBuilder,
      indicators: shell.links.indicators,
      apiKeys: shell.links.apiKeys,
      apiUsage: shell.links.apiUsage,
      strategyComparison: shell.links.strategyComparison,
      marketplace: shell.links.marketplace,
      strategyLeaderboard: shell.links.strategyLeaderboard,
      plugins: shell.links.plugins,
      chromeExtension: shell.links.chromeExtension,
      status: shell.links.status,
      costBenchmark: extra.links.costBenchmark,
      liveFeed: shell.links.liveFeed,
      profileWidget: extra.links.profileWidget,
      supabaseSetup: extra.links.supabaseSetup,
      blog: extra.links.blog,
      weeklyReport: extra.links.weeklyReport,
      starHistory: extra.links.starHistory,
      share: extra.links.share,
      contribute: extra.links.contribute,
      contributors: extra.links.contributors,
      discord: 'Discord',
      productHunt: 'Product Hunt',
      weeklyDigest: extra.links.weeklyDigest,
      setupGuide: shell.links.setupGuide,
      sponsors: extra.links.sponsors,
      pledgeWall: shell.links.pledgeWall,
      smsAlerts: shell.links.smsAlerts,
      howItWorks: extra.links.howItWorks,
    },
  };
}

const dictionaries = {
  en: buildDictionary('en'),
  es: buildDictionary('es'),
  zh: buildDictionary('zh'),
  ms: buildDictionary('ms'),
  ar: buildDictionary('ar'),
} satisfies Record<Locale, MarketingNavTranslations>;

export function getMarketingNavTranslations(locale: Locale): MarketingNavTranslations {
  return dictionaries[locale];
}
