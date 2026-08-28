export type Locale = 'en' | 'es' | 'zh' | 'ms' | 'ar';

export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALES: { code: Locale; label: string; href: string; dir?: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'EN', href: '/' },
  { code: 'es', label: 'ES', href: '/es' },
  { code: 'zh', label: '中文', href: '/zh' },
  { code: 'ms', label: 'MS', href: '/ms' },
  { code: 'ar', label: 'AR', href: '/ar', dir: 'rtl' },
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
    stats: { description: string }[];
  };
  howItWorks: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    steps: { title: string; description: string }[];
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
    items: { question: string; answer: string }[];
  };
  nav: {
    dashboard: string;
    signals: string;
    trackRecord: string;
    language: string;
    openApp: string;
  };
}

const en: Translations = {
  nav: { dashboard: 'Lab', signals: 'Candidate feed', trackRecord: 'Evidence', language: 'Language', openApp: 'Inspect the evidence' },
  meta: {
    title: 'TradeClaw — Open Trading Research Lab',
    description: 'Inspect a negative cost-adjusted record, test ideas, download artifacts, and reproduce the research with Docker Compose.',
    ogTitle: 'TradeClaw — Evidence Before Trading Claims',
    ogDescription: 'A self-hostable research lab for inspecting costs, failed gates, recorded observations, and reproducible tests.',
    keywords: ['trading research', 'cost-adjusted backtest', 'open data', 'self-hosted research', 'strategy evidence'],
  },
  hero: {
    badge: 'OPEN RESEARCH · COST-ADJUSTED · REPRODUCIBLE',
    headline: 'Test the claim.',
    headlineAccent: 'Inspect the evidence.',
    headlineSuffix: 'Reproduce it.',
    subheadline: 'TradeClaw publishes a negative record after modeled costs. Use the lab to understand why the gate failed, test a different idea, and reproduce every result on your own infrastructure.',
    ctaPrimary: 'Inspect the track record',
    ctaSecondary: 'Open the research lab',
    signalFeed: 'EVIDENCE GATE: FAILED',
  },
  socialProof: { stats: [{ description: 'No tested short-term candidate has cleared the published deployability gate after modeled costs. Broadcast and execution remain blocked.' }] },
  howItWorks: {
    badge: 'THE USEFUL PATH',
    title: 'From finding to ',
    titleAccent: 'reproduction',
    subtitle: 'Each step answers a concrete question: what happened, what costs changed, whether your variation survives, and whether someone else can reproduce it.',
    steps: [
      { title: 'Inspect the finding', description: 'Start with the recorded outcome, modeled costs, excluded rows, and the exact gate that failed.' },
      { title: 'Test your idea', description: 'Use provider-backed screener coverage and an honest default backtest that produces a reviewable sample.' },
      { title: 'Reproduce the work', description: 'Download artifacts or self-host the same application, PostgreSQL evidence store, and research code.' },
    ],
  },
  deploy: {
    badge: 'BUILD / SELF-HOST',
    title: 'Run the lab on ',
    titleAccent: 'your machine.',
    subtitle: 'Docker Compose is the supported self-host path. It starts the web app and required PostgreSQL database so observations and research runs persist.',
      requirement: 'Copy .env.example, set the required secrets, then use the documented Compose workflow. Hosting, market-data providers, brokers, and notification services may charge separately.',
  },
  faq: {
    badge: 'QUESTIONS',
    title: 'What this ',
    titleAccent: 'can and cannot prove',
    items: [
      { question: 'Does TradeClaw currently show a deployable edge?', answer: 'No. The public cost-adjusted record fails the published evidence gate. Candidate classifications are research observations, not recommendations or profit probabilities.' },
      { question: 'What value does a failed result provide?', answer: 'It makes weak ideas cheaper to reject. You can inspect assumptions, see where costs erase an apparent edge, and test a variation before risking capital.' },
      { question: 'Are the outcomes broker fills?', answer: 'No. Observation outcomes use provider OHLCV, while fees and slippage are modeled and labeled separately. They are not customer-account returns or execution records.' },
      { question: 'How do I self-host it?', answer: 'Clone the repository, copy .env.example to .env, set DB_PASSWORD, USER_SESSION_SECRET, ADMIN_SECRET, and AUTH_SECRET, then run `docker compose up -d`. PostgreSQL is required.' },
    ],
  },
};

