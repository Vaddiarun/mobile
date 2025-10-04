// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View } from 'react-native';
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
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          alignSelf: 'center',
          borderRadius: 30,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 10,
          marginLeft: 20,
          marginRight: 20,
          marginBottom: insets.bottom < 30 ? 30 : 60,
        },
        tabBarIcon: ({ focused }) => {
          const isQR = route.name === 'qr-scanner';
          const name =
            route.name === 'index' ? 'home' : route.name === 'history' ? 'history' : undefined;

          return (
            <View
              className={`mt-2 h-16 w-16 items-center justify-center rounded-full ${
                focused ? 'bg-blue-600' : 'bg-transparent'
              }`}>
              {isQR ? (
                <MaterialCommunityIcons name="line-scan" size={focused ? 35 : 25} color="#fff" />
              ) : (
                <MaterialIcons
                  name={(name as any) ?? 'home'}
                  size={focused ? 35 : 25}
                  color="#fff"
                />
              )}
            </View>
          );
        },
      })}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="qr-scanner" options={{ title: 'QRScaner' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
