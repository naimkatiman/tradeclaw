import type { Locale } from '../translations';

export interface ScreenerTranslations {
  loading: string;
  documentTitle: string;
  provenance: {
    title: string;
    detail: string;
  };
  title: string;
  subtitle: string;
  score: {
    high: string;
    mid: string;
    low: string;
  };
  filters: {
    rsiRange: string;
    minRuleScore: string;
    timeframe: string;
    macd: string;
    emaPosition: string;
    direction: string;
  };
  options: {
    any: string;
    bullish: string;
    bearish: string;
    aboveEma20: string;
    belowEma20: string;
    goldenCross: string;
    all: string;
    buy: string;
    sell: string;
  };
  actions: {
    watchlistOnly: string;
    noResultsToExport: string;
    exportRows: string;
    exportCsv: string;
    scanning: string;
    scanNow: string;
    viewSignal: string;
    view: string;
    alert: string;
    watch: string;
    addToWatchlist: string;
    removeFromWatchlist: string;
    retryScan: string;
  };
  stats: {
    totalScanned: string;
    assetsTracked: string;
    matchingFilters: string;
    ofAssets: string;
    strongestSignal: string;
    strongestDetail: string;
    noSignals: string;
    bias: string;
  };
  initial: {
    title: string;
    detail: string;
  };
  empty: {
    scanFailed: string;
    scanFailedDetail: string;
    noMatches: string;
    tooRestrictive: string;
    adjustHint: string;
    lowerScore: string;
    widenRsi: string;
    resetFilters: string;
  };
  sort: {
    label: string;
    ruleScore: string;
    symbol: string;
    price: string;
    high: string;
    low: string;
  };
  columns: {
    watchlist: string;
    symbol: string;
    price: string;
    signal: string;
    ruleScore: string;
    emaStatus: string;
    chart: string;
    timeframe: string;
    actions: string;
  };
  emaStatus: {
    mixed: string;
    goldenCross: string;
    deathCross: string;
    aboveEma20: string;
    belowEma20: string;
  };
  footer: {
    scannedAt: string;
    sortHint: string;
    watchHint: string;
  };
  aria: {
    rsiMinimum: string;
    rsiMaximum: string;
    minimumRuleScore: string;
    priceChartFor: string;
    addSymbolToWatchlist: string;
    removeSymbolFromWatchlist: string;
  };
}

