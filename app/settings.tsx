import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { getUser, clearUser } from '../mmkv-storage/storage';
import CustomModal from '../components/CustomModal';
import { deleteUser } from '../services/RestApiServices/AuthenticateService';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      const body = {
        username: user?.data?.user?.Username || '',
        phone: user?.data?.user?.Phone || '',
        email: user?.data?.user?.Email || ''
      };
      
      await deleteUser(body);
      clearUser();
      router.replace('/splash');
    } catch (error) {
      clearUser();
      router.replace('/splash');
    } finally {
      setShowLogoutModal(false);
    }
  };

  const formatDate = (timestamp: number | string): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-GB', {
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
        <View className="mb-4 overflow-hidden rounded-2xl border border-gray-300">
          <View className="bg-blue-50 px-4 py-3">
            <Text className="text-base font-bold text-blue-600">Personal Info</Text>
          </View>
          <View className="bg-white p-4">

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
        </View>

        {/* Account Info Section */}
        <View className="mb-4 overflow-hidden rounded-2xl border border-gray-300">
          <View className="bg-blue-50 px-4 py-3">
            <Text className="text-base font-bold text-blue-600">Account Info</Text>
          </View>
          <View className="bg-white p-4">

          {/* Help & Support */}
          <TouchableOpacity onPress={() => router.push('/help-support')} className="mb-4 flex-row items-center justify-between py-2">
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
        </View>
      </ScrollView>

      <CustomModal
        visible={showLogoutModal}
        type="warning"
        title="Logout"
        message="Are you sure you want to logout?"
        onClose={() => setShowLogoutModal(false)}
        buttonText="Cancel"
        onConfirm={confirmLogout}
        confirmText="Logout"
      />
    </SafeAreaView>
  );
}
