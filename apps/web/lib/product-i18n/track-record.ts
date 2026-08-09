import type { Locale } from '../translations';

export interface TrackRecordTranslations {
  documentTitle: string;
  surfaces: {
    ariaLabel: string;
    recordLabel: string;
    recordDescription: string;
    studyLabel: string;
    studyDescription: string;
    studyBoundary: string;
  };
  periods: { all: string };
  categories: { all: string; majors: string; thematic: string };
  relativeTime: { minutesAgo: string; hoursAgo: string; daysAgo: string };
  window: { storedSince: string; currentArchive: string };
  status: {
    expired: string;
    unverified: string;
    close: string;
    pending: string;
    all: string;
    buy: string;
    sell: string;
  };
  header: {
    eyebrow: string;
    priceMoveSum: string;
    priceMoveHelp: string;
    winRate: string;
    winRateHelp: string;
    breakEven: string;
    breakEvenHelp: string;
    resolvedSignals: string;
    resolvedHelp: string;
    sequentialSimulation: string;
    simulationHelp: string;
    maxDrawdown: string;
    maxDrawdownHelp: string;
    latestOutcome: string;
    embed: string;
    shareX: string;
    shareLinkedIn: string;
    headlineDisclosure: string;
    riskLabel: string;
    riskBody: string;
  };
  rolling: {
    title: string;
    onlyDays: string;
    resolved: string;
    total: string;
    historyAvailable: string;
  };
  scope: {
    eligibleLabel: string;
    broadcastLabel: string;
    broadcastDetail: string;
    eligibleCaption: string;
    broadcastCaption: string;
    showEligible: string;
  };
  categoryCaption: {
    majors: string;
    thematic: string;
    broadcast: string;
    eligible: string;
  };
  stats: {
    resolved: string;
    resolvedHint: string;
    averagePnl: string;
    averagePnlHint: string;
    priceMoveSum: string;
    priceMoveSumHint: string;
    streak: string;
    streakHint: string;
    unusableOutcome: string;
    unusableOutcomeHint: string;
    gateBlocked: string;
    gateBlockedHint: string;
    pending: string;
    pendingHint: string;
  };
  hints: {
    priceMoveSum: string;
    sequentialSimulation: string;
    averagePnl: string;
    winRate24h: string;
    winRate4h: string;
    resolved: string;
    unusableOutcome: string;
    gateBlocked: string;
    pending: string;
    maxDrawdown: string;
    streak: string;
    breakEven: string;
  };
  alerts: {
    title: string;
    detail: string;
    openTelegram: string;
    signalDashboard: string;
  };
  research: {
    title: string;
    detail: string;
    viewLeaderboard: string;
    browseStrategies: string;
  };
  sections: {
    perSymbol: string;
    recordedRows: string;
    population: string;
  };
  columns: {
    pair: string;
    recordedRows: string;
    hit4h: string;
    hit24h: string;
    averagePnl: string;
    priceMoveSum: string;
    trend: string;
    barOpen: string;
    direction: string;
    entry: string;
    pnl: string;
  };
  filters: {
    pair: string;
    all: string;
    clear: string;
  };
  table: {
    range: string;
    noPeriodData: string;
    noMatchingSignals: string;
    noPeriodSignals: string;
    barOpenHelp: string;
    firstPage: string;
    previousPage: string;
    nextPage: string;
    lastPage: string;
  };
  populationBody: string;
  aria: {
    filterPair: string;
    viewSignal: string;
    whatMeans: string;
  };
}

