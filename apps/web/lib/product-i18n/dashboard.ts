import type { Locale } from '../translations';

export interface DashboardTranslations {
  common: {
    all: string;
    buy: string;
    sell: string;
    live: string;
    demo: string;
    copied: string;
    dismiss: string;
    refresh: string;
    pending: string;
    details: string;
    copyValue: string;
    winRateShort: string;
    defaultLabel: string;
    high: string;
    medium: string;
    low: string;
    assets: {
      all: string;
      crypto: string;
      forex: string;
      metals: string;
      stocks: string;
    };
    bias: {
      bull: string;
      bear: string;
      neutral: string;
    };
  };
  document: {
    title: string;
    titleWithBuyCount: string;
  };
  onboarding: {
    title: string;
    reviewTitle: string;
    reviewBody: string;
    inspectTitle: string;
    inspectBody: string;
    selfHostTitle: string;
    selfHostBeforeCommand: string;
    selfHostAfterCommand: string;
  };
  telegram: {
    generateErrorRetry: string;
    generateError: string;
    generating: string;
    connect: string;
    joinPublicChannel: string;
  };
  confidence: {
    high: string;
    medium: string;
    low: string;
    hint: string;
  };
  explanation: {
    title: string;
    rsiOversold: string;
    rsiBelowNeutral: string;
    macdBullish: string;
    priceAboveEma: string;
    stochasticOversold: string;
    rsiOverbought: string;
    rsiAboveNeutral: string;
    macdBearish: string;
    priceBelowEma: string;
    stochasticOverbought: string;
    multiIndicatorAlignment: string;
  };
  outcomes: {
    tp3Hit: string;
    tp2Hit: string;
    tp1Hit: string;
    stopped: string;
    expired: string;
    active: string;
    progressToTp1: string;
  };
  share: {
    title: string;
    postOnX: string;
    copyLink: string;
    headline: string;
    entry: string;
    targets: string;
    disclaimer: string;
  };
  actions: {
    addWatchlist: string;
    removeWatchlist: string;
    showChart: string;
    hideChart: string;
  };
  signal: {
    atrBadge: string;
    scoreHint: string;
  };
  levels: {
    entry: string;
    sl: string;
    tp1: string;
    tp2: string;
    tp3: string;
    entryHint: string;
    slHint: string;
    tp1Hint: string;
    tp2Hint: string;
    tp3Hint: string;
  };
  indicators: {
    trend: string;
    stochastic: string;
    up: string;
    down: string;
    flat: string;
    emaStack: string;
    supportResistance: string;
    atrStop: string;
    bbWidth: string;
    realTracked: string;
    demoSeeded: string;
    chartHeading: string;
    fullScreen: string;
  };
  history: {
    heading: string;
    winRate: string;
    resolved: string;
    streak: string;
    priceMoveSum: string;
    winRateAria: string;
    resolvedAria: string;
    streakAria: string;
    priceMoveSumAria: string;
    winRateHint: string;
    resolvedHint: string;
    streakHint: string;
    priceMoveSumHint: string;
    pair: string;
    direction: string;
    ruleScore: string;
    entry: string;
    directionalMove: string;
    viewRecord: string;
  };
  controls: {
    auto: string;
    paused: string;
  };
  transparency: {
    providerBefore: string;
    providerAfter: string;
    provenance: string;
  };
  warning: {
    syntheticSymbols: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    selected: string;
    topSignal: string;
    score: string;
  };
  stats: {
    activeSignals: string;
    buySell: string;
    averageRuleScore: string;
    marketBias: string;
  };
  filters: {
    highRuleScore: string;
    watchlist: string;
  };
  empty: {
    noAssetSignals: string;
    noFilteredSignals: string;
    otherCategoriesForex: string;
    otherCategoriesMetals: string;
    otherCategoriesOther: string;
    adjustFilters: string;
    showAllAssets: string;
    generating: string;
    analyzing: string;
    autoRetrying: string;
    retryNow: string;
    takeTour: string;
    noHighScoreCandidates: string;
    potentialBelow: string;
  };
  potential: {
    heading: string;
    scoreBand: string;
    count: string;
    description: string;
  };
  footer: {
    tagline: string;
    disclaimer: string;
  };
}

