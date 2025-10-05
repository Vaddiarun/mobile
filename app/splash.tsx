// app/splash.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text } from 'react-native';

export default function Splash() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/login'), 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <LinearGradient colors={['#1e3a8a', '#2563eb']} className="flex-1 items-center justify-center">
      <Text className="text-3xl font-bold text-white">Thinxlog</Text>
    </LinearGradient>
  );
}