const en: TrackRecordTranslations = {
  documentTitle: 'Observed Signal Track Record — TradeClaw',
  surfaces: {
    ariaLabel: 'Choose an evidence surface',
    recordLabel: 'Observed track record',
    recordDescription: 'Source-backed OHLCV outcomes',
    studyLabel: 'Modeled signal study',
    studyDescription: 'Sizing, costs, and sequential equity',
    studyBoundary: 'Modeled output — not the observed track record or broker performance',
  },
  periods: { all: 'All' },
  categories: { all: 'All', majors: 'Majors', thematic: 'Thematic' },
  relativeTime: { minutesAgo: '{count}m ago', hoursAgo: '{count}h ago', daysAgo: '{count}d ago' },
  window: { storedSince: 'currently stored since {date}', currentArchive: 'current archive' },
  status: { expired: 'expired', unverified: 'unverified', close: 'Close', pending: 'pending', all: 'All', buy: 'BUY', sell: 'SELL' },
  header: {
    eyebrow: 'OHLCV-Resolved Signal Record', priceMoveSum: 'sum of price moves · unsized',
    priceMoveHelp: 'What the unsized price-move sum means', winRate: 'win rate', winRateHelp: 'What win rate means',
    breakEven: 'break-even {value}%', breakEvenHelp: 'What break-even win rate means', resolvedSignals: 'resolved signals',
    resolvedHelp: 'What resolved signals means', sequentialSimulation: 'sequential simulation · 1% risk',
    simulationHelp: 'What the sequential simulation means', maxDrawdown: 'max drawdown −{value}%',
    maxDrawdownHelp: 'What max drawdown means', latestOutcome: 'Latest counted outcome', embed: 'Embed this',
    shareX: 'Share on X', shareLinkedIn: 'Share on LinkedIn',
    headlineDisclosure: 'This page is the observed signal-outcome record. It reports source-backed OHLCV outcomes, counts, win rate, and unsized price moves; none are broker fills or portfolio returns. Position sizing, modeled costs, drawdown, and sequential equity are kept on the separate Modeled Signal Study page. Pending, zero-value expiry placeholders, and gate-blocked rows are surfaced separately instead of being folded into win-rate statistics.',
    riskLabel: 'Risk notice:',
    riskBody: 'TradeClaw provides educational signal analytics and historical research. Signals are not financial advice, investment recommendations, or guaranteed outcomes. Trading involves substantial risk, including loss of capital. Past performance does not predict future results. Always test with paper trading and independent risk controls before using real funds.',
  },
  rolling: { title: 'Rolling win rate · {window}', onlyDays: '(only {count}d of data)', resolved: '{count} resolved', total: '{count} total', historyAvailable: 'Only {count} days of history available' },
  scope: {
    eligibleLabel: 'Eligible signal stream', broadcastLabel: 'Broadcast-approved subset',
    broadcastDetail: 'Only signals the live gate (regime + curation + risk pipeline) approved for the Telegram broadcast. Gate decisions are recorded per row since 2026-06-10 — earlier signals carry no decision and are excluded from this view entirely.',
    eligibleCaption: 'Eligible recorded signal stream across tracked symbols and timeframes. This is not a subscriber execution or portfolio ledger.',
    broadcastCaption: 'Broadcast view — only signals the live risk gate approved for the Telegram broadcast. Decisions are recorded per row since 2026-06-10; older signals are excluded.',
    showEligible: 'Show eligible stream',
  },
  categoryCaption: {
    majors: '{count} highest-liquidity instruments. The cleanest read on strategy quality.',
    thematic: '{count} narrative-driven symbols. Wider coverage, more noise — useful for breadth, not for headline win rate.',
    broadcast: 'Gate-approved signals only — decisions recorded since 2026-06-10.',
    eligible: 'Eligible rows for every tracked symbol in the current archive.',
  },
  stats: {
    resolved: 'Resolved', resolvedHint: 'Usable 24h OHLCV outcome', averagePnl: 'Avg P&L', averagePnlHint: 'Per resolved signal',
    priceMoveSum: 'Sum of price moves', priceMoveSumHint: 'Raw sum of per-signal market %', streak: 'Streak',
    streakHint: 'Consecutive resolved', unusableOutcome: 'No usable 24h outcome',
    unusableOutcomeHint: 'Missing/zero force-expiry placeholder', gateBlocked: 'Gate-blocked',
    gateBlockedHint: 'Risk filter declined entry', pending: 'Pending', pendingHint: 'Still inside 24h window',
  },
  hints: {
    priceMoveSum: 'Arithmetic sum of each counted signal\'s OHLCV-resolved price move. It uses the displayed entry and resolved exit with no position sizing or execution costs, so it is not a portfolio return.',
    sequentialSimulation: 'Hypothetical sequential equity simulation starting at $10,000. It risks 1% of modeled current equity per eligible signal and deducts stated fee/slippage assumptions. It does not use broker fills or model overlapping exposure, margin, leverage, latency, funding, or subscriber selection, so it is not an actual portfolio return.',
    averagePnl: 'Arithmetic sum of OHLCV-resolved per-signal price moves divided by counted resolved signals. No position sizing or execution costs are applied.',
    winRate24h: 'Counted signals whose usable 24h OHLCV outcome hit TP, divided by all counted signals with a usable 24h outcome. Pending, simulated, gate-blocked, and zero or missing force-expiry placeholders are excluded.',
    winRate4h: 'Resolved signals whose 4h OHLCV outcome hit TP, divided by total resolved signals. This shorter horizon is an early read on signal quality.',
    resolved: 'Signals with a usable provider-OHLCV 24h outcome: TP, SL, or a nonzero 24h close. Still-open, simulated, gate-blocked, and zero or missing force-expiry placeholders are excluded. This is an observed signal-outcome record, not a subscriber execution ledger.',
    unusableOutcome: 'The resolver could not produce a usable 24h market outcome and wrote a zero force-expiry placeholder, or the row remains missing after the horizon. It is excluded from win rate.',
    gateBlocked: 'The engine emitted the signal, but the full-risk gate refused entry. It is excluded from counted outcomes on this page.',
    pending: 'The signal is still inside the 24h tracking window, so its outcome is not yet known.',
    maxDrawdown: 'Worst peak-to-trough drop in the hypothetical sequential equity simulation for this window. It is model drawdown, not drawdown observed in a broker or subscriber account.',
    streak: 'Consecutive resolved signals, signed positive for a win streak and negative for a losing streak.',
    breakEven: 'The win rate this study needs to break even given its observed average win/loss R and stated cost assumptions. It is a modeled research threshold, not a guaranteed live result.',
  },
  alerts: { title: 'Research Alerts', detail: 'Entry-like alerts remain paused whenever the published cost-adjusted evidence gate is not ready.', openTelegram: 'Open Telegram', signalDashboard: 'Signal Dashboard' },
  research: { title: 'Inspect Strategy Research', detail: 'Review the available modeled backtests and trade logs. Fixture metrics are research diagnostics, not live or broker performance.', viewLeaderboard: 'View Leaderboard', browseStrategies: 'Browse Strategies' },
  sections: { perSymbol: 'Per-Symbol Outcomes', recordedRows: 'Recorded Signal Rows', population: 'Population and Limitations' },
  columns: { pair: 'Pair', recordedRows: 'Recorded rows', hit4h: '4h Hit', hit24h: '24h Hit', averagePnl: 'Avg P&L', priceMoveSum: 'Price-move sum', trend: 'Trend', barOpen: 'Bar Open', direction: 'Dir', entry: 'Entry', pnl: 'P&L' },
  filters: { pair: 'Pair', all: 'All', clear: 'Clear' },
  table: {
    range: '{from}–{to} of {total}', noPeriodData: 'No data for this period yet.',
    noMatchingSignals: 'No signals match these filters.', noPeriodSignals: 'No signals for this period yet.',
    barOpenHelp: 'Candle bar open time (your local timezone). The signal anchors to this bar; the engine records it shortly after the bar closes (within the next 5-minute cron tick), so wall-clock recording can be up to one timeframe later than the value shown.',
    firstPage: 'First page', previousPage: 'Previous page', nextPage: 'Next page', lastPage: 'Last page',
  },
  populationBody: 'Stored signals carry their generation timestamp. New counted outcomes require an approved observed-OHLCV source and are not broker fills. Legacy outcome values without approved source provenance remain visible as unverified audit rows and do not count. Counted outcomes include source-backed TP, SL, and nonzero 24-hour closes; they exclude simulated, gate-blocked, pending, and zero/missing force-expiry placeholders. The unsized price-move sum uses counted rows. The separate modeled study further requires a recorded stop-loss. The broadcast view includes only gate approvals recorded since 2026-06-10. These populations are signal observations, not customer trades or actual portfolio returns.',
  aria: { filterPair: 'Filter by pair', viewSignal: 'View signal {pair} {direction} {time}', whatMeans: 'What {label} means' },
};

