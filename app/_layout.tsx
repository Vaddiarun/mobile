// app/_layout.tsx
import 'react-native-reanimated';
import '../global.css';
import './tw-interop';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="verifyotp" options={{ headerShown: false }} />
        <Stack.Screen name="otp-success" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="help-support" options={{ headerShown: false }} />
        <Stack.Screen name="trip-configuration" options={{ headerShown: false }} />
        <Stack.Screen name="trip-detail" options={{ headerShown: false }} />
        <Stack.Screen
          name="bluetooth-communication"
          options={{ title: 'Mobile to Sensor', headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
