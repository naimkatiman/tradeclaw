export type Locale = "en" | "es" | "zh" | "ms" | "ar";

export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: { code: Locale; label: string; href: string; dir?: "ltr" | "rtl" }[] = [
  { code: "en", label: "EN", href: "/" },
  { code: "es", label: "ES", href: "/es" },
  { code: "zh", label: "中文", href: "/zh" },
  { code: "ms", label: "MS", href: "/ms" },
  { code: "ar", label: "AR", href: "/ar", dir: "rtl" },
];

export interface Translations {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    keywords: string[];
  };
  hero: {
    badge: string;
    headline: string;
    headlineAccent: string;
    headlineSuffix: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    signalFeed: string;
  };
  socialProof: {
    badge: string;
    title: string;
    titleAccent: string;
    stats: {
      label: string;
      description: string;
    }[];
  };
  howItWorks: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    steps: {
      title: string;
      description: string;
    }[];
  };
  deploy: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    requirement: string;
  };
  faq: {
    badge: string;
    title: string;
    titleAccent: string;
    items: {
      question: string;
      answer: string;
    }[];
  };
  cta: {
    viewComparison: string;
    viewHeatmap: string;
    deployOn: string;
  };
  // App shell strings (issue #16). Phase 1 covers primary nav + the language
  // switcher; remaining app surfaces are extracted in Phase 2.
  nav: {
    dashboard: string;
    signals: string;
    trackRecord: string;
    language: string;
    openApp: string;
  };
}

const en: Translations = {
  nav: { dashboard: "Dashboard", signals: "Signals", trackRecord: "Track Record", language: "Language", openApp: "Open the app" },
  meta: {
    title: "TradeClaw — Open-Source AI Trading Signals",
    description: "MIT-licensed trading-signal software for forex, crypto, and metals. Self-host with Docker and review the supporting evidence before use.",
    ogTitle: "TradeClaw — Open-Source Trading Transparency",
    ogDescription: "Inspect TradeClaw signal records and their supporting evidence. MIT-licensed source with a documented self-hosting path.",
    keywords: ["trading signals", "open source", "self-hosted", "AI trading", "forex signals", "crypto signals"],
  },
  hero: {
    badge: "MIT Licensed · Self-Hosted · Rule-Based",
    headline: "AI Trading Signals.",
    headlineAccent: "Open Source.",
    headlineSuffix: "Self-Hosted.",
    subheadline: "Inspect BUY/SELL signal records for forex, crypto, and commodities. Market data, hosting, brokers, and notification services have separate availability, privacy terms, and costs.",
    ctaPrimary: "Review self-hosting setup",
    ctaSecondary: "Star on GitHub",
    signalFeed: "Signal archive",
  },
  socialProof: {
    badge: "Evidence labels",
    title: "Repository-visible ",
    titleAccent: "facts",
    stats: [
      { label: "GitHub Stars", description: "Fetched from GitHub when available" },
      { label: "Signal Records", description: "Observed or explicitly modeled entries" },
      { label: "Covered Markets", description: "Assets depend on configured data sources" },
      { label: "Source License", description: "MIT license; external services set their own terms" },
    ],
  },
  howItWorks: {
    badge: "Get started",
    title: "Run on ",
    titleAccent: "your infrastructure",
    subtitle: "TradeClaw's source is MIT-licensed. Hosting, market data, brokers, and notification providers may charge separately.",
    steps: [
      { title: "Clone & Configure", description: "Clone the repository, copy .env.example, set the required secrets, then use the documented Docker Compose workflow." },
      { title: "Configure Data", description: "Select assets supported by your configured data source. Add broker or notification credentials only for integrations you intentionally enable." },
      { title: "Review Signal Evidence", description: "Inspect signal labels, confidence as indicator agreement, and any observed or modeled outcome evidence before deciding how to use a record." },
    ],
  },
  deploy: {
    badge: "Self-hosting",
    title: "Your infrastructure.",
    titleAccent: "Your control.",
    subtitle: "Review the repository setup for each environment. Infrastructure, provider terms, and data handling depend on the services you configure.",
    requirement: "The documented Docker Compose path requires Docker and the secrets listed in .env.example.",
  },
  faq: {
    badge: "FAQ",
    title: "Frequently asked ",
    titleAccent: "questions",
    items: [
      { question: "What does MIT-licensed mean here?", answer: "TradeClaw's source code is available under the MIT license, and its public hosted archive currently has no TradeClaw paywall. Hosting, market-data providers, brokers, and notification services may charge their own fees." },
      { question: "How do the signals work?", answer: "TradeClaw's open rule-based engine combines technical indicators with multi-timeframe confluence. BUY/SELL labels and confidence values describe weighted indicator agreement, not a probability of profit. No external AI API is required." },
      { question: "Can I use it for live trading?", answer: "Automated execution is disabled by default. If explicitly enabled, only gate-approved crypto signals can reach the implemented Binance USDT-perpetual executor, which uses testnet by default. The RoboForex bridge is still an interface scaffold, and paper-trading results are simulated." },
      { question: "How do I deploy it?", answer: "Clone the repo, copy .env.example to .env, set DB_PASSWORD, USER_SESSION_SECRET, ADMIN_SECRET, and AUTH_SECRET, then run `docker compose up -d`. MetaApi is not required. Docker Compose maps documented .env variables through an explicit allowlist; NEXT_PUBLIC_* changes require matching image build arguments and a rebuild." },
    ],
  },
  cta: {
    viewComparison: "See full comparison",
    viewHeatmap: "View Heatmap",
    deployOn: "Review setup for",
  },
};