const es: Translations = {
  nav: { dashboard: 'Laboratorio', signals: 'Candidatos', trackRecord: 'Evidencia', language: 'Idioma', openApp: 'Inspeccionar la evidencia' },
  meta: {
    title: 'TradeClaw — Laboratorio abierto de investigación de trading',
    description: 'Inspecciona un historial negativo tras costes modelados, prueba ideas, descarga artefactos y reproduce la investigación con Docker Compose.',
    ogTitle: 'TradeClaw — Evidencia antes que promesas de trading',
    ogDescription: 'Un laboratorio autoalojable para inspeccionar costes, pruebas fallidas, observaciones registradas y resultados reproducibles.',
    keywords: ['investigación de trading', 'backtest con costes', 'datos abiertos', 'investigación autoalojada', 'evidencia de estrategias'],
  },
  hero: {
    badge: 'INVESTIGACIÓN ABIERTA · COSTES MODELADOS · REPRODUCIBLE',
    headline: 'Prueba la afirmación.',
    headlineAccent: 'Inspecciona la evidencia.',
    headlineSuffix: 'Reprodúcela.',
    subheadline: 'TradeClaw publica un historial negativo después de costes modelados. Usa el laboratorio para entender por qué falló el criterio, probar otra idea y reproducir cada resultado en tu propia infraestructura.',
    ctaPrimary: 'Inspeccionar el historial',
    ctaSecondary: 'Abrir el laboratorio',
    signalFeed: 'CRITERIO DE EVIDENCIA: FALLIDO',
  },
  socialProof: { stats: [{ description: 'Ningún candidato de corto plazo probado ha superado el criterio público de despliegue después de costes modelados. La difusión y la ejecución siguen bloqueadas.' }] },
  howItWorks: {
    badge: 'EL RECORRIDO ÚTIL',
    title: 'Del hallazgo a la ',
    titleAccent: 'reproducción',
    subtitle: 'Cada paso responde una pregunta concreta: qué ocurrió, qué cambiaron los costes, si tu variante resiste y si otra persona puede reproducirla.',
    steps: [
      { title: 'Inspecciona el hallazgo', description: 'Empieza por el resultado registrado, los costes modelados, las filas excluidas y el criterio exacto que falló.' },
      { title: 'Prueba tu idea', description: 'Usa la cobertura real del analizador y un backtest inicial que genere una muestra suficiente para revisar.' },
      { title: 'Reproduce el trabajo', description: 'Descarga los artefactos o autoaloja la misma aplicación, la base de evidencia PostgreSQL y el código de investigación.' },
    ],
  },
  deploy: {
    badge: 'CONSTRUIR / AUTOALOJAR',
    title: 'Ejecuta el laboratorio en ',
    titleAccent: 'tu máquina.',
    subtitle: 'Docker Compose es la ruta de autoalojamiento compatible. Inicia la aplicación web y la base PostgreSQL obligatoria para conservar observaciones y ejecuciones de investigación.',
      requirement: 'Copia .env.example, define los secretos obligatorios y sigue el flujo documentado de Compose. El alojamiento, los datos de mercado, los brókeres y las notificaciones pueden cobrar por separado.',
  },
  faq: {
    badge: 'PREGUNTAS',
    title: 'Qué puede y qué no puede ',
    titleAccent: 'demostrar',
    items: [
      { question: '¿TradeClaw muestra hoy una ventaja desplegable?', answer: 'No. El historial público ajustado por costes falla el criterio de evidencia. Las clasificaciones son observaciones de investigación, no recomendaciones ni probabilidades de beneficio.' },
      { question: '¿Qué valor aporta un resultado fallido?', answer: 'Permite descartar ideas débiles con menos coste. Puedes revisar supuestos, ver dónde los costes borran la ventaja aparente y probar una variante antes de arriesgar capital.' },
      { question: '¿Los resultados son ejecuciones de un bróker?', answer: 'No. Los resultados de las observaciones usan OHLCV del proveedor; las comisiones y el deslizamiento se modelan y etiquetan por separado. No son rentabilidades de cuentas reales.' },
      { question: '¿Cómo lo autoalojo?', answer: 'Clona el repositorio, copia .env.example a .env, define DB_PASSWORD, USER_SESSION_SECRET, ADMIN_SECRET y AUTH_SECRET, y ejecuta `docker compose up -d`. PostgreSQL es obligatorio.' },
    ],
  },
};