const en: DashboardTranslations = {
  common: {
    all: 'All', buy: 'BUY', sell: 'SELL', live: 'LIVE', demo: 'DEMO', copied: 'Copied!',
    dismiss: 'Dismiss', refresh: 'Refresh', pending: 'pending', details: 'details',
    copyValue: 'Copy {value}', winRateShort: 'WR', defaultLabel: 'default', high: 'high', medium: 'medium', low: 'low',
    assets: { all: 'All', crypto: 'Crypto', forex: 'Forex', metals: 'Metals', stocks: 'Stocks' },
    bias: { bull: 'Bull', bear: 'Bear', neutral: 'Neutral' },
  },
  document: {
    title: 'TradeClaw — Live Signals',
    titleWithBuyCount: '({count} BUY) TradeClaw — Live Signals',
  },
  onboarding: {
    title: '3 steps to inspect the research output:',
    reviewTitle: 'Review signal candidates',
    reviewBody: 'BUY/SELL research labels with indicator-confluence scores.',
    inspectTitle: 'Inspect any row',
    inspectBody: 'check its timestamp, data-quality label, entry reference, TP/SL levels, and indicator breakdown.',
    selfHostTitle: 'Self-host the stack',
    selfHostBeforeCommand: 'set the required secrets, run',
    selfHostAfterCommand: 'and audit the engine yourself.',
  },
  telegram: {
    generateErrorRetry: 'Could not generate link. Try again.',
    generateError: 'Could not generate link.',
    generating: 'Generating link…',
    connect: 'Connect Telegram',
    joinPublicChannel: 'Join free public channel',
  },
  confidence: {
    high: 'High rule score — broad indicator agreement',
    medium: 'Mid rule score — partial indicator agreement',
    low: 'Low rule score — limited indicator agreement',
    hint: 'Mechanical indicator-agreement score (0–100), not a probability or measured edge. It combines RSI, MACD, EMA, Stochastic, and Bollinger Band rules.',
  },
  explanation: {
    title: 'Why this signal?',
    rsiOversold: 'RSI at {value} (oversold condition)',
    rsiBelowNeutral: 'RSI at {value} (below neutral)',
    macdBullish: 'MACD crossover bullish',
    priceAboveEma: 'Price above EMA20 — uptrend intact',
    stochasticOversold: 'Stochastic in oversold range',
    rsiOverbought: 'RSI at {value} (overbought condition)',
    rsiAboveNeutral: 'RSI at {value} (above neutral)',
    macdBearish: 'MACD crossover bearish',
    priceBelowEma: 'Price below EMA20 — downtrend intact',
    stochasticOverbought: 'Stochastic in overbought range',
    multiIndicatorAlignment: 'Rule score {score}/100 — multi-indicator alignment',
  },
  outcomes: {
    tp3Hit: 'TP3 hit', tp2Hit: 'TP2 hit', tp1Hit: 'TP1 hit', stopped: 'Stopped', expired: 'Expired', active: 'Active',
    progressToTp1: 'Progress to TP1: {progress}%',
  },
  share: {
    title: 'Share signal', postOnX: 'Post on X', copyLink: 'Copy link',
    headline: '{direction} {symbol} — rule score {score}/100',
    entry: 'Entry: ${entry}',
    targets: 'TP1: ${tp1} | SL: ${sl}',
    disclaimer: 'Rule-generated research candidate; not a broker order or success probability.',
  },
  actions: {
    addWatchlist: 'Add to watchlist', removeWatchlist: 'Remove from watchlist', showChart: 'Show chart', hideChart: 'Hide chart',
  },
  signal: {
    atrBadge: 'SL {multiplier}× ATR',
    scoreHint: 'rule score',
  },
  levels: {
    entry: 'Entry', sl: 'SL', tp1: 'TP1', tp2: 'TP2', tp3: 'TP3',
    entryHint: 'Price when the signal was generated.',
    slHint: 'Stop Loss = Entry ± (ATR × multiplier). ATR measures recent volatility — wider ATR means a wider stop to avoid noise.',
    tp1Hint: 'Take Profit 1 — closest target at about 1.5× the risk distance.',
    tp2Hint: 'Take Profit 2 — mid target at about 2.5× risk. A partial close at TP1 is one possible risk-management approach.',
    tp3Hint: 'Take Profit 3 — stretch target at about 3.5× risk, intended for stronger moves.',
  },
  indicators: {
    trend: 'Trend', stochastic: 'Stoch', up: 'UP', down: 'DOWN', flat: 'FLAT', emaStack: 'EMA Stack',
    supportResistance: 'S/R Levels', atrStop: 'ATR Stop: {multiplier}× ({confidence})', bbWidth: 'BB Width: {width}%',
    realTracked: 'real-tracked', demoSeeded: 'demo-seeded', chartHeading: '{symbol} · Entry / SL / TP', fullScreen: 'Full screen →',
  },
  history: {
    heading: 'Signal Track Record', winRate: 'win rate', resolved: 'resolved', streak: 'streak', priceMoveSum: 'price-move sum',
    winRateAria: 'What win rate means', resolvedAria: 'What resolved means', streakAria: 'What streak means',
    priceMoveSumAria: 'What the price-move sum means',
    winRateHint: 'Counted signals whose 24h provider-OHLCV outcome hit TP, divided by counted signals with a usable 24h outcome. Pending, simulated, gate-blocked, and unusable placeholder rows are excluded.',
    resolvedHint: 'Signals with a usable 24h provider-OHLCV outcome: TP, SL, or a nonzero 24h close after neither was hit. This is an engine signal study, not a subscriber execution ledger.',
    streakHint: 'Consecutive resolved signals, signed: positive for a winning run and negative for a losing run.',
    priceMoveSumHint: 'Arithmetic sum of counted signals’ OHLCV-resolved price moves, without position sizing or execution costs. It is not a portfolio return.',
    pair: 'Pair', direction: 'Dir', ruleScore: 'Rule score', entry: 'Entry',
    directionalMove: 'Directional move', viewRecord: 'View Signal Record →',
  },
  controls: { auto: 'Auto', paused: 'Paused' },
  transparency: {
    providerBefore: 'Runtime quotes prefer',
    providerAfter: 'through the market-data hub. Signal candles use the hub when configured, then Binance for crypto or Stooq for forex/metals; synthetic fallback rows are suppressed from this signal list.',
    provenance: 'Card badges identify the expected provider lane; the real-versus-synthetic quality flag is the runtime provenance currently carried on each signal.',
  },
  warning: {
    syntheticSymbols: '{count} of {total} symbols are using synthetic data (API unavailable) — signals suppressed for those pairs.',
  },
  hero: {
    eyebrow: 'Live signal feed',
    title: 'Signals',
    description: 'Provider-backed, rule-generated candidates with transparent source and evidence boundaries.',
    selected: 'SELECTED',
    topSignal: 'TOP SIGNAL',
    score: '{score}/100 rule score',
  },
  stats: { activeSignals: 'Active signals', buySell: 'Buy / Sell', averageRuleScore: 'Avg rule score', marketBias: 'Market bias' },
  filters: { highRuleScore: 'High Rule Score (≥80/100)', watchlist: 'Watchlist' },
  empty: {
    noAssetSignals: 'No {asset} signals right now',
    noFilteredSignals: 'No signals match the current filters',
    otherCategoriesForex: 'Active signals in other categories: {count}. Try another asset class or check back when forex sessions are open.',
    otherCategoriesMetals: 'Active signals in other categories: {count}. Try another asset class or check back when metals markets are active.',
    otherCategoriesOther: 'Active signals in other categories: {count}. Try another asset class or check back when more setups trigger.',
    adjustFilters: 'Active signals: {count}. Adjust the score or watchlist filters to see them.',
    showAllAssets: 'Show all assets',
    generating: 'Generating signals…',
    analyzing: 'The TA engine is analyzing live market data. This takes up to 30 seconds on first load.',
    autoRetrying: 'Auto-retrying every 15s. Signals appear when the market is active and setups meet the quality threshold.',
    retryNow: 'Retry now',
    takeTour: 'Take the tour',
    noHighScoreCandidates: 'No candidates with a rule score of 70/100 or higher right now',
    potentialBelow: 'Potential setups below: {count} (50–69/100). They have partial indicator agreement and may strengthen.',
  },
  potential: {
    heading: 'Potential Signals', scoreBand: 'rule score 50–69/100', count: 'Setups: {count}',
    description: 'Early-stage setups that have not reached full confluence yet. Watch for confirmation before acting.',
  },
  footer: {
    tagline: 'TradeClaw Signal Scanner · Open Source · Self-Hosted',
    disclaimer: 'Signal analysis is for educational purposes only. Not financial advice.',
  },
};

