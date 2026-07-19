import type { Locale } from '../translations';

export interface AppShellTranslations {
  language: string;
  adminBadge: string;
  more: string;
  tradingWorkspace: string;
  userMenu: {
    signIn: string;
    accountMenu: string;
    signedInVia: string;
    profileSettings: string;
    adminDashboard: string;
    signOut: string;
  };
  theme: {
    toggle: string;
    switchTo: string;
    modeTitle: string;
    labels: {
      dark: string;
      light: string;
      system: string;
    };
  };
  aria: {
    primaryNavigation: string;
    memberNavigation: string;
    adminNavigation: string;
    openMenu: string;
    closeMenu: string;
    moreNavigation: string;
  };
  groups: {
    tradingTools: string;
    insights: string;
    notifications: string;
    community: string;
    transparency: string;
    operations: string;
    surfaces: string;
    trading: string;
    tools: string;
  };
  links: {
    today: string;
    signals: string;
    copilot: string;
    screener: string;
    backtest: string;
    leaderboard: string;
    trackRecord: string;
    strategyBuilder: string;
    strategyRules: string;
    strategyLeaderboard: string;
    multiTimeframe: string;
    paperTrading: string;
    journal: string;
    glossary: string;
    alerts: string;
    digest: string;
    dailyTelegram: string;
    vote: string;
    badges: string;
    tradingViewExport: string;
    research: string;
    methodology: string;
    whyLongTerm: string;
    openData: string;
    calibration: string;
    overview: string;
    socialQueue: string;
    executions: string;
    backToApp: string;
    publicTrackRecord: string;
    userDashboard: string;
    dashboard: string;
    heatmap: string;
    paperTrade: string;
    strategyComparison: string;
    replay: string;
    portfolio: string;
    strategy: string;
    rules: string;
    indicators: string;
    apiUsage: string;
    apiKeys: string;
    marketplace: string;
    plugins: string;
    chromeExtension: string;
    status: string;
    patterns: string;
    benchmark: string;
    liveFeed: string;
    setupGuide: string;
    pledgeWall: string;
    smsAlerts: string;
  };
}

const en: AppShellTranslations = {
  language: 'Language',
  adminBadge: 'Admin',
  more: 'More',
  tradingWorkspace: 'Trading workspace',
  userMenu: {
    signIn: 'Sign in', accountMenu: 'Account menu', signedInVia: 'via {provider}',
    profileSettings: 'Profile & Settings', adminDashboard: 'Admin Dashboard', signOut: 'Sign out',
  },
  theme: {
    toggle: 'Toggle theme', switchTo: 'Switch to {next} theme (currently {current})',
    modeTitle: '{current} mode — click for {next}',
    labels: { dark: 'Dark', light: 'Light', system: 'System' },
  },
  aria: {
    primaryNavigation: 'Primary navigation',
    memberNavigation: 'Member navigation',
    adminNavigation: 'Admin navigation',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    moreNavigation: 'More navigation',
  },
  groups: {
    tradingTools: 'Trading Tools',
    insights: 'Insights',
    notifications: 'Notifications',
    community: 'Community',
    transparency: 'Transparency',
    operations: 'Operations',
    surfaces: 'Surfaces',
    trading: 'Trading',
    tools: 'Tools',
  },
  links: {
    today: 'Today', signals: 'Signals', copilot: 'Copilot', screener: 'Screener', backtest: 'Backtest',
    leaderboard: 'Leaderboard', trackRecord: 'Track Record', strategyBuilder: 'Strategy Builder',
    strategyRules: 'Strategy Rules', strategyLeaderboard: 'Strategy Leaderboard', multiTimeframe: 'Multi-TF',
    paperTrading: 'Paper Trading', journal: 'Journal', glossary: 'Glossary', alerts: 'Alerts', digest: 'Digest',
    dailyTelegram: 'Daily TG', vote: 'Vote', badges: 'Badges', tradingViewExport: 'TradingView Export',
    research: 'Research', methodology: 'Methodology', whyLongTerm: 'Why Long-Term', openData: 'Open Data',
    calibration: 'Calibration', overview: 'Overview', socialQueue: 'Social Queue', executions: 'Executions',
    backToApp: '↩ App', publicTrackRecord: 'Public Track Record', userDashboard: 'User Dashboard',
    dashboard: 'Dashboard', heatmap: 'Heatmap', paperTrade: 'Paper Trade', strategyComparison: 'Strategy Comparison',
    replay: 'Replay', portfolio: 'Portfolio', strategy: 'Strategy', rules: 'Rules', indicators: 'Indicators',
    apiUsage: 'API Usage', apiKeys: 'API Keys', marketplace: 'Marketplace', plugins: 'Plugins',
    chromeExtension: 'Chrome Extension', status: 'Status', patterns: 'Patterns', benchmark: 'Benchmark',
    liveFeed: 'Live Feed', setupGuide: 'Setup Guide', pledgeWall: 'Pledge Wall', smsAlerts: 'SMS Alerts',
  },
};

