import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface Signal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timeframe: string;
  timestamp: number;
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export default function SignalDetailScreen() {
  const { data } = useLocalSearchParams<{ id: string; data: string }>();

  let signal: Signal | null = null;
  try {
    if (data) signal = JSON.parse(data);
  } catch { /* ignore */ }

  if (!signal) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Signal not found</Text>
      </View>
    );
  }

  const isBuy = signal.direction === 'BUY';
  const atr = signal.entry * 0.005;
  const sl = isBuy ? signal.entry - atr * 1.5 : signal.entry + atr * 1.5;
  const tp1 = isBuy ? signal.entry + atr * 1.5 * 1.618 : signal.entry - atr * 1.5 * 1.618;
  const fmt = (n: number) => n >= 1000 ? n.toFixed(2) : n.toFixed(4);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Direction badge */}
      <View style={[styles.badge, isBuy ? styles.buyBadge : styles.sellBadge]}>
        <Text style={[styles.badgeText, isBuy ? styles.buyText : styles.sellText]}>
          {signal.direction} · {signal.symbol}
        </Text>
      </View>

      {/* Confidence */}
      <View style={styles.confContainer}>
        <Text style={styles.confLabel}>Confidence</Text>
        <Text style={styles.confValue}>{signal.confidence}%</Text>
        <View style={styles.confBar}>
          <View style={[styles.confFill, { width: `${signal.confidence}%` as `${number}%` }]} />
        </View>
      </View>

      {/* Price levels */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Price Levels</Text>
        <Row label="Entry" value={fmt(signal.entry)} />
        <Row label="Stop Loss (ATR)" value={fmt(sl)} valueColor="#EF4444" />
        <Row label="TP1 (1.618)" value={fmt(tp1)} valueColor="#10B981" />
      </View>

      {/* Meta */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Signal Info</Text>
        <Row label="Timeframe" value={signal.timeframe} />
        <Row label="Signal ID" value={signal.id.slice(0, 12) + '...'} />
        <Row
          label="Generated"
          value={new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  errorText: { color: '#52525B', fontSize: 13 },
  badge: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  buyBadge: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' },
  sellBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  badgeText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  buyText: { color: '#10B981' },
  sellText: { color: '#EF4444' },
  confContainer: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  confLabel: { fontSize: 10, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1 },
  confValue: { fontSize: 28, fontWeight: '700', color: '#10B981', fontFamily: 'monospace' },
  confBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
  confFill: { height: 4, backgroundColor: '#10B981', borderRadius: 2 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  cardTitle: { fontSize: 10, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 12, color: '#71717A' },
  rowValue: { fontSize: 12, fontFamily: 'monospace', color: '#D4D4D8', fontWeight: '500' },
});