const es: DashboardTranslations = {
  common: {
    all: 'Todos', buy: 'COMPRA', sell: 'VENTA', live: 'EN VIVO', demo: 'DEMO', copied: '¡Copiado!',
    dismiss: 'Cerrar', refresh: 'Actualizar', pending: 'pendiente', details: 'detalles',
    copyValue: 'Copiar {value}', winRateShort: 'TA', defaultLabel: 'predeterminado', high: 'alta', medium: 'media', low: 'baja',
    assets: { all: 'Todos', crypto: 'Cripto', forex: 'Forex', metals: 'Metales', stocks: 'Acciones' },
    bias: { bull: 'Alcista', bear: 'Bajista', neutral: 'Neutral' },
  },
  document: { title: 'TradeClaw — Señales en vivo', titleWithBuyCount: '({count} COMPRA) TradeClaw — Señales en vivo' },
  onboarding: {
    title: '3 pasos para inspeccionar los resultados de investigación:',
    reviewTitle: 'Revisa las señales candidatas', reviewBody: 'Etiquetas de investigación COMPRA/VENTA con puntuaciones de confluencia de indicadores.',
    inspectTitle: 'Inspecciona cualquier fila', inspectBody: 'comprueba la hora, la calidad de datos, la entrada de referencia, los niveles TP/SL y el desglose de indicadores.',
    selfHostTitle: 'Autoaloja la plataforma', selfHostBeforeCommand: 'configura los secretos necesarios, ejecuta', selfHostAfterCommand: 'y audita el motor por tu cuenta.',
  },
  telegram: {
    generateErrorRetry: 'No se pudo generar el enlace. Inténtalo de nuevo.', generateError: 'No se pudo generar el enlace.',
    generating: 'Generando enlace…', connect: 'Conectar Telegram', joinPublicChannel: 'Unirse al canal público gratuito',
  },
  confidence: {
    high: 'Puntuación alta — amplio acuerdo entre indicadores', medium: 'Puntuación media — acuerdo parcial entre indicadores',
    low: 'Puntuación baja — acuerdo limitado entre indicadores',
    hint: 'Puntuación mecánica de acuerdo entre indicadores (0–100), no una probabilidad ni una ventaja medida. Combina reglas de RSI, MACD, EMA, Estocástico y Bandas de Bollinger.',
  },
  explanation: {
    title: '¿Por qué esta señal?', rsiOversold: 'RSI en {value} (condición de sobreventa)', rsiBelowNeutral: 'RSI en {value} (por debajo de neutral)',
    macdBullish: 'Cruce alcista del MACD', priceAboveEma: 'Precio por encima de EMA20 — tendencia alcista intacta',
    stochasticOversold: 'Estocástico en zona de sobreventa', rsiOverbought: 'RSI en {value} (condición de sobrecompra)',
    rsiAboveNeutral: 'RSI en {value} (por encima de neutral)', macdBearish: 'Cruce bajista del MACD',
    priceBelowEma: 'Precio por debajo de EMA20 — tendencia bajista intacta', stochasticOverbought: 'Estocástico en zona de sobrecompra',
    multiIndicatorAlignment: 'Puntuación {score}/100 — alineación de varios indicadores',
  },
  outcomes: {
    tp3Hit: 'TP3 alcanzado', tp2Hit: 'TP2 alcanzado', tp1Hit: 'TP1 alcanzado', stopped: 'Stop alcanzado', expired: 'Caducada', active: 'Activa',
    progressToTp1: 'Progreso hacia TP1: {progress}%',
  },
  share: {
    title: 'Compartir señal', postOnX: 'Publicar en X', copyLink: 'Copiar enlace', headline: '{direction} {symbol} — puntuación {score}/100',
    entry: 'Entrada: ${entry}', targets: 'TP1: ${tp1} | SL: ${sl}',
    disclaimer: 'Candidata de investigación generada por reglas; no es una orden de bróker ni una probabilidad de éxito.',
  },
  actions: { addWatchlist: 'Añadir a seguimiento', removeWatchlist: 'Quitar de seguimiento', showChart: 'Mostrar gráfico', hideChart: 'Ocultar gráfico' },
  signal: {
    atrBadge: 'SL {multiplier}× ATR', scoreHint: 'puntuación de reglas',
  },
  levels: {
    entry: 'Entrada', sl: 'SL', tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', entryHint: 'Precio cuando se generó la señal.',
    slHint: 'Stop Loss = Entrada ± (ATR × multiplicador). El ATR mide la volatilidad reciente; un ATR mayor produce un stop más amplio para evitar ruido.',
    tp1Hint: 'Take Profit 1 — objetivo más cercano, a unas 1,5× la distancia de riesgo.',
    tp2Hint: 'Take Profit 2 — objetivo intermedio, a unas 2,5× el riesgo. Un cierre parcial en TP1 es una posible forma de gestionar el riesgo.',
    tp3Hint: 'Take Profit 3 — objetivo extendido, a unas 3,5× el riesgo, pensado para movimientos más fuertes.',
  },
  indicators: {
    trend: 'Tendencia', stochastic: 'Estoc.', up: 'ALCISTA', down: 'BAJISTA', flat: 'LATERAL', emaStack: 'Conjunto EMA',
    supportResistance: 'Niveles S/R', atrStop: 'Stop ATR: {multiplier}× ({confidence})', bbWidth: 'Ancho BB: {width}%',
    realTracked: 'real-seguida', demoSeeded: 'demo-generada', chartHeading: '{symbol} · Entrada / SL / TP', fullScreen: 'Pantalla completa →',
  },
  history: {
    heading: 'Historial de señales', winRate: 'tasa de acierto', resolved: 'resueltas', streak: 'racha', priceMoveSum: 'suma de movimientos',
    winRateAria: 'Qué significa la tasa de acierto', resolvedAria: 'Qué significa resuelta', streakAria: 'Qué significa la racha',
    priceMoveSumAria: 'Qué significa la suma de movimientos',
    winRateHint: 'Señales contabilizadas cuyo resultado OHLCV de 24 h alcanzó TP, divididas por las señales con un resultado utilizable de 24 h. Se excluyen filas pendientes, simuladas, bloqueadas y marcadores no utilizables.',
    resolvedHint: 'Señales con un resultado OHLCV utilizable de 24 h: TP, SL o un cierre no nulo cuando no se alcanzó ninguno. Es un estudio del motor, no un registro de ejecución de suscriptores.',
    streakHint: 'Señales resueltas consecutivas: valor positivo para una racha ganadora y negativo para una racha perdedora.',
    priceMoveSumHint: 'Suma aritmética de los movimientos OHLCV de las señales contabilizadas, sin tamaño de posición ni costes de ejecución. No es una rentabilidad de cartera.',
    pair: 'Par', direction: 'Dir.', ruleScore: 'Puntuación', entry: 'Entrada',
    directionalMove: 'Movimiento direccional', viewRecord: 'Ver historial de señales →',
  },
  controls: { auto: 'Auto', paused: 'Pausado' },
  transparency: {
    providerBefore: 'Las cotizaciones en tiempo de ejecución prefieren',
    providerAfter: 'mediante el centro de datos de mercado. Las velas usan el centro cuando está configurado, después Binance para cripto o Stooq para forex/metales; las filas sintéticas se excluyen de esta lista.',
    provenance: 'Las insignias indican la ruta de proveedor esperada; la marca real o sintética es la procedencia que acompaña actualmente a cada señal.',
  },
  warning: { syntheticSymbols: '{count} de {total} símbolos usan datos sintéticos (API no disponible); las señales de esos pares están excluidas.' },
  hero: {
    eyebrow: 'Flujo de señales en vivo',
    title: 'Señales',
    description: 'Candidatas generadas por reglas y respaldadas por proveedores, con fuentes y límites de evidencia transparentes.',
    selected: 'SELECCIONADA',
    topSignal: 'SEÑAL PRINCIPAL',
    score: 'puntuación {score}/100',
  },
  stats: { activeSignals: 'Señales activas', buySell: 'Compra / Venta', averageRuleScore: 'Puntuación media', marketBias: 'Sesgo del mercado' },
  filters: { highRuleScore: 'Puntuación alta (≥80/100)', watchlist: 'Seguimiento' },
  empty: {
    noAssetSignals: 'No hay señales de {asset} ahora', noFilteredSignals: 'Ninguna señal coincide con los filtros actuales',
    otherCategoriesForex: 'Señales activas en otras categorías: {count}. Prueba otra clase de activo o vuelve cuando estén abiertas las sesiones de forex.',
    otherCategoriesMetals: 'Señales activas en otras categorías: {count}. Prueba otra clase de activo o vuelve cuando estén activos los mercados de metales.',
    otherCategoriesOther: 'Señales activas en otras categorías: {count}. Prueba otra clase de activo o vuelve cuando aparezcan más configuraciones.',
    adjustFilters: 'Señales activas: {count}. Ajusta los filtros de puntuación o seguimiento para verlas.', showAllAssets: 'Mostrar todos los activos',
    generating: 'Generando señales…', analyzing: 'El motor de análisis técnico estudia datos de mercado en vivo. La primera carga puede tardar hasta 30 segundos.',
    autoRetrying: 'Reintento automático cada 15 s. Las señales aparecen cuando el mercado está activo y las configuraciones superan el umbral de calidad.',
    retryNow: 'Reintentar ahora', takeTour: 'Iniciar recorrido', noHighScoreCandidates: 'Ahora no hay candidatas con una puntuación de 70/100 o superior',
    potentialBelow: 'Configuraciones potenciales debajo: {count} (50–69/100). Tienen acuerdo parcial entre indicadores y pueden fortalecerse.',
  },
  potential: {
    heading: 'Señales potenciales', scoreBand: 'puntuación 50–69/100', count: 'Configuraciones: {count}',
    description: 'Configuraciones iniciales que aún no alcanzan la confluencia completa. Espera confirmación antes de actuar.',
  },
  footer: { tagline: 'Analizador de señales TradeClaw · Código abierto · Autoalojado', disclaimer: 'El análisis de señales es solo educativo. No es asesoramiento financiero.' },
};