const en: ScreenerTranslations = {
  loading: 'Scanning markets…',
  documentTitle: 'Asset Screener — TradeClaw',
  provenance: {
    title: 'Observed-data scan',
    detail: 'Generated fallback candles are excluded from public candidate results. The scan time appears below; upstream availability and freshness can vary.',
  },
  title: 'Asset Screener',
  subtitle: 'Scan {count} configured assets for indicator conditions. These are analytical outputs, not trade recommendations.',
  score: {
    high: 'High rule score — broad indicator agreement',
    mid: 'Mid rule score — partial indicator agreement',
    low: 'Low rule score — limited indicator agreement',
  },
  filters: {
    rsiRange: 'RSI range',
    minRuleScore: 'Minimum rule score',
    timeframe: 'Timeframe',
    macd: 'MACD',
    emaPosition: 'EMA position',
    direction: 'Direction',
  },
  options: {
    any: 'Any',
    bullish: 'Bullish',
    bearish: 'Bearish',
    aboveEma20: 'Above EMA20',
    belowEma20: 'Below EMA20',
    goldenCross: 'Golden cross',
    all: 'All',
    buy: 'BUY',
    sell: 'SELL',
  },
  actions: {
    watchlistOnly: 'Watchlist Only',
    noResultsToExport: 'No results to export',
    exportRows: 'Export {count} rows to CSV',
    exportCsv: 'Export CSV',
    scanning: 'Scanning…',
    scanNow: 'Scan Now',
    viewSignal: 'Inspect Evidence',
    view: 'View',
    alert: 'Alert',
    watch: 'Watch',
    addToWatchlist: 'Add to watchlist',
    removeFromWatchlist: 'Remove from watchlist',
    retryScan: 'Retry scan',
  },
  stats: {
    totalScanned: 'Provider-backed inputs',
    assetsTracked: 'of configured universe',
    matchingFilters: 'Matching filters',
    ofAssets: 'of {count} assets',
    strongestSignal: 'Strongest candidate',
    strongestDetail: '{direction} · rule score {score}/100',
    noSignals: 'no eligible candidates',
    bias: 'Bias',
  },
  initial: {
    title: 'Set your filters and tap Scan Now',
    detail: 'Scans {count} assets across forex, crypto, and metals',
  },
  empty: {
    scanFailed: 'Scan failed',
    scanFailedDetail: 'Market data did not load — this was not caused by your filters.',
    noMatches: 'No candidates passed this scan',
    tooRestrictive: 'Zero is a valid result: no provider-backed observation cleared the engine and filter gates. Inspect the record or method before changing rules.',
    adjustHint: 'No provider-backed observation cleared both the engine gate and your filters. Inspect the record or method before changing rules.',
    lowerScore: 'Lower rule score to 50/100',
    widenRsi: 'Widen RSI range',
    resetFilters: 'Reset all filters',
  },
  sort: {
    label: 'Sort by',
    ruleScore: 'Rule score',
    symbol: 'Symbol',
    price: 'Price',
    high: 'High',
    low: 'Low',
  },
  columns: {
    watchlist: 'Watchlist',
    symbol: 'Symbol',
    price: 'Price',
    signal: 'Directional case',
    ruleScore: 'Rule score',
    emaStatus: 'EMA status',
    chart: 'Chart',
    timeframe: 'TF',
    actions: 'Evidence',
  },
  emaStatus: {
    mixed: 'Mixed',
    goldenCross: 'Golden cross',
    deathCross: 'Death cross',
    aboveEma20: 'Above EMA20',
    belowEma20: 'Below EMA20',
  },
  footer: {
    scannedAt: 'Scanned at {time}',
    sortHint: 'Click column headers to sort',
    watchHint: '★ adds an asset to the watchlist',
  },
  aria: {
    rsiMinimum: 'Minimum RSI',
    rsiMaximum: 'Maximum RSI',
    minimumRuleScore: 'Minimum rule score',
    priceChartFor: 'Price chart for {symbol}',
    addSymbolToWatchlist: 'Add {symbol} to watchlist',
    removeSymbolFromWatchlist: 'Remove {symbol} from watchlist',
  },
};

