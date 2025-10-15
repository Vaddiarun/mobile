import React from 'react';
import { View, Text, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HelpSupport() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-black">Help & Support</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="flex-1 px-4">
        <View className="mb-4 overflow-hidden rounded-2xl border border-gray-300">
          <View className="bg-blue-50 px-4 py-3">
            <Text className="text-base font-bold text-blue-600">Email Support</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:gnd-support@gndsolutions.in')}
            className="flex-row items-center bg-white p-4">
            <MaterialCommunityIcons name="email-outline" size={24} color="#1976D2" />
            <Text className="ml-3 text-base text-gray-800">gnd-support@gndsolutions.in</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4 overflow-hidden rounded-2xl border border-gray-300">
          <View className="bg-blue-50 px-4 py-3">
            <Text className="text-base font-bold text-blue-600">Call Support</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL('tel:+911234567890')}
            className="flex-row items-center bg-white p-4">
            <MaterialCommunityIcons name="phone-outline" size={24} color="#1976D2" />
            <Text className="ml-3 text-base text-gray-800">+91 1234567890</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