const zh: Translations = {
  nav: { dashboard: '实验室', signals: '候选列表', trackRecord: '证据', language: '语言', openApp: '查看证据' },
  meta: {
    title: 'TradeClaw — 开源交易研究实验室',
    description: '查看计入模型成本后的负向记录，测试想法，下载研究产物，并用 Docker Compose 复现结果。',
    ogTitle: 'TradeClaw — 先看证据，再谈交易结论',
    ogDescription: '一个可自行托管的研究实验室，用于检查成本、失败门槛、预先记录的观察和可复现测试。',
    keywords: ['交易研究', '成本调整回测', '开放数据', '自行托管研究', '策略证据'],
  },
  hero: {
    badge: '开放研究 · 计入模型成本 · 可复现',
    headline: '验证结论。',
    headlineAccent: '检查证据。',
    headlineSuffix: '自行复现。',
    subheadline: 'TradeClaw 公布计入模型成本后的负向记录。你可以查看证据门槛为何失败，测试不同想法，并在自己的基础设施上复现每个结果。',
    ctaPrimary: '查看历史记录',
    ctaSecondary: '打开研究实验室',
    signalFeed: '证据门槛：未通过',
  },
  socialProof: { stats: [{ description: '在计入公开的模型成本后，尚无已测试的短期候选通过部署门槛。广播与经纪商执行仍保持关闭。' }] },
  howItWorks: {
    badge: '有价值的路径',
    title: '从发现走向',
    titleAccent: '复现',
    subtitle: '每一步回答一个具体问题：发生了什么、成本改变了什么、你的变体能否存活，以及其他人能否复现。',
    steps: [
      { title: '检查研究发现', description: '先看记录结果、模型成本、排除样本，以及没有通过的具体门槛。' },
      { title: '测试你的想法', description: '使用真实数据源覆盖的筛选器，并从能产生可审查样本的默认回测开始。' },
      { title: '复现研究过程', description: '下载研究产物，或自行托管相同的应用、PostgreSQL 证据库和研究代码。' },
    ],
  },
  deploy: {
    badge: '构建 / 自行托管',
    title: '在你的设备上运行',
    titleAccent: '研究实验室。',
    subtitle: 'Docker Compose 是受支持的自行托管方式。它会启动 Web 应用和必需的 PostgreSQL 数据库，以保存观察记录和研究运行。',
      requirement: '复制 .env.example，设置必需密钥，然后按文档运行 Compose。托管、市场数据、经纪商和通知服务可能另行收费。',
  },
  faq: {
    badge: '常见问题',
    title: '它能证明什么，',
    titleAccent: '不能证明什么',
    items: [
      { question: 'TradeClaw 目前证明了可部署的优势吗？', answer: '没有。公开的成本调整记录未通过证据门槛。候选分类只是研究观察，不是交易建议，也不是盈利概率。' },
      { question: '失败结果有什么价值？', answer: '它能以更低成本淘汰薄弱想法。你可以检查假设，看到成本如何抹去表面优势，并在投入资金前测试变体。' },
      { question: '这些结果是经纪商成交记录吗？', answer: '不是。观察结果来自数据提供方的 OHLCV；费用和滑点会单独建模并标注。它们不是客户账户收益或真实成交。' },
      { question: '如何自行托管？', answer: '克隆仓库，将 .env.example 复制为 .env，设置 DB_PASSWORD、USER_SESSION_SECRET、ADMIN_SECRET 和 AUTH_SECRET，然后运行 `docker compose up -d`。必须使用 PostgreSQL。' },
    ],
  },
};