const es: ScreenerTranslations = {
  loading: 'Escaneando mercados…',
  documentTitle: 'Analizador de activos — TradeClaw',
  provenance: {
    title: 'Escaneo con datos observados',
    detail: 'Las velas de respaldo generadas se excluyen de los resultados públicos de candidatas. La hora del escaneo aparece abajo; la disponibilidad y la frescura de las fuentes pueden variar.',
  },
  title: 'Analizador de activos',
  subtitle: 'Analiza {count} activos configurados para encontrar condiciones de indicadores. Son resultados analíticos, no recomendaciones de trading.',
  score: {
    high: 'Puntuación de reglas alta — amplio acuerdo entre indicadores',
    mid: 'Puntuación de reglas media — acuerdo parcial entre indicadores',
    low: 'Puntuación de reglas baja — acuerdo limitado entre indicadores',
  },
  filters: {
    rsiRange: 'Rango de RSI',
    minRuleScore: 'Puntuación mínima de reglas',
    timeframe: 'Marco temporal',
    macd: 'MACD',
    emaPosition: 'Posición de EMA',
    direction: 'Dirección',
  },
  options: {
    any: 'Cualquiera',
    bullish: 'Alcista',
    bearish: 'Bajista',
    aboveEma20: 'Por encima de EMA20',
    belowEma20: 'Por debajo de EMA20',
    goldenCross: 'Cruce dorado',
    all: 'Todas',
    buy: 'Comprar',
    sell: 'Vender',
  },
  actions: {
    watchlistOnly: 'Solo lista de seguimiento',
    noResultsToExport: 'No hay resultados para exportar',
    exportRows: 'Exportar {count} filas a CSV',
    exportCsv: 'Exportar CSV',
    scanning: 'Escaneando…',
    scanNow: 'Escanear ahora',
    viewSignal: 'Inspeccionar evidencia',
    view: 'Ver',
    alert: 'Alerta',
    watch: 'Seguir',
    addToWatchlist: 'Añadir a la lista de seguimiento',
    removeFromWatchlist: 'Quitar de la lista de seguimiento',
    retryScan: 'Reintentar escaneo',
  },
  stats: {
    totalScanned: 'Entradas con proveedor',
    assetsTracked: 'del universo configurado',
    matchingFilters: 'Coinciden con los filtros',
    ofAssets: 'de {count} activos',
    strongestSignal: 'Candidata más fuerte',
    strongestDetail: '{direction} · puntuación de reglas {score}/100',
    noSignals: 'sin candidatas elegibles',
    bias: 'Sesgo',
  },
  initial: {
    title: 'Configura los filtros y pulsa Escanear ahora',
    detail: 'Analiza {count} activos de forex, cripto y metales',
  },
  empty: {
    scanFailed: 'El escaneo falló',
    scanFailedDetail: 'Los datos de mercado no se cargaron; el problema no está en tus filtros.',
    noMatches: 'Ninguna candidata superó este escaneo',
    tooRestrictive: 'Cero es un resultado válido: ninguna observación respaldada por proveedor superó las puertas del motor y los filtros.',
    adjustHint: 'Ninguna observación superó tanto la puerta del motor como tus filtros. Revisa el historial o el método antes de cambiar reglas.',
    lowerScore: 'Bajar la puntuación a 50/100',
    widenRsi: 'Ampliar el rango de RSI',
    resetFilters: 'Restablecer todos los filtros',
  },
  sort: {
    label: 'Ordenar por',
    ruleScore: 'Puntuación de reglas',
    symbol: 'Símbolo',
    price: 'Precio',
    high: 'Mayor',
    low: 'Menor',
  },
  columns: {
    watchlist: 'Lista de seguimiento',
    symbol: 'Símbolo',
    price: 'Precio',
    signal: 'Caso direccional',
    ruleScore: 'Puntuación de reglas',
    emaStatus: 'Estado de EMA',
    chart: 'Gráfico',
    timeframe: 'Marco',
    actions: 'Evidencia',
  },
  emaStatus: {
    mixed: 'Mixto',
    goldenCross: 'Cruce dorado',
    deathCross: 'Cruce de la muerte',
    aboveEma20: 'Por encima de EMA20',
    belowEma20: 'Por debajo de EMA20',
  },
  footer: {
    scannedAt: 'Escaneado a las {time}',
    sortHint: 'Pulsa los encabezados de columna para ordenar',
    watchHint: '★ añade un activo a la lista de seguimiento',
  },
  aria: {
    rsiMinimum: 'RSI mínimo',
    rsiMaximum: 'RSI máximo',
    minimumRuleScore: 'Puntuación mínima de reglas',
    priceChartFor: 'Gráfico de precio de {symbol}',
    addSymbolToWatchlist: 'Añadir {symbol} a la lista de seguimiento',
    removeSymbolFromWatchlist: 'Quitar {symbol} de la lista de seguimiento',
  },
};

