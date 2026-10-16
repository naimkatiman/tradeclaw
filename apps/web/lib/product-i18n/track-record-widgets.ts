import type { Locale } from '../translations';

export interface TrackRecordWidgetTranslations {
  embed: {
    defaultLabel: string;
    copy: string;
    copied: string;
    copyCode: string;
    close: string;
    pairTitle: string;
    trackRecordTitle: string;
    pairDescription: string;
    trackRecordDescription: string;
    iframeMethod: string;
    scriptTag: string;
    docs: string;
  };
  share: {
    xDefaultLabel: string;
    xAria: string;
    xObserved: string;
    xGeneric: string;
    linkedinDefaultLabel: string;
    linkedinAria: string;
    linkedinObserved: string;
    linkedinGeneric: string;
  };
  trailingWeek: {
    aria: string;
    title: string;
    info: string;
    infoLabel: string;
    disclosure: string;
    badgeBetter: string;
    badgeFewerTrades: string;
    badgeMatched: string;
    badgeWorse: string;
    eligibleLabel: string;
    premiumLabel: string;
    currentArchive: string;
    archiveSummary: string;
    verdictBetter: string;
    verdictFewerTrades: string;
    verdictWorse: string;
    sequentialSimulation: string;
    win: string;
    trades: string;
    expectancy: string;
    breakEven: string;
    breakEvenUnavailable: string;
  };
  equity: {
    chartEmpty: string;
    chartLabel: string;
    title: string;
    broadcastSubset: string;
    eligibleStream: string;
    broadcastNoSummary: string;
    broadcastWithCap: string;
    broadcastWithoutCap: string;
    eligibleNoSummary: string;
    eligibleWithCap: string;
    eligibleWithoutCap: string;
    sizedSignalsOne: string;
    sizedSignalsMany: string;
    smoothedSummary: string;
    bandAll: string;
    bandPremium: string;
    bandAllTitle: string;
    bandPremiumTitle: string;
    smoothTitle: string;
    smoothActive: string;
    smoothInactive: string;
    smoothBannerWithCap: string;
    smoothBannerWithoutCap: string;
    noEvidence: string;
    sequentialResult: string;
    sequentialHint: string;
    sequentialHintLabel: string;
    simulatedMaxDrawdown: string;
    maxDrawdownHint: string;
    maxDrawdownHintLabel: string;
    deepestDrop: string;
    hypotheticalPath: string;
    winRate: string;
    winRateHint: string;
    winRateHintLabel: string;
    breakEven: string;
    resolvedSignals: string;
    resolvedHint: string;
    resolvedHintLabel: string;
    sharpeAnnualized: string;
    sharpeHint: string;
    sharpeHintLabel: string;
    sharpeDaysOne: string;
    sharpeDaysMany: string;
    sharpeNeedsDays: string;
    avgRWin: string;
    avgRWinHint: string;
    avgRWinHintLabel: string;
    avgRLoss: string;
    avgRLossHint: string;
    avgRLossHintLabel: string;
    expectancyNet: string;
    expectancyHint: string;
    expectancyHintLabel: string;
    grossMinusCost: string;
    rStatsAllOne: string;
    rStatsAllMany: string;
    rStatsExcludedOne: string;
    rStatsExcludedMany: string;
    dateRange: string;
    loading: string;
    tooltipSignal: string;
    tooltipCumulative: string;
  };
}