const ms: Translations = {
  nav: { dashboard: 'Makmal', signals: 'Suapan calon', trackRecord: 'Bukti', language: 'Bahasa', openApp: 'Periksa bukti' },
  meta: {
    title: 'TradeClaw — Makmal Penyelidikan Dagangan Sumber Terbuka',
    description: 'Periksa rekod negatif selepas kos dimodelkan, uji idea, muat turun artifak dan hasilkan semula kajian dengan Docker Compose.',
    ogTitle: 'TradeClaw — Bukti Sebelum Dakwaan Dagangan',
    ogDescription: 'Makmal hos sendiri untuk memeriksa kos, pagar yang gagal, pemerhatian direkod awal dan ujian yang boleh dihasilkan semula.',
    keywords: ['penyelidikan dagangan', 'ujian balik kos', 'data terbuka', 'penyelidikan hos sendiri', 'bukti strategi'],
  },
  hero: {
    badge: 'PENYELIDIKAN TERBUKA · KOS DIMODELKAN · BOLEH DIHASILKAN SEMULA',
    headline: 'Uji dakwaan.',
    headlineAccent: 'Periksa bukti.',
    headlineSuffix: 'Hasilkan semula.',
    subheadline: 'TradeClaw menerbitkan rekod negatif selepas kos dimodelkan. Gunakan makmal untuk memahami sebab pagar gagal, menguji idea lain dan menghasilkan semula setiap keputusan pada infrastruktur anda.',
    ctaPrimary: 'Periksa rekod prestasi',
    ctaSecondary: 'Buka makmal penyelidikan',
    signalFeed: 'PAGAR BUKTI: GAGAL',
  },
  socialProof: { stats: [{ description: 'Tiada calon jangka pendek yang diuji melepasi pagar kebolehgunaan selepas kos dimodelkan. Siaran dan pelaksanaan kekal disekat.' }] },
  howItWorks: {
    badge: 'LALUAN YANG BERGUNA',
    title: 'Daripada dapatan kepada ',
    titleAccent: 'penghasilan semula',
    subtitle: 'Setiap langkah menjawab soalan khusus: apa berlaku, apa yang kos ubah, sama ada variasi anda bertahan dan sama ada orang lain boleh menghasilkannya semula.',
    steps: [
      { title: 'Periksa dapatan', description: 'Mulakan dengan hasil direkod, kos dimodelkan, baris dikecualikan dan pagar tepat yang gagal.' },
      { title: 'Uji idea anda', description: 'Gunakan liputan penyaring bersumber pembekal dan ujian balik lalai yang menghasilkan sampel boleh disemak.' },
      { title: 'Hasilkan semula kerja', description: 'Muat turun artifak atau hos sendiri aplikasi, stor bukti PostgreSQL dan kod penyelidikan yang sama.' },
    ],
  },
  deploy: {
    badge: 'BINA / HOS SENDIRI',
    title: 'Jalankan makmal pada ',
    titleAccent: 'mesin anda.',
    subtitle: 'Docker Compose ialah laluan hos sendiri yang disokong. Ia memulakan aplikasi web dan pangkalan data PostgreSQL yang diperlukan supaya pemerhatian dan kajian kekal disimpan.',
      requirement: 'Salin .env.example, tetapkan rahsia wajib dan ikuti aliran Compose yang didokumenkan. Pengehosan, data pasaran, broker dan perkhidmatan notifikasi mungkin mengenakan caj berasingan.',
  },
  faq: {
    badge: 'SOALAN',
    title: 'Apa yang boleh dan tidak boleh ',
    titleAccent: 'dibuktikan',
    items: [
      { question: 'Adakah TradeClaw kini menunjukkan kelebihan yang boleh digunakan?', answer: 'Tidak. Rekod awam selepas kos gagal pagar bukti. Klasifikasi calon ialah pemerhatian penyelidikan, bukan cadangan atau kebarangkalian untung.' },
      { question: 'Apakah nilai keputusan yang gagal?', answer: 'Ia membantu menolak idea lemah dengan kos lebih rendah. Anda boleh memeriksa andaian, melihat kos menghapuskan kelebihan yang kelihatan dan menguji variasi sebelum mempertaruhkan modal.' },
      { question: 'Adakah hasil ini transaksi broker?', answer: 'Tidak. Hasil pemerhatian menggunakan OHLCV pembekal; fi dan gelinciran dimodel dan dilabel berasingan. Ia bukan pulangan akaun pelanggan atau rekod pelaksanaan.' },
      { question: 'Bagaimana untuk hos sendiri?', answer: 'Klon repositori, salin .env.example ke .env, tetapkan DB_PASSWORD, USER_SESSION_SECRET, ADMIN_SECRET dan AUTH_SECRET, kemudian jalankan `docker compose up -d`. PostgreSQL diperlukan.' },
    ],
  },
};

