export type Locale = "en" | "es" | "zh";

export const SUPPORTED_LOCALES: { code: Locale; label: string; href: string }[] = [
  { code: "en", label: "EN", href: "/" },
  { code: "es", label: "ES", href: "/es" },
  { code: "zh", label: "中文", href: "/zh" },
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
}

const en: Translations = {
  meta: {
    title: "TradeClaw — Open-Source AI Trading Signals",
    description: "Self-hosted AI trading signals for forex, crypto, and metals. Free forever. Deploy in 5 minutes with Docker.",
    ogTitle: "TradeClaw — Stop Renting Your Trading Edge",
    ogDescription: "Open-source AI trading signals for forex, crypto & metals. Self-hosted. Free forever. Deploy in 5 min with Docker.",
    keywords: ["trading signals", "open source", "self-hosted", "AI trading", "forex signals", "crypto signals"],
  },
  hero: {
    badge: "Open Source · Self-Hosted · AI-Powered",
    headline: "AI Trading Signals.",
    headlineAccent: "Open Source.",
    headlineSuffix: "Self-Hosted.",
    subheadline: "Real-time BUY/SELL signals for forex, crypto, and commodities. Self-hosted, private, and free — no subscription, no lock-in, no data sent to third parties.",
    ctaPrimary: "Deploy Free in 30s",
    ctaSecondary: "Star on GitHub",
    signalFeed: "Live signal feed",
  },
  socialProof: {
    badge: "By the numbers",
    title: "Trusted by traders ",
    titleAccent: "worldwide",
    stats: [
      { label: "GitHub Stars", description: "Developers starred the repo" },
      { label: "Signals Generated", description: "AI signals produced to date" },
      { label: "Supported Assets", description: "Forex, crypto & commodity pairs" },
      { label: "Active Instances", description: "Self-hosted deployments worldwide" },
    ],
  },
  howItWorks: {
    badge: "Get started",
    title: "Deploy in ",
    titleAccent: "under 2 minutes",
    subtitle: "No vendor accounts, no API keys for signal providers, no monthly fees. Just clone and run.",
    steps: [
      { title: "Clone & Deploy", description: "Clone the repo and spin up TradeClaw with a single Docker Compose command. Railway and Vercel one-click deploys also available." },
      { title: "Configure Assets", description: "Set your broker API keys and choose from 12+ asset pairs across crypto, forex, and commodities. Configure alert thresholds and Telegram notifications." },
      { title: "Get AI Signals", description: "Your dashboard populates with AI-powered BUY/SELL signals with confidence scores, TP/SL levels, and multi-timeframe confluence analysis." },
    ],
  },
  deploy: {
    badge: "Deploy in under 2 minutes",
    title: "Your trading edge.",
    titleAccent: "Your infrastructure.",
    subtitle: "Choose your preferred deploy method. All options give you full control — no vendor lock-in, no data shared.",
    requirement: "Requires Docker. Runs on any Linux/Mac/Windows machine.",
  },
  faq: {
    badge: "FAQ",
    title: "Frequently asked ",
    titleAccent: "questions",
    items: [
      { question: "Is it really free?", answer: "Yes, completely. TradeClaw is MIT-licensed open-source software. You pay nothing to use it — not now, not ever. You only pay for your own server hosting (Railway free tier, Fly.io, VPS, etc.), which typically costs $0–5/month." },
      { question: "How do AI signals work?", answer: "TradeClaw's signal engine combines multiple technical indicators (RSI, MACD, Bollinger Bands, EMA, ATR) with multi-timeframe confluence analysis. Signals are classified as BUY/SELL with a confidence score (0–100%) derived from the weighted agreement across timeframes (M5 to D1). No external AI API is required." },
      { question: "Can I use it for live trading?", answer: "TradeClaw generates signals and provides TP/SL levels, but does not execute trades automatically. You connect your broker via MetaApi to receive price data, and you decide whether to act on signals. Paper trading mode is available so you can test performance before going live." },
      { question: "How do I deploy it?", answer: "Clone the repo, copy .env.example to .env, set your MetaApi credentials (optional for paper trading), then run `docker compose up -d`. Your dashboard is ready at localhost:3000. For cloud deploy, use the one-click Railway or Vercel buttons in the repo README." },
    ],
  },
  cta: {
    viewComparison: "See full comparison",
    viewHeatmap: "View Heatmap",
    deployOn: "Deploy on",
  },
};

