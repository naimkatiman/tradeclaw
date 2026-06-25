import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://tradeclaw.win';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const { status } = await Notifications.getPermissionsAsync();
    const granted = status === 'granted';
    setNotificationsEnabled(granted);

    if (granted) {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'tradeclaw' });
      setPushToken(tokenData.data);
    } else {
      setPushToken(null);
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const toggleNotifications = async (value: boolean) => {
    if (Platform.OS === 'web') return;

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'tradeclaw' });
        setPushToken(tokenData.data);
        setNotificationsEnabled(true);
        // Re-register with backend
        try {
          await fetch(`${API_BASE}/api/notifications/expo-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: tokenData.data,
              platform: Platform.OS,
              minConfidence: 80,
              directions: ['BUY', 'SELL'],
              enabled: true,
            }),
          });
        } catch {
          // silent fail
        }
      } else {
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
      if (pushToken) {
        try {
          await fetch(`${API_BASE}/api/notifications/expo-token`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: pushToken }),
          });
        } catch {
          // silent fail
        }
        setPushToken(null);
      }
    }
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Connection</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>TradeClaw API URL</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://your-instance.railway.app"
          placeholderTextColor="#3F3F46"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={styles.hint}>Leave empty to use the default demo instance</Text>
      </View>

      <Text style={styles.sectionLabel}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowLabel}>Signal alerts</Text>
            <Text style={styles.rowSub}>
              {notificationsEnabled
                ? pushToken
                  ? 'Push token registered'
                  : 'Permission granted'
                : 'Enable for high-confidence signal push'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#27272A', true: 'rgba(16,185,129,0.4)' }}
            thumbColor={notificationsEnabled ? '#10B981' : '#52525B'}
          />
        </View>
        {pushToken && (
          <Text style={styles.tokenHint} numberOfLines={1}>
            Token: {pushToken.slice(0, 24)}…
          </Text>
        )}
      </View>

      <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnDone]} onPress={save} activeOpacity={0.8}>
        <Text style={[styles.saveBtnText, saved && styles.saveBtnTextDone]}>
          {saved ? 'Saved' : 'Save settings'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.version}>TradeClaw Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050505' },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, color: '#52525B', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  fieldLabel: { fontSize: 11, color: '#71717A', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  hint: { fontSize: 10, color: '#3F3F46' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13, color: '#D4D4D8' },
  rowSub: { fontSize: 10, color: '#52525B', marginTop: 2 },
  tokenHint: { fontSize: 9, color: '#3F3F46', fontFamily: 'monospace', marginTop: 4 },
  saveBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    marginTop: 8,
  },
  saveBtnDone: { backgroundColor: 'rgba(16,185,129,0.25)', borderColor: 'rgba(16,185,129,0.4)' },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  saveBtnTextDone: { color: '#34D399' },
  version: { fontSize: 10, color: '#27272A', textAlign: 'center', marginTop: 8 },
});
