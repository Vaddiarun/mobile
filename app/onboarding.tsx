import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { storage } from '../mmkv-storage/storage';

export default function OnboardingScreen() {
  const router = useRouter();

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const locationStatus = await Location.requestForegroundPermissionsAsync();

      if (cameraStatus.status !== 'granted' || locationStatus.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and Location permissions are needed for full app functionality.',
          [{ text: 'OK' }]
        );
      }
      
      storage.set('hasCompletedOnboarding', true);
      router.replace('/login');
    } catch (error) {
      console.error('Permission request error:', error);
      storage.set('hasCompletedOnboarding', true);
      router.replace('/login');
    }
  };

  return <View className="flex-1 bg-white" />;
}
