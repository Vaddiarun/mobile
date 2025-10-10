// app/trip-detail.tsx
import React, { useMemo } from 'react';
import { Buffer } from 'buffer';
import { View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrips } from '../mmkv-storage/storage';

type DataPacket = {
  time: number;
  temperature: number;
  humidity: number;
};

export default function TripDetail() {
  const router = useRouter();
  const { tripIndex } = useLocalSearchParams();

  const trip = useMemo(() => {
    const trips = getTrips() || [];
    const index = parseInt(String(tripIndex), 10);
    return trips[index] || null;
  }, [tripIndex]);

  const packets = useMemo(() => {
    if (!trip) return [];

    // First try to use the packets array if available (newly saved trips)
    if (trip.packets && Array.isArray(trip.packets)) {
      return trip.packets.sort((a: DataPacket, b: DataPacket) => a.time - b.time);
    }

    // Fallback to parsing comma-separated data string (legacy trips)
    const dataString = trip.data || '';
    if (!dataString) return [];

    try {
      // Convert comma-separated string back to buffer, then to JSON
      const bufferArray = dataString.split(',').map((n: string) => parseInt(n, 10));
      const buffer = Buffer.from(bufferArray);
      const jsonString = buffer.toString('utf-8');
      const parsedData = JSON.parse(jsonString);

      // Sort by timestamp (ascending - earliest first)
      return (parsedData as DataPacket[]).sort((a, b) => a.time - b.time);
    } catch (e) {
      console.error('Error parsing trip data:', e);
      return [];
    }
  }, [trip]);

  const thresholds = useMemo(() => {
    if (!trip?.tripConfig?.boxProfile) return null;

    const profile = trip.tripConfig.boxProfile;
    return {
      tempMin: profile.minTemp ?? -Infinity,
      tempMax: profile.maxTemp ?? Infinity,
      humMin: profile.minHum ?? -Infinity,
      humMax: profile.maxHum ?? Infinity,
    };
  }, [trip]);

  const getValueColor = (value: number, min: number, max: number) => {
    if (value < min || value > max) return '#EF4444'; // Red for exceeding
    if (value === min || value === max) return '#F59E0B'; // Yellow for at limit
    return '#10B981'; // Green for normal
  };

  const formatTimestamp = (unixTime: number) => {
    const date = new Date(unixTime * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderPacket = ({ item, index }: { item: DataPacket; index: number }) => {
    const tempColor = thresholds
      ? getValueColor(item.temperature, thresholds.tempMin, thresholds.tempMax)
      : '#10B981';
    const humColor = thresholds
      ? getValueColor(item.humidity, thresholds.humMin, thresholds.humMax)
      : '#10B981';

    return (
      <View className="mb-3 rounded-lg border border-gray-200 bg-white p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-600">Record #{index + 1}</Text>
          <Text className="text-xs text-gray-500">{formatTimestamp(item.time)}</Text>
        </View>

        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="mb-1 text-xs text-gray-500">Temperature</Text>
            <Text style={{ color: tempColor, fontSize: 20, fontWeight: '600' }}>
              {item.temperature}°C
            </Text>
            {thresholds && (
              <Text className="mt-1 text-xs text-gray-400">
                ({thresholds.tempMin}° - {thresholds.tempMax}°)
              </Text>
            )}
          </View>

          <View className="w-px bg-gray-200" />

          <View className="items-center">
            <Text className="mb-1 text-xs text-gray-500">Humidity</Text>
            <Text style={{ color: humColor, fontSize: 20, fontWeight: '600' }}>
              {item.humidity}%
            </Text>
            {thresholds && (
              <Text className="mt-1 text-xs text-gray-400">
                ({thresholds.humMin}% - {thresholds.humMax}%)
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
        <Pressable
          className="h-10 w-10 items-center justify-center"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Trip Details</Text>
        <View className="w-10" />
      </View>

      {/* Trip Info */}
      <View className="border-b border-gray-200 bg-white p-4">
        <Text className="mb-1 text-xl font-bold text-gray-800">
          {trip.tripName || 'Unnamed Trip'}
        </Text>
        <View className="mt-2 flex-row items-center">
          <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600">Device: {trip.deviceID}</Text>
        </View>
        {trip.tripConfig?.customerProfile && (
          <View className="mt-1 flex-row items-center">
            <MaterialCommunityIcons name="account" size={16} color="#666" />
            <Text className="ml-1 text-sm text-gray-600">
              {trip.tripConfig.customerProfile.profileName}
            </Text>
          </View>
        )}
        <View className="mt-1 flex-row items-center">
          <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600">{trip.location || 'No location'}</Text>
        </View>

        {/* Legend */}
        <View className="mt-3 flex-row items-center justify-around rounded-lg bg-gray-100 p-2">
          <View className="flex-row items-center">
            <View className="mr-1 h-3 w-3 rounded-full bg-green-500" />
            <Text className="text-xs text-gray-600">Normal</Text>
          </View>
          <View className="flex-row items-center">
            <View className="mr-1 h-3 w-3 rounded-full bg-yellow-500" />
            <Text className="text-xs text-gray-600">At Limit</Text>
          </View>
          <View className="flex-row items-center">
            <View className="mr-1 h-3 w-3 rounded-full bg-red-500" />
            <Text className="text-xs text-gray-600">Exceeds</Text>
          </View>
        </View>
      </View>

      {/* Data List */}
      <View className="flex-1 px-4 pt-4">
        <Text className="mb-3 text-sm font-semibold text-gray-700">
          Collected Data ({packets.length} records)
        </Text>

        {packets.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400">No data available</Text>
          </View>
        ) : (
          <FlatList
            data={packets}
            keyExtractor={(item, index) => `${item.time}-${index}`}
            renderItem={renderPacket}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