const es: Translations = {
  nav: { dashboard: "Panel", signals: "Señales", trackRecord: "Historial", language: "Idioma", openApp: "Abrir la app" },
  meta: {
    title: "TradeClaw — Señales de Trading con IA de Código Abierto",
    description: "Software de señales para forex, cripto y metales con licencia MIT. Autoalójalo con Docker y revisa la evidencia antes de usarlo.",
    ogTitle: "TradeClaw — Transparencia de Trading de Código Abierto",
    ogDescription: "Inspecciona los registros de señales de TradeClaw y su evidencia. Código con licencia MIT y ruta de autoalojamiento documentada.",
    keywords: ["señales de trading", "código abierto", "autoalojado", "trading con IA", "señales forex", "señales cripto", "bot de trading", "análisis técnico", "trading algorítmico"],
  },
  hero: {
    badge: "Licencia MIT · Autoalojado · Basado en reglas",
    headline: "Señales de Trading con IA.",
    headlineAccent: "Código Abierto.",
    headlineSuffix: "Autoalojado.",
    subheadline: "Inspecciona registros BUY/SELL para forex, cripto y materias primas. Los datos, el hosting, los brokers y las notificaciones tienen disponibilidad, privacidad y costes propios.",
    ctaPrimary: "Revisar autoalojamiento",
    ctaSecondary: "Estrella en GitHub",
    signalFeed: "Archivo de señales",
  },
  socialProof: {
    badge: "Etiquetas de evidencia",
    title: "Hechos visibles en el ",
    titleAccent: "repositorio",
    stats: [
      { label: "Estrellas en GitHub", description: "Consultadas en GitHub cuando está disponible" },
      { label: "Registros de señales", description: "Entradas observadas o marcadas como modeladas" },
      { label: "Mercados cubiertos", description: "Los activos dependen de la fuente de datos configurada" },
      { label: "Licencia del código", description: "Licencia MIT; los servicios externos fijan sus términos" },
    ],
  },
  howItWorks: {
    badge: "Comienza aquí",
    title: "Ejecuta en ",
    titleAccent: "tu infraestructura",
    subtitle: "El código tiene licencia MIT. El hosting, los datos, los brokers y las notificaciones pueden cobrar por separado.",
    steps: [
      { title: "Clona y configura", description: "Clona el repositorio, copia .env.example, define los secretos obligatorios y sigue el flujo documentado de Docker Compose." },
      { title: "Configura los datos", description: "Elige activos admitidos por tu fuente de datos. Añade credenciales de broker o notificaciones solo para integraciones que actives." },
      { title: "Revisa la evidencia", description: "Interpreta la confianza como acuerdo de indicadores y revisa resultados observados o modelados antes de usar un registro." },
    ],
  },
  deploy: {
    badge: "Autoalojamiento",
    title: "Tu infraestructura.",
    titleAccent: "Tu control.",
    subtitle: "Revisa la configuración del repositorio para cada entorno. La infraestructura, los términos y el tratamiento de datos dependen de los servicios configurados.",
    requirement: "La ruta documentada con Docker Compose requiere Docker y los secretos de .env.example.",
  },
  faq: {
    badge: "Preguntas frecuentes",
    title: "Preguntas ",
    titleAccent: "frecuentes",
    items: [
      { question: "¿Qué implica aquí la licencia MIT?", answer: "El código de TradeClaw está disponible bajo la licencia MIT y su archivo público alojado no tiene actualmente un muro de pago de TradeClaw. El hosting, los proveedores de datos, los brokers y los servicios de notificación pueden cobrar sus propias tarifas." },
      { question: "¿Cómo funcionan las señales?", answer: "El motor abierto y basado en reglas combina indicadores técnicos con confluencia multitemporal. Las etiquetas BUY/SELL y la confianza describen el acuerdo ponderado de indicadores, no una probabilidad de beneficio. No se requiere una API externa de IA." },
      { question: "¿Puedo usarlo para trading en vivo?", answer: "La ejecución automática está desactivada por defecto. Si un operador la habilita explícitamente, solo las señales cripto aprobadas por las compuertas pueden llegar al ejecutor Binance USDT perpetuo, que usa testnet por defecto. El puente RoboForex sigue siendo una interfaz sin implementar y el paper trading es simulado." },
      { question: "¿Cómo lo despliego?", answer: "Clona el repo, copia .env.example a .env, configura DB_PASSWORD, USER_SESSION_SECRET, ADMIN_SECRET y AUTH_SECRET, y ejecuta `docker compose up -d`. MetaApi no es necesario. Compose asigna las variables .env documentadas mediante una lista explícita; los cambios NEXT_PUBLIC_* requieren argumentos de compilación y reconstruir la imagen." },
    ],
  },
  cta: {
    viewComparison: "Ver comparación completa",
    viewHeatmap: "Ver Mapa de Calor",
    deployOn: "Revisar configuración para",
  },
};