const en: TrackRecordWidgetTranslations = {
  embed: {
    defaultLabel: 'Embed',
    copy: 'Copy',
    copied: 'Copied',
    copyCode: 'Copy {method} code',
    close: 'Close embed dialog',
    pairTitle: 'Embed the {pair} widget',
    trackRecordTitle: 'Embed the Track Record widget',
    pairDescription: 'Paste this into any website to show a live {pair} signal card that refreshes automatically every 60 seconds.',
    trackRecordDescription: 'Paste this into any website to show the live track record, which refreshes automatically every 60 seconds.',
    iframeMethod: 'iframe method',
    scriptTag: 'Script tag',
    docs: 'View the full embed documentation →',
  },
  share: {
    xDefaultLabel: 'Share on X',
    xAria: 'Share the track record on X',
    xObserved: 'TradeClaw observed a {winRate} win rate across {resolved} counted signals resolved using OHLCV. This is signal-study data only, not broker fills or portfolio returns:',
    xGeneric: 'TradeClaw publishes recorded signal rows, OHLCV-resolved outcomes, and exclusions. This is not an execution ledger:',
    linkedinDefaultLabel: 'Share on LinkedIn',
    linkedinAria: 'Share the track record on LinkedIn',
    linkedinObserved: 'TradeClaw observed a {winRate} win rate across {resolved} counted signals whose outcomes were resolved against provider OHLCV. This is signal-study data, not broker fills or customer portfolio returns.\n\nInspect the population and methodology:\n{url}',
    linkedinGeneric: 'TradeClaw publishes recorded signal rows, OHLCV-resolved outcomes, and the excluded populations. It is not an execution or customer-account ledger:\n{url}',
  },
  trailingWeek: {
    aria: 'Trailing 7-day comparison of Premium and all eligible signals',
    title: 'Last 7 Days — Premium vs Eligible Stream',
    info: 'Side-by-side sequential simulation results for the Premium band (confidence ≥ 85) and the eligible sized-signal stream over the last 7 days. Both use the same modeled sizing and cost assumptions.',
    infoLabel: 'What this comparison shows',
    disclosure: 'The window and modeled sizing and cost assumptions are identical. These are simulations, not account returns.',
    badgeBetter: 'Premium outperformed All by {delta}',
    badgeFewerTrades: 'Premium is {delta} versus All because it traded less, not because accuracy was higher',
    badgeMatched: 'Premium matched All with no per-trade edge',
    badgeWorse: 'Premium underperformed All by {delta}',
    eligibleLabel: 'Eligible sized signals',
    premiumLabel: 'Premium only (confidence ≥ 85)',
    currentArchive: 'Current archive simulation',
    archiveSummary: 'All: {allReturn} across {allTrades} trades. Premium: {premiumReturn} across {premiumTrades} trades. {verdict}',
    verdictBetter: 'The filter is ahead in the current archive model.',
    verdictFewerTrades: 'The filter is ahead only because it traded less.',
    verdictWorse: 'The filter is behind in the current archive model.',
    sequentialSimulation: 'sequential simulation',
    win: 'Win rate',
    trades: 'Trades',
    expectancy: 'Expectancy',
    breakEven: 'Break-even {value} · 7-day window',
    breakEvenUnavailable: 'Break-even unavailable · 7-day window',
  },
  equity: {
    chartEmpty: 'Performance tracking will begin after signals are recorded and resolved.',
    chartLabel: 'Sequential equity simulation chart',
    title: 'Signal Study — Sequential Simulation',
    broadcastSubset: 'Broadcast subset',
    eligibleStream: 'Eligible stream',
    broadcastNoSummary: 'Gate-approved broadcast subset — decisions have been recorded since {date}.',
    broadcastWithCap: 'Gate-approved broadcast subset — decisions have been recorded since {date}. The sequential simulation uses {risk} modeled risk per signal, capped at {cap}, after per-asset fee and slippage assumptions (average {cost} ≈ {costR} per signal).',
    broadcastWithoutCap: 'Gate-approved broadcast subset — decisions have been recorded since {date}. The sequential simulation uses {risk} modeled risk per signal after per-asset fee and slippage assumptions (average {cost} ≈ {costR} per signal).',
    eligibleNoSummary: 'Eligible signal stream. Outcomes require approved observed-OHLCV provenance; no broker fills are used.',
    eligibleWithCap: 'Eligible signal stream. The fixed-fractional sequential simulation uses {risk} modeled risk per signal, capped at {cap} per signal, after per-asset fee and slippage assumptions (average {cost} ≈ {costR} per signal). Outcomes require approved observed-OHLCV provenance; no broker fills are used.',
    eligibleWithoutCap: 'Eligible signal stream. The fixed-fractional sequential simulation uses {risk} modeled risk per signal after per-asset fee and slippage assumptions (average {cost} ≈ {costR} per signal). Outcomes require approved observed-OHLCV provenance; no broker fills are used.',
    sizedSignalsOne: '{count} eligible sized signal is in this window. The simulation processes it sequentially; it does not model overlapping exposure, account margin, or which signals a subscriber received or executed.',
    sizedSignalsMany: '{count} eligible sized signals are in this window. The simulation processes every one sequentially; it does not model overlapping exposure, account margin, or which signals a subscriber received or executed.',
    smoothedSummary: 'Outlier-smoothed: each trade\'s R-multiple is clamped to {cap} (the top and bottom 5% are clipped). Raw drawdown is larger.',
    bandAll: 'All',
    bandPremium: 'Premium',
    bandAllTitle: 'Eligible sized signals in the selected scope.',
    bandPremiumTitle: 'Premium only: confidence ≥ 85. This is the high-conviction subset of eligible signals.',
    smoothTitle: 'Clip the top and bottom 5% of trade outcomes using a P95 cap. This reveals the path without single-trade outliers in either direction.',
    smoothActive: 'Smoothed (P95)',
    smoothInactive: 'Smooth outliers',
    smoothBannerWithCap: 'Outlier-smoothed view (P95-clipped) — this is not the raw equity path. The top and bottom 5% of trade outcomes are clamped to {cap}; raw drawdown is larger. Turn off “Smoothed” for the unmodified curve.',
    smoothBannerWithoutCap: 'Outlier-smoothed view (P95-clipped) — this is not the raw equity path. The top and bottom 5% of trade outcomes are clamped; raw drawdown is larger. Turn off “Smoothed” for the unmodified curve.',
    noEvidence: 'No approved observed-OHLCV outcomes with a recorded stop loss are available for this simulation window. No zero-return placeholder is shown.',
    sequentialResult: 'Sequential simulation result',
    sequentialHint: 'Hypothetical sequential equity simulation starting at $10,000. It orders eligible sized signals by timestamp, risks 1% of current equity on every signal, caps each R-multiple at 8R, and deducts static per-asset fee and slippage assumptions (about 0.40% crypto, 0.10% metals, and 0.04% FX of notional). It does not use broker fills or model overlapping exposure, margin, leverage, latency, funding, or subscriber selection, so it is not an actual portfolio return.',
    sequentialHintLabel: 'What the sequential simulation means',
    simulatedMaxDrawdown: 'Simulated Max Drawdown',
    maxDrawdownHint: 'Worst peak-to-trough drop in the hypothetical sequential equity simulation over this window. It is model drawdown, not drawdown observed in a broker or subscriber account.',
    maxDrawdownHintLabel: 'What max drawdown means',
    deepestDrop: 'Deepest peak-to-trough drop',
    hypotheticalPath: '{start} → {end}',
    winRate: 'Win Rate',
    winRateHint: 'Counted signals whose 24-hour OHLCV outcome hit TP, divided by counted signals with a usable 24-hour OHLCV outcome. A nonzero 24-hour close after neither TP nor SL hit counts as a miss. Zero or missing force-expiry placeholders, simulated rows, and gate-blocked rows are excluded.',
    winRateHintLabel: 'What win rate means',
    breakEven: 'break-even {value}',
    resolvedSignals: 'Resolved Signals',
    resolvedHint: 'Signals with a usable 24-hour outcome resolved from provider OHLCV: TP, SL, or a nonzero 24-hour close after neither was hit. Still-open rows, zero or missing force-expiry placeholders, simulated rows, and gate-blocked signals are excluded. This is an engine signal study, not a subscriber execution ledger.',
    resolvedHintLabel: 'What resolved signals means',
    sharpeAnnualized: 'Sharpe (annualized)',
    sharpeHint: 'Daily-bucketed annualized Sharpe: trades are grouped by UTC date, then calculated as mean daily return divided by standard deviation of daily return, multiplied by the square root of 365. Calendar days are used because the engine spans crypto, FX, and indices with no shared session. Daily bucketing is required because per-signal returns are not independent and identically distributed.',
    sharpeHintLabel: 'What the Sharpe ratio means',
    sharpeDaysOne: 'over {count} trading day',
    sharpeDaysMany: 'over {count} trading days',
    sharpeNeedsDays: 'needs ≥5 days (currently {count})',
    avgRWin: 'Avg R per Win',
    avgRWinHint: 'Average R-multiple of winning OHLCV-resolved signals. R is the entry-to-stop distance in percent; +2.0R means the modeled price outcome was twice the planned risk distance. This is not a broker fill or realized account gain.',
    avgRWinHintLabel: 'What average R per win means',
    avgRLoss: 'Avg R per Loss',
    avgRLossHint: 'Average R-multiple of losing OHLCV-resolved signals. Values near -1R mean the resolved price outcome was near the planned stop distance; they do not measure broker fill quality or realized slippage.',
    avgRLossHintLabel: 'What average R per loss means',
    expectancyNet: 'Expectancy (net)',
    expectancyHint: 'Average modeled R per eligible sized signal after the stated cost assumptions: gross expectancy minus average modeled fee and slippage cost in R. A positive gross value with a negative net value means the assumed costs exceed the observed gross edge. This is study expectancy, not realized subscriber expectancy.',
    expectancyHintLabel: 'What expectancy means',
    grossMinusCost: '{gross} gross − {cost} cost',
    rStatsAllOne: 'R statistics cover {sized} sized trade.',
    rStatsAllMany: 'R statistics cover {sized} sized trades.',
    rStatsExcludedOne: 'R statistics cover {sized} sized trade out of {resolved} resolved signals; legacy rows without a stop are excluded.',
    rStatsExcludedMany: 'R statistics cover {sized} sized trades out of {resolved} resolved signals; legacy rows without a stop are excluded.',
    dateRange: 'Range: {range}.',
    loading: 'Loading the equity simulation',
    tooltipSignal: 'Signal #{count}',
    tooltipCumulative: '{value} cumulative',
  },
};

