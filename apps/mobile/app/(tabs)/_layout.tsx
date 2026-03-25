import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '▲',
    'paper-trading': '◈',
    settings: '⚙',
  };
  return (
    <Text style={[styles.icon, focused && styles.iconActive]}>
      {icons[name] || '●'}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 16, color: '#52525B' },
  iconActive: { color: '#10B981' },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#52525B',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
        headerStyle: { backgroundColor: '#050505' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600', fontSize: 14 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Signals',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="paper-trading"
        options={{
          title: 'Paper',
          tabBarIcon: ({ focused }) => <TabIcon name="paper-trading" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