const zh: Translations = {
  nav: { dashboard: "仪表板", signals: "信号", trackRecord: "战绩", language: "语言", openApp: "打开应用" },
  meta: {
    title: "TradeClaw — 开源 AI 交易信号平台",
    description: "采用 MIT 许可证的外汇、加密货币和贵金属交易信号软件。可用 Docker 自托管，使用前请核查支持证据。",
    ogTitle: "TradeClaw — 开源交易透明度",
    ogDescription: "查看 TradeClaw 信号记录及支持证据。源代码采用 MIT 许可证，并提供自托管文档。",
    keywords: ["交易信号", "开源", "自托管", "AI交易", "外汇信号", "加密货币信号", "交易机器人", "技术分析", "算法交易", "量化交易"],
  },
  hero: {
    badge: "MIT 许可证 · 自托管 · 规则驱动",
    headline: "AI 交易信号。",
    headlineAccent: "开源。",
    headlineSuffix: "自托管。",
    subheadline: "查看外汇、加密货币和大宗商品的买卖信号记录。行情、托管、经纪商和通知服务各有可用性、隐私条款和费用。",
    ctaPrimary: "查看自托管设置",
    ctaSecondary: "在 GitHub 上加星",
    signalFeed: "信号档案",
  },
  socialProof: {
    badge: "证据标签",
    title: "仓库中可核查的",
    titleAccent: "事实",
    stats: [
      { label: "GitHub 星标", description: "可用时从 GitHub 获取" },
      { label: "信号记录", description: "已观察或明确标记为建模的记录" },
      { label: "覆盖市场", description: "资产取决于配置的数据源" },
      { label: "源代码许可", description: "MIT 许可证；外部服务自行制定条款" },
    ],
  },
  howItWorks: {
    badge: "开始使用",
    title: "运行于",
    titleAccent: "你的基础设施",
    subtitle: "源代码采用 MIT 许可证。托管、行情、经纪商和通知服务可能另外收费。",
    steps: [
      { title: "克隆并配置", description: "克隆仓库，复制 .env.example，设置必需密钥，然后使用文档中的 Docker Compose 流程。" },
      { title: "配置数据", description: "选择数据源支持的资产。仅为你明确启用的经纪商或通知集成添加凭据。" },
      { title: "核查信号证据", description: "将置信度理解为指标一致程度，并在使用记录前核查已观察或建模的结果证据。" },
    ],
  },
  deploy: {
    badge: "自托管",
    title: "你的基础设施。",
    titleAccent: "你的掌控。",
    subtitle: "请查看各环境的仓库设置说明。基础设施、服务条款和数据处理取决于你的配置。",
    requirement: "文档中的 Docker Compose 流程需要 Docker 和 .env.example 列出的密钥。",
  },
  faq: {
    badge: "常见问题",
    title: "常见",
    titleAccent: "问题解答",
    items: [
      { question: "MIT 许可证在这里意味着什么？", answer: "TradeClaw 源代码依据 MIT 许可证提供，当前公开托管档案没有 TradeClaw 付费墙。服务器托管、行情数据、经纪商和通知服务可能收取各自的费用。" },
      { question: "信号如何工作？", answer: "开源规则引擎将技术指标与多时间框架汇合分析结合。买入/卖出标签和置信度表示指标的加权一致程度，而不是盈利概率。无需外部 AI API。" },
      { question: "可以用于实盘交易吗？", answer: "自动执行默认关闭。只有操作员明确启用后，通过风控与证据门控的加密货币信号才能进入已实现的 Binance USDT 永续合约执行器；默认使用测试网。RoboForex 桥接仍只是未实现的接口，模拟交易结果也不是经纪商成交。" },
      { question: "如何部署？", answer: "克隆仓库，将 .env.example 复制为 .env，设置 DB_PASSWORD、USER_SESSION_SECRET、ADMIN_SECRET 和 AUTH_SECRET，然后运行 `docker compose up -d`。无需 MetaApi。Compose 通过明确的允许列表映射文档化的 .env 变量；更改 NEXT_PUBLIC_* 需要对应的构建参数并重新构建镜像。" },
    ],
  },
  cta: {
    viewComparison: "查看完整对比",
    viewHeatmap: "查看热力图",
    deployOn: "查看设置：",
  },
};