const es: TrackRecordTranslations = {
  documentTitle: 'Registro observado de señales — TradeClaw',
  surfaces: {
    ariaLabel: 'Elegir una superficie de evidencia',
    recordLabel: 'Registro observado',
    recordDescription: 'Resultados OHLCV respaldados por fuente',
    studyLabel: 'Estudio modelado de señales',
    studyDescription: 'Tamaño, costes y capital secuencial',
    studyBoundary: 'Resultado modelado: no es el registro observado ni rendimiento del bróker',
  },
  periods: { all: 'Todo' }, categories: { all: 'Todo', majors: 'Principales', thematic: 'Temáticos' },
  relativeTime: { minutesAgo: 'hace {count} min', hoursAgo: 'hace {count} h', daysAgo: 'hace {count} d' },
  window: { storedSince: 'almacenado desde {date}', currentArchive: 'archivo actual' },
  status: { expired: 'vencido', unverified: 'sin verificar', close: 'Cierre', pending: 'pendiente', all: 'Todo', buy: 'COMPRA', sell: 'VENTA' },
  header: {
    eyebrow: 'Registro de señales resuelto con OHLCV', priceMoveSum: 'suma de movimientos de precio · sin dimensionar',
    priceMoveHelp: 'Qué significa la suma de movimientos sin dimensionar', winRate: 'tasa de acierto', winRateHelp: 'Qué significa la tasa de acierto',
    breakEven: 'equilibrio {value}%', breakEvenHelp: 'Qué significa la tasa de equilibrio', resolvedSignals: 'señales resueltas',
    resolvedHelp: 'Qué significa señales resueltas', sequentialSimulation: 'simulación secuencial · riesgo del 1%',
    simulationHelp: 'Qué significa la simulación secuencial', maxDrawdown: 'caída máxima −{value}%',
    maxDrawdownHelp: 'Qué significa la caída máxima', latestOutcome: 'Último resultado contado', embed: 'Insertar',
    shareX: 'Compartir en X', shareLinkedIn: 'Compartir en LinkedIn',
    headlineDisclosure: 'Esta página es el registro observado de resultados de señales. Informa resultados OHLCV respaldados por fuente, recuentos, tasa de acierto y movimientos de precio sin dimensionar; ninguno representa ejecuciones del bróker ni retornos de cartera. El tamaño de posición, los costes modelados, la caída y el capital secuencial están en la página separada de Estudio Modelado. Las filas pendientes, los marcadores de vencimiento con valor cero y las bloqueadas por el filtro se muestran por separado y no se incluyen en la tasa de acierto.',
    riskLabel: 'Aviso de riesgo:', riskBody: 'TradeClaw ofrece análisis educativos de señales e investigación histórica. Las señales no son asesoramiento financiero, recomendaciones de inversión ni resultados garantizados. Operar implica un riesgo considerable, incluida la pérdida de capital. El rendimiento pasado no predice resultados futuros. Prueba siempre con trading simulado y controles de riesgo independientes antes de usar fondos reales.',
  },
  rolling: { title: 'Tasa de acierto móvil · {window}', onlyDays: '(solo {count} d de datos)', resolved: '{count} resueltas', total: '{count} totales', historyAvailable: 'Solo hay {count} días de historial' },
  scope: {
    eligibleLabel: 'Flujo de señales elegibles', broadcastLabel: 'Subconjunto aprobado para difusión',
    broadcastDetail: 'Solo señales aprobadas por el filtro en vivo (régimen + selección + riesgo) para la difusión de Telegram. Las decisiones se registran por fila desde 2026-06-10; las señales anteriores no tienen decisión y se excluyen por completo de esta vista.',
    eligibleCaption: 'Flujo registrado de señales elegibles en los símbolos y marcos temporales seguidos. No es un registro de ejecución ni de cartera de suscriptores.',
    broadcastCaption: 'Vista de difusión: solo señales aprobadas por el filtro de riesgo en vivo para Telegram. Las decisiones se registran por fila desde 2026-06-10; las señales anteriores quedan excluidas.',
    showEligible: 'Mostrar flujo elegible',
  },
  categoryCaption: {
    majors: '{count} instrumentos de mayor liquidez. La lectura más limpia de la calidad de la estrategia.',
    thematic: '{count} símbolos guiados por narrativas. Más cobertura y más ruido; útil para amplitud, no para la tasa principal.',
    broadcast: 'Solo señales aprobadas por el filtro; decisiones registradas desde 2026-06-10.',
    eligible: 'Filas elegibles para cada símbolo seguido en el archivo actual.',
  },
  stats: {
    resolved: 'Resueltas', resolvedHint: 'Resultado OHLCV utilizable a 24 h', averagePnl: 'P&L medio', averagePnlHint: 'Por señal resuelta',
    priceMoveSum: 'Suma de movimientos', priceMoveSumHint: 'Suma bruta del % de mercado por señal', streak: 'Racha',
    streakHint: 'Resoluciones consecutivas', unusableOutcome: 'Sin resultado utilizable a 24 h',
    unusableOutcomeHint: 'Marcador de vencimiento forzado ausente o cero', gateBlocked: 'Bloqueadas por el filtro',
    gateBlockedHint: 'El filtro de riesgo rechazó la entrada', pending: 'Pendientes', pendingHint: 'Aún dentro de la ventana de 24 h',
  },
  hints: {
    priceMoveSum: 'Suma aritmética del movimiento de precio resuelto con OHLCV de cada señal contada. Usa la entrada y la salida mostradas sin dimensionamiento ni costes de ejecución, por lo que no es un retorno de cartera.',
    sequentialSimulation: 'Simulación secuencial hipotética desde $10.000. Arriesga el 1% del capital modelado actual por señal elegible y descuenta los supuestos indicados de comisiones y deslizamiento. No usa ejecuciones del bróker ni modela exposición solapada, margen, apalancamiento, latencia, financiación o selección del suscriptor; no es un retorno real de cartera.',
    averagePnl: 'Suma aritmética de los movimientos de precio por señal resueltos con OHLCV, dividida por las señales resueltas contadas. No se aplican tamaño de posición ni costes de ejecución.',
    winRate24h: 'Señales contadas cuyo resultado OHLCV utilizable a 24 h alcanzó TP, divididas por todas las señales con resultado utilizable. Se excluyen pendientes, simuladas, bloqueadas y marcadores de vencimiento forzado ausentes o cero.',
    winRate4h: 'Señales resueltas cuyo resultado OHLCV a 4 h alcanzó TP, divididas por todas las señales resueltas. Este horizonte corto ofrece una lectura temprana de calidad.',
    resolved: 'Señales con resultado utilizable a 24 h procedente de OHLCV: TP, SL o cierre no nulo. Se excluyen las abiertas, simuladas, bloqueadas y los marcadores de vencimiento ausentes o cero. Es un registro observado de resultados, no un registro de ejecuciones.',
    unusableOutcome: 'El resolutor no pudo obtener un resultado de mercado utilizable a 24 h y escribió un marcador de vencimiento cero, o la fila sigue sin resultado tras el horizonte. Se excluye de la tasa de acierto.',
    gateBlocked: 'El motor emitió la señal, pero el filtro integral de riesgo rechazó la entrada. Se excluye de los resultados contados en esta página.',
    pending: 'La señal sigue dentro de la ventana de seguimiento de 24 h; el resultado aún no se conoce.',
    maxDrawdown: 'Peor caída de máximo a mínimo en la simulación secuencial hipotética de esta ventana. Es una caída del modelo, no la observada en una cuenta real.',
    streak: 'Secuencia de señales resueltas: positiva para una racha ganadora y negativa para una perdedora.',
    breakEven: 'Tasa de acierto que el estudio necesita para alcanzar el equilibrio según su R media de ganancias y pérdidas y sus costes declarados. Es un umbral modelado, no un resultado real garantizado.',
  },
  alerts: { title: 'Alertas de investigación', detail: 'Las alertas de entrada permanecen pausadas cuando el filtro de evidencia ajustada por costes publicado no está listo.', openTelegram: 'Abrir Telegram', signalDashboard: 'Panel de señales' },
  research: { title: 'Examinar investigación de estrategias', detail: 'Revisa los backtests modelados y los registros de operaciones disponibles. Las métricas de prueba son diagnósticos de investigación, no rendimiento real ni del bróker.', viewLeaderboard: 'Ver clasificación', browseStrategies: 'Explorar estrategias' },
  sections: { perSymbol: 'Resultados por símbolo', recordedRows: 'Filas de señales registradas', population: 'Población y limitaciones' },
  columns: { pair: 'Par', recordedRows: 'Filas registradas', hit4h: 'Acierto 4 h', hit24h: 'Acierto 24 h', averagePnl: 'P&L medio', priceMoveSum: 'Suma de movimientos', trend: 'Tendencia', barOpen: 'Apertura de vela', direction: 'Dir.', entry: 'Entrada', pnl: 'P&L' },
  filters: { pair: 'Par', all: 'Todo', clear: 'Limpiar' },
  table: {
    range: '{from}–{to} de {total}', noPeriodData: 'Aún no hay datos para este periodo.', noMatchingSignals: 'Ninguna señal coincide con estos filtros.',
    noPeriodSignals: 'Aún no hay señales para este periodo.',
    barOpenHelp: 'Hora de apertura de la vela en tu zona horaria. La señal se ancla a esta vela y el motor la registra poco después del cierre, dentro del siguiente ciclo cron de 5 minutos; por eso el registro puede ser hasta un marco temporal posterior al valor mostrado.',
    firstPage: 'Primera página', previousPage: 'Página anterior', nextPage: 'Página siguiente', lastPage: 'Última página',
  },
  populationBody: 'Las señales almacenadas conservan su hora de generación. Los nuevos resultados contados requieren una fuente OHLCV observada y aprobada; no son ejecuciones del bróker. Los valores históricos sin procedencia aprobada siguen visibles como filas de auditoría sin verificar y no cuentan. Los resultados contados incluyen TP, SL y cierres no nulos a 24 horas respaldados por fuente; excluyen datos simulados, filas bloqueadas, pendientes y marcadores de vencimiento forzado ausentes o cero. La suma sin dimensionar usa las filas contadas. El estudio modelado separado exige además un stop-loss registrado. La vista de difusión incluye solo aprobaciones registradas desde 2026-06-10. Son observaciones de señales, no operaciones de clientes ni retornos reales de cartera.',
  aria: { filterPair: 'Filtrar por par', viewSignal: 'Ver señal {pair} {direction} {time}', whatMeans: 'Qué significa {label}' },
};