const es: TrackRecordWidgetTranslations = {
  embed: {
    defaultLabel: 'Insertar', copy: 'Copiar', copied: 'Copiado', copyCode: 'Copiar el código de {method}',
    close: 'Cerrar el cuadro de inserción', pairTitle: 'Insertar el widget de {pair}',
    trackRecordTitle: 'Insertar el widget del historial',
    pairDescription: 'Pega esto en cualquier sitio web para mostrar una tarjeta de señal en vivo de {pair} que se actualiza automáticamente cada 60 segundos.',
    trackRecordDescription: 'Pega esto en cualquier sitio web para mostrar el historial en vivo, que se actualiza automáticamente cada 60 segundos.',
    iframeMethod: 'Método iframe', scriptTag: 'Etiqueta script', docs: 'Ver toda la documentación de inserción →',
  },
  share: {
    xDefaultLabel: 'Compartir en X', xAria: 'Compartir el historial en X',
    xObserved: 'TradeClaw observó una tasa de aciertos del {winRate} en {resolved} señales contabilizadas y resueltas mediante OHLCV. Son datos de un estudio de señales, no ejecuciones de bróker ni rentabilidades de cartera:',
    xGeneric: 'TradeClaw publica las filas de señales registradas, los resultados resueltos mediante OHLCV y las exclusiones. No es un registro de ejecución:',
    linkedinDefaultLabel: 'Compartir en LinkedIn', linkedinAria: 'Compartir el historial en LinkedIn',
    linkedinObserved: 'TradeClaw observó una tasa de aciertos del {winRate} en {resolved} señales contabilizadas cuyos resultados se resolvieron con OHLCV del proveedor. Son datos de un estudio de señales, no ejecuciones de bróker ni rentabilidades de carteras de clientes.\n\nConsulta la población y la metodología:\n{url}',
    linkedinGeneric: 'TradeClaw publica las filas de señales registradas, los resultados resueltos mediante OHLCV y las poblaciones excluidas. No es un registro de ejecución ni de cuentas de clientes:\n{url}',
  },
  trailingWeek: {
    aria: 'Comparación de los últimos 7 días entre Premium y todas las señales elegibles',
    title: 'Últimos 7 días — Premium frente al flujo elegible',
    info: 'Resultados paralelos de la simulación secuencial para la banda Premium (confianza ≥ 85) y el flujo elegible de señales con tamaño durante los últimos 7 días. Ambos usan los mismos supuestos modelados de tamaño y costes.',
    infoLabel: 'Qué muestra esta comparación',
    disclosure: 'La ventana y los supuestos modelados de tamaño y costes son idénticos. Son simulaciones, no rentabilidades de cuenta.',
    badgeBetter: 'Premium superó a Todo por {delta}',
    badgeFewerTrades: 'Premium está {delta} frente a Todo porque operó menos, no porque la precisión fuera mayor',
    badgeMatched: 'Premium igualó a Todo sin ventaja por operación',
    badgeWorse: 'Premium quedó por detrás de Todo por {delta}',
    eligibleLabel: 'Señales elegibles con tamaño', premiumLabel: 'Solo Premium (confianza ≥ 85)',
    currentArchive: 'Simulación del archivo actual',
    archiveSummary: 'Todo: {allReturn} en {allTrades} operaciones. Premium: {premiumReturn} en {premiumTrades} operaciones. {verdict}',
    verdictBetter: 'El filtro va por delante en el modelo del archivo actual.',
    verdictFewerTrades: 'El filtro va por delante solo porque operó menos.',
    verdictWorse: 'El filtro va por detrás en el modelo del archivo actual.',
    sequentialSimulation: 'simulación secuencial', win: 'Tasa de aciertos', trades: 'Operaciones', expectancy: 'Expectativa',
    breakEven: 'Punto de equilibrio {value} · ventana de 7 días',
    breakEvenUnavailable: 'Punto de equilibrio no disponible · ventana de 7 días',
  },
  equity: {
    chartEmpty: 'El seguimiento del rendimiento comenzará cuando las señales se registren y se resuelvan.',
    chartLabel: 'Gráfico de simulación secuencial del capital', title: 'Estudio de señales — Simulación secuencial',
    broadcastSubset: 'Subconjunto de difusión', eligibleStream: 'Flujo elegible',
    broadcastNoSummary: 'Subconjunto aprobado para difusión por la puerta de riesgo; las decisiones se registran desde {date}.',
    broadcastWithCap: 'Subconjunto aprobado para difusión por la puerta de riesgo; las decisiones se registran desde {date}. La simulación secuencial usa un riesgo modelado de {risk} por señal, limitado a {cap}, después de los supuestos de comisiones y deslizamiento por activo (promedio de {cost} ≈ {costR} por señal).',
    broadcastWithoutCap: 'Subconjunto aprobado para difusión por la puerta de riesgo; las decisiones se registran desde {date}. La simulación secuencial usa un riesgo modelado de {risk} por señal después de los supuestos de comisiones y deslizamiento por activo (promedio de {cost} ≈ {costR} por señal).',
    eligibleNoSummary: 'Flujo de señales elegibles. Los resultados requieren procedencia observada-OHLCV aprobada; no se usan ejecuciones de bróker.',
    eligibleWithCap: 'Flujo de señales elegibles. La simulación secuencial de fracción fija usa un riesgo modelado de {risk} por señal, limitado a {cap} por señal, después de los supuestos de comisiones y deslizamiento por activo (promedio de {cost} ≈ {costR} por señal). Los resultados requieren procedencia observada-OHLCV aprobada; no se usan ejecuciones de bróker.',
    eligibleWithoutCap: 'Flujo de señales elegibles. La simulación secuencial de fracción fija usa un riesgo modelado de {risk} por señal después de los supuestos de comisiones y deslizamiento por activo (promedio de {cost} ≈ {costR} por señal). Los resultados requieren procedencia observada-OHLCV aprobada; no se usan ejecuciones de bróker.',
    sizedSignalsOne: 'Hay {count} señal elegible con tamaño en esta ventana. La simulación la procesa secuencialmente; no modela exposición solapada, margen de cuenta ni qué señales recibió o ejecutó un suscriptor.',
    sizedSignalsMany: 'Hay {count} señales elegibles con tamaño en esta ventana. La simulación las procesa todas secuencialmente; no modela exposición solapada, margen de cuenta ni qué señales recibió o ejecutó un suscriptor.',
    smoothedSummary: 'Suavizado de atípicos: el múltiplo R de cada operación se limita a {cap} (se recorta el 5 % superior e inferior). La caída bruta es mayor.',
    bandAll: 'Todo', bandPremium: 'Premium', bandAllTitle: 'Señales elegibles con tamaño en el ámbito seleccionado.',
    bandPremiumTitle: 'Solo Premium: confianza ≥ 85. Es el subconjunto de mayor convicción de las señales elegibles.',
    smoothTitle: 'Recorta el 5 % superior e inferior de los resultados con un límite P95. Muestra la trayectoria sin atípicos de una sola operación en ninguna dirección.',
    smoothActive: 'Suavizado (P95)', smoothInactive: 'Suavizar atípicos',
    smoothBannerWithCap: 'Vista suavizada de atípicos (recorte P95): no es la trayectoria de capital bruta. El 5 % superior e inferior de los resultados se limita a {cap}; la caída bruta es mayor. Desactiva «Suavizado» para ver la curva sin modificar.',
    smoothBannerWithoutCap: 'Vista suavizada de atípicos (recorte P95): no es la trayectoria de capital bruta. El 5 % superior e inferior de los resultados se limita; la caída bruta es mayor. Desactiva «Suavizado» para ver la curva sin modificar.',
    noEvidence: 'No hay resultados observados-OHLCV aprobados con un stop loss registrado para esta ventana de simulación. No se muestra ningún marcador de rentabilidad cero.',
    sequentialResult: 'Resultado de la simulación secuencial',
    sequentialHint: 'Simulación hipotética de capital secuencial que comienza con 10.000 USD. Ordena por fecha las señales elegibles con tamaño, arriesga el 1 % del capital actual en cada señal, limita cada múltiplo R a 8R y descuenta supuestos estáticos de comisiones y deslizamiento por activo (aproximadamente 0,40 % en cripto, 0,10 % en metales y 0,04 % del nocional en FX). No usa ejecuciones de bróker ni modela exposición solapada, margen, apalancamiento, latencia, financiación o selección del suscriptor; por tanto, no es una rentabilidad real de cartera.',
    sequentialHintLabel: 'Qué significa la simulación secuencial',
    simulatedMaxDrawdown: 'Caída máxima simulada',
    maxDrawdownHint: 'Mayor caída de pico a valle de la simulación hipotética de capital secuencial durante esta ventana. Es una caída del modelo, no una caída observada en una cuenta de bróker o suscriptor.',
    maxDrawdownHintLabel: 'Qué significa la caída máxima',
    deepestDrop: 'Mayor caída de pico a valle', hypotheticalPath: '{start} → {end}',
    winRate: 'Tasa de aciertos',
    winRateHint: 'Señales contabilizadas cuyo resultado OHLCV de 24 horas alcanzó TP, dividido entre las señales contabilizadas con un resultado OHLCV utilizable de 24 horas. Un cierre no nulo a las 24 horas después de no alcanzar TP ni SL cuenta como fallo. Se excluyen los marcadores de vencimiento forzado nulos o ausentes, las filas simuladas y las filas bloqueadas por la puerta de riesgo.',
    winRateHintLabel: 'Qué significa la tasa de aciertos', breakEven: 'equilibrio {value}',
    resolvedSignals: 'Señales resueltas',
    resolvedHint: 'Señales con un resultado utilizable de 24 horas resuelto mediante OHLCV del proveedor: TP, SL o un cierre no nulo a las 24 horas después de no alcanzar ninguno. Se excluyen las filas abiertas, los marcadores de vencimiento forzado nulos o ausentes, las filas simuladas y las señales bloqueadas por la puerta de riesgo. Es un estudio de señales del motor, no un registro de ejecuciones de suscriptores.',
    resolvedHintLabel: 'Qué significan las señales resueltas',
    sharpeAnnualized: 'Sharpe (anualizado)',
    sharpeHint: 'Sharpe anualizado agrupado por día: las operaciones se agrupan por fecha UTC y se calcula la rentabilidad diaria media dividida por la desviación estándar de la rentabilidad diaria, multiplicada por la raíz cuadrada de 365. Se usan días naturales porque el motor abarca cripto, FX e índices sin una sesión común. La agrupación diaria es necesaria porque las rentabilidades por señal no son independientes ni tienen una distribución idéntica.',
    sharpeHintLabel: 'Qué significa la ratio de Sharpe',
    sharpeDaysOne: 'durante {count} día de negociación', sharpeDaysMany: 'durante {count} días de negociación',
    sharpeNeedsDays: 'necesita ≥5 días (actualmente {count})', avgRWin: 'R promedio por acierto',
    avgRWinHint: 'Múltiplo R promedio de las señales ganadoras resueltas mediante OHLCV. R es la distancia porcentual entre entrada y stop; +2,0R significa que el resultado de precio modelado duplicó la distancia de riesgo prevista. No es una ejecución de bróker ni una ganancia realizada de cuenta.',
    avgRWinHintLabel: 'Qué significa el R promedio por acierto', avgRLoss: 'R promedio por fallo',
    avgRLossHint: 'Múltiplo R promedio de las señales perdedoras resueltas mediante OHLCV. Los valores cercanos a -1R indican que el resultado de precio resuelto estuvo cerca de la distancia del stop prevista; no miden la calidad de ejecución del bróker ni el deslizamiento realizado.',
    avgRLossHintLabel: 'Qué significa el R promedio por fallo', expectancyNet: 'Expectativa (neta)',
    expectancyHint: 'R modelado promedio por señal elegible con tamaño tras los supuestos de costes indicados: expectativa bruta menos coste modelado promedio de comisiones y deslizamiento en R. Un valor bruto positivo con uno neto negativo significa que los costes supuestos superan la ventaja bruta observada. Es expectativa de estudio, no expectativa realizada de suscriptores.',
    expectancyHintLabel: 'Qué significa la expectativa', grossMinusCost: '{gross} bruto − {cost} de coste',
    rStatsAllOne: 'Las estadísticas R cubren {sized} operación con tamaño.',
    rStatsAllMany: 'Las estadísticas R cubren {sized} operaciones con tamaño.',
    rStatsExcludedOne: 'Las estadísticas R cubren {sized} operación con tamaño de {resolved} señales resueltas; se excluyen las filas antiguas sin stop.',
    rStatsExcludedMany: 'Las estadísticas R cubren {sized} operaciones con tamaño de {resolved} señales resueltas; se excluyen las filas antiguas sin stop.',
    dateRange: 'Intervalo: {range}.', loading: 'Cargando la simulación de capital',
    tooltipSignal: 'Señal n.º {count}', tooltipCumulative: '{value} acumulado',
  },
};

