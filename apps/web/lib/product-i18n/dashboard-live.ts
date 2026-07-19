import type { Locale } from '../translations';

export interface DashboardLiveTranslations {
  common: {
    buy: string;
    sell: string;
    live: string;
    off: string;
    dismiss: string;
  };
  entryStaleness: {
    unfavorable: string;
    favorable: string;
  };
  ticker: {
    connecting: string;
  };
  connection: {
    connectedTooltip: string;
    connectingTooltip: string;
    disconnectedTooltip: string;
  };
  toast: {
    dismiss: string;
    ruleScore: string;
  };
  gate: {
    regimes: {
      trend: string;
      volatile: string;
      range: string;
      unknown: string;
    };
    statuses: {
      off: string;
      allow: string;
      blocked: string;
    };
    tooltip: {
      mode: string;
      regime: string;
      streakLosses: string;
      drawdown: string;
      lookback: string;
      reason: string;
    };
    aria: string;
  };
  tour: {
    steps: {
      marketSnapshot: { title: string; description: string };
      signalCard: { title: string; description: string };
      filters: { title: string; description: string };
      refresh: { title: string; description: string };
      accuracy: { title: string; description: string };
      deeper: { title: string; description: string };
    };
    dialogAria: string;
    stepCount: string;
    close: string;
    goToStep: string;
    dontShowAgain: string;
    back: string;
    skip: string;
    finish: string;
    next: string;
    keyboardHint: string;
    button: string;
  };
}

const en: DashboardLiveTranslations = {
  common: { buy: 'BUY', sell: 'SELL', live: 'LIVE', off: 'OFF', dismiss: 'Dismiss' },
  entryStaleness: {
    unfavorable: 'Price moved {change}% — entry may be stale',
    favorable: 'Price is now {change}% from entry — the move is favorable',
  },
  ticker: { connecting: 'Connecting to market data…' },
  connection: {
    connectedTooltip: 'Connected — live price feed (~2s crypto, ≤60s FX/metals/stocks). See /data-freshness.',
    connectingTooltip: 'Connecting to price stream…',
    disconnectedTooltip: 'Disconnected — reconnecting…',
  },
  toast: { dismiss: 'Dismiss signal notification', ruleScore: '{score}/100 rule score' },
  gate: {
    regimes: { trend: 'TREND', volatile: 'VOLATILE', range: 'RANGE', unknown: 'UNKNOWN' },
    statuses: { off: 'gates off', allow: 'gates allow', blocked: 'GATES BLOCKED' },
    tooltip: {
      mode: 'Mode: {mode}',
      regime: 'Regime: {regime}',
      streakLosses: 'Streak losses: {current}/{limit}',
      drawdown: 'Drawdown: {current}% / {limit}%{volatility}',
      lookback: 'Lookback: {current}/{limit} resolved signals',
      reason: 'Reason: {reason}',
    },
    aria: 'Risk gate status: {status}, regime {regime}',
  },
  tour: {
    steps: {
      marketSnapshot: {
        title: 'Your market snapshot',
        description: 'See active signals, the buy/sell ratio, average rule score, and market bias at a glance. Use this as a research overview before inspecting individual signals.',
      },
      signalCard: {
        title: 'Reading a signal card',
        description: 'Each card shows a 0–100 rule score, the stamped reference entry, an ATR-based SL, and TP1–TP3 targets. The score measures indicator agreement, not a probability. Use the “?” buttons for metric details.',
      },
      filters: {
        title: 'Filter by what matters',
        description: 'Narrow signals by timeframe, direction (BUY/SELL), or asset class. The filters change what is displayed; they do not alter the underlying signal records.',
      },
      refresh: {
        title: 'Stay in sync',
        description: 'Auto-refresh checks for signal updates every 30 seconds. Pause it when you want to inspect the current view without automatic changes.',
      },
      accuracy: {
        title: 'Inspect signal outcomes',
        description: 'Review recorded signal rows and outcomes resolved against provider OHLCV, with excluded populations labeled. These are not broker fills or portfolio returns.',
      },
      deeper: {
        title: 'Ready to go deeper?',
        description: 'Use Backtest for historical strategy studies, configure Telegram alerts when available, or export a signal for Telegram, Discord, or TradingView. Verify every integration before relying on it.',
      },
    },
    dialogAria: 'Tour step {current} of {total}',
    stepCount: 'Step {current} of {total}',
    close: 'Close tour',
    goToStep: 'Go to step {step}',
    dontShowAgain: 'Don’t show again',
    back: '← Back',
    skip: 'Skip tour',
    finish: 'Finish tour',
    next: 'Next →',
    keyboardHint: '← → to navigate · Esc to close',
    button: 'Tour',
  },
};

