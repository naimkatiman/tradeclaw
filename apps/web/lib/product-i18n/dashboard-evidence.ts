import type { Locale } from '../translations';

export interface DashboardEvidenceTranslations {
  visitStreak: {
    aria: string;
    current: string;
    stats: string;
    milestones: {
      three: string;
      seven: string;
      fourteen: string;
      thirty: string;
    };
  };
  reEngagement: {
    welcomeBack: string;
    resolvedWhileAway: string;
    seeAccuracy: string;
    dismiss: string;
  };
  accuracy: {
    noResolved: string;
    resolved: string;
    winRate: string;
    averageReturn: string;
    bestWinRate: string;
    bestReturn: string;
    bestSignal: string;
    streak: string;
    title: string;
    streakWin: string;
    streakLoss: string;
    hints: {
      resolved: string;
      winRate: string;
      averageReturn: string;
      streak: string;
    };
    aria: {
      resolvedHint: string;
      winRateHint: string;
      averageReturnHint: string;
      streakHint: string;
      expand: string;
      collapse: string;
    };
  };
  accuracyMeta: {
    winRate: string;
    latest: string;
    lessThanHourAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
  export: {
    title: string;
    button: string;
    heading: string;
    copied: string;
    descriptions: {
      telegram: string;
      discord: string;
      tradingview: string;
      mt5: string;
      webhook: string;
    };
    message: {
      headline: string;
      entry: string;
      stopLoss: string;
      timeframe: string;
      trend: string;
      scoreLine: string;
      via: string;
    };
  };
  provenance: {
    live: { label: string; tooltip: string };
    mixed: { label: string; tooltip: string };
    simulated: { label: string; tooltip: string };
    empty: { label: string; tooltip: string };
    withSource: string;
  };
  dataSource: {
    tooltip: string;
  };
  chart: {
    entry: string;
  };
}

const en: DashboardEvidenceTranslations = {
  visitStreak: {
    aria: 'Visit streak: {count} days',
    current: 'Day {count} streak',
    stats: 'Longest: {longest} · Total visits: {total}',
    milestones: {
      three: 'Getting started!',
      seven: 'Active Trader',
      fourteen: 'TradeClaw Regular',
      thirty: 'TradeClaw OG',
    },
  },
  reEngagement: {
    welcomeBack: 'Welcome back!',
    resolvedWhileAway: 'Signals resolved while you were away ({count} days)',
    seeAccuracy: 'See Accuracy',
    dismiss: 'Dismiss welcome-back banner',
  },
  accuracy: {
    noResolved: 'No resolved signals yet — published signals with a rule score of at least 70/100 are checked against live market candles every hour.',
    resolved: 'OHLCV resolved',
    winRate: 'Win rate',
    averageReturn: 'Avg return',
    bestWinRate: 'Best win rate · {pair}',
    bestReturn: 'Best return · {pair}',
    bestSignal: 'Best signal',
    streak: 'Streak',
    title: 'Accuracy stats',
    streakWin: '{count}W',
    streakLoss: '{count}L',
    hints: {
      resolved: 'Signals with a usable 24h outcome resolved from provider OHLCV: TP, SL, or a nonzero 24h close after neither was hit. Pending, simulated, gate-blocked, and unusable force-expiry rows are excluded. This is an engine signal study, not a subscriber execution ledger.',
      winRate: 'Counted signals whose 24h OHLCV outcome hit TP, divided by counted signals with a usable 24h outcome. A nonzero 24h close after neither TP nor SL hit counts as a miss. Pending, simulated, gate-blocked, and unusable force-expiry rows are excluded.',
      averageReturn: 'Arithmetic sum of OHLCV-resolved per-signal price moves divided by counted resolved signals. No position sizing or execution costs are applied.',
      streak: 'Consecutive resolved signals, signed: positive for a win streak and negative for a losing streak.',
    },
    aria: {
      resolvedHint: 'What OHLCV resolved means',
      winRateHint: 'What win rate means',
      averageReturnHint: 'What average return means',
      streakHint: 'What streak means',
      expand: 'Expand accuracy stats',
      collapse: 'Collapse accuracy stats',
    },
  },
  accuracyMeta: {
    winRate: '{rate}% win rate',
    latest: 'latest {age}',
    lessThanHourAgo: 'less than 1h ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago',
  },
  export: {
    title: 'Export signal',
    button: 'Export',
    heading: 'Export or copy as',
    copied: 'Copied!',
    descriptions: {
      telegram: 'Formatted message for Telegram bots and channels',
      discord: 'Discord webhook embed JSON',
      tradingview: 'TradingView alert webhook JSON',
      mt5: 'MetaTrader 5 compatible order JSON',
      webhook: 'Generic webhook payload',
    },
    message: {
      headline: 'rule score {score}/100',
      entry: 'Entry',
      stopLoss: 'Stop loss',
      timeframe: 'Timeframe',
      trend: 'Trend',
      scoreLine: 'Rule score: {score}/100 (not a predictive probability)',
      via: 'via TradeClaw — tradeclaw.win',
    },
  },
  provenance: {
    live: {
      label: 'Recorded / OHLCV',
      tooltip: 'Stats use non-synthetic recorded signals and provider OHLCV outcomes. They are not broker fills or account returns.',
    },
    mixed: {
      label: 'Mixed data',
      tooltip: 'Stats include recorded and simulated signals. Simulated rows are excluded from accuracy calculations.',
    },
    simulated: {
      label: 'Simulated',
      tooltip: 'All displayed data is simulated seed data for demonstration purposes.',
    },
    empty: {
      label: 'No data',
      tooltip: 'No signal data is available yet.',
    },
    withSource: '{tooltip} Source: {source}',
  },
  dataSource: {
    tooltip: 'Expected provider lane: {source}. Runtime fallbacks may differ; see the signal quality label and /data-freshness.',
  },
  chart: {
    entry: 'Entry',
  },
};

const es: DashboardEvidenceTranslations = {
  visitStreak: {
    aria: 'Racha de visitas: {count} días',
    current: 'Racha de {count} días',
    stats: 'Máxima: {longest} · Visitas totales: {total}',
    milestones: {
      three: '¡Primeros pasos!',
      seven: 'Trader activo',
      fourteen: 'Habitual de TradeClaw',
      thirty: 'Veterano de TradeClaw',
    },
  },
  reEngagement: {
    welcomeBack: '¡Te damos la bienvenida!',
    resolvedWhileAway: 'Se resolvieron señales durante tu ausencia ({count} días)',
    seeAccuracy: 'Ver precisión',
    dismiss: 'Cerrar el aviso de bienvenida',
  },
  accuracy: {
    noResolved: 'Aún no hay señales resueltas. Las señales publicadas con una puntuación de reglas de al menos 70/100 se contrastan cada hora con velas reales del mercado.',
    resolved: 'Resueltas con OHLCV',
    winRate: 'Tasa de acierto',
    averageReturn: 'Retorno medio',
    bestWinRate: 'Mejor tasa de acierto · {pair}',
    bestReturn: 'Mejor retorno · {pair}',
    bestSignal: 'Mejor señal',
    streak: 'Racha',
    title: 'Estadísticas de precisión',
    streakWin: '{count}G',
    streakLoss: '{count}P',
    hints: {
      resolved: 'Señales con un resultado utilizable a 24 h resuelto mediante OHLCV del proveedor: TP, SL o un cierre no nulo a 24 h cuando no se alcanzó ninguno. Se excluyen las pendientes, simuladas, bloqueadas por la puerta de riesgo y las expiraciones forzadas inutilizables. Es un estudio del motor, no un registro de ejecuciones de usuarios.',
      winRate: 'Señales contadas cuyo resultado OHLCV a 24 h alcanzó TP, dividido por las señales contadas con un resultado utilizable a 24 h. Un cierre no nulo tras no alcanzar TP ni SL cuenta como fallo. Se excluyen pendientes, simuladas, bloqueadas y expiraciones forzadas inutilizables.',
      averageReturn: 'Suma aritmética de los movimientos de precio por señal resueltos con OHLCV, dividida por las señales resueltas contadas. No aplica tamaño de posición ni costes de ejecución.',
      streak: 'Señales resueltas consecutivas: valor positivo para una racha ganadora y negativo para una racha perdedora.',
    },
    aria: {
      resolvedHint: 'Qué significa resuelta con OHLCV',
      winRateHint: 'Qué significa tasa de acierto',
      averageReturnHint: 'Qué significa retorno medio',
      streakHint: 'Qué significa racha',
      expand: 'Expandir estadísticas de precisión',
      collapse: 'Contraer estadísticas de precisión',
    },
  },
  accuracyMeta: {
    winRate: '{rate}% de acierto',
    latest: 'última: {age}',
    lessThanHourAgo: 'hace menos de 1 h',
    hoursAgo: 'hace {count} h',
    daysAgo: 'hace {count} días',
  },
  export: {
    title: 'Exportar señal',
    button: 'Exportar',
    heading: 'Exportar o copiar como',
    copied: '¡Copiado!',
    descriptions: {
      telegram: 'Mensaje con formato para bots y canales de Telegram',
      discord: 'JSON de inserción para webhook de Discord',
      tradingview: 'JSON para webhook de alerta de TradingView',
      mt5: 'JSON de orden compatible con MetaTrader 5',
      webhook: 'Carga genérica para webhook',
    },
    message: {
      headline: 'puntuación de reglas {score}/100',
      entry: 'Entrada',
      stopLoss: 'Stop loss',
      timeframe: 'Marco temporal',
      trend: 'Tendencia',
      scoreLine: 'Puntuación de reglas: {score}/100 (no es una probabilidad predictiva)',
      via: 'vía TradeClaw — tradeclaw.win',
    },
  },
  provenance: {
    live: {
      label: 'Registrado / OHLCV',
      tooltip: 'Las estadísticas usan señales registradas no sintéticas y resultados OHLCV del proveedor. No son ejecuciones del bróker ni retornos de una cuenta.',
    },
    mixed: {
      label: 'Datos mixtos',
      tooltip: 'Las estadísticas incluyen señales registradas y simuladas. Las filas simuladas se excluyen de los cálculos de precisión.',
    },
    simulated: {
      label: 'Simulado',
      tooltip: 'Todos los datos mostrados son datos semilla simulados con fines de demostración.',
    },
    empty: {
      label: 'Sin datos',
      tooltip: 'Aún no hay datos de señales disponibles.',
    },
    withSource: '{tooltip} Fuente: {source}',
  },
  dataSource: {
    tooltip: 'Canal de proveedor esperado: {source}. Las fuentes alternativas en ejecución pueden diferir; consulta la etiqueta de calidad de la señal y /data-freshness.',
  },
  chart: {
    entry: 'Entrada',
  },
};

const zh: DashboardEvidenceTranslations = {
  visitStreak: {
    aria: '连续访问：{count} 天',
    current: '连续访问第 {count} 天',
    stats: '最长：{longest} 天 · 总访问：{total} 次',
    milestones: {
      three: '已经起步！',
      seven: '活跃交易者',
      fourteen: 'TradeClaw 常客',
      thirty: 'TradeClaw 元老',
    },
  },
  reEngagement: {
    welcomeBack: '欢迎回来！',
    resolvedWhileAway: '你离开期间已有信号完成判定（{count} 天）',
    seeAccuracy: '查看准确率',
    dismiss: '关闭欢迎横幅',
  },
  accuracy: {
    noResolved: '尚无已判定信号。规则评分至少为 70/100 的已发布信号会每小时使用真实市场K线核验。',
    resolved: 'OHLCV 已判定',
    winRate: '胜率',
    averageReturn: '平均回报',
    bestWinRate: '最高胜率 · {pair}',
    bestReturn: '最高回报 · {pair}',
    bestSignal: '最佳信号',
    streak: '连续结果',
    title: '准确率统计',
    streakWin: '{count}连胜',
    streakLoss: '{count}连败',
    hints: {
      resolved: '具有可用 24 小时结果并由供应商 OHLCV 判定的信号：触及 TP、SL，或两者均未触及时采用非零的 24 小时收盘结果。待定、模拟、被风控门阻止及不可用的强制到期记录均被排除。这是信号引擎研究，不是用户成交记录。',
      winRate: '24 小时 OHLCV 结果触及 TP 的计数信号，除以具有可用 24 小时结果的计数信号。未触及 TP 或 SL 后的非零 24 小时收盘计为未命中。待定、模拟、被阻止及不可用强制到期记录均被排除。',
      averageReturn: 'OHLCV 判定的单个信号价格变动算术总和，除以计数的已判定信号。不应用仓位规模或执行成本。',
      streak: '连续已判定信号：正数表示连胜，负数表示连败。',
    },
    aria: {
      resolvedHint: 'OHLCV 已判定的含义',
      winRateHint: '胜率的含义',
      averageReturnHint: '平均回报的含义',
      streakHint: '连续结果的含义',
      expand: '展开准确率统计',
      collapse: '收起准确率统计',
    },
  },
  accuracyMeta: {
    winRate: '胜率 {rate}%',
    latest: '最新：{age}',
    lessThanHourAgo: '不到 1 小时前',
    hoursAgo: '{count} 小时前',
    daysAgo: '{count} 天前',
  },
  export: {
    title: '导出信号',
    button: '导出',
    heading: '导出或复制为',
    copied: '已复制！',
    descriptions: {
      telegram: '适用于 Telegram 机器人和频道的格式化消息',
      discord: 'Discord webhook 嵌入 JSON',
      tradingview: 'TradingView 警报 webhook JSON',
      mt5: '兼容 MetaTrader 5 的订单 JSON',
      webhook: '通用 webhook 数据',
    },
    message: {
      headline: '规则评分 {score}/100',
      entry: '入场',
      stopLoss: '止损',
      timeframe: '时间周期',
      trend: '趋势',
      scoreLine: '规则评分：{score}/100（并非预测概率）',
      via: '来自 TradeClaw — tradeclaw.win',
    },
  },
  provenance: {
    live: {
      label: '已记录 / OHLCV',
      tooltip: '统计使用非合成的已记录信号和供应商 OHLCV 结果。它们不是经纪商成交或账户回报。',
    },
    mixed: {
      label: '混合数据',
      tooltip: '统计包含已记录和模拟信号。模拟记录不计入准确率计算。',
    },
    simulated: {
      label: '模拟',
      tooltip: '显示的全部数据均为演示用途的模拟种子数据。',
    },
    empty: {
      label: '暂无数据',
      tooltip: '目前还没有可用的信号数据。',
    },
    withSource: '{tooltip} 数据源：{source}',
  },
  dataSource: {
    tooltip: '预期供应商通道：{source}。运行时备用来源可能不同；请查看信号质量标签和 /data-freshness。',
  },
  chart: {
    entry: '入场',
  },
};

const ms: DashboardEvidenceTranslations = {
  visitStreak: {
    aria: 'Rentetan lawatan: {count} hari',
    current: 'Rentetan hari ke-{count}',
    stats: 'Terpanjang: {longest} · Jumlah lawatan: {total}',
    milestones: {
      three: 'Sudah bermula!',
      seven: 'Pedagang Aktif',
      fourteen: 'Pengunjung Tetap TradeClaw',
      thirty: 'Veteran TradeClaw',
    },
  },
  reEngagement: {
    welcomeBack: 'Selamat kembali!',
    resolvedWhileAway: 'Isyarat diselesaikan semasa anda tiada ({count} hari)',
    seeAccuracy: 'Lihat Ketepatan',
    dismiss: 'Tutup sepanduk selamat kembali',
  },
  accuracy: {
    noResolved: 'Belum ada isyarat yang diselesaikan. Isyarat terbitan dengan skor peraturan sekurang-kurangnya 70/100 disemak terhadap lilin pasaran sebenar setiap jam.',
    resolved: 'Diselesaikan OHLCV',
    winRate: 'Kadar menang',
    averageReturn: 'Pulangan purata',
    bestWinRate: 'Kadar menang terbaik · {pair}',
    bestReturn: 'Pulangan terbaik · {pair}',
    bestSignal: 'Isyarat terbaik',
    streak: 'Rentetan',
    title: 'Statistik ketepatan',
    streakWin: '{count}M',
    streakLoss: '{count}K',
    hints: {
      resolved: 'Isyarat dengan hasil 24 jam yang boleh digunakan dan diselesaikan daripada OHLCV penyedia: TP, SL atau penutupan 24 jam bukan sifar apabila kedua-duanya tidak disentuh. Rekod belum selesai, simulasi, disekat gerbang dan luput paksa yang tidak boleh digunakan dikecualikan. Ini kajian isyarat enjin, bukan lejar pelaksanaan pelanggan.',
      winRate: 'Isyarat dikira yang hasil OHLCV 24 jamnya menyentuh TP, dibahagi isyarat dikira dengan hasil 24 jam yang boleh digunakan. Penutupan bukan sifar selepas TP dan SL tidak disentuh dikira sebagai gagal. Rekod belum selesai, simulasi, disekat dan luput paksa yang tidak boleh digunakan dikecualikan.',
      averageReturn: 'Jumlah aritmetik pergerakan harga setiap isyarat yang diselesaikan OHLCV, dibahagi isyarat selesai yang dikira. Saiz posisi dan kos pelaksanaan tidak digunakan.',
      streak: 'Isyarat selesai berturut-turut: positif untuk rentetan menang dan negatif untuk rentetan kalah.',
    },
    aria: {
      resolvedHint: 'Maksud diselesaikan OHLCV',
      winRateHint: 'Maksud kadar menang',
      averageReturnHint: 'Maksud pulangan purata',
      streakHint: 'Maksud rentetan',
      expand: 'Kembangkan statistik ketepatan',
      collapse: 'Kuncupkan statistik ketepatan',
    },
  },
  accuracyMeta: {
    winRate: 'kadar menang {rate}%',
    latest: 'terkini {age}',
    lessThanHourAgo: 'kurang 1 jam lalu',
    hoursAgo: '{count} jam lalu',
    daysAgo: '{count} hari lalu',
  },
  export: {
    title: 'Eksport isyarat',
    button: 'Eksport',
    heading: 'Eksport atau salin sebagai',
    copied: 'Disalin!',
    descriptions: {
      telegram: 'Mesej berformat untuk bot dan saluran Telegram',
      discord: 'JSON benaman webhook Discord',
      tradingview: 'JSON webhook amaran TradingView',
      mt5: 'JSON pesanan serasi MetaTrader 5',
      webhook: 'Muatan webhook generik',
    },
    message: {
      headline: 'skor peraturan {score}/100',
      entry: 'Kemasukan',
      stopLoss: 'Henti rugi',
      timeframe: 'Rangka masa',
      trend: 'Trend',
      scoreLine: 'Skor peraturan: {score}/100 (bukan kebarangkalian ramalan)',
      via: 'melalui TradeClaw — tradeclaw.win',
    },
  },
  provenance: {
    live: {
      label: 'Direkod / OHLCV',
      tooltip: 'Statistik menggunakan isyarat direkod bukan sintetik dan hasil OHLCV penyedia. Ia bukan isian broker atau pulangan akaun.',
    },
    mixed: {
      label: 'Data campuran',
      tooltip: 'Statistik merangkumi isyarat direkod dan simulasi. Rekod simulasi dikecualikan daripada pengiraan ketepatan.',
    },
    simulated: {
      label: 'Simulasi',
      tooltip: 'Semua data yang dipaparkan ialah data benih simulasi untuk tujuan demonstrasi.',
    },
    empty: {
      label: 'Tiada data',
      tooltip: 'Belum ada data isyarat yang tersedia.',
    },
    withSource: '{tooltip} Sumber: {source}',
  },
  dataSource: {
    tooltip: 'Laluan penyedia dijangka: {source}. Sumber sandaran masa jalan mungkin berbeza; lihat label kualiti isyarat dan /data-freshness.',
  },
  chart: {
    entry: 'Kemasukan',
  },
};

const ar: DashboardEvidenceTranslations = {
  visitStreak: {
    aria: 'سلسلة الزيارات: {count} يومًا',
    current: 'اليوم {count} من سلسلة الزيارات',
    stats: 'الأطول: {longest} · إجمالي الزيارات: {total}',
    milestones: {
      three: 'بداية موفقة!',
      seven: 'متداول نشط',
      fourteen: 'من رواد TradeClaw',
      thirty: 'من أوائل TradeClaw',
    },
  },
  reEngagement: {
    welcomeBack: 'مرحبًا بعودتك!',
    resolvedWhileAway: 'حُسمت إشارات أثناء غيابك ({count} يومًا)',
    seeAccuracy: 'عرض الدقة',
    dismiss: 'إغلاق شريط الترحيب',
  },
  accuracy: {
    noResolved: 'لا توجد إشارات محسومة بعد. تُفحص الإشارات المنشورة ذات درجة قواعد لا تقل عن 70/100 مقابل شموع السوق الفعلية كل ساعة.',
    resolved: 'محسومة عبر OHLCV',
    winRate: 'معدل الفوز',
    averageReturn: 'متوسط العائد',
    bestWinRate: 'أفضل معدل فوز · {pair}',
    bestReturn: 'أفضل عائد · {pair}',
    bestSignal: 'أفضل إشارة',
    streak: 'السلسلة',
    title: 'إحصاءات الدقة',
    streakWin: '{count} فوز',
    streakLoss: '{count} خسارة',
    hints: {
      resolved: 'إشارات لها نتيجة صالحة خلال 24 ساعة حُسمت من بيانات OHLCV للمزود: بلوغ TP أو SL، أو إغلاق غير صفري بعد 24 ساعة عند عدم بلوغهما. تُستبعد السجلات المعلقة والمحاكاة والمحجوبة بالبوابة وسجلات انتهاء الصلاحية غير الصالحة. هذه دراسة لإشارات المحرك وليست سجل تنفيذ للمشتركين.',
      winRate: 'عدد الإشارات التي بلغت نتيجة OHLCV لها خلال 24 ساعة مستوى TP مقسومًا على الإشارات ذات النتيجة الصالحة. يُحسب الإغلاق غير الصفري بعد عدم بلوغ TP أو SL كإخفاق. تُستبعد السجلات المعلقة والمحاكاة والمحجوبة وسجلات انتهاء الصلاحية غير الصالحة.',
      averageReturn: 'المجموع الحسابي لحركات السعر لكل إشارة محسومة عبر OHLCV مقسومًا على عدد الإشارات المحسومة المحتسبة. لا تُطبق أحجام المراكز أو تكاليف التنفيذ.',
      streak: 'إشارات محسومة متتالية: القيمة الموجبة لسلسلة الفوز والسالبة لسلسلة الخسارة.',
    },
    aria: {
      resolvedHint: 'ما معنى الحسم عبر OHLCV',
      winRateHint: 'ما معنى معدل الفوز',
      averageReturnHint: 'ما معنى متوسط العائد',
      streakHint: 'ما معنى السلسلة',
      expand: 'توسيع إحصاءات الدقة',
      collapse: 'طي إحصاءات الدقة',
    },
  },
  accuracyMeta: {
    winRate: 'معدل الفوز {rate}%',
    latest: 'الأحدث: {age}',
    lessThanHourAgo: 'منذ أقل من ساعة',
    hoursAgo: 'منذ {count} ساعة',
    daysAgo: 'منذ {count} يومًا',
  },
  export: {
    title: 'تصدير الإشارة',
    button: 'تصدير',
    heading: 'تصدير أو نسخ بصيغة',
    copied: 'تم النسخ!',
    descriptions: {
      telegram: 'رسالة منسقة لروبوتات وقنوات Telegram',
      discord: 'بيانات JSON مضمنة لـ Discord webhook',
      tradingview: 'بيانات JSON لتنبيه TradingView webhook',
      mt5: 'بيانات طلب JSON متوافقة مع MetaTrader 5',
      webhook: 'حمولة webhook عامة',
    },
    message: {
      headline: 'درجة القواعد {score}/100',
      entry: 'الدخول',
      stopLoss: 'وقف الخسارة',
      timeframe: 'الإطار الزمني',
      trend: 'الاتجاه العام',
      scoreLine: 'درجة القواعد: {score}/100 (ليست احتمالًا تنبؤيًا)',
      via: 'عبر TradeClaw — tradeclaw.win',
    },
  },
  provenance: {
    live: {
      label: 'مسجلة / OHLCV',
      tooltip: 'تستخدم الإحصاءات إشارات مسجلة غير اصطناعية ونتائج OHLCV من المزود. وهي ليست تنفيذات وسيط أو عوائد حساب.',
    },
    mixed: {
      label: 'بيانات مختلطة',
      tooltip: 'تشمل الإحصاءات إشارات مسجلة ومحاكاة. تُستبعد سجلات المحاكاة من حسابات الدقة.',
    },
    simulated: {
      label: 'محاكاة',
      tooltip: 'كل البيانات المعروضة بيانات أولية محاكاة لأغراض العرض.',
    },
    empty: {
      label: 'لا توجد بيانات',
      tooltip: 'لا تتوفر بيانات إشارات بعد.',
    },
    withSource: '{tooltip} المصدر: {source}',
  },
  dataSource: {
    tooltip: 'مسار المزود المتوقع: {source}. قد تختلف المصادر الاحتياطية وقت التشغيل؛ راجع وسم جودة الإشارة و/data-freshness.',
  },
  chart: {
    entry: 'الدخول',
  },
};

const dictionaries = { en, es, zh, ms, ar } satisfies Record<Locale, DashboardEvidenceTranslations>;

export function getDashboardEvidenceTranslations(locale: Locale): DashboardEvidenceTranslations {
  return dictionaries[locale];
}
