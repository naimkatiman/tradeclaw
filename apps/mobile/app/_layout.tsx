import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#050505" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#050505' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600', fontSize: 14 },
          contentStyle: { backgroundColor: '#050505' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="signal/[id]"
          options={{ title: 'Signal Detail', presentation: 'card' }}
        />
      </Stack>
    </>
  );
}
