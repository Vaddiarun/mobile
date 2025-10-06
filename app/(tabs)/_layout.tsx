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
          height: 60,
          borderRadius: 40,
          marginHorizontal: 25,
          marginBottom: Math.max(insets.bottom, 20),
          paddingBottom: 10,
          paddingTop: 10,
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          // elevation: 5,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIcon: ({ focused, color }) => {
          const isQR = route.name === 'qr-scanner';
          const name =
            route.name === 'index' ? 'home' : route.name === 'history' ? 'history' : 'home';

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
  dot: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotFocused: {
    backgroundColor: '#2563EB', // blue-600
  },
});