// Malay (Bahasa Malaysia) — initial translation, native-speaker review pending (#16).
const ms: Translations = {
  nav: { dashboard: "Papan Pemuka", signals: "Isyarat", trackRecord: "Rekod Prestasi", language: "Bahasa", openApp: "Buka aplikasi" },
  meta: {
    title: "TradeClaw — Isyarat Dagangan AI Sumber Terbuka",
    description: "Perisian isyarat dagangan berlesen MIT untuk forex, kripto dan logam. Hos sendiri dengan Docker dan semak bukti sebelum digunakan.",
    ogTitle: "TradeClaw — Ketelusan Dagangan Sumber Terbuka",
    ogDescription: "Semak rekod isyarat TradeClaw dan bukti sokongannya. Sumber berlesen MIT dengan panduan hos sendiri.",
    keywords: ["isyarat dagangan", "sumber terbuka", "dihos sendiri", "dagangan AI", "isyarat forex", "isyarat kripto"],
  },
  hero: {
    badge: "Lesen MIT · Dihos Sendiri · Berasaskan Peraturan",
    headline: "Isyarat Dagangan AI.",
    headlineAccent: "Sumber Terbuka.",
    headlineSuffix: "Dihos Sendiri.",
    subheadline: "Semak rekod BELI/JUAL untuk forex, kripto dan komoditi. Data pasaran, hosting, broker dan notifikasi mempunyai ketersediaan, terma privasi dan kos tersendiri.",
    ctaPrimary: "Semak persediaan hos sendiri",
    ctaSecondary: "Star di GitHub",
    signalFeed: "Arkib isyarat",
  },
  socialProof: {
    badge: "Label bukti",
    title: "Fakta yang boleh disemak dalam ",
    titleAccent: "repositori",
    stats: [
      { label: "Bintang GitHub", description: "Diambil daripada GitHub apabila tersedia" },
      { label: "Rekod isyarat", description: "Entri diperhati atau ditanda jelas sebagai model" },
      { label: "Pasaran diliputi", description: "Aset bergantung pada sumber data yang dikonfigurasi" },
      { label: "Lesen sumber", description: "Lesen MIT; perkhidmatan luar menetapkan terma sendiri" },
    ],
  },
  howItWorks: {
    badge: "Mulakan",
    title: "Jalankan pada ",
    titleAccent: "infrastruktur anda",
    subtitle: "Sumber TradeClaw berlesen MIT. Hosting, data pasaran, broker dan notifikasi mungkin mengenakan caj berasingan.",
    steps: [
      { title: "Klon & Konfigurasi", description: "Klon repositori, salin .env.example, tetapkan rahsia wajib dan ikuti aliran Docker Compose yang didokumenkan." },
      { title: "Konfigurasi Data", description: "Pilih aset yang disokong sumber data anda. Tambah kelayakan broker atau notifikasi hanya bagi integrasi yang anda aktifkan." },
      { title: "Semak Bukti Isyarat", description: "Tafsir keyakinan sebagai persetujuan penunjuk dan semak bukti hasil diperhati atau dimodelkan sebelum menggunakan rekod." },
    ],
  },
  deploy: {
    badge: "Hos sendiri",
    title: "Infrastruktur anda.",
    titleAccent: "Kawalan anda.",
    subtitle: "Semak persediaan repositori bagi setiap persekitaran. Infrastruktur, terma pembekal dan pengendalian data bergantung pada konfigurasi anda.",
    requirement: "Aliran Docker Compose yang didokumenkan memerlukan Docker dan rahsia dalam .env.example.",
  },
  faq: {
    badge: "Soalan lazim",
    title: "Soalan yang ",
    titleAccent: "kerap ditanya",
    items: [
      { question: "Apakah maksud lesen MIT di sini?", answer: "Kod sumber TradeClaw tersedia di bawah lesen MIT dan arkib awam yang dihoskan kini tiada paywall TradeClaw. Hosting, pembekal data pasaran, broker dan perkhidmatan notifikasi mungkin mengenakan bayaran masing-masing." },
      { question: "Bagaimana isyarat berfungsi?", answer: "Enjin sumber terbuka berasaskan peraturan menggabungkan penunjuk teknikal dengan pertemuan pelbagai jangka masa. Label BELI/JUAL dan skor keyakinan menerangkan persetujuan penunjuk berwajaran, bukan kebarangkalian untung." },
      { question: "Bolehkah saya menggunakannya untuk dagangan langsung?", answer: "Pelaksanaan automatik dimatikan secara lalai. Jika operator mengaktifkannya secara jelas, hanya isyarat kripto yang lulus pagar bukti boleh sampai ke pelaksana Binance USDT perpetual, yang menggunakan testnet secara lalai. Jambatan RoboForex masih sekadar rangka antara muka dan hasil paper trading ialah simulasi." },
      { question: "Bagaimana saya memasangnya?", answer: "Klon repo, salin .env.example ke .env, tetapkan DB_PASSWORD, USER_SESSION_SECRET, ADMIN_SECRET dan AUTH_SECRET, kemudian jalankan `docker compose up -d`. MetaApi tidak diperlukan. Compose memetakan pemboleh ubah .env yang didokumenkan melalui senarai izin jelas; perubahan NEXT_PUBLIC_* memerlukan argumen binaan yang sepadan dan bina semula imej." },
    ],
  },
  cta: {
    viewComparison: "Lihat perbandingan penuh",
    viewHeatmap: "Lihat Peta Haba",
    deployOn: "Semak persediaan untuk",
  },
};