const es: Translations = {
  meta: {
    title: "TradeClaw — Señales de Trading con IA de Código Abierto",
    description: "Señales de trading con IA autoalojadas para forex, cripto y metales. Gratis para siempre. Despliega en 5 minutos con Docker.",
    ogTitle: "TradeClaw — Deja de Alquilar tu Ventaja en Trading",
    ogDescription: "Señales de trading con IA de código abierto para forex, cripto y metales. Autoalojado. Gratis para siempre.",
    keywords: ["señales de trading", "código abierto", "autoalojado", "trading con IA", "señales forex", "señales cripto", "bot de trading", "análisis técnico", "trading algorítmico"],
  },
  hero: {
    badge: "Código Abierto · Autoalojado · Con IA",
    headline: "Señales de Trading con IA.",
    headlineAccent: "Código Abierto.",
    headlineSuffix: "Autoalojado.",
    subheadline: "Señales BUY/SELL en tiempo real para forex, cripto y materias primas. Autoalojado, privado y gratuito — sin suscripción, sin dependencia, sin datos enviados a terceros.",
    ctaPrimary: "Despliega Gratis en 30s",
    ctaSecondary: "Estrella en GitHub",
    signalFeed: "Feed de señales en vivo",
  },
  socialProof: {
    badge: "En números",
    title: "Confianza de traders en ",
    titleAccent: "todo el mundo",
    stats: [
      { label: "Estrellas en GitHub", description: "Desarrolladores destacaron el repo" },
      { label: "Señales Generadas", description: "Señales IA producidas hasta hoy" },
      { label: "Activos Soportados", description: "Pares de forex, cripto y commodities" },
      { label: "Instancias Activas", description: "Despliegues autoalojados en el mundo" },
    ],
  },
  howItWorks: {
    badge: "Comienza aquí",
    title: "Despliega en ",
    titleAccent: "menos de 2 minutos",
    subtitle: "Sin cuentas de proveedor, sin claves API para señales, sin cuotas mensuales. Solo clona y ejecuta.",
    steps: [
      { title: "Clona y Despliega", description: "Clona el repositorio y levanta TradeClaw con un solo comando de Docker Compose. También disponible despliegue en un clic con Railway y Vercel." },
      { title: "Configura Activos", description: "Configura tus claves API del broker y elige entre 12+ pares de activos en cripto, forex y materias primas. Configura umbrales de alerta y notificaciones de Telegram." },
      { title: "Recibe Señales IA", description: "Tu panel se llena con señales BUY/SELL impulsadas por IA con puntuaciones de confianza, niveles TP/SL y análisis de confluencia multi-temporal." },
    ],
  },
  deploy: {
    badge: "Despliega en menos de 2 minutos",
    title: "Tu ventaja en trading.",
    titleAccent: "Tu infraestructura.",
    subtitle: "Elige tu método de despliegue preferido. Todas las opciones te dan control total — sin dependencia de proveedor, sin datos compartidos.",
    requirement: "Requiere Docker. Funciona en cualquier máquina Linux/Mac/Windows.",
  },
  faq: {
    badge: "Preguntas frecuentes",
    title: "Preguntas ",
    titleAccent: "frecuentes",
    items: [
      { question: "¿Es realmente gratis?", answer: "Sí, completamente. TradeClaw es software de código abierto con licencia MIT. No pagas nada por usarlo — ni ahora ni nunca. Solo pagas por tu propio hosting (Railway tier gratuito, Fly.io, VPS, etc.), que típicamente cuesta $0–5/mes." },
      { question: "¿Cómo funcionan las señales IA?", answer: "El motor de señales de TradeClaw combina múltiples indicadores técnicos (RSI, MACD, Bandas de Bollinger, EMA, ATR) con análisis de confluencia multi-temporal. Las señales se clasifican como BUY/SELL con una puntuación de confianza (0–100%) derivada del acuerdo ponderado entre marcos temporales (M5 a D1). No se requiere API externa de IA." },
      { question: "¿Puedo usarlo para trading en vivo?", answer: "TradeClaw genera señales y proporciona niveles TP/SL, pero no ejecuta operaciones automáticamente. Conectas tu broker vía MetaApi para recibir datos de precios, y tú decides si actuar sobre las señales. El modo de paper trading está disponible para probar el rendimiento antes de operar en vivo." },
      { question: "¿Cómo lo despliego?", answer: "Clona el repo, copia .env.example a .env, configura tus credenciales de MetaApi (opcional para paper trading), y ejecuta `docker compose up -d`. Tu panel estará listo en localhost:3000. Para despliegue en la nube, usa los botones de un clic de Railway o Vercel en el README del repo." },
    ],
  },
  cta: {
    viewComparison: "Ver comparación completa",
    viewHeatmap: "Ver Mapa de Calor",
    deployOn: "Desplegar en",
  },
};