const zh: ScreenerTranslations = {
  loading: '正在扫描市场…',
  documentTitle: '资产筛选器 — TradeClaw',
  provenance: {
    title: '实测数据扫描',
    detail: '公开候选结果会排除生成的备用 K 线。扫描时间显示在下方；上游数据的可用性和新鲜度可能变化。',
  },
  title: '资产筛选器',
  subtitle: '扫描 {count} 个已配置资产以查找指标条件。这些是分析结果，并非交易建议。',
  score: {
    high: '规则评分高 — 多项指标广泛一致',
    mid: '规则评分中等 — 部分指标一致',
    low: '规则评分低 — 指标一致性有限',
  },
  filters: {
    rsiRange: 'RSI 范围',
    minRuleScore: '最低规则评分',
    timeframe: '时间周期',
    macd: 'MACD',
    emaPosition: 'EMA 位置',
    direction: '方向',
  },
  options: {
    any: '任意',
    bullish: '看涨',
    bearish: '看跌',
    aboveEma20: '高于 EMA20',
    belowEma20: '低于 EMA20',
    goldenCross: '黄金交叉',
    all: '全部',
    buy: '买入',
    sell: '卖出',
  },
  actions: {
    watchlistOnly: '仅看关注列表',
    noResultsToExport: '没有可导出的结果',
    exportRows: '导出 {count} 行到 CSV',
    exportCsv: '导出 CSV',
    scanning: '正在扫描…',
    scanNow: '立即扫描',
    viewSignal: '检查证据',
    view: '查看',
    alert: '提醒',
    watch: '关注',
    addToWatchlist: '加入关注列表',
    removeFromWatchlist: '从关注列表移除',
    retryScan: '重试扫描',
  },
  stats: {
    totalScanned: '供应商支持的输入',
    assetsTracked: '占配置资产总数',
    matchingFilters: '符合筛选条件',
    ofAssets: '共 {count} 个资产',
    strongestSignal: '最强候选',
    strongestDetail: '{direction} · 规则评分 {score}/100',
    noSignals: '无合格候选',
    bias: '偏向',
  },
  initial: {
    title: '设置筛选条件并点击“立即扫描”',
    detail: '扫描外汇、加密资产和金属中的 {count} 个资产',
  },
  empty: {
    scanFailed: '扫描失败',
    scanFailedDetail: '市场数据未能加载；这不是你的筛选条件造成的。',
    noMatches: '本次扫描没有候选通过',
    tooRestrictive: '零也是有效结果：没有供应商支持的观测同时通过引擎门槛与筛选条件。',
    adjustHint: '没有观测同时通过引擎门槛与筛选条件。更改规则前请先查看记录或方法。',
    lowerScore: '将规则评分降至 50/100',
    widenRsi: '扩大 RSI 范围',
    resetFilters: '重置所有筛选条件',
  },
  sort: {
    label: '排序方式',
    ruleScore: '规则评分',
    symbol: '代码',
    price: '价格',
    high: '从高到低',
    low: '从低到高',
  },
  columns: {
    watchlist: '关注列表',
    symbol: '代码',
    price: '价格',
    signal: '方向假设',
    ruleScore: '规则评分',
    emaStatus: 'EMA 状态',
    chart: '图表',
    timeframe: '周期',
    actions: '证据',
  },
  emaStatus: {
    mixed: '混合',
    goldenCross: '黄金交叉',
    deathCross: '死亡交叉',
    aboveEma20: '高于 EMA20',
    belowEma20: '低于 EMA20',
  },
  footer: {
    scannedAt: '扫描时间：{time}',
    sortHint: '点击列标题进行排序',
    watchHint: '★ 可将资产加入关注列表',
  },
  aria: {
    rsiMinimum: '最低 RSI',
    rsiMaximum: '最高 RSI',
    minimumRuleScore: '最低规则评分',
    priceChartFor: '{symbol} 的价格图表',
    addSymbolToWatchlist: '将 {symbol} 加入关注列表',
    removeSymbolFromWatchlist: '将 {symbol} 从关注列表移除',
  },
};

