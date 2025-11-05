// app/trip-records.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTripDetails } from '../services/RestApiServices/HistoryService';

type DataPacket = {
  time: number;
  temperature: number;
  humidity: number;
};

export default function TripRecords() {
  const router = useRouter();
  const { tripName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [apiTrip, setApiTrip] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllPages, setShowAllPages] = useState(false);
  const RECORDS_PER_PAGE = 20;

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!tripName) {
        setLoading(false);
        return;
      }

      /* ========== TESTING: COMMENT FROM HERE TO REMOVE TEST DATA ========== */
      if (tripName === 'TEST_TRIP_200') {
        const fakeRecords = Array.from({ length: 200 }, (_, i) => ({
          Timestamp: String(Math.floor(Date.now() / 1000) - (200 - i) * 60),
          Temperature: String(20 + Math.random() * 10),
          Humidity: String(50 + Math.random() * 30),
        }));
        setApiTrip({
          tripInfo: {
            tripName: 'TEST_TRIP_200',
            deviceid: 'TEST_DEVICE',
            deviceID: 'TEST_DEVICE',
            tripConfig: {
              customerProfile: { profileName: 'Test Customer' },
              boxProfile: { profileName: 'Test Box', minTemp: 15, maxTemp: 30, minHum: 40, maxHum: 80 },
            },
          },
          records: fakeRecords,
        });
        setLoading(false);
        return;
      }
      /* ========== TESTING: COMMENT TO HERE TO REMOVE TEST DATA ========== */

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

  const paginatedPackets = useMemo(() => {
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
    const endIndex = startIndex + RECORDS_PER_PAGE;
    return packets.slice(startIndex, endIndex);
  }, [packets, currentPage]);

  const totalPages = Math.ceil(packets.length / RECORDS_PER_PAGE);

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
    if (value < min || value > max) return '#EF4444';
    return '#000000';
  };

  const formatDate = (unixTime: number) => {
    const date = new Date(unixTime * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (unixTime: number) => {
    const date = new Date(unixTime * 1000);
    return date.toLocaleTimeString('en-US', {
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

    const actualRecordNumber = (currentPage - 1) * RECORDS_PER_PAGE + index + 1;

    return (
      <View className="flex-row items-center border-b border-gray-200 py-2">
        <Text className="w-12 text-center text-xs text-gray-700">{actualRecordNumber}</Text>
        <Text className="flex-1 text-xs text-gray-600">{formatDate(item.time)}</Text>
        <Text className="flex-1 text-xs text-gray-600">{formatTime(item.time)}</Text>
        <Text style={{ color: tempColor, fontSize: 12, fontWeight: '600' }} className="w-16 text-center">
          {item.temperature}°C
        </Text>
        <Text style={{ color: humColor, fontSize: 12, fontWeight: '600' }} className="w-16 text-center">
          {item.humidity}%
        </Text>
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
        <Text className="text-lg font-semibold text-black">Trip Records</Text>
        <View className="w-10" />
      </View>

      {/* Records Table */}
      <View className="flex-1 px-4 pt-4">
        <Text className="mb-3 text-sm font-semibold text-gray-700">
          All Records ({packets.length} total)
        </Text>

        {packets.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400">No records available</Text>
          </View>
        ) : (
          <>
            <View className="mb-2 flex-row items-center border-b-2 border-gray-300 bg-gray-100 py-2">
              <Text className="w-12 text-center text-xs font-bold text-gray-700">#</Text>
              <Text className="flex-1 text-xs font-bold text-gray-700">Date</Text>
              <Text className="flex-1 text-xs font-bold text-gray-700">Time</Text>
              <Text className="w-16 text-center text-xs font-bold text-gray-700">Temp</Text>
              <Text className="w-16 text-center text-xs font-bold text-gray-700">Humid</Text>
            </View>
            <FlatList
              data={paginatedPackets}
              keyExtractor={(item, index) => `${item.time}-${index}`}
              renderItem={renderPacket}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
            {totalPages > 1 && (
              <View className="pb-4">
                <View className="flex-row items-center justify-center gap-2">
                  <TouchableOpacity
                    onPress={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`h-9 w-9 items-center justify-center rounded-full ${currentPage === 1 ? 'bg-gray-300' : 'bg-blue-600'}`}>
                    <Text className={currentPage === 1 ? 'text-gray-500' : 'text-white'}>«</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`h-9 w-9 items-center justify-center rounded-full ${currentPage === 1 ? 'bg-gray-300' : 'bg-blue-600'}`}>
                    <Text className={currentPage === 1 ? 'text-gray-500' : 'text-white'}>‹</Text>
                  </TouchableOpacity>
                  <View className="h-9 w-12 items-center justify-center rounded-full bg-blue-600">
                    <Text className="text-white font-semibold">{currentPage}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`h-9 w-9 items-center justify-center rounded-full ${currentPage === totalPages ? 'bg-gray-300' : 'bg-blue-600'}`}>
                    <Text className={currentPage === totalPages ? 'text-gray-500' : 'text-white'}>›</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`h-9 w-9 items-center justify-center rounded-full ${currentPage === totalPages ? 'bg-gray-300' : 'bg-blue-600'}`}>
                    <Text className={currentPage === totalPages ? 'text-gray-500' : 'text-white'}>»</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowAllPages(!showAllPages)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-blue-600">
                    <MaterialCommunityIcons name="view-grid" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {showAllPages && (
                  <View className="mt-3 flex-row flex-wrap justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <TouchableOpacity
                        key={page}
                        onPress={() => {
                          setCurrentPage(page);
                          setShowAllPages(false);
                        }}
                        className={`h-8 w-8 items-center justify-center rounded-full ${currentPage === page ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <Text className={currentPage === page ? 'text-white font-semibold text-xs' : 'text-gray-700 text-xs'}>{page}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
