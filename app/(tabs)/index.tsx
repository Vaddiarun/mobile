// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Platform,
  PermissionsAndroid,
  Alert,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Camera } from 'react-native-vision-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getUser, getTrips } from '../../mmkv-storage/storage';

export default function Home() {
  const insets = useSafeAreaInsets();
  const tabH = useBottomTabBarHeight();
  const router = useRouter();

  const [userName, setUserName] = useState('User');
  const [tripOn, setTripOn] = useState(0);
  const [tripOff, setTripOff] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const loadUserData = useCallback(() => {
    const user = getUser();
    if (user && user.data && user.data.user) {
      setUserName(user.data.user.Username || 'User');
    }

    const trips = getTrips() || [];
    const activeTrips = trips.filter((trip: any) => trip.status === 'Started');
    const inactiveTrips = trips.filter((trip: any) => trip.status === 'Stopped');

    setTripOn(activeTrips.length);
    setTripOff(inactiveTrips.length);

    const sortedTrips = [...trips]
      .sort((a: any, b: any) => {
        const timeA = a.stopTimestamp || a.timestamp || a.createdAt || 0;
        const timeB = b.stopTimestamp || b.timestamp || b.createdAt || 0;
        return timeB - timeA;
      })
      .slice(0, 4);

    const formattedActivity = sortedTrips.map((trip: any) => ({
      id: trip.deviceID || trip.tripName || '—',
      time: formatDate(trip.stopTimestamp || trip.timestamp || trip.createdAt || Date.now()),
      status: trip.status === 'Started' ? 'Turned on' : 'Turned off',
    }));

    setRecentActivity(formattedActivity);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const formatDate = (ts: number | string): string => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    const req = async () => {
      const cam = await Camera.requestCameraPermission();
      if (cam !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed.');
        return;
      }
      if (Platform.OS !== 'android') return;

      if (Platform.Version >= 31) {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(permissions).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert(
            'Permissions Required',
            'Bluetooth and Location permissions are required for scanning devices.'
          );
        }
      } else if (Platform.Version >= 23) {
        const hasLoc = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!hasLoc) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Location permission is required for Bluetooth scanning.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission Required',
              'Location permission is required to scan for Bluetooth devices.'
            );
          }
        }
      }
    };
    req();
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingTop: 16 + insets.top, paddingBottom: tabH + 24 }}
        showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View className="mb-6 flex-row items-start justify-between">
          <View>
            <Text className="text-4xl font-bold text-black">Hello, {userName}</Text>
            <Text className="mt-1 text-sm text-gray-600">A quick look at your devices</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings' as any)}
            className="mt-4">
            <MaterialCommunityIcons name="cog-outline" size={30} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Trip summary */}
        <View className="mb-5 mt-3 rounded-xl bg-gray-100 p-4 py-10">
          <Text className="mb-3 text-2xl font-bold text-black">What You Did Today</Text>
          <View className="flex-row justify-between">
            <View className="flex-1 items-start">
              <Text className="text-xl font-semibold text-neutral-900">Trip On</Text>
              <Text className="text-md mb-1 text-gray-600">Active devices</Text>
              <Text className="text-6xl font-extrabold text-blue-600">
                {tripOn.toString().padStart(2, '0')}
              </Text>
            </View>
            <View className="flex-1 items-start">
              <Text className="text-xl font-semibold text-neutral-900">Trip Off</Text>
              <Text className="text-md mb-1 text-gray-600">Inactive devices</Text>
              <Text className="text-6xl font-extrabold text-blue-600">
                {tripOff.toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>

        {/* Banner */}
        <View className="relative mb-6 mt-3">
          <Image
            source={require('../../assets/images/G8.png')}
            contentFit="contain"
            className="absolute -top-4 left-6 z-20   h-[140px] w-[90px]"
            accessibilityLabel="Device"
          />
          <View className="relative mt-10 flex-row items-center rounded-xl bg-blue-600 p-7">
            <View className="absolute left-[-20px] top-5 h-[140px] w-[140px] rounded-full bg-white/20" />
            <View className="flex-1">
              <Text className="ml-40 text-base font-bold text-white">Humidity & Temperature</Text>
              <Text className="ml-40 mt-1 text-[13px] text-gray-100">
                Always Under Your Control
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-3 mt-6 flex-row justify-between">
          <Text className="text-[17px] font-bold text-black">Recent Activity</Text>
          {/* <Text
            className="text-sm text-blue-600"
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/history')}>
            Show all
          </Text> */}
        </View>

        {recentActivity.length > 0 ? (
          recentActivity.map((item, index) => (
            <View
              key={`${item.id}-${index}`}
              className="flex-row justify-between border-b border-gray-200 py-3.5">
              <Text className="flex-1 text-base font-semibold text-black">{item.id}</Text>
              <Text className="flex-1 text-center text-[13px] text-gray-600">{item.time}</Text>
              <View className="flex-1 flex-row items-center justify-end">
                <View
                  className={`mr-1.5 h-3 w-3 rounded-full ${item.status === 'Turned on' ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <Text className="text-[13px] text-black">{item.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <View className="py-8">
            <Text className="text-center text-sm text-gray-500">No recent activity</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
