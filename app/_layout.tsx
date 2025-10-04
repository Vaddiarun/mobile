import 'react-native-reanimated';
import '../global.css';
import './tw-interop';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trip-configuration" options={{ headerShown: false }} />
        <Stack.Screen
          name="bluetooth-communication"
          options={{ title: 'Mobile to Sensor', headerTitleAlign: 'center' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
