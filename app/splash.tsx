import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { getUser, hasCompletedOnboarding } from '../mmkv-storage/storage';
import { getTripHistory } from '../services/RestApiServices/HistoryService';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndTrips = async () => {
      // Check if first time user
      if (!hasCompletedOnboarding()) {
        router.replace('/onboarding');
        return;
      }

      // Check if user is already logged in
      const user = getUser();
      if (user?.data?.token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    };

    const t = setTimeout(checkAuthAndTrips, 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient colors={['#1e3a8a', '#2563eb']} className="flex-1 items-center justify-center">
      <Image
        source={require('assets/images/logo_splash.png')}
        style={{ width: 250, height: 220 }}
        contentFit="contain"
      />
    </LinearGradient>
  );
}