const ar: Translations = {
  nav: { dashboard: 'المختبر', signals: 'قائمة المرشحين', trackRecord: 'الأدلة', language: 'اللغة', openApp: 'افحص الأدلة' },
  meta: {
    title: 'TradeClaw — مختبر مفتوح لأبحاث التداول',
    description: 'افحص سجلًا سلبيًا بعد التكاليف النموذجية، واختبر الأفكار، ونزّل الملفات البحثية، وأعد إنتاج النتائج عبر Docker Compose.',
    ogTitle: 'TradeClaw — الأدلة قبل ادعاءات التداول',
    ogDescription: 'مختبر قابل للاستضافة الذاتية لفحص التكاليف والبوابات الفاشلة والملاحظات المسجلة مسبقًا والاختبارات القابلة لإعادة الإنتاج.',
    keywords: ['أبحاث التداول', 'اختبار خلفي مع التكاليف', 'بيانات مفتوحة', 'بحث مستضاف ذاتيًا', 'أدلة الاستراتيجيات'],
  },
  hero: {
    badge: 'بحث مفتوح · تكاليف نموذجية · قابل لإعادة الإنتاج',
    headline: 'اختبر الادعاء.',
    headlineAccent: 'افحص الأدلة.',
    headlineSuffix: 'أعد إنتاجها.',
    subheadline: 'ينشر TradeClaw سجلًا سلبيًا بعد احتساب التكاليف النموذجية. استخدم المختبر لفهم سبب فشل البوابة، واختبار فكرة أخرى، وإعادة إنتاج كل نتيجة على بنيتك التحتية.',
    ctaPrimary: 'افحص سجل الأداء',
    ctaSecondary: 'افتح مختبر البحث',
    signalFeed: 'بوابة الأدلة: فاشلة',
  },
  socialProof: { stats: [{ description: 'لم يجتز أي مرشح قصير الأجل تم اختباره بوابة النشر المعلنة بعد التكاليف النموذجية. يظل البث والتنفيذ محظورين.' }] },
  howItWorks: {
    badge: 'المسار المفيد',
    title: 'من النتيجة إلى ',
    titleAccent: 'إعادة الإنتاج',
    subtitle: 'تجيب كل خطوة عن سؤال محدد: ماذا حدث، وكيف غيّرت التكاليف النتيجة، وهل يصمد تعديلك، وهل يستطيع شخص آخر إعادة إنتاجه.',
    steps: [
      { title: 'افحص النتيجة', description: 'ابدأ بالنتيجة المسجلة والتكاليف النموذجية والصفوف المستبعدة والبوابة الدقيقة التي فشلت.' },
      { title: 'اختبر فكرتك', description: 'استخدم تغطية الماسح المدعومة بمصدر بيانات واختبارًا خلفيًا افتراضيًا ينتج عينة قابلة للمراجعة.' },
      { title: 'أعد إنتاج العمل', description: 'نزّل الملفات أو استضف التطبيق وقاعدة أدلة PostgreSQL وكود البحث نفسه.' },
    ],
  },
  deploy: {
    badge: 'البناء / الاستضافة الذاتية',
    title: 'شغّل المختبر على ',
    titleAccent: 'جهازك.',
    subtitle: 'Docker Compose هو مسار الاستضافة الذاتية المدعوم. يشغّل تطبيق الويب وقاعدة PostgreSQL المطلوبة لحفظ الملاحظات وعمليات البحث.',
      requirement: 'انسخ .env.example واضبط الأسرار المطلوبة ثم اتبع مسار Compose الموثق. قد تفرض خدمات الاستضافة وبيانات السوق والوسطاء والإشعارات رسوماً منفصلة.',
  },
  faq: {
    badge: 'أسئلة',
    title: 'ما الذي يمكن وما الذي لا يمكن ',
    titleAccent: 'إثباته',
    items: [
      { question: 'هل يثبت TradeClaw حاليًا وجود أفضلية قابلة للنشر؟', answer: 'لا. يفشل السجل العام المعدّل بالتكاليف بوابة الأدلة المنشورة. تصنيفات المرشحين ملاحظات بحثية وليست توصيات أو احتمالات ربح.' },
      { question: 'ما قيمة النتيجة الفاشلة؟', answer: 'تجعل استبعاد الأفكار الضعيفة أقل تكلفة. يمكنك فحص الافتراضات ورؤية أين تمحو التكاليف الأفضلية الظاهرية واختبار تعديل قبل المخاطرة برأس المال.' },
      { question: 'هل النتائج صفقات منفذة لدى وسيط؟', answer: 'لا. تستخدم نتائج الملاحظات بيانات OHLCV من المزود، بينما تُنمذج الرسوم والانزلاق وتُوسم منفصلة. ليست عوائد حسابات عملاء أو سجلات تنفيذ.' },
      { question: 'كيف أستضيفه ذاتيًا؟', answer: 'استنسخ المستودع، وانسخ .env.example إلى .env، واضبط DB_PASSWORD وUSER_SESSION_SECRET وADMIN_SECRET وAUTH_SECRET، ثم شغّل `docker compose up -d`. PostgreSQL مطلوب.' },
    ],
  },
};

const translations = { en, es, zh, ms, ar } satisfies Record<Locale, Translations>;

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}

export function getLandingLocale(pathname: string): Locale | null {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SUPPORTED_LOCALES.find(({ href }) => href === normalizedPath)?.code ?? null;
}

export function getLocaleHref(locale: Locale): string {
  return SUPPORTED_LOCALES.find(({ code }) => code === locale)?.href ?? '/';
}

export function isLocalizedLandingPath(pathname: string): boolean {
  const locale = getLandingLocale(pathname);
  return locale !== null && locale !== DEFAULT_LOCALE;
}

export function getHtmlLanguage(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : locale;
}

export function getLanguageAlternates(baseUrl = 'https://tradeclaw.win'): Record<string, string> {
  const base = baseUrl.replace(/\/$/, '');
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map(({ code, href }) => [
      getHtmlLanguage(code),
      href === '/' ? base : `${base}${href}`,
    ]),
  );

  return { ...languages, 'x-default': base };
}

export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