const ms: ScreenerTranslations = {
  loading: 'Mengimbas pasaran…',
  documentTitle: 'Penyaring Aset — TradeClaw',
  provenance: {
    title: 'Imbasan data cerapan',
    detail: 'Lilin sandaran yang dijana dikecualikan daripada hasil calon awam. Masa imbasan dipaparkan di bawah; ketersediaan dan kesegaran sumber huluan boleh berubah.',
  },
  title: 'Penyaring Aset',
  subtitle: 'Imbas {count} aset yang dikonfigurasi untuk keadaan penunjuk. Ini ialah output analisis, bukan cadangan dagangan.',
  score: {
    high: 'Skor peraturan tinggi — persetujuan penunjuk yang luas',
    mid: 'Skor peraturan sederhana — persetujuan separa antara penunjuk',
    low: 'Skor peraturan rendah — persetujuan penunjuk yang terhad',
  },
  filters: {
    rsiRange: 'Julat RSI',
    minRuleScore: 'Skor peraturan minimum',
    timeframe: 'Rangka masa',
    macd: 'MACD',
    emaPosition: 'Kedudukan EMA',
    direction: 'Arah',
  },
  options: {
    any: 'Mana-mana',
    bullish: 'Menaik',
    bearish: 'Menurun',
    aboveEma20: 'Di atas EMA20',
    belowEma20: 'Di bawah EMA20',
    goldenCross: 'Persilangan emas',
    all: 'Semua',
    buy: 'Beli',
    sell: 'Jual',
  },
  actions: {
    watchlistOnly: 'Senarai pantau sahaja',
    noResultsToExport: 'Tiada hasil untuk dieksport',
    exportRows: 'Eksport {count} baris ke CSV',
    exportCsv: 'Eksport CSV',
    scanning: 'Sedang mengimbas…',
    scanNow: 'Imbas sekarang',
    viewSignal: 'Periksa bukti',
    view: 'Lihat',
    alert: 'Amaran',
    watch: 'Pantau',
    addToWatchlist: 'Tambah pada senarai pantau',
    removeFromWatchlist: 'Alih keluar daripada senarai pantau',
    retryScan: 'Cuba imbas semula',
  },
  stats: {
    totalScanned: 'Input disokong pembekal',
    assetsTracked: 'daripada alam semesta dikonfigurasi',
    matchingFilters: 'Sepadan dengan penapis',
    ofAssets: 'daripada {count} aset',
    strongestSignal: 'Calon terkuat',
    strongestDetail: '{direction} · skor peraturan {score}/100',
    noSignals: 'tiada calon layak',
    bias: 'Kecenderungan',
  },
  initial: {
    title: 'Tetapkan penapis dan tekan Imbas sekarang',
    detail: 'Mengimbas {count} aset merentas forex, kripto dan logam',
  },
  empty: {
    scanFailed: 'Imbasan gagal',
    scanFailedDetail: 'Data pasaran tidak dapat dimuatkan — masalah ini bukan disebabkan penapis anda.',
    noMatches: 'Tiada calon melepasi imbasan ini',
    tooRestrictive: 'Sifar ialah hasil yang sah: tiada pemerhatian disokong pembekal melepasi pagar enjin dan penapis.',
    adjustHint: 'Tiada pemerhatian melepasi pagar enjin dan penapis anda. Semak rekod atau kaedah sebelum mengubah peraturan.',
    lowerScore: 'Rendahkan skor peraturan kepada 50/100',
    widenRsi: 'Luaskan julat RSI',
    resetFilters: 'Tetapkan semula semua penapis',
  },
  sort: {
    label: 'Isih mengikut',
    ruleScore: 'Skor peraturan',
    symbol: 'Simbol',
    price: 'Harga',
    high: 'Tinggi',
    low: 'Rendah',
  },
  columns: {
    watchlist: 'Senarai pantau',
    symbol: 'Simbol',
    price: 'Harga',
    signal: 'Hipotesis arah',
    ruleScore: 'Skor peraturan',
    emaStatus: 'Status EMA',
    chart: 'Carta',
    timeframe: 'RM',
    actions: 'Bukti',
  },
  emaStatus: {
    mixed: 'Bercampur',
    goldenCross: 'Persilangan emas',
    deathCross: 'Persilangan maut',
    aboveEma20: 'Di atas EMA20',
    belowEma20: 'Di bawah EMA20',
  },
  footer: {
    scannedAt: 'Diimbas pada {time}',
    sortHint: 'Klik pengepala lajur untuk mengisih',
    watchHint: '★ menambah aset pada senarai pantau',
  },
  aria: {
    rsiMinimum: 'RSI minimum',
    rsiMaximum: 'RSI maksimum',
    minimumRuleScore: 'Skor peraturan minimum',
    priceChartFor: 'Carta harga untuk {symbol}',
    addSymbolToWatchlist: 'Tambah {symbol} pada senarai pantau',
    removeSymbolFromWatchlist: 'Alih keluar {symbol} daripada senarai pantau',
  },
};

