import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getUser, clearUser } from '../mmkv-storage/storage';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          clearUser();
          router.replace('/splash');
        },
      },
    ]);
  };

  const formatDate = (timestamp: number | string): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const userName = user?.data?.user?.Username || 'User';
  const userEmail = user?.data?.user?.Email || 'Not available';
  const userPhone = user?.data?.user?.Phone || 'Not available';
  const registeredDate = formatDate(Date.now());

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 pt-2">
        <Pressable
          className="h-10 w-10 items-center justify-center"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-bold text-black">Settings</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Personal Info Section */}
        <View className="mb-4 rounded-2xl bg-blue-50 p-4">
          <Text className="mb-4 text-base font-bold text-blue-800">Personal Info</Text>

          {/* Name */}
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
              <MaterialCommunityIcons name="account-outline" size={24} color="#1976D2" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Name</Text>
              <Text className="text-base font-semibold text-gray-800">{userName}</Text>
            </View>
          </View>

          {/* Email */}
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
              <MaterialCommunityIcons name="email-outline" size={24} color="#1976D2" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Email</Text>
              <Text className="text-base font-semibold text-gray-800">{userEmail}</Text>
            </View>
          </View>

          {/* Phone Number */}
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
              <MaterialCommunityIcons name="phone-outline" size={24} color="#1976D2" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Phone Number</Text>
              <Text className="text-base font-semibold text-gray-800">{userPhone}</Text>
            </View>
          </View>

          {/* Registered Date */}
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
              <MaterialCommunityIcons name="calendar-outline" size={24} color="#1976D2" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Registered Date</Text>
              <Text className="text-base font-semibold text-gray-800">{registeredDate}</Text>
            </View>
          </View>
        </View>

        {/* Account Info Section */}
        <View className="mb-4 rounded-2xl bg-gray-50 p-4">
          <Text className="mb-4 text-base font-bold text-gray-800">Account Info</Text>

          {/* Help & Support */}
          <TouchableOpacity className="mb-4 flex-row items-center justify-between py-2">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="help-circle-outline" size={24} color="#666" />
              <Text className="ml-3 text-base text-gray-800">Help & Support</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} className="flex-row items-center py-2">
            <MaterialCommunityIcons name="logout" size={24} color="#d32f2f" />
            <Text className="ml-3 text-base font-semibold text-red-600">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