const zh: DashboardTranslations = {
  common: {
    all: '全部', buy: '买入', sell: '卖出', live: '实时', demo: '演示', copied: '已复制！', dismiss: '关闭', refresh: '刷新', pending: '待处理', details: '详情',
    copyValue: '复制 {value}', winRateShort: '胜率', defaultLabel: '默认', high: '高', medium: '中', low: '低',
    assets: { all: '全部', crypto: '加密货币', forex: '外汇', metals: '贵金属', stocks: '股票' },
    bias: { bull: '看涨', bear: '看跌', neutral: '中性' },
  },
  document: { title: 'TradeClaw — 实时信号', titleWithBuyCount: '（{count} 个买入）TradeClaw — 实时信号' },
  onboarding: {
    title: '用 3 个步骤检查研究结果：', reviewTitle: '查看候选信号', reviewBody: '查看带有指标共振评分的买入/卖出研究标签。',
    inspectTitle: '检查任意一行', inspectBody: '核对时间戳、数据质量标签、参考入场价、TP/SL 水平和指标明细。',
    selfHostTitle: '自行托管整套系统', selfHostBeforeCommand: '设置所需密钥并运行', selfHostAfterCommand: '然后自行审计信号引擎。',
  },
  telegram: { generateErrorRetry: '无法生成链接，请重试。', generateError: '无法生成链接。', generating: '正在生成链接…', connect: '连接 Telegram', joinPublicChannel: '加入免费公开频道' },
  confidence: {
    high: '高规则评分 — 多项指标广泛一致', medium: '中等规则评分 — 指标部分一致', low: '低规则评分 — 指标一致性有限',
    hint: '机械式指标一致性评分（0–100），不是概率，也不是已测得的优势。评分综合 RSI、MACD、EMA、随机指标和布林带规则。',
  },
  explanation: {
    title: '为什么出现此信号？', rsiOversold: 'RSI 为 {value}（超卖状态）', rsiBelowNeutral: 'RSI 为 {value}（低于中性）',
    macdBullish: 'MACD 金叉偏多', priceAboveEma: '价格高于 EMA20 — 上升趋势仍在', stochasticOversold: '随机指标处于超卖区',
    rsiOverbought: 'RSI 为 {value}（超买状态）', rsiAboveNeutral: 'RSI 为 {value}（高于中性）', macdBearish: 'MACD 死叉偏空',
    priceBelowEma: '价格低于 EMA20 — 下降趋势仍在', stochasticOverbought: '随机指标处于超买区',
    multiIndicatorAlignment: '规则评分 {score}/100 — 多指标一致',
  },
  outcomes: { tp3Hit: '已触及 TP3', tp2Hit: '已触及 TP2', tp1Hit: '已触及 TP1', stopped: '已止损', expired: '已过期', active: '进行中', progressToTp1: '到 TP1 的进度：{progress}%' },
  share: {
    title: '分享信号', postOnX: '发布到 X', copyLink: '复制链接', headline: '{direction} {symbol} — 规则评分 {score}/100',
    entry: '入场：${entry}', targets: 'TP1：${tp1} | SL：${sl}', disclaimer: '由规则生成的研究候选，不是券商订单，也不是成功概率。',
  },
  actions: { addWatchlist: '加入关注列表', removeWatchlist: '移出关注列表', showChart: '显示图表', hideChart: '隐藏图表' },
  signal: { atrBadge: 'SL {multiplier}× ATR', scoreHint: '规则评分' },
  levels: {
    entry: '入场', sl: 'SL', tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', entryHint: '生成信号时的价格。',
    slHint: '止损 = 入场价 ±（ATR × 倍数）。ATR 衡量近期波动；ATR 越大，止损越宽，以减少市场噪声干扰。',
    tp1Hint: '止盈 1 — 最近目标，约为风险距离的 1.5 倍。', tp2Hint: '止盈 2 — 中间目标，约为风险的 2.5 倍。在 TP1 部分平仓是一种可选的风险管理方式。',
    tp3Hint: '止盈 3 — 延伸目标，约为风险的 3.5 倍，适用于更强的价格走势。',
  },
  indicators: {
    trend: '趋势', stochastic: '随机指标', up: '向上', down: '向下', flat: '横盘', emaStack: 'EMA 排列', supportResistance: '支撑/阻力位',
    atrStop: 'ATR 止损：{multiplier}×（{confidence}）', bbWidth: 'BB 宽度：{width}%', realTracked: '真实跟踪', demoSeeded: '演示生成',
    chartHeading: '{symbol} · 入场 / SL / TP', fullScreen: '全屏 →',
  },
  history: {
    heading: '信号历史记录', winRate: '胜率', resolved: '已结算', streak: '连续结果', priceMoveSum: '价格变动合计',
    winRateAria: '胜率的含义', resolvedAria: '已结算的含义', streakAria: '连续结果的含义', priceMoveSumAria: '价格变动合计的含义',
    winRateHint: '24 小时提供商 OHLCV 结果触及 TP 的计入信号数，除以拥有可用 24 小时结果的计入信号数。待处理、模拟、被风控阻止及不可用占位行均被排除。',
    resolvedHint: '拥有可用 24 小时提供商 OHLCV 结果的信号：TP、SL，或两者均未触及时的非零 24 小时收盘结果。这是引擎信号研究，不是用户成交账本。',
    streakHint: '连续已结算信号；正数表示连续获胜，负数表示连续失败。',
    priceMoveSumHint: '计入信号的 OHLCV 已结算价格变动之算术和，不包含仓位规模或执行成本，不代表投资组合收益。',
    pair: '交易对', direction: '方向', ruleScore: '规则评分', entry: '入场', directionalMove: '方向性变动', viewRecord: '查看信号记录 →',
  },
  controls: { auto: '自动', paused: '已暂停' },
  transparency: {
    providerBefore: '运行时行情优先使用', providerAfter: '并经由市场数据中心。信号 K 线在已配置时使用数据中心，随后加密货币使用 Binance，外汇/贵金属使用 Stooq；合成回退行不会出现在此信号列表中。',
    provenance: '卡片徽章标明预期的数据提供路径；每个信号当前携带的真实/合成质量标记代表运行时数据来源。',
  },
  warning: { syntheticSymbols: '{total} 个品种中有 {count} 个正在使用合成数据（API 不可用）；这些交易对的信号已被隐藏。' },
  hero: {
    eyebrow: '实时信号流',
    title: '信号',
    description: '由规则生成、由数据提供商支持的候选信号，并清楚标示数据来源与证据边界。',
    selected: '已选择',
    topSignal: '首选信号',
    score: '规则评分 {score}/100',
  },
  stats: { activeSignals: '活跃信号', buySell: '买入 / 卖出', averageRuleScore: '平均规则评分', marketBias: '市场倾向' },
  filters: { highRuleScore: '高规则评分（≥80/100）', watchlist: '关注列表' },
  empty: {
    noAssetSignals: '目前没有{asset}信号', noFilteredSignals: '没有信号符合当前筛选条件',
    otherCategoriesForex: '其他类别中的活跃信号：{count}。请尝试其他资产类别，或在外汇交易时段开放后再查看。',
    otherCategoriesMetals: '其他类别中的活跃信号：{count}。请尝试其他资产类别，或在贵金属市场活跃后再查看。',
    otherCategoriesOther: '其他类别中的活跃信号：{count}。请尝试其他资产类别，或等待更多形态触发。',
    adjustFilters: '活跃信号：{count}。调整评分或关注列表筛选条件即可查看。', showAllAssets: '显示全部资产', generating: '正在生成信号…',
    analyzing: '技术分析引擎正在分析实时市场数据。首次加载最多需要 30 秒。', autoRetrying: '每 15 秒自动重试。市场活跃且形态达到质量阈值时会显示信号。',
    retryNow: '立即重试', takeTour: '开始导览', noHighScoreCandidates: '目前没有规则评分达到 70/100 或更高的候选信号',
    potentialBelow: '下方潜在形态：{count} 个（50–69/100）。这些形态只有部分指标一致，之后可能增强。',
  },
  potential: { heading: '潜在信号', scoreBand: '规则评分 50–69/100', count: '形态数量：{count}', description: '这些早期形态尚未达到完全共振。采取行动前请等待确认。' },
  footer: { tagline: 'TradeClaw 信号扫描器 · 开源 · 自托管', disclaimer: '信号分析仅供教育用途，不构成财务建议。' },
};