const zh: TrackRecordTranslations = {
  documentTitle: '实测信号记录 — TradeClaw',
  surfaces: {
    ariaLabel: '选择证据页面',
    recordLabel: '实测跟踪记录',
    recordDescription: '有来源支持的 OHLCV 结果',
    studyLabel: '模型化信号研究',
    studyDescription: '仓位、成本与顺序权益',
    studyBoundary: '模型输出——不是实测记录或券商表现',
  },
  periods: { all: '全部' }, categories: { all: '全部', majors: '主流', thematic: '主题' },
  relativeTime: { minutesAgo: '{count} 分钟前', hoursAgo: '{count} 小时前', daysAgo: '{count} 天前' },
  window: { storedSince: '当前存档始于 {date}', currentArchive: '当前存档' },
  status: { expired: '已过期', unverified: '未验证', close: '收盘', pending: '待定', all: '全部', buy: '买入', sell: '卖出' },
  header: {
    eyebrow: 'OHLCV 已解析信号记录', priceMoveSum: '价格变动总和 · 未定仓位', priceMoveHelp: '未定仓位价格变动总和的含义',
    winRate: '胜率', winRateHelp: '胜率的含义', breakEven: '盈亏平衡 {value}%', breakEvenHelp: '盈亏平衡胜率的含义',
    resolvedSignals: '已解析信号', resolvedHelp: '已解析信号的含义', sequentialSimulation: '顺序模拟 · 1% 风险',
    simulationHelp: '顺序模拟的含义', maxDrawdown: '最大回撤 −{value}%', maxDrawdownHelp: '最大回撤的含义',
    latestOutcome: '最新计入结果', embed: '嵌入此内容', shareX: '分享到 X', shareLinkedIn: '分享到 LinkedIn',
    headlineDisclosure: '本页是实测信号结果记录，报告有来源支持的 OHLCV 结果、数量、胜率和未定仓位价格变动；这些都不是券商成交或投资组合回报。仓位规模、模型成本、回撤和顺序权益放在独立的模型化信号研究页面。待定行、零值强制到期占位行和被风险门槛拦截的行会单独显示，不计入胜率统计。',
    riskLabel: '风险提示：', riskBody: 'TradeClaw 提供教育用途的信号分析和历史研究。信号不构成财务建议、投资推荐或结果保证。交易存在重大风险，包括本金损失。过去表现不能预测未来结果。使用真实资金前，请务必先进行模拟交易并采用独立风险控制。',
  },
  rolling: { title: '滚动胜率 · {window}', onlyDays: '（仅 {count} 天数据）', resolved: '已解析 {count}', total: '共 {count}', historyAvailable: '仅有 {count} 天历史数据' },
  scope: {
    eligibleLabel: '符合条件的信号流', broadcastLabel: '获准推送的子集',
    broadcastDetail: '这里只显示通过实时门槛（市场状态、筛选和风险流程）并获准用于 Telegram 推送的信号。自 2026-06-10 起，每行都会记录门槛决定；更早的信号没有决定，因此完全排除在此视图之外。',
    eligibleCaption: '涵盖所跟踪品种和周期的符合条件信号记录。这不是订阅者的执行记录或投资组合账本。',
    broadcastCaption: '推送视图：仅包含实时风险门槛批准用于 Telegram 推送的信号。自 2026-06-10 起逐行记录决定；更早的信号被排除。',
    showEligible: '显示符合条件的信号流',
  },
  categoryCaption: {
    majors: '{count} 个流动性最高的品种，可更清晰地观察策略质量。',
    thematic: '{count} 个叙事驱动品种，覆盖更广但噪声更多；适合观察广度，不适合作为标题胜率。',
    broadcast: '仅含门槛批准的信号；决定记录始于 2026-06-10。', eligible: '当前存档中每个跟踪品种的符合条件记录。',
  },
  stats: {
    resolved: '已解析', resolvedHint: '可用的 24 小时 OHLCV 结果', averagePnl: '平均盈亏', averagePnlHint: '每条已解析信号',
    priceMoveSum: '价格变动总和', priceMoveSumHint: '每条信号市场百分比的原始总和', streak: '连续记录', streakHint: '连续已解析结果',
    unusableOutcome: '无可用 24 小时结果', unusableOutcomeHint: '缺失或零值强制到期占位', gateBlocked: '被门槛拦截',
    gateBlockedHint: '风险过滤器拒绝入场', pending: '待定', pendingHint: '仍处于 24 小时窗口内',
  },
  hints: {
    priceMoveSum: '计入信号的 OHLCV 解析价格变动算术和。它使用显示的入场价和解析退出价，不包含仓位大小或执行成本，因此不是投资组合回报。',
    sequentialSimulation: '从 10,000 美元开始的假设顺序权益模拟。每条合格信号按当前模拟权益的 1% 风险计算，并扣除已说明的费用和滑点假设。它不使用券商成交，也不模拟重叠敞口、保证金、杠杆、延迟、资金费或订阅者选择，因此不是实际回报。',
    averagePnl: 'OHLCV 解析的每条信号价格变动总和，除以计入的已解析信号数。不包含仓位大小或执行成本。',
    winRate24h: '24 小时 OHLCV 可用结果命中 TP 的计入信号，除以所有有可用结果的计入信号。排除待定、模拟、被门槛拦截以及零值或缺失的强制到期占位行。',
    winRate4h: '4 小时 OHLCV 结果命中 TP 的已解析信号，除以全部已解析信号。较短周期用于早期观察信号质量。',
    resolved: '具有供应商 OHLCV 24 小时可用结果的信号：TP、SL 或非零收盘。排除未平仓、模拟、门槛拦截和零值或缺失的强制到期占位行。这是实测信号结果记录，不是订阅者成交账本。',
    unusableOutcome: '解析器无法生成可用的 24 小时市场结果，并写入零值强制到期占位，或该行在周期后仍缺失。它不计入胜率。',
    gateBlocked: '引擎已发出信号，但完整风险门槛拒绝入场。它不计入本页的结果统计。',
    pending: '信号仍处于 24 小时跟踪窗口内，结果尚未确定。',
    maxDrawdown: '该窗口的假设顺序权益模拟中，从峰值到谷值的最大下降。这是模型回撤，不是券商或订阅者账户的实际回撤。',
    streak: '连续已解析信号；连胜为正，连败为负。',
    breakEven: '基于观察到的平均盈亏 R 和已说明成本，本研究达到盈亏平衡所需的胜率。这是模型化研究阈值，不是保证的实盘结果。',
  },
  alerts: { title: '研究提醒', detail: '当已发布的成本调整证据门槛尚未就绪时，类似入场的提醒会保持暂停。', openTelegram: '打开 Telegram', signalDashboard: '信号面板' },
  research: { title: '查看策略研究', detail: '查看可用的建模回测和交易日志。样例指标只用于研究诊断，并非实时或券商表现。', viewLeaderboard: '查看排行榜', browseStrategies: '浏览策略' },
  sections: { perSymbol: '按品种统计结果', recordedRows: '已记录信号行', population: '样本范围与局限' },
  columns: { pair: '交易对', recordedRows: '记录行数', hit4h: '4小时命中', hit24h: '24小时命中', averagePnl: '平均盈亏', priceMoveSum: '价格变动总和', trend: '趋势', barOpen: 'K线开盘', direction: '方向', entry: '入场', pnl: '盈亏' },
  filters: { pair: '交易对', all: '全部', clear: '清除' },
  table: {
    range: '{from}–{to}，共 {total}', noPeriodData: '该时段暂无数据。', noMatchingSignals: '没有信号符合这些筛选条件。', noPeriodSignals: '该时段暂无信号。',
    barOpenHelp: 'K 线开盘时间（按你的本地时区）。信号锚定此 K 线；引擎会在收盘后不久、下一次 5 分钟定时任务中记录，因此实际记录时间最多可能比显示值晚一个周期。',
    firstPage: '第一页', previousPage: '上一页', nextPage: '下一页', lastPage: '最后一页',
  },
  populationBody: '已存储信号保留其生成时间。新的计入结果必须来自获准的实测 OHLCV 来源，并非券商成交。缺少获准来源证明的旧结果仍以未验证审计行显示，但不计入统计。计入结果包括有来源支持的止盈、止损和非零 24 小时收盘；排除模拟数据、门槛拦截、待定以及零值或缺失的强制到期占位。未定仓位价格变动总和使用计入行。独立的模型化研究还要求记录止损。推送视图仅包含自 2026-06-10 起记录的门槛批准。这些是信号观测，不是客户交易或实际投资组合回报。',
  aria: { filterPair: '按交易对筛选', viewSignal: '查看信号 {pair} {direction} {time}', whatMeans: '{label} 的含义' },
};