const es: DashboardLiveTranslations = {
  common: { buy: 'COMPRA', sell: 'VENTA', live: 'EN VIVO', off: 'DESCONECTADO', dismiss: 'Cerrar' },
  entryStaleness: {
    unfavorable: 'El precio se movió {change}% — la entrada puede estar desactualizada',
    favorable: 'El precio está ahora a {change}% de la entrada — el movimiento es favorable',
  },
  ticker: { connecting: 'Conectando con los datos de mercado…' },
  connection: {
    connectedTooltip: 'Conectado — precios en vivo (~2 s en cripto, ≤60 s en FX/metales/acciones). Consulta /data-freshness.',
    connectingTooltip: 'Conectando con el flujo de precios…',
    disconnectedTooltip: 'Desconectado — reconectando…',
  },
  toast: { dismiss: 'Cerrar notificación de señal', ruleScore: 'puntuación de reglas {score}/100' },
  gate: {
    regimes: { trend: 'TENDENCIA', volatile: 'VOLÁTIL', range: 'RANGO', unknown: 'DESCONOCIDO' },
    statuses: { off: 'controles desactivados', allow: 'controles permiten', blocked: 'CONTROLES BLOQUEAN' },
    tooltip: {
      mode: 'Modo: {mode}', regime: 'Régimen: {regime}',
      streakLosses: 'Pérdidas seguidas: {current}/{limit}',
      drawdown: 'Caída: {current}% / {limit}%{volatility}',
      lookback: 'Ventana: {current}/{limit} señales resueltas',
      reason: 'Motivo: {reason}',
    },
    aria: 'Estado de controles de riesgo: {status}, régimen {regime}',
  },
  tour: {
    steps: {
      marketSnapshot: { title: 'Resumen del mercado', description: 'Consulta las señales activas, la proporción compra/venta, la puntuación media y el sesgo del mercado. Úsalo como resumen de investigación antes de inspeccionar señales concretas.' },
      signalCard: { title: 'Cómo leer una señal', description: 'Cada tarjeta muestra una puntuación de reglas de 0 a 100, la entrada de referencia registrada, un SL basado en ATR y objetivos TP1–TP3. La puntuación mide acuerdo entre indicadores, no una probabilidad. Usa “?” para ver detalles.' },
      filters: { title: 'Filtra lo importante', description: 'Reduce las señales por temporalidad, dirección (COMPRA/VENTA) o clase de activo. Los filtros cambian la vista, no los registros subyacentes.' },
      refresh: { title: 'Mantén la vista al día', description: 'La actualización automática busca cambios cada 30 segundos. Paúsala para inspeccionar la vista actual sin cambios automáticos.' },
      accuracy: { title: 'Inspecciona los resultados', description: 'Revisa señales registradas y resultados resueltos con OHLCV del proveedor, con las poblaciones excluidas identificadas. No son ejecuciones de bróker ni rentabilidad de cartera.' },
      deeper: { title: '¿Quieres profundizar?', description: 'Usa Backtest para estudios históricos, configura alertas de Telegram cuando estén disponibles o exporta una señal a Telegram, Discord o TradingView. Verifica cada integración antes de depender de ella.' },
    },
    dialogAria: 'Paso {current} de {total} del recorrido', stepCount: 'Paso {current} de {total}', close: 'Cerrar recorrido',
    goToStep: 'Ir al paso {step}', dontShowAgain: 'No volver a mostrar', back: '← Atrás', skip: 'Omitir recorrido',
    finish: 'Finalizar recorrido', next: 'Siguiente →', keyboardHint: '← → para navegar · Esc para cerrar', button: 'Recorrido',
  },
};