// Arabic — initial translation, RTL layout. Native-speaker review pending (#16).
const ar: Translations = {
  nav: { dashboard: "لوحة التحكم", signals: "الإشارات", trackRecord: "سجل الأداء", language: "اللغة", openApp: "افتح التطبيق" },
  meta: {
    title: "TradeClaw — إشارات تداول بالذكاء الاصطناعي مفتوحة المصدر",
    description: "برنامج إشارات تداول مرخص بـ MIT للفوركس والعملات الرقمية والمعادن. استضفه ذاتيًا عبر Docker وراجع الأدلة قبل الاستخدام.",
    ogTitle: "TradeClaw — شفافية التداول مفتوحة المصدر",
    ogDescription: "إشارات تداول بالذكاء الاصطناعي مفتوحة المصدر للفوركس والعملات الرقمية والمعادن.",
    keywords: ["إشارات التداول", "مفتوح المصدر", "ذاتي الاستضافة", "تداول بالذكاء الاصطناعي", "إشارات الفوركس", "إشارات العملات الرقمية"],
  },
  hero: {
    badge: "ترخيص MIT · استضافة ذاتية · قائم على القواعد",
    headline: "إشارات تداول بالذكاء الاصطناعي.",
    headlineAccent: "مفتوح المصدر.",
    headlineSuffix: "ذاتي الاستضافة.",
    subheadline: "راجع سجلات الشراء والبيع للفوركس والعملات الرقمية والسلع. لبيانات السوق والاستضافة والوسطاء والإشعارات شروط توفر وخصوصية وتكاليف مستقلة.",
    ctaPrimary: "راجع إعداد الاستضافة الذاتية",
    ctaSecondary: "ضع نجمة على GitHub",
    signalFeed: "أرشيف الإشارات",
  },
  socialProof: {
    badge: "تسميات الأدلة",
    title: "حقائق يمكن التحقق منها في ",
    titleAccent: "المستودع",
    stats: [
      { label: "نجوم GitHub", description: "تجلب من GitHub عند توفرها" },
      { label: "سجلات الإشارات", description: "مدخلات مرصودة أو موسومة بوضوح كنماذج" },
      { label: "الأسواق المغطاة", description: "تعتمد الأصول على مصدر البيانات المهيأ" },
      { label: "ترخيص المصدر", description: "ترخيص MIT؛ الخدمات الخارجية تحدد شروطها" },
    ],
  },
  howItWorks: {
    badge: "ابدأ",
    title: "شغّله على ",
    titleAccent: "بنيتك التحتية",
    subtitle: "المصدر مرخص بـ MIT. قد تفرض الاستضافة وبيانات السوق والوسطاء والإشعارات رسومًا منفصلة.",
    steps: [
      { title: "استنسخ وهيئ", description: "استنسخ المستودع وانسخ .env.example واضبط الأسرار المطلوبة ثم اتبع مسار Docker Compose الموثق." },
      { title: "هيئ البيانات", description: "اختر الأصول التي يدعمها مصدر بياناتك. أضف بيانات اعتماد الوسيط أو الإشعارات فقط للتكاملات التي تفعلها." },
      { title: "راجع أدلة الإشارة", description: "فسّر درجة الثقة كتوافق للمؤشرات وراجع أدلة النتائج المرصودة أو المصممة قبل استخدام السجل." },
    ],
  },
  deploy: {
    badge: "الاستضافة الذاتية",
    title: "بنيتك التحتية.",
    titleAccent: "تحكمك الكامل.",
    subtitle: "راجع إعداد المستودع لكل بيئة. تعتمد البنية التحتية وشروط المزود ومعالجة البيانات على الخدمات التي تهيئها.",
    requirement: "يتطلب مسار Docker Compose الموثق Docker والأسرار المدرجة في .env.example.",
  },
  faq: {
    badge: "الأسئلة الشائعة",
    title: "أسئلة ",
    titleAccent: "شائعة",
    items: [
      { question: "ماذا يعني ترخيص MIT هنا؟", answer: "كود TradeClaw متاح بموجب ترخيص MIT، والأرشيف العام المستضاف لا يفرض حاليًا رسومًا من TradeClaw. قد تفرض الاستضافة ومزودات بيانات السوق والوسطاء وخدمات الإشعارات رسومها الخاصة." },
      { question: "كيف تعمل الإشارات؟", answer: "يجمع المحرك المفتوح القائم على القواعد بين المؤشرات الفنية وتحليل الأطر الزمنية المتعددة. تعبّر إشارات الشراء والبيع ودرجة الثقة عن توافق المؤشرات، وليست احتمالًا للربح." },
      { question: "هل يمكنني استخدامه للتداول المباشر؟", answer: "التنفيذ الآلي معطل افتراضيًا. إذا فعّله المشغل صراحةً، فلا تصل إلى منفذ عقود Binance USDT الدائمة إلا إشارات العملات المشفرة التي تجتاز بوابات الأدلة، ويستخدم المنفذ شبكة الاختبار افتراضيًا. جسر RoboForex ما زال واجهة غير منفذة ونتائج التداول الورقي محاكاة." },
      { question: "كيف أنشره؟", answer: "استنسخ المستودع، وانسخ .env.example إلى .env، واضبط DB_PASSWORD وUSER_SESSION_SECRET وADMIN_SECRET وAUTH_SECRET، ثم شغّل `docker compose up -d`. لا يلزم MetaApi. يمرر Compose متغيرات .env الموثقة عبر قائمة سماح صريحة؛ وتتطلب تغييرات NEXT_PUBLIC_* معاملات بناء مطابقة وإعادة بناء الصورة." },
    ],
  },
  cta: {
    viewComparison: "عرض المقارنة الكاملة",
    viewHeatmap: "عرض خريطة الحرارة",
    deployOn: "راجع إعداد",
  },
};

const translations: Record<Locale, Translations> = { en, es, zh, ms, ar };

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}

/** Returns the locale owned by an exact landing-page URL, including `/` for English. */
export function getLandingLocale(pathname: string): Locale | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return SUPPORTED_LOCALES.find(({ href }) => href === normalizedPath)?.code ?? null;
}

export function getLocaleHref(locale: Locale): string {
  return SUPPORTED_LOCALES.find(({ code }) => code === locale)?.href ?? "/";
}

export function isLocalizedLandingPath(pathname: string): boolean {
  const locale = getLandingLocale(pathname);
  return locale !== null && locale !== DEFAULT_LOCALE;
}

/** BCP 47 language tag used by the document and SEO metadata. */
export function getHtmlLanguage(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale;
}

export function getLanguageAlternates(baseUrl = "https://tradeclaw.win"): Record<string, string> {
  const base = baseUrl.replace(/\/$/, "");
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map(({ code, href }) => [
      getHtmlLanguage(code),
      href === "/" ? base : `${base}${href}`,
    ]),
  );

  return { ...languages, "x-default": base };
}

/** Returns "rtl" for Arabic, "ltr" for everything else. */
export function getTextDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
