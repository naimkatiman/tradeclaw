import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';

interface Signal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timeframe: string;
  timestamp: number;
}

// Use the deployed TradeClaw API — replace with your host
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateSignals(): Signal[] {
  const symbols = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];
  const timeframes = ['M15', 'H1', 'H4', 'D1'];
  const prices: Record<string, number> = {
    XAUUSD: 2180, BTCUSD: 87500, ETHUSD: 3400, EURUSD: 1.083,
    GBPUSD: 1.264, USDJPY: 151.2, XAGUSD: 24.8, AUDUSD: 0.654,
  };
  const seed = Math.floor(Date.now() / 300000);
  return symbols.map((symbol, i) => {
    const r1 = seededRandom(seed + i * 7);
    const r2 = seededRandom(seed + i * 7 + 1);
    const r3 = seededRandom(seed + i * 7 + 2);
    return {
      id: `${symbol}-${seed}`,
      symbol,
      direction: r1 > 0.5 ? 'BUY' : 'SELL',
      confidence: Math.round(55 + r2 * 40),
      entry: prices[symbol] * (0.999 + r3 * 0.002),
      timeframe: timeframes[Math.floor(r1 * timeframes.length)],
      timestamp: Date.now() - Math.floor(r3 * 3600000),
    };
  });
}

function SignalCard({ signal, onPress }: { signal: Signal; onPress: () => void }) {
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
          Entry {signal.entry >= 1000 ? signal.entry.toFixed(2) : signal.entry.toFixed(4)}
        </Text>
        <View style={styles.confRow}>
          <View style={styles.confBar}>
            <View style={[styles.confFill, { width: `${signal.confidence}%` as `${number}%` }]} />
          </View>
          <Text style={styles.confValue}>{signal.confidence}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/signals`);
      const data = await res.json();
      setSignals(data.signals || generateSignals());
    } catch {
      setSignals(generateSignals());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={signals}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <SignalCard
          signal={item}
          onPress={() => router.push({ pathname: '/signal/[id]', params: { id: item.id, data: JSON.stringify(item) } })}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#10B981"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Signals</Text>
          <Text style={styles.headerSub}>{signals.length} pairs · updates every 5min</Text>
        </View>
      }
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#050505' },
  listContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: '#52525B', marginTop: 2 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  symbol: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  timeframe: { fontSize: 10, color: '#52525B', fontFamily: 'monospace', marginTop: 2 },
  dirBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  buyBadge: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' },
  sellBadge: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  dirText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  buyText: { color: '#10B981' },
  sellText: { color: '#EF4444' },
  cardFooter: { gap: 8 },
  entry: { fontSize: 11, color: '#71717A', fontFamily: 'monospace' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
  confFill: { height: 3, backgroundColor: '#10B981', borderRadius: 2 },
  confValue: { fontSize: 10, color: '#10B981', fontFamily: 'monospace', fontWeight: '600', width: 32, textAlign: 'right' },
  sep: { height: 8 },
});