const ar: ScreenerTranslations = {
  loading: 'جارٍ مسح الأسواق…',
  documentTitle: 'ماسح الأصول — TradeClaw',
  provenance: {
    title: 'مسح ببيانات مرصودة',
    detail: 'تُستبعد شموع الاحتياط المُنشأة من نتائج المرشحين العامة. يظهر وقت المسح أدناه؛ وقد يختلف توفر بيانات المصادر وحداثتها.',
  },
  title: 'ماسح الأصول',
  subtitle: 'عدد الأصول المُهيأة للمسح: {count}. ابحث عن شروط المؤشرات. هذه مخرجات تحليلية وليست توصيات تداول.',
  score: {
    high: 'درجة قواعد مرتفعة — توافق واسع بين المؤشرات',
    mid: 'درجة قواعد متوسطة — توافق جزئي بين المؤشرات',
    low: 'درجة قواعد منخفضة — توافق محدود بين المؤشرات',
  },
  filters: {
    rsiRange: 'نطاق RSI',
    minRuleScore: 'الحد الأدنى لدرجة القواعد',
    timeframe: 'الإطار الزمني',
    macd: 'MACD',
    emaPosition: 'موضع EMA',
    direction: 'الاتجاه',
  },
  options: {
    any: 'أيّ قيمة',
    bullish: 'صعودي',
    bearish: 'هبوطي',
    aboveEma20: 'فوق EMA20',
    belowEma20: 'دون EMA20',
    goldenCross: 'تقاطع ذهبي',
    all: 'الكل',
    buy: 'شراء',
    sell: 'بيع',
  },
  actions: {
    watchlistOnly: 'قائمة المراقبة فقط',
    noResultsToExport: 'لا توجد نتائج للتصدير',
    exportRows: 'تصدير النتائج إلى CSV ({count})',
    exportCsv: 'تصدير CSV',
    scanning: 'جارٍ المسح…',
    scanNow: 'امسح الآن',
    viewSignal: 'فحص الدليل',
    view: 'عرض',
    alert: 'تنبيه',
    watch: 'راقب',
    addToWatchlist: 'أضف إلى قائمة المراقبة',
    removeFromWatchlist: 'أزل من قائمة المراقبة',
    retryScan: 'أعد المسح',
  },
  stats: {
    totalScanned: 'مدخلات مدعومة من المزود',
    assetsTracked: 'من نطاق الأصول المهيأ',
    matchingFilters: 'المطابق للفلاتر',
    ofAssets: 'إجمالي الأصول: {count}',
    strongestSignal: 'أقوى مرشح',
    strongestDetail: '{direction} · درجة القواعد {score}/100',
    noSignals: 'لا يوجد مرشح مؤهل',
    bias: 'الانحياز',
  },
  initial: {
    title: 'اضبط الفلاتر ثم اضغط «امسح الآن»',
    detail: 'عدد الأصول التي يشملها المسح: {count} عبر الفوركس والعملات المشفرة والمعادن',
  },
  empty: {
    scanFailed: 'فشل المسح',
    scanFailedDetail: 'تعذر تحميل بيانات السوق — المشكلة ليست في فلاترك.',
    noMatches: 'لم يجتز أي مرشح هذا الفحص',
    tooRestrictive: 'الصفر نتيجة صالحة: لم تتجاوز أي ملاحظة مدعومة من المزود بوابات المحرك والفلاتر.',
    adjustHint: 'لم تتجاوز أي ملاحظة بوابة المحرك وفلاترك معًا. افحص السجل أو المنهج قبل تغيير القواعد.',
    lowerScore: 'خفّض درجة القواعد إلى 50/100',
    widenRsi: 'وسّع نطاق RSI',
    resetFilters: 'أعد ضبط كل الفلاتر',
  },
  sort: {
    label: 'رتّب حسب',
    ruleScore: 'درجة القواعد',
    symbol: 'الرمز',
    price: 'السعر',
    high: 'الأعلى',
    low: 'الأدنى',
  },
  columns: {
    watchlist: 'قائمة المراقبة',
    symbol: 'الرمز',
    price: 'السعر',
    signal: 'الفرضية الاتجاهية',
    ruleScore: 'درجة القواعد',
    emaStatus: 'حالة EMA',
    chart: 'الرسم',
    timeframe: 'الإطار',
    actions: 'الأدلة',
  },
  emaStatus: {
    mixed: 'مختلط',
    goldenCross: 'تقاطع ذهبي',
    deathCross: 'تقاطع هبوطي',
    aboveEma20: 'فوق EMA20',
    belowEma20: 'دون EMA20',
  },
  footer: {
    scannedAt: 'تم المسح عند {time}',
    sortHint: 'اضغط رؤوس الأعمدة للترتيب',
    watchHint: '★ لإضافة أصل إلى قائمة المراقبة',
  },
  aria: {
    rsiMinimum: 'الحد الأدنى لـ RSI',
    rsiMaximum: 'الحد الأقصى لـ RSI',
    minimumRuleScore: 'الحد الأدنى لدرجة القواعد',
    priceChartFor: 'رسم سعر {symbol}',
    addSymbolToWatchlist: 'أضف {symbol} إلى قائمة المراقبة',
    removeSymbolFromWatchlist: 'أزل {symbol} من قائمة المراقبة',
  },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, ScreenerTranslations>;

export function getScreenerTranslations(locale: Locale): ScreenerTranslations {
  return dictionaries[locale];
}
