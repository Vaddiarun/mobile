// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(0,0,0,0.85)',
          borderTopWidth: 0,
          elevation: 0,
          height: 44,
          alignSelf: 'center',
          borderRadius: 32,
          paddingHorizontal: 12,
          marginLeft: 20,
          marginRight: 20,
          marginBottom: Math.max(insets.bottom, 50),
        },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarIconStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarIcon: ({ focused, color, size }) => {
          const isQR = route.name === 'qr-scanner';
          const name =
            route.name === 'index' ? 'home' : route.name === 'history' ? 'history' : 'home';

          // circular highlight when focused
          return (
            <View style={[styles.dot, focused && styles.dotFocused]}>
              {isQR ? (
                <MaterialCommunityIcons name="line-scan" size={focused ? 30 : 24} color={color} />
              ) : (
                <MaterialIcons name={name as any} size={focused ? 30 : 24} color={color} />
              )}
            </View>
          );
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="qr-scanner" options={{ title: 'QRScanner' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dot: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  dotFocused: { backgroundColor: '#2563EB' }, // blue-600
});