const es: AppShellTranslations = {
  language: 'Idioma',
  adminBadge: 'Administrador',
  more: 'Más',
  tradingWorkspace: 'Espacio de trading',
  userMenu: {
    signIn: 'Iniciar sesión', accountMenu: 'Menú de la cuenta', signedInVia: 'mediante {provider}',
    profileSettings: 'Perfil y configuración', adminDashboard: 'Panel de administración', signOut: 'Cerrar sesión',
  },
  theme: {
    toggle: 'Cambiar tema', switchTo: 'Cambiar al tema {next} (actualmente {current})',
    modeTitle: 'Modo {current} — pulsa para {next}',
    labels: { dark: 'Oscuro', light: 'Claro', system: 'Sistema' },
  },
  aria: {
    primaryNavigation: 'Navegación principal', memberNavigation: 'Navegación de usuario',
    adminNavigation: 'Navegación de administración', openMenu: 'Abrir menú', closeMenu: 'Cerrar menú',
    moreNavigation: 'Más opciones de navegación',
  },
  groups: {
    tradingTools: 'Herramientas de trading', insights: 'Análisis', notifications: 'Notificaciones',
    community: 'Comunidad', transparency: 'Transparencia', operations: 'Operaciones', surfaces: 'Vistas',
    trading: 'Trading', tools: 'Herramientas',
  },
  links: {
    today: 'Hoy', signals: 'Señales', copilot: 'Copiloto', screener: 'Analizador', backtest: 'Backtest',
    leaderboard: 'Clasificación', trackRecord: 'Historial', strategyBuilder: 'Constructor de estrategias',
    strategyRules: 'Reglas de estrategia', strategyLeaderboard: 'Ranking de estrategias', multiTimeframe: 'Multitemporal',
    paperTrading: 'Trading simulado', journal: 'Diario', glossary: 'Glosario', alerts: 'Alertas', digest: 'Resumen',
    dailyTelegram: 'Telegram diario', vote: 'Votar', badges: 'Insignias', tradingViewExport: 'Exportar a TradingView',
    research: 'Investigación', methodology: 'Metodología', whyLongTerm: 'Por qué a largo plazo', openData: 'Datos abiertos',
    calibration: 'Calibración', overview: 'Resumen', socialQueue: 'Cola social', executions: 'Ejecuciones',
    backToApp: '↩ App', publicTrackRecord: 'Historial público', userDashboard: 'Panel de usuario',
    dashboard: 'Panel', heatmap: 'Mapa de calor', paperTrade: 'Operación simulada', strategyComparison: 'Comparar estrategias',
    replay: 'Repetición', portfolio: 'Cartera', strategy: 'Estrategia', rules: 'Reglas', indicators: 'Indicadores',
    apiUsage: 'Uso de API', apiKeys: 'Claves API', marketplace: 'Marketplace', plugins: 'Plugins',
    chromeExtension: 'Extensión de Chrome', status: 'Estado', patterns: 'Patrones', benchmark: 'Benchmark',
    liveFeed: 'Feed en vivo', setupGuide: 'Guía de instalación', pledgeWall: 'Muro de compromisos', smsAlerts: 'Alertas SMS',
  },
};

