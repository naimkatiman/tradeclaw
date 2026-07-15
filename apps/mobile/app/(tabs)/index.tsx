import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  parseSignalResponse,
  type ObservedSignal,
} from '../../lib/signal-contract';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function SignalCard({ signal, onPress }: { signal: ObservedSignal; onPress: () => void }) {
  const isBuy = signal.direction === 'BUY';
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.symbol}>{signal.symbol}</Text>
          <Text style={styles.timeframe}>{signal.timeframe}</Text>
        </View>
        <View style={[styles.dirBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
          <Text style={[styles.dirText, isBuy ? styles.buyText : styles.sellText]}>
            {signal.direction}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.entry}>
          Candidate {signal.entry >= 1000 ? signal.entry.toFixed(2) : signal.entry.toFixed(4)}
        </Text>
        <View style={styles.confRow}>
          <View style={styles.confBar}>
            <View style={[styles.confFill, { width: `${signal.confidence}%` as `${number}%` }]} />
          </View>
          <Text style={styles.confValue}>{signal.confidence}/100</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [signals, setSignals] = useState<ObservedSignal[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/signals`, {
        headers: { Accept: 'application/json' },
      });
      const body: unknown = await response.json();
      const parsed = parseSignalResponse(body);

      setSignals(parsed.signals);
      setReason(parsed.reason ?? (response.ok ? null : `api-http-${response.status}`));
    } catch {
      setSignals([]);
      setReason('signal-api-unreachable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#10B981" />
        <Text style={styles.loadingText}>Checking observed signal data</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, signals.length === 0 && styles.emptyContent]}
      data={signals}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <SignalCard
          signal={item}
          onPress={() => router.push({
            pathname: '/signal/[id]',
            params: { id: item.id, data: JSON.stringify(item) },
          })}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor="#10B981"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Observed candidates</Text>
          <Text style={styles.headerSub}>
            {signals.length > 0
              ? `${signals.length} provider-backed candidate${signals.length === 1 ? '' : 's'}`
              : 'No provider-backed candidates available'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Signal data unavailable</Text>
          <Text style={styles.emptyBody}>
            TradeClaw did not receive a complete provider-observed candidate. No fallback prices or generated signals are shown.
          </Text>
          {reason ? <Text style={styles.reason}>{reason}</Text> : null}
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#050505' },
  listContent: { padding: 16 },
  emptyContent: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#050505' },
  loadingText: { color: '#71717A', fontSize: 12 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: '#71717A', marginTop: 2 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  symbol: { fontSize: 15, fontWeight: '700', color: '#fff' },
  timeframe: { fontSize: 10, color: '#71717A', fontFamily: 'monospace', marginTop: 2 },
  dirBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  buyBadge: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' },
  sellBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  dirText: { fontSize: 11, fontWeight: '700' },
  buyText: { color: '#10B981' },
  sellText: { color: '#EF4444' },
  cardFooter: { gap: 8 },
  entry: { fontSize: 11, color: '#A1A1AA', fontFamily: 'monospace' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
  confFill: { height: 3, backgroundColor: '#10B981', borderRadius: 2 },
  confValue: { fontSize: 10, color: '#10B981', fontFamily: 'monospace', fontWeight: '600', width: 48, textAlign: 'right' },
  emptyState: {
    flex: 1,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: { color: '#E4E4E7', fontSize: 15, fontWeight: '600' },
  emptyBody: { color: '#71717A', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  reason: { color: '#52525B', fontSize: 10, fontFamily: 'monospace', marginTop: 12 },
  sep: { height: 8 },
});