const zh: Translations = {
  meta: {
    title: "TradeClaw — 开源 AI 交易信号平台",
    description: "自托管 AI 交易信号，支持外汇、加密货币和贵金属。永久免费。5 分钟内用 Docker 部署。",
    ogTitle: "TradeClaw — 不再租用你的交易优势",
    ogDescription: "开源 AI 交易信号，支持外汇、加密货币和贵金属。自托管，永久免费。",
    keywords: ["交易信号", "开源", "自托管", "AI交易", "外汇信号", "加密货币信号", "交易机器人", "技术分析", "算法交易", "量化交易"],
  },
  hero: {
    badge: "开源 · 自托管 · AI 驱动",
    headline: "AI 交易信号。",
    headlineAccent: "开源。",
    headlineSuffix: "自托管。",
    subheadline: "外汇、加密货币和大宗商品的实时买卖信号。自托管、私密且免费 — 无订阅、无锁定、不向第三方发送数据。",
    ctaPrimary: "30 秒免费部署",
    ctaSecondary: "在 GitHub 上加星",
    signalFeed: "实时信号动态",
  },
  socialProof: {
    badge: "数据说话",
    title: "全球交易者",
    titleAccent: "信赖之选",
    stats: [
      { label: "GitHub 星标", description: "开发者为仓库加星" },
      { label: "生成信号数", description: "迄今产生的 AI 信号" },
      { label: "支持资产数", description: "外汇、加密货币和商品交易对" },
      { label: "活跃实例数", description: "全球自托管部署" },
    ],
  },
  howItWorks: {
    badge: "开始使用",
    title: "",
    titleAccent: "2 分钟内完成部署",
    subtitle: "无需供应商账户，无需信号提供商 API 密钥，无月费。只需克隆并运行。",
    steps: [
      { title: "克隆并部署", description: "克隆仓库，使用一条 Docker Compose 命令启动 TradeClaw。也支持 Railway 和 Vercel 一键部署。" },
      { title: "配置资产", description: "设置你的经纪商 API 密钥，从 12+ 个加密货币、外汇和商品交易对中选择。配置警报阈值和 Telegram 通知。" },
      { title: "获取 AI 信号", description: "你的仪表板将填充 AI 驱动的买卖信号，包含置信度评分、止盈/止损水平和多时间框架汇合分析。" },
    ],
  },
  deploy: {
    badge: "2 分钟内完成部署",
    title: "你的交易优势。",
    titleAccent: "你的基础设施。",
    subtitle: "选择你偏好的部署方式。所有选项都让你完全掌控 — 无供应商锁定，无数据共享。",
    requirement: "需要 Docker。可在任何 Linux/Mac/Windows 机器上运行。",
  },
  faq: {
    badge: "常见问题",
    title: "常见",
    titleAccent: "问题解答",
    items: [
      { question: "真的免费吗？", answer: "是的，完全免费。TradeClaw 是 MIT 许可的开源软件。你无需支付任何费用 — 现在不用，以后也不用。你只需支付自己的服务器托管费用（Railway 免费层、Fly.io、VPS 等），通常每月 $0–5。" },
      { question: "AI 信号如何工作？", answer: "TradeClaw 的信号引擎结合多种技术指标（RSI、MACD、布林带、EMA、ATR）和多时间框架汇合分析。信号被分类为买入/卖出，并附带置信度评分（0-100%），该评分源自各时间框架（M5 到 D1）的加权一致性。无需外部 AI API。" },
      { question: "可以用于实盘交易吗？", answer: "TradeClaw 生成信号并提供止盈/止损水平，但不会自动执行交易。你通过 MetaApi 连接经纪商以接收价格数据，由你决定是否根据信号操作。提供模拟交易模式，让你在实盘前测试表现。" },
      { question: "如何部署？", answer: "克隆仓库，将 .env.example 复制为 .env，设置 MetaApi 凭证（模拟交易可选），然后运行 `docker compose up -d`。仪表板在 localhost:3000 就绪。云部署可使用 README 中的 Railway 或 Vercel 一键部署按钮。" },
    ],
  },
  cta: {
    viewComparison: "查看完整对比",
    viewHeatmap: "查看热力图",
    deployOn: "部署到",
  },
};

const translations: Record<Locale, Translations> = { en, es, zh };

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}