const ms: TrackRecordTranslations = {
  documentTitle: 'Rekod Isyarat Diperhati — TradeClaw',
  surfaces: {
    ariaLabel: 'Pilih permukaan bukti',
    recordLabel: 'Rekod diperhati',
    recordDescription: 'Hasil OHLCV yang disokong sumber',
    studyLabel: 'Kajian isyarat bermodel',
    studyDescription: 'Saiz, kos dan ekuiti berurutan',
    studyBoundary: 'Output bermodel — bukan rekod diperhati atau prestasi broker',
  },
  periods: { all: 'Semua' }, categories: { all: 'Semua', majors: 'Utama', thematic: 'Tematik' },
  relativeTime: { minutesAgo: '{count} min lalu', hoursAgo: '{count} jam lalu', daysAgo: '{count} hari lalu' },
  window: { storedSince: 'disimpan sejak {date}', currentArchive: 'arkib semasa' },
  status: { expired: 'tamat', unverified: 'belum disahkan', close: 'Tutup', pending: 'menunggu', all: 'Semua', buy: 'BELI', sell: 'JUAL' },
  header: {
    eyebrow: 'Rekod Isyarat Diselesaikan OHLCV', priceMoveSum: 'jumlah pergerakan harga · tanpa saiz',
    priceMoveHelp: 'Maksud jumlah pergerakan harga tanpa saiz', winRate: 'kadar menang', winRateHelp: 'Maksud kadar menang',
    breakEven: 'pulang modal {value}%', breakEvenHelp: 'Maksud kadar menang pulang modal', resolvedSignals: 'isyarat diselesaikan',
    resolvedHelp: 'Maksud isyarat diselesaikan', sequentialSimulation: 'simulasi berurutan · risiko 1%',
    simulationHelp: 'Maksud simulasi berurutan', maxDrawdown: 'susutan maksimum −{value}%', maxDrawdownHelp: 'Maksud susutan maksimum',
    latestOutcome: 'Hasil terkini yang dikira', embed: 'Benamkan', shareX: 'Kongsi di X', shareLinkedIn: 'Kongsi di LinkedIn',
    headlineDisclosure: 'Halaman ini ialah rekod hasil isyarat yang diperhati. Ia melaporkan hasil OHLCV yang disokong sumber, bilangan, kadar menang dan pergerakan harga tanpa saiz; semuanya bukan pengisian broker atau pulangan portfolio. Saiz posisi, kos bermodel, susutan dan ekuiti berurutan ditempatkan pada halaman Kajian Isyarat Bermodel yang berasingan. Baris menunggu, pemegang tempat tamat paksa bernilai sifar dan baris disekat gerbang dipaparkan berasingan dan tidak dimasukkan ke statistik kadar menang.',
    riskLabel: 'Notis risiko:', riskBody: 'TradeClaw menyediakan analitik isyarat pendidikan dan penyelidikan sejarah. Isyarat bukan nasihat kewangan, cadangan pelaburan atau hasil yang dijamin. Dagangan melibatkan risiko besar termasuk kehilangan modal. Prestasi lalu tidak meramalkan hasil masa depan. Sentiasa uji dengan dagangan kertas dan kawalan risiko bebas sebelum menggunakan wang sebenar.',
  },
  rolling: { title: 'Kadar menang bergerak · {window}', onlyDays: '(hanya {count} hari data)', resolved: '{count} diselesaikan', total: '{count} jumlah', historyAvailable: 'Hanya {count} hari sejarah tersedia' },
  scope: {
    eligibleLabel: 'Aliran isyarat layak', broadcastLabel: 'Subset diluluskan siaran',
    broadcastDetail: 'Hanya isyarat yang diluluskan oleh gerbang langsung (rejim + pemilihan + risiko) untuk siaran Telegram. Keputusan gerbang direkodkan bagi setiap baris sejak 2026-06-10; isyarat terdahulu tiada keputusan dan dikecualikan sepenuhnya daripada paparan ini.',
    eligibleCaption: 'Aliran isyarat layak yang direkodkan merentas simbol dan rangka masa dijejak. Ini bukan lejar pelaksanaan atau portfolio pelanggan.',
    broadcastCaption: 'Paparan siaran: hanya isyarat yang diluluskan gerbang risiko langsung untuk Telegram. Keputusan direkodkan bagi setiap baris sejak 2026-06-10; isyarat lebih lama dikecualikan.',
    showEligible: 'Tunjukkan aliran layak',
  },
  categoryCaption: {
    majors: '{count} instrumen dengan kecairan tertinggi. Bacaan paling bersih untuk kualiti strategi.',
    thematic: '{count} simbol berasaskan naratif. Liputan lebih luas dan lebih hingar; berguna untuk keluasan, bukan kadar menang utama.',
    broadcast: 'Isyarat diluluskan gerbang sahaja; keputusan direkodkan sejak 2026-06-10.', eligible: 'Baris layak bagi setiap simbol dijejak dalam arkib semasa.',
  },
  stats: {
    resolved: 'Diselesaikan', resolvedHint: 'Hasil OHLCV 24 jam yang boleh digunakan', averagePnl: 'Purata P&L', averagePnlHint: 'Setiap isyarat diselesaikan',
    priceMoveSum: 'Jumlah pergerakan harga', priceMoveSumHint: 'Jumlah mentah % pasaran setiap isyarat', streak: 'Rentetan',
    streakHint: 'Hasil diselesaikan berturut-turut', unusableOutcome: 'Tiada hasil 24 jam boleh guna',
    unusableOutcomeHint: 'Pemegang tempat tamat paksa hilang atau sifar', gateBlocked: 'Disekat gerbang',
    gateBlockedHint: 'Penapis risiko menolak kemasukan', pending: 'Menunggu', pendingHint: 'Masih dalam tetingkap 24 jam',
  },
  hints: {
    priceMoveSum: 'Jumlah aritmetik pergerakan harga diselesaikan OHLCV bagi setiap isyarat yang dikira. Ia menggunakan kemasukan dan keluar yang dipaparkan tanpa saiz kedudukan atau kos pelaksanaan, jadi ia bukan pulangan portfolio.',
    sequentialSimulation: 'Simulasi ekuiti berurutan andaian bermula pada $10,000. Ia merisikokan 1% ekuiti model semasa bagi setiap isyarat layak dan menolak andaian yuran serta gelinciran yang dinyatakan. Ia tidak menggunakan pengisian broker atau memodelkan pendedahan bertindih, margin, leveraj, kependaman, pendanaan atau pilihan pelanggan, jadi ia bukan pulangan portfolio sebenar.',
    averagePnl: 'Jumlah aritmetik pergerakan harga setiap isyarat yang diselesaikan dengan OHLCV, dibahagi dengan isyarat diselesaikan yang dikira. Saiz kedudukan dan kos pelaksanaan tidak digunakan.',
    winRate24h: 'Isyarat dikira yang hasil OHLCV 24 jamnya mencapai TP, dibahagi dengan semua isyarat dikira yang mempunyai hasil boleh guna. Baris menunggu, simulasi, disekat gerbang dan pemegang tempat tamat paksa sifar atau hilang dikecualikan.',
    winRate4h: 'Isyarat diselesaikan yang hasil OHLCV 4 jamnya mencapai TP, dibahagi dengan semua isyarat diselesaikan. Tempoh lebih pendek ini memberi bacaan awal kualiti isyarat.',
    resolved: 'Isyarat dengan hasil 24 jam OHLCV pembekal yang boleh digunakan: TP, SL atau penutupan bukan sifar. Baris masih terbuka, simulasi, disekat gerbang dan pemegang tempat tamat paksa sifar atau hilang dikecualikan. Ini rekod hasil isyarat diperhati, bukan lejar pelaksanaan pelanggan.',
    unusableOutcome: 'Penyelesai tidak dapat menghasilkan hasil pasaran 24 jam yang boleh digunakan lalu menulis pemegang tempat tamat paksa sifar, atau baris masih tiada selepas tempoh. Ia dikecualikan daripada kadar menang.',
    gateBlocked: 'Enjin mengeluarkan isyarat tetapi gerbang risiko penuh menolak kemasukan. Ia dikecualikan daripada hasil dikira pada halaman ini.',
    pending: 'Isyarat masih berada dalam tetingkap penjejakan 24 jam, jadi hasilnya belum diketahui.',
    maxDrawdown: 'Kejatuhan puncak ke dasar terburuk dalam simulasi ekuiti berurutan andaian bagi tetingkap ini. Ia susutan model, bukan susutan yang diperhati dalam akaun broker atau pelanggan.',
    streak: 'Isyarat diselesaikan berturut-turut; positif untuk rentetan menang dan negatif untuk rentetan kalah.',
    breakEven: 'Kadar menang yang diperlukan kajian untuk pulang modal berdasarkan purata R menang/rugi dan andaian kos dinyatakan. Ia ambang penyelidikan bermodel, bukan hasil langsung yang dijamin.',
  },
  alerts: { title: 'Amaran Penyelidikan', detail: 'Amaran seperti kemasukan kekal dijeda apabila gerbang bukti terlaras kos yang diterbitkan belum sedia.', openTelegram: 'Buka Telegram', signalDashboard: 'Panel Isyarat' },
  research: { title: 'Periksa Penyelidikan Strategi', detail: 'Semak ujian balik bermodel dan log dagangan yang tersedia. Metrik lekapan ialah diagnostik penyelidikan, bukan prestasi langsung atau broker.', viewLeaderboard: 'Lihat Papan Kedudukan', browseStrategies: 'Layari Strategi' },
  sections: { perSymbol: 'Hasil Mengikut Simbol', recordedRows: 'Baris Isyarat Direkodkan', population: 'Populasi dan Had' },
  columns: { pair: 'Pasangan', recordedRows: 'Baris direkodkan', hit4h: 'Tepat 4j', hit24h: 'Tepat 24j', averagePnl: 'Purata P&L', priceMoveSum: 'Jumlah pergerakan', trend: 'Arah aliran', barOpen: 'Bukaan Bar', direction: 'Arah', entry: 'Kemasukan', pnl: 'P&L' },
  filters: { pair: 'Pasangan', all: 'Semua', clear: 'Kosongkan' },
  table: {
    range: '{from}–{to} daripada {total}', noPeriodData: 'Belum ada data untuk tempoh ini.', noMatchingSignals: 'Tiada isyarat sepadan dengan penapis ini.', noPeriodSignals: 'Belum ada isyarat untuk tempoh ini.',
    barOpenHelp: 'Masa bukaan bar lilin dalam zon waktu tempatan anda. Isyarat berpaut pada bar ini dan enjin merekodkannya sejurus selepas bar ditutup, dalam kitaran cron 5 minit seterusnya; oleh itu masa rekod boleh lewat sehingga satu tempoh rangka masa daripada nilai yang dipaparkan.',
    firstPage: 'Halaman pertama', previousPage: 'Halaman sebelumnya', nextPage: 'Halaman seterusnya', lastPage: 'Halaman terakhir',
  },
  populationBody: 'Isyarat tersimpan mengekalkan masa penjanaannya. Hasil baharu yang dikira memerlukan sumber OHLCV diperhati dan diluluskan; ia bukan pengisian broker. Nilai hasil lama tanpa asal usul yang diluluskan kekal kelihatan sebagai baris audit belum disahkan dan tidak dikira. Hasil dikira merangkumi TP, SL dan penutupan 24 jam bukan sifar yang disokong sumber; data simulasi, baris disekat, menunggu serta pemegang tempat tamat paksa sifar atau hilang dikecualikan. Jumlah pergerakan tanpa saiz menggunakan baris dikira. Kajian bermodel yang berasingan turut memerlukan henti rugi direkodkan. Paparan siaran hanya merangkumi kelulusan gerbang yang direkodkan sejak 2026-06-10. Populasi ini ialah pemerhatian isyarat, bukan dagangan pelanggan atau pulangan portfolio sebenar.',
  aria: { filterPair: 'Tapis mengikut pasangan', viewSignal: 'Lihat isyarat {pair} {direction} {time}', whatMeans: 'Maksud {label}' },
};

