// app/trip-detail.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrips } from '../mmkv-storage/storage';
import { getTripDetails } from '../services/RestApiServices/HistoryService';

type DataPacket = {
  time: number;
  temperature: number;
  humidity: number;
};

export default function TripDetail() {
  const router = useRouter();
  const { tripName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [apiTrip, setApiTrip] = useState<any>(null);

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!tripName) {
        setLoading(false);
        return;
      }

      const result = await getTripDetails(String(tripName));
      if (result.success && result.data) {
        setApiTrip(result.data);
      }
      setLoading(false);
    };

    fetchTripDetails();
  }, [tripName]);

  const trip = apiTrip?.tripInfo;

  const packets = useMemo(() => {
    if (apiTrip?.records) {
      return apiTrip.records.map((r: any) => ({
        time: parseInt(r.Timestamp),
        temperature: parseFloat(r.Temperature),
        humidity: parseFloat(r.Humidity),
      }));
    }
    return [];
  }, [apiTrip]);

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
          </View>

          <View className="w-px bg-gray-200" />

          <View className="items-center">
            <Text className="mb-1 text-xs text-gray-500">Humidity</Text>
            <Text style={{ color: humColor, fontSize: 20, fontWeight: '600' }}>
              {item.humidity}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </SafeAreaView>
    );
  }

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
        {trip.tripConfig?.boxProfile && (
          <View className="mt-1 flex-row items-center">
            <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
            <Text className="ml-1 text-sm text-gray-600">
              {trip.tripConfig.boxProfile.profileName}
            </Text>
          </View>
        )}
        {trip.startLocation && (
          <View className="mt-1 flex-row items-center">
            <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
            <Text className="ml-1 text-sm text-gray-600">
              Start: {trip.startLocation.latitude.toFixed(4)}, {trip.startLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
        {trip.endLocation && (
          <View className="mt-1 flex-row items-center">
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
            <Text className="ml-1 text-sm text-gray-600">
              End: {trip.endLocation.latitude.toFixed(4)}, {trip.endLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Thresholds & Legend */}
        {thresholds && (
          <View className="mt-3 rounded-lg bg-gray-100 p-3">
            <View className="mb-2 flex-row justify-around">
              <View className="items-center">
                <Text className="text-xs text-gray-500">Temp Range</Text>
                <Text className="text-sm font-semibold text-gray-700">
                  {thresholds.tempMin}° - {thresholds.tempMax}°C
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-gray-500">Humidity Range</Text>
                <Text className="text-sm font-semibold text-gray-700">
                  {thresholds.humMin}% - {thresholds.humMax}%
                </Text>
              </View>
            </View>
            <View className="mt-2 flex-row items-center justify-around border-t border-gray-300 pt-2">
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
        )}
      </View>

      {/* Data List */}
      <View className="flex-1 px-4 pt-4">
        <Text className="mb-3 text-sm font-semibold text-gray-700">
          Collected Data ({packets.length} records)
        </Text>

        {packets.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400">Please stop trip to view records</Text>
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
