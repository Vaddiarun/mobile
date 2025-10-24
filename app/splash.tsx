import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { getUser } from '../mmkv-storage/storage';
import { getTripHistory } from '../services/RestApiServices/HistoryService';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndTrips = async () => {
      const user = getUser();
      if (user && user.data && user.data.token) {
        // Check if user has any active trips
        try {
          const historyResult = await getTripHistory('', '', 1, 1000);
          if (historyResult.success && historyResult.data?.trips) {
            const hasActiveTrip = historyResult.data.trips.some(
              (trip: any) => trip.status !== 'completed'
            );
            
            if (hasActiveTrip) {
              console.log('Active trip found, navigating to home');
            }
          }
        } catch (error) {
          console.log('Error checking trips:', error);
        }
        
        router.replace('/(tabs)');
      } else {
        router.replace('/register');
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