const zh: TrackRecordWidgetTranslations = {
  embed: {
    defaultLabel: '嵌入', copy: '复制', copied: '已复制', copyCode: '复制 {method} 代码', close: '关闭嵌入对话框',
    pairTitle: '嵌入 {pair} 小组件', trackRecordTitle: '嵌入交易记录小组件',
    pairDescription: '将此代码粘贴到任意网站，即可显示每 60 秒自动刷新的 {pair} 实时信号卡片。',
    trackRecordDescription: '将此代码粘贴到任意网站，即可显示每 60 秒自动刷新的实时交易记录。',
    iframeMethod: 'iframe 方式', scriptTag: 'Script 标签', docs: '查看完整嵌入文档 →',
  },
  share: {
    xDefaultLabel: '分享到 X', xAria: '在 X 上分享交易记录',
    xObserved: 'TradeClaw 在 {resolved} 条使用 OHLCV 解析的计数信号中观察到 {winRate} 胜率。这仅是信号研究数据，不是经纪商成交或投资组合收益：',
    xGeneric: 'TradeClaw 公开已记录的信号行、使用 OHLCV 解析的结果和排除项。这不是执行账本：',
    linkedinDefaultLabel: '分享到 LinkedIn', linkedinAria: '在 LinkedIn 上分享交易记录',
    linkedinObserved: 'TradeClaw 在 {resolved} 条计数信号中观察到 {winRate} 胜率，其结果由供应商 OHLCV 解析。这是信号研究数据，不是经纪商成交或客户投资组合收益。\n\n查看样本和方法：\n{url}',
    linkedinGeneric: 'TradeClaw 公开已记录的信号行、使用 OHLCV 解析的结果以及被排除的样本。这不是执行或客户账户账本：\n{url}',
  },
  trailingWeek: {
    aria: 'Premium 与全部合格信号的过去 7 天对比', title: '过去 7 天 — Premium 对比合格信号流',
    info: '对比过去 7 天 Premium 分组（信心度 ≥ 85）与合格定额信号流的顺序模拟结果。两者使用相同的模拟仓位和成本假设。',
    infoLabel: '此对比的含义', disclosure: '时间窗口以及模拟仓位和成本假设完全相同。这些是模拟，不是账户收益。',
    badgeBetter: 'Premium 比全部信号高 {delta}',
    badgeFewerTrades: 'Premium 比全部信号高 {delta}，原因是交易更少，而非准确率更高',
    badgeMatched: 'Premium 与全部信号持平，没有单笔优势', badgeWorse: 'Premium 比全部信号低 {delta}',
    eligibleLabel: '合格定额信号', premiumLabel: '仅 Premium（信心度 ≥ 85）', currentArchive: '当前归档模拟',
    archiveSummary: '全部信号：{allTrades} 笔交易的收益为 {allReturn}。Premium：{premiumTrades} 笔交易的收益为 {premiumReturn}。{verdict}',
    verdictBetter: '在当前归档模型中，该过滤器领先。', verdictFewerTrades: '该过滤器仅因交易更少而领先。',
    verdictWorse: '在当前归档模型中，该过滤器落后。', sequentialSimulation: '顺序模拟', win: '胜率', trades: '交易数', expectancy: '期望值',
    breakEven: '盈亏平衡 {value} · 7 天窗口', breakEvenUnavailable: '盈亏平衡值不可用 · 7 天窗口',
  },
  equity: {
    chartEmpty: '信号记录并解析后将开始跟踪表现。', chartLabel: '顺序权益模拟图', title: '信号研究 — 顺序模拟',
    broadcastSubset: '广播子集', eligibleStream: '合格信号流',
    broadcastNoSummary: '风险门控批准的广播子集；自 {date} 起记录决策。',
    broadcastWithCap: '风险门控批准的广播子集；自 {date} 起记录决策。顺序模拟对每条信号使用 {risk} 的模拟风险，上限为 {cap}，并扣除按资产设定的手续费和滑点（平均每条信号 {cost} ≈ {costR}）。',
    broadcastWithoutCap: '风险门控批准的广播子集；自 {date} 起记录决策。顺序模拟对每条信号使用 {risk} 的模拟风险，并扣除按资产设定的手续费和滑点（平均每条信号 {cost} ≈ {costR}）。',
    eligibleNoSummary: '合格信号流。结果必须具有经批准的实测 OHLCV 来源；不使用经纪商成交。',
    eligibleWithCap: '合格信号流。固定比例顺序模拟对每条信号使用 {risk} 的模拟风险，每条信号上限为 {cap}，并扣除按资产设定的手续费和滑点（平均每条信号 {cost} ≈ {costR}）。结果必须具有经批准的实测 OHLCV 来源；不使用经纪商成交。',
    eligibleWithoutCap: '合格信号流。固定比例顺序模拟对每条信号使用 {risk} 的模拟风险，并扣除按资产设定的手续费和滑点（平均每条信号 {cost} ≈ {costR}）。结果必须具有经批准的实测 OHLCV 来源；不使用经纪商成交。',
    sizedSignalsOne: '此窗口有 {count} 条合格定额信号。模拟会顺序处理该信号；它不模拟重叠敞口、账户保证金，也不模拟订阅者收到或执行了哪些信号。',
    sizedSignalsMany: '此窗口有 {count} 条合格定额信号。模拟会顺序处理所有信号；它不模拟重叠敞口、账户保证金，也不模拟订阅者收到或执行了哪些信号。',
    smoothedSummary: '异常值平滑：每笔交易的 R 倍数限制为 {cap}（剪裁顶部和底部各 5%）。原始回撤更大。',
    bandAll: '全部', bandPremium: 'Premium', bandAllTitle: '选定范围内的合格定额信号。',
    bandPremiumTitle: '仅 Premium：信心度 ≥ 85。这是合格信号中高确信度的子集。',
    smoothTitle: '使用 P95 上限剪裁顶部和底部各 5% 的交易结果，以查看不受单笔交易双向异常值影响的路径。',
    smoothActive: '已平滑（P95）', smoothInactive: '平滑异常值',
    smoothBannerWithCap: '异常值平滑视图（P95 剪裁）——这不是原始权益路径。顶部和底部各 5% 的交易结果限制为 {cap}；原始回撤更大。关闭“已平滑”可查看未修改曲线。',
    smoothBannerWithoutCap: '异常值平滑视图（P95 剪裁）——这不是原始权益路径。顶部和底部各 5% 的交易结果已限制；原始回撤更大。关闭“已平滑”可查看未修改曲线。',
    noEvidence: '此模拟窗口没有带已记录止损的经批准实测 OHLCV 结果。不会显示零收益占位符。',
    sequentialResult: '顺序模拟结果',
    sequentialHint: '这是从 10,000 美元开始的假设性顺序权益模拟。它按时间戳排列合格定额信号，每条信号冒当前权益 1% 的风险，将每个 R 倍数上限设为 8R，并扣除静态的按资产手续费和滑点假设（加密资产约 0.40%、贵金属约 0.10%、FX 名义金额约 0.04%）。它不使用经纪商成交，也不模拟重叠敞口、保证金、杠杆、延迟、资金费或订阅者选择，因此不是实际投资组合收益。',
    sequentialHintLabel: '顺序模拟的含义', simulatedMaxDrawdown: '模拟最大回撤',
    maxDrawdownHint: '此窗口内假设性顺序权益模拟从峰值到谷值的最大降幅。这是模型回撤，不是经纪商或订阅者账户中观察到的回撤。',
    maxDrawdownHintLabel: '最大回撤的含义', deepestDrop: '从峰值到谷值的最大降幅', hypotheticalPath: '{start} → {end}',
    winRate: '胜率',
    winRateHint: '24 小时 OHLCV 结果触及 TP 的计数信号，除以具有可用 24 小时 OHLCV 结果的计数信号。如果 TP 和 SL 都未触及，但 24 小时收盘值非零，则计为失败。排除零值或缺失的强制到期占位符、模拟行和被风险门控阻止的行。',
    winRateHintLabel: '胜率的含义', breakEven: '盈亏平衡 {value}', resolvedSignals: '已解析信号',
    resolvedHint: '通过供应商 OHLCV 解析出可用 24 小时结果的信号：TP、SL，或两者都未触及后的非零 24 小时收盘值。排除仍未平仓的行、零值或缺失的强制到期占位符、模拟行和被风险门控阻止的信号。这是引擎信号研究，不是订阅者执行账本。',
    resolvedHintLabel: '已解析信号的含义', sharpeAnnualized: 'Sharpe（年化）',
    sharpeHint: '按日分组的年化 Sharpe：先按 UTC 日期对交易分组，再用日均收益除以日收益标准差，并乘以 365 的平方根。由于引擎横跨加密资产、FX 和指数，没有共同交易时段，因此使用日历日。每条信号的收益非独立同分布，所以必须按日分组。',
    sharpeHintLabel: 'Sharpe 比率的含义',
    sharpeDaysOne: '覆盖 {count} 个交易日', sharpeDaysMany: '覆盖 {count} 个交易日', sharpeNeedsDays: '需要 ≥5 天（当前 {count} 天）',
    avgRWin: '平均每笔胜交易 R',
    avgRWinHint: '获利且由 OHLCV 解析的信号的平均 R 倍数。R 是入场价到止损价的百分比距离；+2.0R 表示模拟价格结果是计划风险距离的两倍。这不是经纪商成交或账户已实现收益。',
    avgRWinHintLabel: '平均每笔胜交易 R 的含义', avgRLoss: '平均每笔亏损 R',
    avgRLossHint: '亏损且由 OHLCV 解析的信号的平均 R 倍数。接近 -1R 表示解析的价格结果接近计划止损距离；它不衡量经纪商成交质量或已实现滑点。',
    avgRLossHintLabel: '平均每笔亏损 R 的含义', expectancyNet: '期望值（净）',
    expectancyHint: '扣除已声明成本假设后，每条合格定额信号的平均模拟 R：毛期望值减去以 R 计的平均模拟手续费和滑点成本。毛值为正而净值为负，表示假设成本超过观察到的毛优势。这是研究期望值，不是订阅者已实现期望值。',
    expectancyHintLabel: '期望值的含义',
    grossMinusCost: '毛值 {gross} − 成本 {cost}', rStatsAllOne: 'R 统计覆盖 {sized} 笔定额交易。',
    rStatsAllMany: 'R 统计覆盖 {sized} 笔定额交易。',
    rStatsExcludedOne: 'R 统计覆盖 {resolved} 条已解析信号中的 {sized} 笔定额交易；已排除没有止损的旧数据行。',
    rStatsExcludedMany: 'R 统计覆盖 {resolved} 条已解析信号中的 {sized} 笔定额交易；已排除没有止损的旧数据行。',
    dateRange: '范围：{range}。', loading: '正在加载权益模拟', tooltipSignal: '信号 #{count}', tooltipCumulative: '累计 {value}',
  },
};

