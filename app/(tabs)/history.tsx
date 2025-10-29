import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTripHistory } from '../../services/RestApiServices/HistoryService';

type TripRow = {
  id: string;
  tripName: string;
  deviceId: string;
  timestamp: string;
  rawTimestamp: number;
  status: 'Started' | 'Stopped';
};

export default function History() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const tabH = useBottomTabBarHeight();

  const [tab, setTab] = useState<'all' | 'today'>('all');

  // Force tab to 'all' when coming from home page
  useFocusEffect(
    useCallback(() => {
      if (params.forceTab === 'all') {
        setTab('all');
      }
    }, [params.forceTab])
  );
  const [allData, setAllData] = useState<TripRow[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllPages, setShowAllPages] = useState(false);
  const RECORDS_PER_PAGE = 10;

  const loadAllTrips = async (from: string, to: string) => {
    if (loading) return;

    setLoading(true);
    try {
      let allTrips: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const result = await getTripHistory(from, to, page, 50);
        
        if (result.success && result.data) {
          if (result.data.trips) {
            allTrips = [...allTrips, ...result.data.trips];
          }
          totalPages = result.data.meta?.totalPages || 1;
          page++;
        } else {
          break;
        }
      } while (page <= totalPages);

      const formatted: TripRow[] = allTrips
        .sort((a: any, b: any) => (b.startTime || 0) - (a.startTime || 0))
        .map((trip: any, index: number) => {
          const isCompleted = trip.status === 'completed';
          const rawTime =
            isCompleted && trip.endTime
              ? trip.endTime * 1000
              : trip.startTime
                ? trip.startTime * 1000
                : Date.now();
          return {
            id: trip.tripName || `trip-${index}-${rawTime}`,
            tripName: trip.tripName || '',
            deviceId: String(trip.deviceid || '—'),
            timestamp: formatDate(rawTime),
            rawTimestamp: rawTime,
            status: isCompleted ? 'Stopped' : 'Started',
          };
        });

      setAllData(formatted);
    } catch (error) {
      setAllData([]);
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleSelection = (deviceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedIds(newSelected);
  };

  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      const from =
        tab === 'today'
          ? today.toISOString().split('T')[0]
          : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      loadAllTrips(from, to);
    }, [tab])
  );

  const todayPrefix = useMemo(
    () =>
      new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  const filteredData = useMemo(() => {
    if (tab === 'today') {
      const today = new Date().toDateString();
      return allData.filter((trip) => {
        const tripDate = new Date(trip.rawTimestamp).toDateString();
        return tripDate === today;
      });
    }
    return allData;
  }, [tab, allData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
    const endIndex = startIndex + RECORDS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / RECORDS_PER_PAGE);

  const renderItem = ({ item }: { item: TripRow }) => (
    <TouchableOpacity
      onPress={() => {
        if (selectionMode) {
          toggleSelection(item.deviceId);
        } else {
          router.push({
            pathname: '/trip-detail',
            params: { tripName: item.id },
          });
        }
      }}
      className="border-1 my-1 flex-row items-center justify-between border-b border-gray-500 py-3 ">
      {selectionMode && (
        <View className="mr-2">
          <MaterialIcons
            name={selectedIds.has(item.deviceId) ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={selectedIds.has(item.deviceId) ? '#1976D2' : '#666'}
          />
        </View>
      )}
      <Text className="flex-[1.5] text-[15px] font-semibold text-black">{item.deviceId}</Text>
      <Text className="flex-[1.8] text-left text-[12px] text-gray-600">{item.timestamp}</Text>
      <View className="flex-[0.7] flex-row items-center justify-start">
        <View
          className={`mr-2 h-2.5 w-2.5 rounded-full ${
            item.status === 'Started' ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <Text className="text-[12px] text-gray-700">{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          {/* {selectionMode ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel selection"
                onPress={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="h-9 w-9 items-center justify-center">
                <MaterialIcons name="close" size={22} color="#666" />
              </Pressable>
              <Text className="text-lg font-extrabold text-black">{selectedIds.size} Selected</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete selected"
                onPress={handleDeleteSelected}
                className="h-9 w-9 items-center justify-center">
                <MaterialCommunityIcons name="delete-outline" size={22} color="#d32f2f" />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select trips"
                onPress={() => setSelectionMode(true)}
                className="h-9 w-9 items-center justify-center">
                <MaterialIcons name="check-box-outline-blank" size={22} color="#666" />
              </Pressable>
              <Text className="text-lg font-extrabold text-black">Device History</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all history"
                onPress={handleClearAllHistory}
                className="h-9 w-9 items-center justify-center">
                <MaterialCommunityIcons name="delete-outline" size={22} color="#d32f2f" />
              </Pressable>
            </>
          )} */}
          <View className="h-9 w-9" />
          <View className="items-center">
            <Text className="text-lg font-extrabold text-black">Device History</Text>
            <Text className="text-xs text-gray-400">click on trip to view details</Text>
          </View>
          <View className="h-9 w-9" />
        </View>
      </View>

      <View className="flex-1 px-4" style={{ paddingBottom: tabH + 8 }}>
        {/* Tabs */}
        <View className="mb-4 flex-row justify-center">
          <TouchableOpacity
            onPress={() => {
              setTab('all');
              setCurrentPage(1);
            }}
            className={`mx-5 flex-1 items-center rounded-full border px-4 py-2 ${
              tab === 'all' ? 'border-[#1976D2] bg-[#1976D2]' : 'border-gray-300 bg-white'
            }`}>
            <Text
              className={`text-base font-medium ${tab === 'all' ? 'text-white' : 'text-black'}`}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setTab('today');
              setCurrentPage(1);
            }}
            className={`mx-5 flex-1 items-center rounded-full border px-4 py-2 ${
              tab === 'today' ? 'border-[#1976D2] bg-[#1976D2]' : 'border-gray-300 bg-white'
            }`}>
            <Text
              className={`text-base font-medium ${tab === 'today' ? 'text-white' : 'text-black'}`}>
              Today
            </Text>
          </TouchableOpacity>
        </View>

        {/* Table container */}
        <View className="mb-14 flex-1 rounded-[30px] bg-[#e6e6e6] p-2">
          {/* Header row */}
          <View className="mx-auto mt-2 w-[90%] flex-row">
            <Text className="flex-[1.5] text-[14px] font-bold text-black">Device ID</Text>
            <Text className="flex-[1.8] text-[14px] font-bold text-black">Timestamp</Text>
            <Text className="flex-[0.7] text-[14px] font-bold text-black">Status</Text>
          </View>

          {/* List */}
          <FlatList
            data={paginatedData}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 50, width: '95%', alignSelf: 'center' }}

            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color="#1976D2" className="mt-10" />
              ) : (
                <Text className="mt-5 text-center text-sm text-gray-600">No trips found.</Text>
              )
            }
            ListFooterComponent={
              loading && allData.length > 0 ? (
                <ActivityIndicator size="small" color="#1976D2" className="my-4" />
              ) : null
            }
          />
          
          {totalPages > 1 && (
            <View className="pb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1" />
                <View className="flex-row items-center gap-2">
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
                </View>
                <View className="flex-1 items-end">
                  <TouchableOpacity
                    onPress={() => setShowAllPages(!showAllPages)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-blue-600">
                    <MaterialCommunityIcons name="view-grid" size={18} color="white" />
                  </TouchableOpacity>
                </View>
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
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatDate(ts: number | string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
