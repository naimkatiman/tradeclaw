import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function PaperTradingScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Virtual Balance</Text>
        <Text style={styles.balanceAmount}>$10,000.00</Text>
        <Text style={styles.balanceSub}>Open app on web to start paper trading</Text>
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Full paper trading on web</Text>
        <Text style={styles.ctaBody}>
          Place virtual trades, track P&L, and build your track record — available in the TradeClaw web app.
        </Text>
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>Open Web App</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, gap: 12 },
  balanceCard: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 10, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: '#10B981', fontFamily: 'monospace', letterSpacing: -1 },
  balanceSub: { fontSize: 11, color: '#52525B', marginTop: 8 },
  ctaCard: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  ctaTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  ctaBody: { fontSize: 12, color: '#71717A', lineHeight: 18 },
  ctaButton: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  ctaButtonText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
});