const ms: TrackRecordWidgetTranslations = {
  embed: {
    defaultLabel: 'Benam', copy: 'Salin', copied: 'Disalin', copyCode: 'Salin kod {method}', close: 'Tutup dialog benam',
    pairTitle: 'Benam widget {pair}', trackRecordTitle: 'Benam widget rekod prestasi',
    pairDescription: 'Tampalkan ini pada mana-mana laman web untuk memaparkan kad isyarat langsung {pair} yang disegar semula secara automatik setiap 60 saat.',
    trackRecordDescription: 'Tampalkan ini pada mana-mana laman web untuk memaparkan rekod prestasi langsung yang disegar semula secara automatik setiap 60 saat.',
    iframeMethod: 'Kaedah iframe', scriptTag: 'Tag script', docs: 'Lihat dokumentasi benam penuh →',
  },
  share: {
    xDefaultLabel: 'Kongsi di X', xAria: 'Kongsi rekod prestasi di X',
    xObserved: 'TradeClaw memerhatikan kadar menang {winRate} merentas {resolved} isyarat dikira yang diselesaikan menggunakan OHLCV. Ini hanyalah data kajian isyarat, bukan pengisian broker atau pulangan portfolio:',
    xGeneric: 'TradeClaw menerbitkan baris isyarat yang direkodkan, hasil yang diselesaikan menggunakan OHLCV dan pengecualian. Ini bukan lejar pelaksanaan:',
    linkedinDefaultLabel: 'Kongsi di LinkedIn', linkedinAria: 'Kongsi rekod prestasi di LinkedIn',
    linkedinObserved: 'TradeClaw memerhatikan kadar menang {winRate} merentas {resolved} isyarat dikira yang hasilnya diselesaikan berdasarkan OHLCV penyedia. Ini ialah data kajian isyarat, bukan pengisian broker atau pulangan portfolio pelanggan.\n\nPeriksa populasi dan metodologi:\n{url}',
    linkedinGeneric: 'TradeClaw menerbitkan baris isyarat yang direkodkan, hasil yang diselesaikan menggunakan OHLCV dan populasi yang dikecualikan. Ini bukan lejar pelaksanaan atau akaun pelanggan:\n{url}',
  },
  trailingWeek: {
    aria: 'Perbandingan 7 hari terkini antara Premium dengan semua isyarat layak', title: '7 Hari Terkini — Premium berbanding Aliran Layak',
    info: 'Hasil simulasi berurutan secara sebelah-menyebelah bagi jalur Premium (keyakinan ≥ 85) dan aliran isyarat bersaiz yang layak sepanjang 7 hari terkini. Kedua-duanya menggunakan andaian saiz dan kos bermodel yang sama.',
    infoLabel: 'Maksud perbandingan ini', disclosure: 'Tetingkap serta andaian saiz dan kos bermodel adalah sama. Ini simulasi, bukan pulangan akaun.',
    badgeBetter: 'Premium mengatasi Semua sebanyak {delta}',
    badgeFewerTrades: 'Premium berada {delta} berbanding Semua kerana kurang berdagang, bukan kerana ketepatan lebih tinggi',
    badgeMatched: 'Premium menyamai Semua tanpa kelebihan setiap dagangan', badgeWorse: 'Premium ketinggalan daripada Semua sebanyak {delta}',
    eligibleLabel: 'Isyarat bersaiz yang layak', premiumLabel: 'Premium sahaja (keyakinan ≥ 85)', currentArchive: 'Simulasi arkib semasa',
    archiveSummary: 'Semua: {allReturn} merentas {allTrades} dagangan. Premium: {premiumReturn} merentas {premiumTrades} dagangan. {verdict}',
    verdictBetter: 'Penapis mendahului dalam model arkib semasa.', verdictFewerTrades: 'Penapis mendahului hanya kerana kurang berdagang.',
    verdictWorse: 'Penapis ketinggalan dalam model arkib semasa.', sequentialSimulation: 'simulasi berurutan', win: 'Kadar menang', trades: 'Dagangan', expectancy: 'Jangkaan',
    breakEven: 'Pulang modal {value} · tetingkap 7 hari', breakEvenUnavailable: 'Pulang modal tidak tersedia · tetingkap 7 hari',
  },
  equity: {
    chartEmpty: 'Penjejakan prestasi akan bermula selepas isyarat direkodkan dan diselesaikan.', chartLabel: 'Carta simulasi ekuiti berurutan',
    title: 'Kajian Isyarat — Simulasi Berurutan', broadcastSubset: 'Subset siaran', eligibleStream: 'Aliran layak',
    broadcastNoSummary: 'Subset siaran yang diluluskan gerbang; keputusan direkodkan sejak {date}.',
    broadcastWithCap: 'Subset siaran yang diluluskan gerbang; keputusan direkodkan sejak {date}. Simulasi berurutan menggunakan risiko bermodel {risk} bagi setiap isyarat, dihadkan pada {cap}, selepas andaian fi dan gelinciran setiap aset (purata {cost} ≈ {costR} bagi setiap isyarat).',
    broadcastWithoutCap: 'Subset siaran yang diluluskan gerbang; keputusan direkodkan sejak {date}. Simulasi berurutan menggunakan risiko bermodel {risk} bagi setiap isyarat selepas andaian fi dan gelinciran setiap aset (purata {cost} ≈ {costR} bagi setiap isyarat).',
    eligibleNoSummary: 'Aliran isyarat layak. Hasil memerlukan asal usul OHLCV diperhati yang diluluskan; pengisian broker tidak digunakan.',
    eligibleWithCap: 'Aliran isyarat layak. Simulasi berurutan pecahan tetap menggunakan risiko bermodel {risk} bagi setiap isyarat, dihadkan pada {cap} bagi setiap isyarat, selepas andaian fi dan gelinciran setiap aset (purata {cost} ≈ {costR} bagi setiap isyarat). Hasil memerlukan asal usul OHLCV diperhati yang diluluskan; pengisian broker tidak digunakan.',
    eligibleWithoutCap: 'Aliran isyarat layak. Simulasi berurutan pecahan tetap menggunakan risiko bermodel {risk} bagi setiap isyarat selepas andaian fi dan gelinciran setiap aset (purata {cost} ≈ {costR} bagi setiap isyarat). Hasil memerlukan asal usul OHLCV diperhati yang diluluskan; pengisian broker tidak digunakan.',
    sizedSignalsOne: 'Terdapat {count} isyarat bersaiz yang layak dalam tetingkap ini. Simulasi memprosesnya secara berurutan; simulasi tidak memodelkan pendedahan bertindih, margin akaun atau isyarat yang diterima atau dilaksanakan pelanggan.',
    sizedSignalsMany: 'Terdapat {count} isyarat bersaiz yang layak dalam tetingkap ini. Simulasi memproses semuanya secara berurutan; simulasi tidak memodelkan pendedahan bertindih, margin akaun atau isyarat yang diterima atau dilaksanakan pelanggan.',
    smoothedSummary: 'Dilicinkan daripada pencilan: gandaan R setiap dagangan dihadkan pada {cap} (5% teratas dan terbawah dipotong). Susut nilai mentah lebih besar.',
    bandAll: 'Semua', bandPremium: 'Premium', bandAllTitle: 'Isyarat bersaiz yang layak dalam skop dipilih.',
    bandPremiumTitle: 'Premium sahaja: keyakinan ≥ 85. Ini subset berkeyakinan tinggi bagi isyarat layak.',
    smoothTitle: 'Potong 5% teratas dan terbawah hasil dagangan menggunakan had P95. Ini menunjukkan laluan tanpa pencilan dagangan tunggal dalam kedua-dua arah.',
    smoothActive: 'Dilicinkan (P95)', smoothInactive: 'Licinkan pencilan',
    smoothBannerWithCap: 'Paparan dilicinkan daripada pencilan (dipotong P95) — ini bukan laluan ekuiti mentah. 5% teratas dan terbawah hasil dagangan dihadkan pada {cap}; susut nilai mentah lebih besar. Matikan “Dilicinkan” untuk lengkung tanpa pengubahsuaian.',
    smoothBannerWithoutCap: 'Paparan dilicinkan daripada pencilan (dipotong P95) — ini bukan laluan ekuiti mentah. 5% teratas dan terbawah hasil dagangan dihadkan; susut nilai mentah lebih besar. Matikan “Dilicinkan” untuk lengkung tanpa pengubahsuaian.',
    noEvidence: 'Tiada hasil OHLCV diperhati yang diluluskan dengan henti rugi direkodkan tersedia untuk tetingkap simulasi ini. Tiada pemegang tempat pulangan sifar dipaparkan.',
    sequentialResult: 'Hasil simulasi berurutan',
    sequentialHint: 'Simulasi ekuiti berurutan hipotesis bermula dengan USD10,000. Simulasi menyusun isyarat bersaiz yang layak mengikut cap masa, mempertaruhkan 1% ekuiti semasa pada setiap isyarat, mengehadkan setiap gandaan R pada 8R dan menolak andaian fi serta gelinciran statik setiap aset (kira-kira 0.40% kripto, 0.10% logam dan 0.04% notional FX). Simulasi tidak menggunakan pengisian broker atau memodelkan pendedahan bertindih, margin, leveraj, kependaman, pendanaan atau pemilihan pelanggan; maka ini bukan pulangan portfolio sebenar.',
    sequentialHintLabel: 'Maksud simulasi berurutan', simulatedMaxDrawdown: 'Susut Nilai Maksimum Tersimulasi',
    maxDrawdownHint: 'Penurunan puncak ke palung paling buruk dalam simulasi ekuiti berurutan hipotesis sepanjang tetingkap ini. Ini susut nilai model, bukan susut nilai yang diperhatikan dalam akaun broker atau pelanggan.',
    maxDrawdownHintLabel: 'Maksud susut nilai maksimum', deepestDrop: 'Penurunan puncak ke palung terdalam', hypotheticalPath: '{start} → {end}',
    winRate: 'Kadar Menang',
    winRateHint: 'Isyarat dikira yang hasil OHLCV 24 jamnya mencapai TP, dibahagi dengan isyarat dikira yang mempunyai hasil OHLCV 24 jam yang boleh digunakan. Penutupan 24 jam bukan sifar selepas TP dan SL tidak dicapai dikira sebagai kalah. Pemegang tempat tamat paksa sifar atau hilang, baris simulasi dan baris disekat gerbang dikecualikan.',
    winRateHintLabel: 'Maksud kadar menang', breakEven: 'pulang modal {value}', resolvedSignals: 'Isyarat Diselesaikan',
    resolvedHint: 'Isyarat dengan hasil 24 jam yang boleh digunakan dan diselesaikan daripada OHLCV penyedia: TP, SL atau penutupan 24 jam bukan sifar selepas kedua-duanya tidak dicapai. Baris yang masih terbuka, pemegang tempat tamat paksa sifar atau hilang, baris simulasi dan isyarat disekat gerbang dikecualikan. Ini kajian isyarat enjin, bukan lejar pelaksanaan pelanggan.',
    resolvedHintLabel: 'Maksud isyarat diselesaikan', sharpeAnnualized: 'Sharpe (tahunan)',
    sharpeHint: 'Sharpe tahunan berkelompok harian: dagangan dikumpulkan mengikut tarikh UTC, kemudian purata pulangan harian dibahagi sisihan piawai pulangan harian dan didarab punca kuasa dua 365. Hari kalendar digunakan kerana enjin merangkumi kripto, FX dan indeks tanpa sesi bersama. Pengelompokan harian diperlukan kerana pulangan setiap isyarat bukan bebas dan bertaburan serupa.',
    sharpeHintLabel: 'Maksud nisbah Sharpe',
    sharpeDaysOne: 'sepanjang {count} hari dagangan', sharpeDaysMany: 'sepanjang {count} hari dagangan', sharpeNeedsDays: 'memerlukan ≥5 hari (kini {count})',
    avgRWin: 'Purata R setiap Menang',
    avgRWinHint: 'Purata gandaan R bagi isyarat menang yang diselesaikan menggunakan OHLCV. R ialah jarak peratus antara kemasukan dengan henti; +2.0R bermaksud hasil harga bermodel ialah dua kali jarak risiko yang dirancang. Ini bukan pengisian broker atau keuntungan akaun yang direalisasikan.',
    avgRWinHintLabel: 'Maksud purata R setiap kemenangan', avgRLoss: 'Purata R setiap Kalah',
    avgRLossHint: 'Purata gandaan R bagi isyarat kalah yang diselesaikan menggunakan OHLCV. Nilai hampir -1R bermaksud hasil harga yang diselesaikan hampir dengan jarak henti yang dirancang; nilai ini tidak mengukur mutu pengisian broker atau gelinciran direalisasikan.',
    avgRLossHintLabel: 'Maksud purata R setiap kekalahan', expectancyNet: 'Jangkaan (bersih)',
    expectancyHint: 'Purata R bermodel bagi setiap isyarat bersaiz yang layak selepas andaian kos dinyatakan: jangkaan kasar ditolak purata kos fi dan gelinciran bermodel dalam R. Nilai kasar positif bersama nilai bersih negatif bermaksud kos andaian melebihi kelebihan kasar yang diperhatikan. Ini jangkaan kajian, bukan jangkaan pelanggan yang direalisasikan.',
    expectancyHintLabel: 'Maksud jangkaan',
    grossMinusCost: '{gross} kasar − {cost} kos', rStatsAllOne: 'Statistik R meliputi {sized} dagangan bersaiz.',
    rStatsAllMany: 'Statistik R meliputi {sized} dagangan bersaiz.',
    rStatsExcludedOne: 'Statistik R meliputi {sized} dagangan bersaiz daripada {resolved} isyarat diselesaikan; baris lama tanpa henti dikecualikan.',
    rStatsExcludedMany: 'Statistik R meliputi {sized} dagangan bersaiz daripada {resolved} isyarat diselesaikan; baris lama tanpa henti dikecualikan.',
    dateRange: 'Julat: {range}.', loading: 'Memuatkan simulasi ekuiti', tooltipSignal: 'Isyarat #{count}', tooltipCumulative: '{value} terkumpul',
  },
};