const zh: DashboardLiveTranslations = {
  common: { buy: '买入', sell: '卖出', live: '实时', off: '离线', dismiss: '关闭' },
  entryStaleness: { unfavorable: '价格已变动 {change}% — 入场价可能已过时', favorable: '价格现较入场价变动 {change}% — 走势有利' },
  ticker: { connecting: '正在连接市场数据…' },
  connection: {
    connectedTooltip: '已连接 — 实时价格流（加密货币约 2 秒，外汇/贵金属/股票不超过 60 秒）。详见 /data-freshness。',
    connectingTooltip: '正在连接价格流…', disconnectedTooltip: '连接已断开 — 正在重连…',
  },
  toast: { dismiss: '关闭信号通知', ruleScore: '规则评分 {score}/100' },
  gate: {
    regimes: { trend: '趋势', volatile: '高波动', range: '区间', unknown: '未知' },
    statuses: { off: '风控关闭', allow: '风控允许', blocked: '风控阻止' },
    tooltip: {
      mode: '模式：{mode}', regime: '市场状态：{regime}', streakLosses: '连续亏损：{current}/{limit}',
      drawdown: '回撤：{current}% / {limit}%{volatility}', lookback: '回看：{current}/{limit} 个已结算信号', reason: '原因：{reason}',
    },
    aria: '风险门控状态：{status}，市场状态 {regime}',
  },
  tour: {
    steps: {
      marketSnapshot: { title: '市场概览', description: '快速查看活跃信号、买卖比例、平均规则评分和市场倾向。在检查单个信号前，将其作为研究概览。' },
      signalCard: { title: '阅读信号卡片', description: '每张卡片显示 0–100 规则评分、记录的参考入场价、基于 ATR 的 SL 和 TP1–TP3 目标。评分衡量指标一致性，不是概率。使用“?”查看指标详情。' },
      filters: { title: '筛选重要内容', description: '按时间周期、方向（买入/卖出）或资产类别缩小信号范围。筛选只改变显示内容，不会修改底层信号记录。' },
      refresh: { title: '保持同步', description: '自动刷新每 30 秒检查一次信号更新。需要稳定查看当前内容时可暂停。' },
      accuracy: { title: '检查信号结果', description: '查看记录的信号及通过提供商 OHLCV 结算的结果，并明确标注排除数据。这些不是券商成交或投资组合收益。' },
      deeper: { title: '准备进一步研究？', description: '使用回测进行历史策略研究，在可用时配置 Telegram 提醒，或将信号导出到 Telegram、Discord 或 TradingView。依赖任何集成前请先验证。' },
    },
    dialogAria: '导览第 {current} 步，共 {total} 步', stepCount: '第 {current} 步，共 {total} 步', close: '关闭导览', goToStep: '前往第 {step} 步',
    dontShowAgain: '不再显示', back: '← 返回', skip: '跳过导览', finish: '完成导览', next: '下一步 →', keyboardHint: '← → 导航 · Esc 关闭', button: '导览',
  },
};

