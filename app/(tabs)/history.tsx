import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTripHistory } from '../../services/RestApiServices/HistoryService';

type TripRow = {
  id: string;
  deviceId: string;
  timestamp: string;
  rawTimestamp: number;
  status: 'Started' | 'Stopped';
};

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabH = useBottomTabBarHeight();

  const [tab, setTab] = useState<'all' | 'today'>('all');
  const [allData, setAllData] = useState<TripRow[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadTrips = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const result = await getTripHistory('', '', 1, 10);
      
      if (result.success && result.data?.trips) {
        const formatted: TripRow[] = result.data.trips
          .sort((a: any, b: any) => (b.startTime || 0) - (a.startTime || 0))
          .map((trip: any, index: number) => {
            const rawTime = trip.startTime ? trip.startTime * 1000 : Date.now();
            return {
              id: trip.tripName || `trip-${index}-${rawTime}`,
              deviceId: String(trip.deviceid || '—'),
              timestamp: formatDate(rawTime),
              rawTimestamp: rawTime,
              status: trip.status === 'completed' ? 'Stopped' : 'Started',
            };
          });
        
        setAllData(formatted);
        setHasMore(false);
        setPage(1);
      } else {
        setAllData([]);
      }
    } catch (error) {
      setAllData([]);
    } finally {
      setLoading(false);
    }
  }, [loading]);



  const loadMoreTrips = useCallback(() => {
    // Disabled since API returns all data at once
  }, []);

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
      const load = async () => {
        if (loading) return;
        
        setLoading(true);
        try {
          const today = new Date();
          const from = tab === 'today' 
            ? today.toISOString().split('T')[0]
            : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const to = today.toISOString().split('T')[0];
          
          const result = await getTripHistory(from, to, 1, 10);
          
          if (result.success && result.data?.trips) {
            const formatted: TripRow[] = result.data.trips
              .sort((a: any, b: any) => (b.startTime || 0) - (a.startTime || 0))
              .map((trip: any, index: number) => {
                const rawTime = trip.startTime ? trip.startTime * 1000 : Date.now();
                return {
                  id: trip.tripName || `trip-${index}-${Date.now()}`,
                  deviceId: String(trip.deviceid || '—'),
                  timestamp: formatDate(rawTime),
                  rawTimestamp: rawTime,
                  status: trip.status === 'completed' ? 'Stopped' : 'Started',
                };
              });
            
            setAllData(formatted);
            setHasMore(false);
            setPage(1);
          } else {
            setAllData([]);
          }
        } catch (error) {
          setAllData([]);
        } finally {
          setLoading(false);
        }
      };
      
      load();
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

  const displayed = useMemo(() => {
    if (tab === 'today') {
      const today = new Date().toDateString();
      return allData.filter(trip => {
        const tripDate = new Date(trip.rawTimestamp).toDateString();
        return tripDate === today;
      });
    }
    return allData;
  }, [tab, allData]);

  const renderItem = ({ item }: { item: TripRow }) => (
    <TouchableOpacity
      onPress={() => {
        if (selectionMode) {
          toggleSelection(item.deviceId);
        } else {
          // Navigate to trip detail screen
          router.push({
            pathname: '/trip-detail',
            params: { tripIndex: String(parseInt(item.id) - 1) },
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
      <Text className="flex-1 text-[15px] font-semibold text-black">{item.deviceId}</Text>
      <Text className="flex-1 text-center text-[12px] text-gray-600">{item.timestamp}</Text>
      <View className="flex-1 flex-row items-center justify-end">
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
          <Text className="text-lg font-extrabold text-black">Device History</Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <View className="flex-1 px-4" style={{ paddingBottom: tabH + 8 }}>
        {/* Tabs */}
        <View className="mb-4 flex-row justify-center">
          <TouchableOpacity
            onPress={() => {
              if (tab !== 'all') {
                setTab('all');
                setPage(1);
                setHasMore(true);
              }
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
              if (tab !== 'today') {
                setTab('today');
                setPage(1);
                setHasMore(true);
              }
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
            data={displayed}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 50, width: '95%', alignSelf: 'center' }}
            onEndReached={loadMoreTrips}
            onEndReachedThreshold={0.1}
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