const zh: AppShellTranslations = {
  language: '语言',
  adminBadge: '管理员',
  more: '更多',
  tradingWorkspace: '交易工作区',
  userMenu: {
    signIn: '登录', accountMenu: '账户菜单', signedInVia: '通过 {provider}',
    profileSettings: '个人资料与设置', adminDashboard: '管理员面板', signOut: '退出登录',
  },
  theme: {
    toggle: '切换主题', switchTo: '切换到{next}主题（当前为{current}）',
    modeTitle: '{current}模式 — 点击切换到{next}',
    labels: { dark: '深色', light: '浅色', system: '跟随系统' },
  },
  aria: {
    primaryNavigation: '主导航', memberNavigation: '用户导航', adminNavigation: '管理员导航',
    openMenu: '打开菜单', closeMenu: '关闭菜单', moreNavigation: '更多导航',
  },
  groups: {
    tradingTools: '交易工具', insights: '洞察', notifications: '通知', community: '社区', transparency: '透明度',
    operations: '运营', surfaces: '页面', trading: '交易', tools: '工具',
  },
  links: {
    today: '今日', signals: '信号', copilot: '智能助手', screener: '资产筛选', backtest: '回测', leaderboard: '排行榜',
    trackRecord: '历史记录', strategyBuilder: '策略构建器', strategyRules: '策略规则', strategyLeaderboard: '策略排行榜',
    multiTimeframe: '多周期', paperTrading: '模拟交易', journal: '交易日志', glossary: '术语表', alerts: '提醒',
    digest: '摘要', dailyTelegram: '每日 Telegram', vote: '投票', badges: '徽章', tradingViewExport: '导出到 TradingView',
    research: '研究', methodology: '方法论', whyLongTerm: '为何关注长期', openData: '开放数据', calibration: '校准',
    overview: '概览', socialQueue: '社交队列', executions: '执行记录', backToApp: '↩ 返回应用',
    publicTrackRecord: '公开历史记录', userDashboard: '用户面板', dashboard: '面板', heatmap: '热力图',
    paperTrade: '模拟交易', strategyComparison: '策略比较', replay: '回放', portfolio: '投资组合', strategy: '策略',
    rules: '规则', indicators: '指标', apiUsage: 'API 用量', apiKeys: 'API 密钥', marketplace: '市场', plugins: '插件',
    chromeExtension: 'Chrome 扩展', status: '状态', patterns: '形态', benchmark: '基准测试', liveFeed: '实时动态',
    setupGuide: '设置指南', pledgeWall: '承诺墙', smsAlerts: '短信提醒',
  },
};

const ms: AppShellTranslations = {
  language: 'Bahasa',
  adminBadge: 'Pentadbir',
  more: 'Lagi',
  tradingWorkspace: 'Ruang kerja dagangan',
  userMenu: {
    signIn: 'Log masuk', accountMenu: 'Menu akaun', signedInVia: 'melalui {provider}',
    profileSettings: 'Profil & Tetapan', adminDashboard: 'Panel Pentadbir', signOut: 'Log keluar',
  },
  theme: {
    toggle: 'Tukar tema', switchTo: 'Tukar kepada tema {next} (kini {current})',
    modeTitle: 'Mod {current} — klik untuk {next}',
    labels: { dark: 'Gelap', light: 'Cerah', system: 'Sistem' },
  },
  aria: {
    primaryNavigation: 'Navigasi utama', memberNavigation: 'Navigasi ahli', adminNavigation: 'Navigasi pentadbir',
    openMenu: 'Buka menu', closeMenu: 'Tutup menu', moreNavigation: 'Navigasi tambahan',
  },
  groups: {
    tradingTools: 'Alat Dagangan', insights: 'Analisis', notifications: 'Pemberitahuan', community: 'Komuniti',
    transparency: 'Ketelusan', operations: 'Operasi', surfaces: 'Paparan', trading: 'Dagangan', tools: 'Alat',
  },
  links: {
    today: 'Hari Ini', signals: 'Isyarat', copilot: 'Pembantu', screener: 'Penyaring', backtest: 'Ujian Balik',
    leaderboard: 'Papan Kedudukan', trackRecord: 'Rekod Prestasi', strategyBuilder: 'Pembina Strategi',
    strategyRules: 'Peraturan Strategi', strategyLeaderboard: 'Kedudukan Strategi', multiTimeframe: 'Berbilang TF',
    paperTrading: 'Dagangan Kertas', journal: 'Jurnal', glossary: 'Glosari', alerts: 'Amaran', digest: 'Ringkasan',
    dailyTelegram: 'Telegram Harian', vote: 'Undi', badges: 'Lencana', tradingViewExport: 'Eksport TradingView',
    research: 'Penyelidikan', methodology: 'Metodologi', whyLongTerm: 'Mengapa Jangka Panjang', openData: 'Data Terbuka',
    calibration: 'Kalibrasi', overview: 'Gambaran Keseluruhan', socialQueue: 'Baris Gilir Sosial', executions: 'Pelaksanaan',
    backToApp: '↩ Aplikasi', publicTrackRecord: 'Rekod Prestasi Awam', userDashboard: 'Panel Pengguna',
    dashboard: 'Panel', heatmap: 'Peta Haba', paperTrade: 'Dagangan Kertas', strategyComparison: 'Perbandingan Strategi',
    replay: 'Main Semula', portfolio: 'Portfolio', strategy: 'Strategi', rules: 'Peraturan', indicators: 'Penunjuk',
    apiUsage: 'Penggunaan API', apiKeys: 'Kunci API', marketplace: 'Pasaran', plugins: 'Pemalam',
    chromeExtension: 'Sambungan Chrome', status: 'Status', patterns: 'Corak', benchmark: 'Penanda Aras',
    liveFeed: 'Suapan Langsung', setupGuide: 'Panduan Persediaan', pledgeWall: 'Dinding Ikrar', smsAlerts: 'Amaran SMS',
  },
};

