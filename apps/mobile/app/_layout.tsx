import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://tradeclaw.win';

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();

  return tokenData.data;
}

async function sendTokenToServer(token: string) {
  try {
    await fetch(`${API_BASE}/api/notifications/expo-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        minConfidence: 80,
        directions: ['BUY', 'SELL'],
        enabled: true,
      }),
    });
  } catch {
    // Silent fail — token will retry on next app open
  }
}

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        sendTokenToServer(token);
      }
    });

    // Listen for incoming notifications while app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      // eslint-disable-next-line no-console
      console.log('Notification received:', notification.request.content.title);
    });

    // Listen for notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // eslint-disable-next-line no-console
      console.log('Notification tapped:', data);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

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