const ms: DashboardTranslations = {
  common: {
    all: 'Semua', buy: 'BELI', sell: 'JUAL', live: 'LANGSUNG', demo: 'DEMO', copied: 'Disalin!', dismiss: 'Tutup', refresh: 'Muat semula', pending: 'menunggu', details: 'butiran',
    copyValue: 'Salin {value}', winRateShort: 'KM', defaultLabel: 'lalai', high: 'tinggi', medium: 'sederhana', low: 'rendah',
    assets: { all: 'Semua', crypto: 'Kripto', forex: 'Forex', metals: 'Logam', stocks: 'Saham' },
    bias: { bull: 'Menaik', bear: 'Menurun', neutral: 'Neutral' },
  },
  document: { title: 'TradeClaw — Isyarat Langsung', titleWithBuyCount: '({count} BELI) TradeClaw — Isyarat Langsung' },
  onboarding: {
    title: '3 langkah untuk memeriksa output penyelidikan:', reviewTitle: 'Semak calon isyarat', reviewBody: 'Label penyelidikan BELI/JUAL dengan skor pertemuan penunjuk.',
    inspectTitle: 'Periksa mana-mana baris', inspectBody: 'semak cap masa, label kualiti data, rujukan kemasukan, aras TP/SL dan pecahan penunjuk.',
    selfHostTitle: 'Hos sendiri keseluruhan sistem', selfHostBeforeCommand: 'tetapkan rahsia yang diperlukan, jalankan', selfHostAfterCommand: 'dan audit enjin itu sendiri.',
  },
  telegram: { generateErrorRetry: 'Pautan tidak dapat dijana. Cuba lagi.', generateError: 'Pautan tidak dapat dijana.', generating: 'Menjana pautan…', connect: 'Sambung Telegram', joinPublicChannel: 'Sertai saluran awam percuma' },
  confidence: {
    high: 'Skor peraturan tinggi — persetujuan penunjuk yang luas', medium: 'Skor peraturan sederhana — persetujuan penunjuk separa',
    low: 'Skor peraturan rendah — persetujuan penunjuk terhad',
    hint: 'Skor mekanikal persetujuan penunjuk (0–100), bukan kebarangkalian atau kelebihan yang telah diukur. Ia menggabungkan peraturan RSI, MACD, EMA, Stokastik dan Bollinger Band.',
  },
  explanation: {
    title: 'Mengapa isyarat ini?', rsiOversold: 'RSI pada {value} (keadaan terlebih jual)', rsiBelowNeutral: 'RSI pada {value} (di bawah neutral)',
    macdBullish: 'Silangan MACD menaik', priceAboveEma: 'Harga di atas EMA20 — aliran menaik kekal', stochasticOversold: 'Stokastik dalam julat terlebih jual',
    rsiOverbought: 'RSI pada {value} (keadaan terlebih beli)', rsiAboveNeutral: 'RSI pada {value} (di atas neutral)', macdBearish: 'Silangan MACD menurun',
    priceBelowEma: 'Harga di bawah EMA20 — aliran menurun kekal', stochasticOverbought: 'Stokastik dalam julat terlebih beli',
    multiIndicatorAlignment: 'Skor peraturan {score}/100 — penjajaran berbilang penunjuk',
  },
  outcomes: { tp3Hit: 'TP3 dicapai', tp2Hit: 'TP2 dicapai', tp1Hit: 'TP1 dicapai', stopped: 'Dihentikan', expired: 'Tamat tempoh', active: 'Aktif', progressToTp1: 'Kemajuan ke TP1: {progress}%' },
  share: {
    title: 'Kongsi isyarat', postOnX: 'Siarkan di X', copyLink: 'Salin pautan', headline: '{direction} {symbol} — skor peraturan {score}/100',
    entry: 'Kemasukan: ${entry}', targets: 'TP1: ${tp1} | SL: ${sl}', disclaimer: 'Calon penyelidikan berasaskan peraturan; bukan pesanan broker atau kebarangkalian kejayaan.',
  },
  actions: { addWatchlist: 'Tambah ke senarai pantau', removeWatchlist: 'Buang daripada senarai pantau', showChart: 'Tunjukkan carta', hideChart: 'Sembunyikan carta' },
  signal: { atrBadge: 'SL {multiplier}× ATR', scoreHint: 'skor peraturan' },
  levels: {
    entry: 'Kemasukan', sl: 'SL', tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', entryHint: 'Harga ketika isyarat dijana.',
    slHint: 'Henti Rugi = Kemasukan ± (ATR × pengganda). ATR mengukur turun naik terkini; ATR yang lebih besar menghasilkan henti yang lebih luas untuk mengelakkan hingar.',
    tp1Hint: 'Ambil Untung 1 — sasaran terdekat pada kira-kira 1.5× jarak risiko.',
    tp2Hint: 'Ambil Untung 2 — sasaran pertengahan pada kira-kira 2.5× risiko. Penutupan separa di TP1 ialah satu pendekatan pengurusan risiko.',
    tp3Hint: 'Ambil Untung 3 — sasaran lanjutan pada kira-kira 3.5× risiko untuk pergerakan yang lebih kuat.',
  },
  indicators: {
    trend: 'Aliran', stochastic: 'Stok.', up: 'NAIK', down: 'TURUN', flat: 'MENDATAR', emaStack: 'Susunan EMA', supportResistance: 'Aras S/R',
    atrStop: 'Henti ATR: {multiplier}× ({confidence})', bbWidth: 'Lebar BB: {width}%', realTracked: 'jejak-sebenar', demoSeeded: 'benih-demo',
    chartHeading: '{symbol} · Kemasukan / SL / TP', fullScreen: 'Skrin penuh →',
  },
  history: {
    heading: 'Rekod Isyarat', winRate: 'kadar menang', resolved: 'diselesaikan', streak: 'rentetan', priceMoveSum: 'jumlah gerakan harga',
    winRateAria: 'Maksud kadar menang', resolvedAria: 'Maksud diselesaikan', streakAria: 'Maksud rentetan', priceMoveSumAria: 'Maksud jumlah gerakan harga',
    winRateHint: 'Isyarat dikira yang hasil OHLCV penyedia 24 jamnya mencapai TP, dibahagi isyarat dikira dengan hasil 24 jam yang boleh digunakan. Baris menunggu, simulasi, disekat dan pemegang tempat tidak boleh digunakan dikecualikan.',
    resolvedHint: 'Isyarat dengan hasil OHLCV penyedia 24 jam yang boleh digunakan: TP, SL atau penutupan 24 jam bukan sifar apabila kedua-duanya tidak dicapai. Ini kajian isyarat enjin, bukan lejar pelaksanaan pelanggan.',
    streakHint: 'Isyarat selesai berturutan; positif bagi rentetan menang dan negatif bagi rentetan kalah.',
    priceMoveSumHint: 'Jumlah aritmetik gerakan harga OHLCV bagi isyarat dikira, tanpa saiz kedudukan atau kos pelaksanaan. Ia bukan pulangan portfolio.',
    pair: 'Pasangan', direction: 'Arah', ruleScore: 'Skor peraturan', entry: 'Kemasukan', directionalMove: 'Gerakan arah', viewRecord: 'Lihat Rekod Isyarat →',
  },
  controls: { auto: 'Auto', paused: 'Dijeda' },
  transparency: {
    providerBefore: 'Sebut harga masa jalan mengutamakan', providerAfter: 'melalui hab data pasaran. Lilin isyarat menggunakan hab apabila dikonfigurasi, kemudian Binance untuk kripto atau Stooq untuk forex/logam; baris sandaran sintetik tidak dipaparkan dalam senarai ini.',
    provenance: 'Lencana kad mengenal pasti laluan penyedia yang dijangka; tanda kualiti sebenar atau sintetik ialah asal data masa jalan yang kini dibawa oleh setiap isyarat.',
  },
  warning: { syntheticSymbols: '{count} daripada {total} simbol menggunakan data sintetik (API tidak tersedia); isyarat bagi pasangan itu disekat.' },
  hero: {
    eyebrow: 'Suapan isyarat langsung',
    title: 'Isyarat',
    description: 'Calon bersandarkan penyedia yang dijana oleh peraturan, dengan sumber dan batas bukti yang telus.',
    selected: 'DIPILIH',
    topSignal: 'ISYARAT UTAMA',
    score: 'skor peraturan {score}/100',
  },
  stats: { activeSignals: 'Isyarat aktif', buySell: 'Beli / Jual', averageRuleScore: 'Purata skor peraturan', marketBias: 'Kecenderungan pasaran' },
  filters: { highRuleScore: 'Skor Peraturan Tinggi (≥80/100)', watchlist: 'Senarai pantau' },
  empty: {
    noAssetSignals: 'Tiada isyarat {asset} sekarang', noFilteredSignals: 'Tiada isyarat sepadan dengan penapis semasa',
    otherCategoriesForex: 'Isyarat aktif dalam kategori lain: {count}. Cuba kelas aset lain atau semak semula apabila sesi forex dibuka.',
    otherCategoriesMetals: 'Isyarat aktif dalam kategori lain: {count}. Cuba kelas aset lain atau semak semula apabila pasaran logam aktif.',
    otherCategoriesOther: 'Isyarat aktif dalam kategori lain: {count}. Cuba kelas aset lain atau semak semula apabila lebih banyak persediaan tercetus.',
    adjustFilters: 'Isyarat aktif: {count}. Laraskan penapis skor atau senarai pantau untuk melihatnya.', showAllAssets: 'Tunjukkan semua aset',
    generating: 'Menjana isyarat…', analyzing: 'Enjin TA sedang menganalisis data pasaran langsung. Muatan pertama boleh mengambil masa sehingga 30 saat.',
    autoRetrying: 'Cuba semula secara automatik setiap 15 saat. Isyarat muncul apabila pasaran aktif dan persediaan memenuhi ambang kualiti.',
    retryNow: 'Cuba lagi sekarang', takeTour: 'Mulakan panduan', noHighScoreCandidates: 'Tiada calon dengan skor peraturan 70/100 atau lebih tinggi sekarang',
    potentialBelow: 'Persediaan berpotensi di bawah: {count} (50–69/100). Penunjuknya bersetuju secara separa dan mungkin menjadi lebih kukuh.',
  },
  potential: { heading: 'Isyarat Berpotensi', scoreBand: 'skor peraturan 50–69/100', count: 'Persediaan: {count}', description: 'Persediaan peringkat awal yang belum mencapai pertemuan penuh. Tunggu pengesahan sebelum bertindak.' },
  footer: { tagline: 'Pengimbas Isyarat TradeClaw · Sumber Terbuka · Dihos Sendiri', disclaimer: 'Analisis isyarat adalah untuk tujuan pendidikan sahaja. Bukan nasihat kewangan.' },
};

