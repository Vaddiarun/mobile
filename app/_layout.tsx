// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* Tabs are the default "Home" */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip-configuration" options={{ headerShown: false }} />
      <Stack.Screen
        name="bluetooth-communication"
        options={{ title: 'Mobile to Sensor', headerTitleAlign: 'center' }}
      />
    </Stack>
  );
}
