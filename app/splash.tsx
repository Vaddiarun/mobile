import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Image } from 'expo-image';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/login'), 1000);
    // const t = setTimeout(() => router.replace('/(tabs)'), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#1e3a8a', '#2563eb']} className="flex-1 items-center justify-center">
      <Image
        source={require('assets/images/logo_splash.png')} // 🖼️ replace with your image path
        style={{ width: 250, height: 220 }} // adjust size as needed
        contentFit="contain"
      />
    </LinearGradient>
  );
}