const ar: DashboardTranslations = {
  common: {
    all: 'الكل', buy: 'شراء', sell: 'بيع', live: 'مباشر', demo: 'تجريبي', copied: 'تم النسخ!', dismiss: 'إغلاق', refresh: 'تحديث', pending: 'قيد الانتظار', details: 'التفاصيل',
    copyValue: 'نسخ {value}', winRateShort: 'م.ف', defaultLabel: 'افتراضي', high: 'عالية', medium: 'متوسطة', low: 'منخفضة',
    assets: { all: 'الكل', crypto: 'العملات الرقمية', forex: 'الفوركس', metals: 'المعادن', stocks: 'الأسهم' },
    bias: { bull: 'صاعد', bear: 'هابط', neutral: 'محايد' },
  },
  document: { title: 'TradeClaw — إشارات مباشرة', titleWithBuyCount: '({count} شراء) TradeClaw — إشارات مباشرة' },
  onboarding: {
    title: '3 خطوات لفحص مخرجات البحث:', reviewTitle: 'راجع الإشارات المرشحة', reviewBody: 'تسميات بحثية للشراء والبيع مع درجات توافق المؤشرات.',
    inspectTitle: 'افحص أي صف', inspectBody: 'تحقق من الطابع الزمني، وتصنيف جودة البيانات، وسعر الدخول المرجعي، ومستويات TP/SL، وتفاصيل المؤشرات.',
    selfHostTitle: 'استضف النظام بنفسك', selfHostBeforeCommand: 'اضبط الأسرار المطلوبة ثم شغّل', selfHostAfterCommand: 'وراجع محرك الإشارات بنفسك.',
  },
  telegram: { generateErrorRetry: 'تعذر إنشاء الرابط. حاول مرة أخرى.', generateError: 'تعذر إنشاء الرابط.', generating: 'جارٍ إنشاء الرابط…', connect: 'ربط Telegram', joinPublicChannel: 'الانضمام إلى القناة العامة المجانية' },
  confidence: {
    high: 'درجة قواعد مرتفعة — توافق واسع بين المؤشرات', medium: 'درجة قواعد متوسطة — توافق جزئي بين المؤشرات', low: 'درجة قواعد منخفضة — توافق محدود بين المؤشرات',
    hint: 'درجة ميكانيكية لتوافق المؤشرات من 0 إلى 100، وليست احتمالاً أو أفضلية مقاسة. تجمع قواعد RSI وMACD وEMA وStochastic وBollinger Bands.',
  },
  explanation: {
    title: 'لماذا ظهرت هذه الإشارة؟', rsiOversold: 'قيمة RSI هي {value} (حالة تشبع بيعي)', rsiBelowNeutral: 'قيمة RSI هي {value} (دون المستوى المحايد)',
    macdBullish: 'تقاطع MACD صاعد', priceAboveEma: 'السعر أعلى EMA20 — الاتجاه الصاعد مستمر', stochasticOversold: 'مؤشر Stochastic في نطاق التشبع البيعي',
    rsiOverbought: 'قيمة RSI هي {value} (حالة تشبع شرائي)', rsiAboveNeutral: 'قيمة RSI هي {value} (فوق المستوى المحايد)', macdBearish: 'تقاطع MACD هابط',
    priceBelowEma: 'السعر أدنى EMA20 — الاتجاه الهابط مستمر', stochasticOverbought: 'مؤشر Stochastic في نطاق التشبع الشرائي',
    multiIndicatorAlignment: 'درجة القواعد {score}/100 — توافق عدة مؤشرات',
  },
  outcomes: { tp3Hit: 'تم بلوغ TP3', tp2Hit: 'تم بلوغ TP2', tp1Hit: 'تم بلوغ TP1', stopped: 'تم إيقافها', expired: 'منتهية', active: 'نشطة', progressToTp1: 'التقدم نحو TP1: {progress}%' },
  share: {
    title: 'مشاركة الإشارة', postOnX: 'النشر على X', copyLink: 'نسخ الرابط', headline: '{direction} {symbol} — درجة القواعد {score}/100',
    entry: 'الدخول: ${entry}', targets: 'TP1: ${tp1} | SL: ${sl}', disclaimer: 'مرشح بحثي مولّد بالقواعد؛ ليس أمر وسيط ولا احتمال نجاح.',
  },
  actions: { addWatchlist: 'إضافة إلى قائمة المتابعة', removeWatchlist: 'إزالة من قائمة المتابعة', showChart: 'إظهار الرسم', hideChart: 'إخفاء الرسم' },
  signal: { atrBadge: 'SL {multiplier}× ATR', scoreHint: 'درجة القواعد' },
  levels: {
    entry: 'الدخول', sl: 'SL', tp1: 'TP1', tp2: 'TP2', tp3: 'TP3', entryHint: 'السعر عند إنشاء الإشارة.',
    slHint: 'وقف الخسارة = الدخول ± (ATR × المضاعف). يقيس ATR التقلب الأخير؛ وكلما اتسع ATR اتسع الوقف لتقليل ضوضاء السوق.',
    tp1Hint: 'جني الربح 1 — أقرب هدف عند نحو 1.5× مسافة المخاطرة.', tp2Hint: 'جني الربح 2 — هدف متوسط عند نحو 2.5× المخاطرة. الإغلاق الجزئي عند TP1 أحد أساليب إدارة المخاطر الممكنة.',
    tp3Hint: 'جني الربح 3 — هدف ممتد عند نحو 3.5× المخاطرة، مخصص للحركات الأقوى.',
  },
  indicators: {
    trend: 'الاتجاه', stochastic: 'Stoch', up: 'صاعد', down: 'هابط', flat: 'عرضي', emaStack: 'ترتيب EMA', supportResistance: 'مستويات الدعم/المقاومة',
    atrStop: 'وقف ATR: {multiplier}× ({confidence})', bbWidth: 'عرض BB: {width}%', realTracked: 'متابعة-حقيقية', demoSeeded: 'بيانات-تجريبية',
    chartHeading: '{symbol} · الدخول / SL / TP', fullScreen: 'ملء الشاشة ←',
  },
  history: {
    heading: 'سجل الإشارات', winRate: 'معدل الفوز', resolved: 'محسومة', streak: 'السلسلة', priceMoveSum: 'مجموع حركة السعر',
    winRateAria: 'ما معنى معدل الفوز', resolvedAria: 'ما معنى الإشارات المحسومة', streakAria: 'ما معنى السلسلة', priceMoveSumAria: 'ما معنى مجموع حركة السعر',
    winRateHint: 'عدد الإشارات المحتسبة التي بلغ ناتج OHLCV لمزوّدها خلال 24 ساعة مستوى TP، مقسوماً على الإشارات المحتسبة ذات ناتج 24 ساعة صالح. تُستبعد الصفوف المعلقة والمحاكاة والمحجوبة والعناصر النائبة غير الصالحة.',
    resolvedHint: 'إشارات ذات ناتج OHLCV صالح من المزوّد خلال 24 ساعة: TP أو SL أو إغلاق غير صفري بعد عدم بلوغ أي منهما. هذه دراسة لإشارات المحرك وليست سجل تنفيذ للمشتركين.',
    streakHint: 'إشارات محسومة متتالية؛ الرقم الموجب لسلسلة فوز والسالب لسلسلة خسارة.',
    priceMoveSumHint: 'المجموع الحسابي لحركات السعر المحسومة عبر OHLCV للإشارات المحتسبة، دون أحجام مراكز أو تكاليف تنفيذ. ليس عائداً لمحفظة.',
    pair: 'الزوج', direction: 'الاتجاه', ruleScore: 'درجة القواعد', entry: 'الدخول', directionalMove: 'الحركة الاتجاهية', viewRecord: 'عرض سجل الإشارات ←',
  },
  controls: { auto: 'تلقائي', paused: 'متوقف مؤقتاً' },
  transparency: {
    providerBefore: 'تفضّل أسعار وقت التشغيل', providerAfter: 'عبر مركز بيانات السوق. تستخدم شموع الإشارات المركز عند ضبطه، ثم Binance للعملات الرقمية أو Stooq للفوركس والمعادن؛ ولا تظهر صفوف البيانات الاصطناعية الاحتياطية في هذه القائمة.',
    provenance: 'تحدد شارات البطاقات مسار المزوّد المتوقع؛ وتصنيف الجودة الحقيقي أو الاصطناعي هو مصدر بيانات وقت التشغيل المحمول حالياً مع كل إشارة.',
  },
  warning: { syntheticSymbols: 'يستخدم {count} من أصل {total} رمزاً بيانات اصطناعية (واجهة API غير متاحة)؛ لذلك حُجبت إشارات تلك الأزواج.' },
  hero: {
    eyebrow: 'موجز الإشارات المباشر',
    title: 'الإشارات',
    description: 'إشارات مرشحة مولدة بقواعد ومدعومة ببيانات المزود، مع توضيح المصدر وحدود الأدلة.',
    selected: 'المحدد',
    topSignal: 'الإشارة الأبرز',
    score: 'درجة القواعد {score}/100',
  },
  stats: { activeSignals: 'الإشارات النشطة', buySell: 'شراء / بيع', averageRuleScore: 'متوسط درجة القواعد', marketBias: 'اتجاه السوق' },
  filters: { highRuleScore: 'درجة قواعد مرتفعة (≥80/100)', watchlist: 'قائمة المتابعة' },
  empty: {
    noAssetSignals: 'لا توجد إشارات {asset} الآن', noFilteredSignals: 'لا توجد إشارات تطابق عوامل التصفية الحالية',
    otherCategoriesForex: 'الإشارات النشطة في الفئات الأخرى: {count}. جرّب فئة أصول أخرى أو عد عند افتتاح جلسات الفوركس.',
    otherCategoriesMetals: 'الإشارات النشطة في الفئات الأخرى: {count}. جرّب فئة أصول أخرى أو عد عندما تنشط أسواق المعادن.',
    otherCategoriesOther: 'الإشارات النشطة في الفئات الأخرى: {count}. جرّب فئة أصول أخرى أو عد عند ظهور إعدادات إضافية.',
    adjustFilters: 'الإشارات النشطة: {count}. عدّل تصفية الدرجة أو قائمة المتابعة لعرضها.', showAllAssets: 'عرض كل الأصول', generating: 'جارٍ إنشاء الإشارات…',
    analyzing: 'يحلل محرك التحليل الفني بيانات السوق المباشرة. قد يستغرق التحميل الأول حتى 30 ثانية.', autoRetrying: 'تتم إعادة المحاولة تلقائياً كل 15 ثانية. تظهر الإشارات عندما يكون السوق نشطاً وتبلغ الإعدادات حد الجودة.',
    retryNow: 'إعادة المحاولة الآن', takeTour: 'بدء الجولة', noHighScoreCandidates: 'لا توجد الآن إشارات مرشحة بدرجة قواعد 70/100 أو أعلى',
    potentialBelow: 'الإعدادات المحتملة أدناه: {count} (50–69/100). توافق المؤشرات فيها جزئي وقد تزداد قوة.',
  },
  potential: { heading: 'إشارات محتملة', scoreBand: 'درجة القواعد 50–69/100', count: 'الإعدادات: {count}', description: 'إعدادات أولية لم تصل بعد إلى التوافق الكامل. انتظر التأكيد قبل اتخاذ أي إجراء.' },
  footer: { tagline: 'ماسح إشارات TradeClaw · مفتوح المصدر · مستضاف ذاتياً', disclaimer: 'تحليل الإشارات لأغراض تعليمية فقط، وليس نصيحة مالية.' },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, DashboardTranslations>;

export function getDashboardTranslations(locale: Locale): DashboardTranslations {
  return dictionaries[locale];
}
