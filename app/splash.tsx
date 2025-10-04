// app/splash.tsx
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/login'), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={['#1e3a8a', '#2563eb']} className="flex-1 items-center justify-center">
      <Text className="text-3xl font-bold tracking-wide text-white">Thinxlog</Text>
    </LinearGradient>
  );
}