const ms: DashboardLiveTranslations = {
  common: { buy: 'BELI', sell: 'JUAL', live: 'LANGSUNG', off: 'LUAR TALIAN', dismiss: 'Tutup' },
  entryStaleness: { unfavorable: 'Harga bergerak {change}% — kemasukan mungkin sudah lapuk', favorable: 'Harga kini {change}% daripada kemasukan — pergerakan memihak kepada isyarat' },
  ticker: { connecting: 'Menyambung ke data pasaran…' },
  connection: {
    connectedTooltip: 'Disambungkan — suapan harga langsung (~2s kripto, ≤60s FX/logam/saham). Lihat /data-freshness.',
    connectingTooltip: 'Menyambung ke aliran harga…', disconnectedTooltip: 'Terputus — menyambung semula…',
  },
  toast: { dismiss: 'Tutup pemberitahuan isyarat', ruleScore: 'skor peraturan {score}/100' },
  gate: {
    regimes: { trend: 'ALIRAN', volatile: 'MERUAP', range: 'JULAT', unknown: 'TIDAK DIKETAHUI' },
    statuses: { off: 'pagar dimatikan', allow: 'pagar membenarkan', blocked: 'PAGAR MENYEKAT' },
    tooltip: {
      mode: 'Mod: {mode}', regime: 'Rejim: {regime}', streakLosses: 'Kerugian berturut-turut: {current}/{limit}',
      drawdown: 'Susut nilai: {current}% / {limit}%{volatility}', lookback: 'Tinjauan: {current}/{limit} isyarat selesai', reason: 'Sebab: {reason}',
    },
    aria: 'Status pagar risiko: {status}, rejim {regime}',
  },
  tour: {
    steps: {
      marketSnapshot: { title: 'Ringkasan pasaran anda', description: 'Lihat isyarat aktif, nisbah beli/jual, purata skor peraturan dan kecenderungan pasaran. Gunakannya sebagai ringkasan penyelidikan sebelum memeriksa isyarat tertentu.' },
      signalCard: { title: 'Membaca kad isyarat', description: 'Setiap kad menunjukkan skor peraturan 0–100, kemasukan rujukan yang direkodkan, SL berasaskan ATR dan sasaran TP1–TP3. Skor mengukur persetujuan penunjuk, bukan kebarangkalian. Gunakan “?” untuk butiran metrik.' },
      filters: { title: 'Tapis perkara penting', description: 'Kecilkan isyarat mengikut rangka masa, arah (BELI/JUAL) atau kelas aset. Penapis hanya menukar paparan, bukan rekod isyarat asas.' },
      refresh: { title: 'Kekal segerak', description: 'Muat semula automatik menyemak kemas kini isyarat setiap 30 saat. Jeda apabila anda mahu memeriksa paparan semasa tanpa perubahan automatik.' },
      accuracy: { title: 'Periksa hasil isyarat', description: 'Semak baris isyarat direkodkan dan hasil yang diselesaikan menggunakan OHLCV penyedia, dengan populasi dikecualikan dilabel. Ini bukan isian broker atau pulangan portfolio.' },
      deeper: { title: 'Sedia untuk mendalami?', description: 'Gunakan Ujian Balik untuk kajian sejarah, tetapkan amaran Telegram apabila tersedia, atau eksport isyarat ke Telegram, Discord atau TradingView. Sahkan setiap integrasi sebelum bergantung padanya.' },
    },
    dialogAria: 'Langkah panduan {current} daripada {total}', stepCount: 'Langkah {current} daripada {total}', close: 'Tutup panduan', goToStep: 'Pergi ke langkah {step}',
    dontShowAgain: 'Jangan tunjukkan lagi', back: '← Kembali', skip: 'Langkau panduan', finish: 'Tamatkan panduan', next: 'Seterusnya →',
    keyboardHint: '← → untuk navigasi · Esc untuk tutup', button: 'Panduan',
  },
};

