# TradeClaw Mobile

Expo React Native app for TradeClaw signal push notifications and mobile dashboard.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

## Local Development

```bash
npm install
npm start
# or
npm run android
npm run ios
```

## Environment Variables

Create a `.env.local` in `apps/mobile/`:

```
EXPO_PUBLIC_API_URL=https://tradeclaw.win
```

## EAS Build & Distribution

### 1. Configure EAS Project

Ensure `app.json` contains your EAS project ID under `extra.eas.projectId`. If you haven't created an EAS project yet:

```bash
eas login
eas project:create
```

Then update `app.json` with the generated project ID.

### 2. Build for Internal Testing

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

### 3. Build for App Store / Play Store

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 4. Submit to Stores

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Requires:
- Apple Developer Account (iOS)
- Google Play Developer Account (Android)
- `eas.json` `submit.production` credentials configured

## Push Notifications

Push tokens are automatically registered on app launch and sent to:

```
POST /api/notifications/expo-token
```

The app requests notification permissions on first open. Tokens are re-registered on every app launch to handle refreshes.

## Project Structure

```
app/
  _layout.tsx       # Root layout with notification setup
  (tabs)/           # Main tab navigation
  signal/[id].tsx   # Signal detail screen
assets/             # Icons, splash screen, adaptive icons
eas.json            # EAS build profiles
app.json            # Expo configuration
```

## Build Profiles

| Profile | Use Case | Distribution |
|---------|----------|--------------|
| `development` | Local dev with Expo Go | Internal |
| `preview` | QA / beta testing | Internal (APK + iOS simulator) |
| `production` | App Store / Play Store | Public stores |