const ar: AppShellTranslations = {
  language: 'اللغة',
  adminBadge: 'المشرف',
  more: 'المزيد',
  tradingWorkspace: 'مساحة التداول',
  userMenu: {
    signIn: 'تسجيل الدخول', accountMenu: 'قائمة الحساب', signedInVia: 'عبر {provider}',
    profileSettings: 'الملف الشخصي والإعدادات', adminDashboard: 'لوحة المشرف', signOut: 'تسجيل الخروج',
  },
  theme: {
    toggle: 'تبديل السمة', switchTo: 'التبديل إلى سمة {next} (الحالية {current})',
    modeTitle: 'الوضع {current} — انقر للتبديل إلى {next}',
    labels: { dark: 'داكن', light: 'فاتح', system: 'النظام' },
  },
  aria: {
    primaryNavigation: 'التنقل الرئيسي', memberNavigation: 'تنقل المستخدم', adminNavigation: 'تنقل المشرف',
    openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة', moreNavigation: 'المزيد من خيارات التنقل',
  },
  groups: {
    tradingTools: 'أدوات التداول', insights: 'التحليلات', notifications: 'الإشعارات', community: 'المجتمع',
    transparency: 'الشفافية', operations: 'العمليات', surfaces: 'الواجهات', trading: 'التداول', tools: 'الأدوات',
  },
  links: {
    today: 'اليوم', signals: 'الإشارات', copilot: 'المساعد', screener: 'ماسح الأصول', backtest: 'الاختبار الخلفي',
    leaderboard: 'لوحة الصدارة', trackRecord: 'السجل', strategyBuilder: 'منشئ الاستراتيجيات',
    strategyRules: 'قواعد الاستراتيجية', strategyLeaderboard: 'ترتيب الاستراتيجيات', multiTimeframe: 'أطر متعددة',
    paperTrading: 'التداول التجريبي', journal: 'اليومية', glossary: 'المصطلحات', alerts: 'التنبيهات', digest: 'الملخص',
    dailyTelegram: 'تيليجرام اليومي', vote: 'التصويت', badges: 'الشارات', tradingViewExport: 'تصدير TradingView',
    research: 'البحث', methodology: 'المنهجية', whyLongTerm: 'لماذا المدى الطويل', openData: 'البيانات المفتوحة',
    calibration: 'المعايرة', overview: 'نظرة عامة', socialQueue: 'قائمة النشر', executions: 'التنفيذات',
    backToApp: '↩ التطبيق', publicTrackRecord: 'السجل العام', userDashboard: 'لوحة المستخدم', dashboard: 'لوحة التحكم',
    heatmap: 'الخريطة الحرارية', paperTrade: 'تداول تجريبي', strategyComparison: 'مقارنة الاستراتيجيات', replay: 'إعادة العرض',
    portfolio: 'المحفظة', strategy: 'الاستراتيجية', rules: 'القواعد', indicators: 'المؤشرات', apiUsage: 'استخدام API',
    apiKeys: 'مفاتيح API', marketplace: 'السوق', plugins: 'الإضافات', chromeExtension: 'إضافة Chrome', status: 'الحالة',
    patterns: 'الأنماط', benchmark: 'المعيار', liveFeed: 'البث المباشر', setupGuide: 'دليل الإعداد',
    pledgeWall: 'جدار التعهدات', smsAlerts: 'تنبيهات SMS',
  },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, AppShellTranslations>;

export type AppShellLinkKey = keyof AppShellTranslations['links'];
export type AppShellGroupKey = keyof AppShellTranslations['groups'];

export function getAppShellTranslations(locale: Locale): AppShellTranslations {
  return dictionaries[locale];
}