const ar: DashboardLiveTranslations = {
  common: { buy: 'شراء', sell: 'بيع', live: 'مباشر', off: 'غير متصل', dismiss: 'إغلاق' },
  entryStaleness: { unfavorable: 'تحرك السعر بنسبة {change}% — قد يكون سعر الدخول قديماً', favorable: 'يبعد السعر الآن {change}% عن الدخول — الحركة مواتية' },
  ticker: { connecting: 'جارٍ الاتصال ببيانات السوق…' },
  connection: {
    connectedTooltip: 'متصل — تدفق أسعار مباشر (نحو ثانيتين للعملات الرقمية، وحتى 60 ثانية للفوركس والمعادن والأسهم). راجع /data-freshness.',
    connectingTooltip: 'جارٍ الاتصال بتدفق الأسعار…', disconnectedTooltip: 'انقطع الاتصال — جارٍ إعادة الاتصال…',
  },
  toast: { dismiss: 'إغلاق إشعار الإشارة', ruleScore: 'درجة القواعد {score}/100' },
  gate: {
    regimes: { trend: 'اتجاه', volatile: 'متقلب', range: 'نطاق', unknown: 'غير معروف' },
    statuses: { off: 'بوابات المخاطر متوقفة', allow: 'بوابات المخاطر تسمح', blocked: 'بوابات المخاطر تحجب' },
    tooltip: {
      mode: 'الوضع: {mode}', regime: 'حالة السوق: {regime}', streakLosses: 'الخسائر المتتالية: {current}/{limit}',
      drawdown: 'التراجع: {current}% / {limit}%{volatility}', lookback: 'فترة المراجعة: {current}/{limit} إشارة محسومة', reason: 'السبب: {reason}',
    },
    aria: 'حالة بوابة المخاطر: {status}، حالة السوق {regime}',
  },
  tour: {
    steps: {
      marketSnapshot: { title: 'ملخص السوق', description: 'اطّلع سريعاً على الإشارات النشطة ونسبة الشراء إلى البيع ومتوسط درجة القواعد واتجاه السوق. استخدمه كملخص بحثي قبل فحص كل إشارة.' },
      signalCard: { title: 'قراءة بطاقة الإشارة', description: 'تعرض كل بطاقة درجة قواعد من 0 إلى 100، وسعر دخول مرجعي مسجل، وSL مبنياً على ATR، وأهداف TP1–TP3. تقيس الدرجة توافق المؤشرات وليست احتمالاً. استخدم “?” لتفاصيل المقاييس.' },
      filters: { title: 'صفِّ ما يهمك', description: 'ضيّق الإشارات حسب الإطار الزمني أو الاتجاه (شراء/بيع) أو فئة الأصل. تغيّر عوامل التصفية ما يظهر فقط ولا تعدّل سجلات الإشارات.' },
      refresh: { title: 'ابقَ متزامناً', description: 'يتحقق التحديث التلقائي من تغييرات الإشارات كل 30 ثانية. أوقفه مؤقتاً عندما تريد فحص العرض الحالي دون تغييرات تلقائية.' },
      accuracy: { title: 'افحص نتائج الإشارات', description: 'راجع صفوف الإشارات المسجلة ونتائجها المحسومة مقابل OHLCV المزوّد، مع توضيح الفئات المستبعدة. هذه ليست تنفيذات وسيط أو عوائد محفظة.' },
      deeper: { title: 'هل تريد التعمق؟', description: 'استخدم الاختبار الخلفي للدراسات التاريخية، واضبط تنبيهات Telegram عند توفرها، أو صدّر إشارة إلى Telegram أو Discord أو TradingView. تحقّق من كل تكامل قبل الاعتماد عليه.' },
    },
    dialogAria: 'الخطوة {current} من {total} في الجولة', stepCount: 'الخطوة {current} من {total}', close: 'إغلاق الجولة', goToStep: 'الانتقال إلى الخطوة {step}',
    dontShowAgain: 'عدم العرض مجدداً', back: 'رجوع →', skip: 'تخطي الجولة', finish: 'إنهاء الجولة', next: 'التالي ←',
    keyboardHint: '← → للتنقل · Esc للإغلاق', button: 'جولة',
  },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, DashboardLiveTranslations>;

export function getDashboardLiveTranslations(locale: Locale): DashboardLiveTranslations {
  return dictionaries[locale];
}