const ar: TrackRecordTranslations = {
  documentTitle: 'سجل الإشارات المرصودة — TradeClaw',
  surfaces: {
    ariaLabel: 'اختر سطح الأدلة',
    recordLabel: 'السجل المرصود',
    recordDescription: 'نتائج OHLCV مدعومة بالمصدر',
    studyLabel: 'دراسة إشارات نموذجية',
    studyDescription: 'التحجيم والتكاليف ومسار رأس المال',
    studyBoundary: 'مخرجات نموذجية — ليست السجل المرصود أو أداء وسيط',
  },
  periods: { all: 'الكل' }, categories: { all: 'الكل', majors: 'الرئيسية', thematic: 'الموضوعية' },
  relativeTime: { minutesAgo: 'قبل {count} د', hoursAgo: 'قبل {count} س', daysAgo: 'قبل {count} يوم' },
  window: { storedSince: 'محفوظ حاليًا منذ {date}', currentArchive: 'الأرشيف الحالي' },
  status: { expired: 'منتهية', unverified: 'غير متحقق', close: 'إغلاق', pending: 'معلقة', all: 'الكل', buy: 'شراء', sell: 'بيع' },
  header: {
    eyebrow: 'سجل الإشارات المحسومة ببيانات OHLCV', priceMoveSum: 'مجموع تحركات السعر · بلا تحجيم',
    priceMoveHelp: 'معنى مجموع تحركات السعر بلا تحجيم', winRate: 'نسبة الفوز', winRateHelp: 'معنى نسبة الفوز',
    breakEven: 'التعادل {value}٪', breakEvenHelp: 'معنى نسبة الفوز عند التعادل', resolvedSignals: 'إشارات محسومة',
    resolvedHelp: 'معنى الإشارات المحسومة', sequentialSimulation: 'محاكاة متسلسلة · مخاطرة 1٪',
    simulationHelp: 'معنى المحاكاة المتسلسلة', maxDrawdown: 'أقصى تراجع −{value}٪', maxDrawdownHelp: 'معنى أقصى تراجع',
    latestOutcome: 'أحدث نتيجة محتسبة', embed: 'تضمين', shareX: 'مشاركة على X', shareLinkedIn: 'مشاركة على LinkedIn',
    headlineDisclosure: 'هذه الصفحة هي سجل نتائج الإشارات المرصودة. تعرض نتائج OHLCV المدعومة بالمصدر والأعداد ونسبة الفوز وتحركات السعر بلا تحجيم؛ ولا يمثل أي منها تنفيذات وسيط أو عوائد محفظة. يوجد تحجيم المراكز والتكاليف النموذجية والتراجع ومسار رأس المال المتسلسل في صفحة دراسة الإشارات النموذجية المنفصلة. تُعرض الصفوف المعلقة وعناصر انتهاء الصلاحية ذات القيمة الصفرية والصفوف المحجوبة بالبوابة منفصلة ولا تُضم إلى إحصاءات الفوز.',
    riskLabel: 'تنبيه مخاطر:', riskBody: 'تقدم TradeClaw تحليلات إشارات تعليمية وأبحاثًا تاريخية. الإشارات ليست نصيحة مالية أو توصية استثمارية أو ضمانًا للنتائج. ينطوي التداول على مخاطر كبيرة، بما فيها خسارة رأس المال. الأداء السابق لا يتنبأ بالنتائج المستقبلية. اختبر دائمًا بالتداول التجريبي وضوابط مخاطر مستقلة قبل استخدام أموال حقيقية.',
  },
  rolling: { title: 'نسبة الفوز المتحركة · {window}', onlyDays: '(بيانات {count} يوم فقط)', resolved: '{count} محسومة', total: '{count} إجمالي', historyAvailable: 'يتوفر سجل {count} يوم فقط' },
  scope: {
    eligibleLabel: 'تدفق الإشارات المؤهلة', broadcastLabel: 'مجموعة معتمدة للبث',
    broadcastDetail: 'يعرض هذا القسم فقط الإشارات التي وافقت عليها البوابة الحية (النظام + الانتقاء + المخاطر) لبث Telegram. تُسجل قرارات البوابة لكل صف منذ 2026-06-10؛ ولا تحمل الإشارات الأقدم قرارًا، لذلك تُستبعد كليًا من هذا العرض.',
    eligibleCaption: 'تدفق مسجل للإشارات المؤهلة عبر الرموز والأطر الزمنية المتابعة. ليس سجل تنفيذ أو محفظة لمشترك.',
    broadcastCaption: 'عرض البث: الإشارات التي وافقت عليها بوابة المخاطر الحية لبث Telegram فقط. تُسجل القرارات لكل صف منذ 2026-06-10 وتُستبعد الإشارات الأقدم.',
    showEligible: 'عرض التدفق المؤهل',
  },
  categoryCaption: {
    majors: '{count} أداة الأعلى سيولة، وهي القراءة الأنقى لجودة الاستراتيجية.',
    thematic: '{count} رمزًا تقودها السرديات. تغطية أوسع وضوضاء أكثر؛ مفيدة للاتساع لا لنسبة الفوز الرئيسية.',
    broadcast: 'الإشارات المعتمدة من البوابة فقط؛ القرارات مسجلة منذ 2026-06-10.', eligible: 'الصفوف المؤهلة لكل رمز متابع في الأرشيف الحالي.',
  },
  stats: {
    resolved: 'محسومة', resolvedHint: 'نتيجة OHLCV صالحة خلال 24 ساعة', averagePnl: 'متوسط الربح/الخسارة', averagePnlHint: 'لكل إشارة محسومة',
    priceMoveSum: 'مجموع تحركات السعر', priceMoveSumHint: 'المجموع الخام لنسبة حركة السوق لكل إشارة', streak: 'السلسلة',
    streakHint: 'نتائج محسومة متتالية', unusableOutcome: 'لا توجد نتيجة صالحة خلال 24 ساعة',
    unusableOutcomeHint: 'عنصر انتهاء قسري مفقود أو صفري', gateBlocked: 'محجوبة بالبوابة',
    gateBlockedHint: 'مرشح المخاطر رفض الدخول', pending: 'معلقة', pendingHint: 'ما زالت ضمن نافذة 24 ساعة',
  },
  hints: {
    priceMoveSum: 'مجموع حسابي لحركة السعر المحسومة بـ OHLCV لكل إشارة محتسبة، باستخدام الدخول والخروج المعروضين بلا تحجيم للمركز أو تكاليف تنفيذ؛ لذا فهو ليس عائد محفظة.',
    sequentialSimulation: 'محاكاة افتراضية متسلسلة لرأس المال تبدأ من 10,000 دولار. تخاطر بـ 1٪ من رأس المال النموذجي الحالي لكل إشارة مؤهلة وتخصم افتراضات الرسوم والانزلاق. لا تستخدم تنفيذات الوسيط ولا تحاكي التعرض المتداخل أو الهامش أو الرافعة أو التأخير أو التمويل أو اختيار المشترك، فليست عائدًا فعليًا.',
    averagePnl: 'مجموع تحركات السعر المحسومة بـ OHLCV لكل إشارة، مقسومًا على عدد الإشارات المحسومة المحتسبة. لا يطبق تحجيم المراكز أو تكاليف التنفيذ.',
    winRate24h: 'الإشارات المحتسبة التي بلغت TP في نتيجة OHLCV الصالحة خلال 24 ساعة، مقسومة على كل الإشارات ذات النتيجة الصالحة. تستبعد الصفوف المعلقة والمحاكاة والمحجوبة وعناصر الانتهاء القسري الصفرية أو المفقودة.',
    winRate4h: 'الإشارات المحسومة التي بلغت TP في نتيجة OHLCV لأربع ساعات، مقسومة على إجمالي الإشارات المحسومة. يوفر هذا الأفق الأقصر قراءة مبكرة لجودة الإشارة.',
    resolved: 'إشارات لها نتيجة OHLCV صالحة لمدة 24 ساعة: TP أو SL أو إغلاق غير صفري. تستبعد المفتوحة والمحاكاة والمحجوبة وعناصر الانتهاء القسري الصفرية أو المفقودة. هذا سجل نتائج إشارات مرصود وليس سجل تنفيذ للمشتركين.',
    unusableOutcome: 'لم يتمكن المحلل من إنتاج نتيجة سوق صالحة خلال 24 ساعة فكتب عنصر انتهاء قسري صفري، أو بقي الصف مفقودًا بعد الأفق. يستبعد من نسبة الفوز.',
    gateBlocked: 'أصدر المحرك الإشارة، لكن بوابة المخاطر الكاملة رفضت الدخول. تُستبعد من النتائج المحتسبة في هذه الصفحة.',
    pending: 'ما زالت الإشارة ضمن نافذة التتبع لمدة 24 ساعة، لذلك لم تُعرف نتيجتها بعد.',
    maxDrawdown: 'أسوأ انخفاض من القمة إلى القاع في محاكاة رأس المال الافتراضية المتسلسلة لهذه النافذة. هو تراجع نموذجي، لا تراجع مرصود في حساب وسيط أو مشترك.',
    streak: 'إشارات محسومة متتالية؛ موجبة لسلسلة فوز وسالبة لسلسلة خسارة.',
    breakEven: 'نسبة الفوز التي تحتاجها الدراسة للتعادل وفق متوسط R للربح والخسارة وافتراضات التكلفة المذكورة. هي عتبة بحثية نموذجية، وليست نتيجة حية مضمونة.',
  },
  alerts: { title: 'تنبيهات البحث', detail: 'تبقى تنبيهات الدخول متوقفة عندما لا تكون بوابة الأدلة المنشورة المعدلة بالتكاليف جاهزة.', openTelegram: 'فتح Telegram', signalDashboard: 'لوحة الإشارات' },
  research: { title: 'فحص أبحاث الاستراتيجيات', detail: 'راجع الاختبارات الخلفية النموذجية وسجلات التداول المتاحة. مقاييس البيانات التجريبية أدوات تشخيص بحثية وليست أداءً حيًا أو أداء وسيط.', viewLeaderboard: 'عرض لوحة الصدارة', browseStrategies: 'تصفح الاستراتيجيات' },
  sections: { perSymbol: 'النتائج حسب الرمز', recordedRows: 'صفوف الإشارات المسجلة', population: 'المجموعة والقيود' },
  columns: { pair: 'الزوج', recordedRows: 'الصفوف المسجلة', hit4h: 'إصابة 4 س', hit24h: 'إصابة 24 س', averagePnl: 'متوسط الربح/الخسارة', priceMoveSum: 'مجموع الحركة', trend: 'الاتجاه', barOpen: 'افتتاح الشمعة', direction: 'الجهة', entry: 'الدخول', pnl: 'الربح/الخسارة' },
  filters: { pair: 'الزوج', all: 'الكل', clear: 'مسح' },
  table: {
    range: '{from}–{to} من {total}', noPeriodData: 'لا توجد بيانات لهذه الفترة بعد.', noMatchingSignals: 'لا توجد إشارات تطابق هذه المرشحات.', noPeriodSignals: 'لا توجد إشارات لهذه الفترة بعد.',
    barOpenHelp: 'وقت افتتاح شمعة السعر حسب منطقتك الزمنية المحلية. ترتبط الإشارة بهذه الشمعة ويسجلها المحرك بعد إغلاقها بقليل ضمن دورة المهمة المجدولة التالية ذات الخمس دقائق؛ لذلك قد يتأخر وقت التسجيل الفعلي حتى مدة إطار زمني واحدة عن القيمة المعروضة.',
    firstPage: 'الصفحة الأولى', previousPage: 'الصفحة السابقة', nextPage: 'الصفحة التالية', lastPage: 'الصفحة الأخيرة',
  },
  populationBody: 'تحمل الإشارات المخزنة وقت توليدها. تتطلب النتائج الجديدة المحتسبة مصدر OHLCV مرصودًا ومعتمدًا، وليست تنفيذات وسيط. تبقى النتائج القديمة التي تفتقر إلى مصدر معتمد ظاهرة كصفوف تدقيق غير متحقق منها ولا تُحتسب. تشمل النتائج المحتسبة أهداف الربح ووقف الخسارة وإغلاقات 24 ساعة غير الصفرية المدعومة بمصدر، وتستبعد البيانات المحاكاة والصفوف المحجوبة والمعلقة وعناصر الانتهاء القسري الصفرية أو المفقودة. يستخدم مجموع الحركة بلا تحجيم الصفوف المحتسبة. تتطلب الدراسة النموذجية المنفصلة أيضًا وقف خسارة مسجلًا. يشمل عرض البث موافقات البوابة المسجلة منذ 2026-06-10 فقط. هذه ملاحظات إشارات وليست تداولات عملاء أو عوائد محافظ فعلية.',
  aria: { filterPair: 'تصفية حسب الزوج', viewSignal: 'عرض إشارة {pair} {direction} {time}', whatMeans: 'معنى {label}' },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, TrackRecordTranslations>;

export function getTrackRecordTranslations(locale: Locale): TrackRecordTranslations {
  return dictionaries[locale];
}
