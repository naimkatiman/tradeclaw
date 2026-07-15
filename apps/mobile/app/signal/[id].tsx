import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  normalizeObservedSignal,
  type ObservedSignal,
} from '../../lib/signal-contract';

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function parseSignal(data: string | undefined): ObservedSignal | null {
  if (!data) return null;
  try {
    return normalizeObservedSignal(JSON.parse(data) as unknown);
  } catch {
    return null;
  }
}

export default function SignalDetailScreen() {
  const { data } = useLocalSearchParams<{ id: string; data: string }>();
  const signal = parseSignal(data);

  if (!signal) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Candidate unavailable</Text>
        <Text style={styles.errorText}>No complete provider-observed record was supplied.</Text>
      </View>
    );
  }

  const isBuy = signal.direction === 'BUY';
  const fmt = (value: number) => value >= 1000 ? value.toFixed(2) : value.toFixed(4);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.badge, isBuy ? styles.buyBadge : styles.sellBadge]}>
        <Text style={[styles.badgeText, isBuy ? styles.buyText : styles.sellText]}>
          {signal.direction} - {signal.symbol}
        </Text>
      </View>

      <View style={styles.confContainer}>
        <Text style={styles.confLabel}>Rule score</Text>
        <Text style={styles.confValue}>{signal.confidence}/100</Text>
        <View style={styles.confBar}>
          <View style={[styles.confFill, { width: `${signal.confidence}%` as `${number}%` }]} />
        </View>
        <Text style={styles.scoreNote}>Mechanical indicator score, not a calibrated probability.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Provider-backed candidate levels</Text>
        <Row label="Candidate entry" value={fmt(signal.entry)} />
        <Row label="Candidate stop" value={fmt(signal.stopLoss)} valueColor="#EF4444" />
        <Row label="Candidate target 1" value={fmt(signal.takeProfit1)} valueColor="#10B981" />
        {signal.takeProfit2 ? <Row label="Candidate target 2" value={fmt(signal.takeProfit2)} valueColor="#10B981" /> : null}
        {signal.takeProfit3 ? <Row label="Candidate target 3" value={fmt(signal.takeProfit3)} valueColor="#10B981" /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Provenance</Text>
        <Row label="Data quality" value="Provider observed" />
        <Row label="Timeframe" value={signal.timeframe} />
        <Row label="Candidate ID" value={signal.id} />
        <Row label="Observed at" value={new Date(signal.timestamp).toLocaleString()} />
      </View>

      <Text style={styles.disclaimer}>
        Research candidate only. This is not a broker order, fill, portfolio result, or investment advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#050505' },
  errorTitle: { color: '#E4E4E7', fontSize: 15, fontWeight: '600' },
  errorText: { color: '#71717A', fontSize: 12, marginTop: 8, textAlign: 'center' },
  badge: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  buyBadge: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' },
  sellBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  badgeText: { fontSize: 18, fontWeight: '700' },
  buyText: { color: '#10B981' },
  sellText: { color: '#EF4444' },
  confContainer: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  confLabel: { fontSize: 10, color: '#71717A', textTransform: 'uppercase' },
  confValue: { fontSize: 28, fontWeight: '700', color: '#10B981', fontFamily: 'monospace' },
  confBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
  confFill: { height: 4, backgroundColor: '#10B981', borderRadius: 2 },
  scoreNote: { color: '#71717A', fontSize: 10, lineHeight: 15 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  cardTitle: { fontSize: 10, color: '#71717A', textTransform: 'uppercase', marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  rowLabel: { fontSize: 12, color: '#A1A1AA', flexShrink: 0 },
  rowValue: { fontSize: 12, fontFamily: 'monospace', color: '#D4D4D8', fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  disclaimer: { color: '#71717A', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8 },
});