const ar: TrackRecordWidgetTranslations = {
  embed: {
    defaultLabel: 'تضمين', copy: 'نسخ', copied: 'تم النسخ', copyCode: 'نسخ رمز {method}', close: 'إغلاق مربع حوار التضمين',
    pairTitle: 'تضمين أداة {pair}', trackRecordTitle: 'تضمين أداة سجل الأداء',
    pairDescription: 'الصق هذا الرمز في أي موقع لعرض بطاقة إشارة {pair} مباشرة يتم تحديثها تلقائيًا كل 60 ثانية.',
    trackRecordDescription: 'الصق هذا الرمز في أي موقع لعرض سجل الأداء المباشر الذي يتم تحديثه تلقائيًا كل 60 ثانية.',
    iframeMethod: 'طريقة iframe', scriptTag: 'وسم script', docs: 'عرض وثائق التضمين الكاملة ←',
  },
  share: {
    xDefaultLabel: 'مشاركة على X', xAria: 'مشاركة سجل الأداء على X',
    xObserved: 'رصدت TradeClaw نسبة فوز {winRate} عبر {resolved} إشارة محتسبة حُسمت باستخدام OHLCV. هذه بيانات دراسة إشارات فقط، وليست تنفيذات وسيط أو عوائد محفظة:',
    xGeneric: 'تنشر TradeClaw صفوف الإشارات المسجلة والنتائج المحسومة باستخدام OHLCV والاستبعادات. هذا ليس سجل تنفيذ:',
    linkedinDefaultLabel: 'مشاركة على LinkedIn', linkedinAria: 'مشاركة سجل الأداء على LinkedIn',
    linkedinObserved: 'رصدت TradeClaw نسبة فوز {winRate} عبر {resolved} إشارة محتسبة، حيث حُسمت نتائجها بيانات OHLCV من المزوّد. هذه بيانات دراسة إشارات، وليست تنفيذات وسيط أو عوائد محافظ العملاء.\n\nافحص المجموعة والمنهجية:\n{url}',
    linkedinGeneric: 'تنشر TradeClaw صفوف الإشارات المسجلة والنتائج المحسومة باستخدام OHLCV والمجموعات المستبعدة. هذا ليس سجل تنفيذ أو حسابات عملاء:\n{url}',
  },
  trailingWeek: {
    aria: 'مقارنة آخر 7 أيام بين Premium وجميع الإشارات المؤهلة', title: 'آخر 7 أيام — Premium مقابل التدفق المؤهل',
    info: 'نتائج متقابلة للمحاكاة المتسلسلة لنطاق Premium (الثقة ≥ 85) وتدفق الإشارات المؤهلة ذات الحجم خلال آخر 7 أيام. يستخدم كلاهما افتراضات الحجم والتكلفة النموذجية نفسها.',
    infoLabel: 'ماذا توضح هذه المقارنة', disclosure: 'النافذة وافتراضات الحجم والتكلفة النموذجية متطابقة. هذه محاكاة وليست عوائد حسابات.',
    badgeBetter: 'تفوّق Premium على الكل بمقدار {delta}',
    badgeFewerTrades: 'يتقدم Premium بمقدار {delta} على الكل لأنه تداول أقل، لا لأن الدقة أعلى',
    badgeMatched: 'تعادل Premium مع الكل بلا ميزة لكل صفقة', badgeWorse: 'تأخر Premium عن الكل بمقدار {delta}',
    eligibleLabel: 'إشارات مؤهلة ذات حجم', premiumLabel: 'Premium فقط (الثقة ≥ 85)', currentArchive: 'محاكاة الأرشيف الحالي',
    archiveSummary: 'الكل: عائد {allReturn} عبر {allTrades} صفقة. Premium: عائد {premiumReturn} عبر {premiumTrades} صفقة. {verdict}',
    verdictBetter: 'المرشح متقدم في نموذج الأرشيف الحالي.', verdictFewerTrades: 'المرشح متقدم فقط لأنه تداول أقل.',
    verdictWorse: 'المرشح متأخر في نموذج الأرشيف الحالي.', sequentialSimulation: 'محاكاة متسلسلة', win: 'نسبة الفوز', trades: 'الصفقات', expectancy: 'التوقع',
    breakEven: 'التعادل {value} · نافذة 7 أيام', breakEvenUnavailable: 'قيمة التعادل غير متاحة · نافذة 7 أيام',
  },
  equity: {
    chartEmpty: 'سيبدأ تتبع الأداء بعد تسجيل الإشارات وحسمها.', chartLabel: 'مخطط المحاكاة المتسلسلة لرأس المال',
    title: 'دراسة الإشارات — محاكاة متسلسلة', broadcastSubset: 'مجموعة البث', eligibleStream: 'التدفق المؤهل',
    broadcastNoSummary: 'مجموعة البث المعتمدة من البوابة؛ تُسجل القرارات منذ {date}.',
    broadcastWithCap: 'مجموعة البث المعتمدة من البوابة؛ تُسجل القرارات منذ {date}. تستخدم المحاكاة المتسلسلة مخاطر نموذجية قدرها {risk} لكل إشارة بحد أقصى {cap}، بعد افتراضات الرسوم والانزلاق لكل أصل (متوسط {cost} ≈ {costR} لكل إشارة).',
    broadcastWithoutCap: 'مجموعة البث المعتمدة من البوابة؛ تُسجل القرارات منذ {date}. تستخدم المحاكاة المتسلسلة مخاطر نموذجية قدرها {risk} لكل إشارة، بعد افتراضات الرسوم والانزلاق لكل أصل (متوسط {cost} ≈ {costR} لكل إشارة).',
    eligibleNoSummary: 'تدفق الإشارات المؤهلة. تتطلب النتائج مصدر OHLCV مرصودًا ومعتمدًا؛ ولا تُستخدم تنفيذات وسيط.',
    eligibleWithCap: 'تدفق الإشارات المؤهلة. تستخدم المحاكاة المتسلسلة ذات الكسر الثابت مخاطر نموذجية قدرها {risk} لكل إشارة بحد أقصى {cap} لكل إشارة، بعد افتراضات الرسوم والانزلاق لكل أصل (متوسط {cost} ≈ {costR} لكل إشارة). تتطلب النتائج مصدر OHLCV مرصودًا ومعتمدًا؛ ولا تُستخدم تنفيذات وسيط.',
    eligibleWithoutCap: 'تدفق الإشارات المؤهلة. تستخدم المحاكاة المتسلسلة ذات الكسر الثابت مخاطر نموذجية قدرها {risk} لكل إشارة، بعد افتراضات الرسوم والانزلاق لكل أصل (متوسط {cost} ≈ {costR} لكل إشارة). تتطلب النتائج مصدر OHLCV مرصودًا ومعتمدًا؛ ولا تُستخدم تنفيذات وسيط.',
    sizedSignalsOne: 'توجد {count} إشارة مؤهلة ذات حجم في هذه النافذة. تعالجها المحاكاة بالتسلسل؛ ولا تحاكي التعرض المتداخل أو هامش الحساب أو الإشارات التي تلقاها المشترك أو نفذها.',
    sizedSignalsMany: 'توجد {count} إشارات مؤهلة ذات حجم في هذه النافذة. تعالجها المحاكاة كلها بالتسلسل؛ ولا تحاكي التعرض المتداخل أو هامش الحساب أو الإشارات التي تلقاها المشترك أو نفذها.',
    smoothedSummary: 'تنعيم القيم المتطرفة: يُحد مضاعف R لكل صفقة عند {cap} (يُقص أعلى وأدنى 5٪). التراجع الخام أكبر.',
    bandAll: 'الكل', bandPremium: 'Premium', bandAllTitle: 'الإشارات المؤهلة ذات الحجم في النطاق المحدد.',
    bandPremiumTitle: 'Premium فقط: الثقة ≥ 85. هذه مجموعة عالية الثقة من الإشارات المؤهلة.',
    smoothTitle: 'قص أعلى وأدنى 5٪ من نتائج الصفقات باستخدام حد P95. يوضح هذا المسار بدون القيم المتطرفة لصفقة واحدة في أي اتجاه.',
    smoothActive: 'منعم (P95)', smoothInactive: 'تنعيم القيم المتطرفة',
    smoothBannerWithCap: 'عرض منعم للقيم المتطرفة (قص P95) — هذا ليس مسار رأس المال الخام. يُحد أعلى وأدنى 5٪ من نتائج الصفقات عند {cap}؛ والتراجع الخام أكبر. أوقف «منعم» لعرض المنحنى بدون تعديل.',
    smoothBannerWithoutCap: 'عرض منعم للقيم المتطرفة (قص P95) — هذا ليس مسار رأس المال الخام. يُحد أعلى وأدنى 5٪ من نتائج الصفقات؛ والتراجع الخام أكبر. أوقف «منعم» لعرض المنحنى بدون تعديل.',
    noEvidence: 'لا تتوفر نتائج OHLCV مرصودة ومعتمدة مع وقف خسارة مسجل لنافذة المحاكاة هذه. لا يُعرض عنصر نائب بعائد صفري.',
    sequentialResult: 'نتيجة المحاكاة المتسلسلة',
    sequentialHint: 'محاكاة افتراضية متسلسلة لرأس المال تبدأ بمبلغ 10,000 دولار أمريكي. ترتب الإشارات المؤهلة ذات الحجم حسب الطابع الزمني، وتخاطر بنسبة 1٪ من رأس المال الحالي في كل إشارة، وتحد كل مضاعف R عند 8R، وتخصم افتراضات ثابتة للرسوم والانزلاق لكل أصل (نحو 0.40٪ للعملات المشفرة، و0.10٪ للمعادن، و0.04٪ من القيمة الاسمية لعملات FX). لا تستخدم تنفيذات الوسيط ولا تحاكي التعرض المتداخل أو الهامش أو الرافعة أو التأخير أو التمويل أو اختيار المشترك، لذلك ليست عائدًا فعليًا لمحفظة.',
    sequentialHintLabel: 'معنى المحاكاة المتسلسلة',
    simulatedMaxDrawdown: 'أقصى تراجع محاكى',
    maxDrawdownHint: 'أسوأ انخفاض من القمة إلى القاع في المحاكاة الافتراضية المتسلسلة لرأس المال خلال هذه النافذة. هذا تراجع نموذجي، وليس تراجعًا مرصودًا في حساب وسيط أو مشترك.',
    maxDrawdownHintLabel: 'معنى أقصى تراجع', deepestDrop: 'أعمق انخفاض من القمة إلى القاع',
    hypotheticalPath: '{start} ← {end}', winRate: 'نسبة الفوز',
    winRateHint: 'عدد الإشارات المحتسبة التي وصلت نتيجتها المستندة إلى OHLCV خلال 24 ساعة إلى TP، مقسومًا على الإشارات المحتسبة ذات نتيجة OHLCV صالحة خلال 24 ساعة. يُحتسب إغلاق 24 ساعة غير الصفري بعد عدم بلوغ TP أو SL كخسارة. تُستبعد عناصر انتهاء الصلاحية القسري الصفرية أو المفقودة، والصفوف المحاكاة، والصفوف المحجوبة بالبوابة.',
    winRateHintLabel: 'معنى نسبة الفوز', breakEven: 'التعادل {value}',
    resolvedSignals: 'الإشارات المحسومة',
    resolvedHint: 'إشارات ذات نتيجة صالحة خلال 24 ساعة محسومة من OHLCV للمزوّد: TP أو SL أو إغلاق 24 ساعة غير صفري بعد عدم بلوغ أي منهما. تُستبعد الصفوف المفتوحة، وعناصر انتهاء الصلاحية القسري الصفرية أو المفقودة، والصفوف المحاكاة، والإشارات المحجوبة بالبوابة. هذه دراسة إشارات للمحرك، وليست سجل تنفيذ للمشتركين.',
    resolvedHintLabel: 'معنى الإشارات المحسومة', sharpeAnnualized: 'Sharpe (سنوي)',
    sharpeHint: 'نسبة Sharpe سنوية مجمعة يوميًا: تُجمع الصفقات حسب تاريخ UTC، ثم يُقسم متوسط العائد اليومي على الانحراف المعياري للعائد اليومي ويُضرب في الجذر التربيعي لـ 365. تُستخدم أيام التقويم لأن المحرك يغطي العملات المشفرة وFX والمؤشرات بلا جلسة مشتركة. التجميع اليومي ضروري لأن عوائد الإشارات ليست مستقلة وموزعة توزيعًا متطابقًا.',
    sharpeHintLabel: 'معنى نسبة Sharpe', sharpeDaysOne: 'على مدار {count} يوم تداول', sharpeDaysMany: 'على مدار {count} أيام تداول',
    sharpeNeedsDays: 'يحتاج إلى ≥5 أيام (المتاح حاليًا {count})', avgRWin: 'متوسط R لكل فوز',
    avgRWinHint: 'متوسط مضاعف R للإشارات الرابحة المحسومة باستخدام OHLCV. تمثل R المسافة المئوية بين الدخول ووقف الخسارة؛ وتعني +2.0R أن نتيجة السعر النموذجية بلغت ضعف مسافة المخاطر المخططة. هذا ليس تنفيذ وسيط أو ربح حساب محققًا.',
    avgRWinHintLabel: 'معنى متوسط R لكل فوز', avgRLoss: 'متوسط R لكل خسارة',
    avgRLossHint: 'متوسط مضاعف R للإشارات الخاسرة المحسومة باستخدام OHLCV. تعني القيم القريبة من -1R أن نتيجة السعر المحسومة كانت قريبة من مسافة وقف الخسارة المخططة؛ وهي لا تقيس جودة تنفيذ الوسيط أو الانزلاق المحقق.',
    avgRLossHintLabel: 'معنى متوسط R لكل خسارة',
    expectancyNet: 'التوقع (صافٍ)',
    expectancyHint: 'متوسط R النموذجي لكل إشارة مؤهلة ذات حجم بعد افتراضات التكلفة المذكورة: التوقع الإجمالي ناقص متوسط تكلفة الرسوم والانزلاق النموذجية مقاسة بـ R. تعني القيمة الإجمالية الموجبة مع قيمة صافية سالبة أن التكاليف المفترضة تتجاوز الميزة الإجمالية المرصودة. هذا توقع دراسة، وليس توقعًا محققًا للمشتركين.',
    expectancyHintLabel: 'معنى التوقع', grossMinusCost: 'إجمالي {gross} − تكلفة {cost}',
    rStatsAllOne: 'تغطي إحصاءات R صفقة واحدة ذات حجم، وعددها {sized}.', rStatsAllMany: 'تغطي إحصاءات R صفقات ذات حجم عددها {sized}.',
    rStatsExcludedOne: 'تغطي إحصاءات R صفقة واحدة ذات حجم، وعددها {sized}، من بين {resolved} إشارة محسومة؛ وتُستبعد الصفوف القديمة بلا وقف.',
    rStatsExcludedMany: 'تغطي إحصاءات R صفقات ذات حجم عددها {sized} من بين {resolved} إشارة محسومة؛ وتُستبعد الصفوف القديمة بلا وقف.',
    dateRange: 'النطاق: {range}.', loading: 'جارٍ تحميل محاكاة رأس المال', tooltipSignal: 'الإشارة رقم {count}', tooltipCumulative: 'تراكمي {value}',
  },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, TrackRecordWidgetTranslations>;

export function getTrackRecordWidgetTranslations(locale: Locale): TrackRecordWidgetTranslations {
  return dictionaries[locale];
}
