import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { storage } from '../mmkv-storage/storage';

export default function ResetTour() {
  const router = useRouter();

  const resetAppTour = () => {
    storage.delete('hasCompletedAppTour');
    Alert.alert('Success', 'App tour reset! Go to home page to see the tour.', [
      { text: 'OK', onPress: () => router.push('/(tabs)') }
    ]);
  };

  const resetOnboarding = () => {
    storage.delete('hasCompletedOnboarding');
    Alert.alert('Success', 'Onboarding reset! Restart the app to see permissions.', [
      { text: 'OK' }
    ]);
  };

  const resetBoth = () => {
    storage.delete('hasCompletedAppTour');
    storage.delete('hasCompletedOnboarding');
    Alert.alert('Success', 'Both reset! Restart the app for full experience.', [
      { text: 'OK' }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-6">
        <Text className="mb-8 text-2xl font-bold text-black">Reset Tour</Text>

        <TouchableOpacity
          onPress={resetAppTour}
          className="mb-4 w-full rounded-lg bg-blue-600 p-4">
          <Text className="text-center text-base font-semibold text-white">
            Reset App Tour Only
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={resetOnboarding}
          className="mb-4 w-full rounded-lg bg-green-600 p-4">
          <Text className="text-center text-base font-semibold text-white">
            Reset Permissions Only
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={resetBoth}
          className="mb-4 w-full rounded-lg bg-red-600 p-4">
          <Text className="text-center text-base font-semibold text-white">
            Reset Everything
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 w-full rounded-lg border-2 border-gray-300 p-4">
          <Text className="text-center text-base font-semibold text-gray-700">
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
