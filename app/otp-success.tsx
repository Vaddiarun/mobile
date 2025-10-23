import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import OtpVerifiedSvg from '../assets/images/otp_verified.svg';

export default function OtpSuccess() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      className="flex-1 items-center justify-center bg-white px-6">
      <OtpVerifiedSvg width={120} height={120} />

      <Text className="mt-6 text-4xl font-bold text-gray-800">You're In</Text>
      <Text className="mt-6 text-2xl font-bold text-gray-800">Verification Successful!</Text>
      <Text className="mt-2 text-center text-base text-gray-600">
        Your account has been verified successfully
      </Text>
    </SafeAreaView>
  );
}
