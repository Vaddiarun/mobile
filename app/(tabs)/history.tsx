import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Pressable, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTrips, clearAllTrips, deleteSelectedTrips } from '../../mmkv-storage/storage';

type TripRow = {
  id: string;
  deviceId: string;
  timestamp: string;
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

  const loadTrips = useCallback(() => {
    const trips = getTrips?.() || [];
    const formatted: TripRow[] = trips.map((trip: any, index: number) => ({
      id: String(index + 1),
      deviceId: String(trip.deviceID ?? '—'),
      timestamp: formatDate(
        trip.status === 'Stopped'
          ? (trip.stopTimestamp ?? trip.timestamp ?? trip.createdAt ?? Date.now())
          : (trip.timestamp ?? trip.createdAt ?? Date.now())
      ),
      status: trip.status || 'Started',
    }));
    setAllData(formatted);
  }, []);

  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all trip history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAllTrips();
            setAllData([]);
            setSelectedIds(new Set());
            setSelectionMode(false);
            Alert.alert('Success', 'All trip history has been cleared.');
          },
        },
      ]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select trips to delete.');
      return;
    }

    Alert.alert('Delete Selected', `Are you sure you want to delete ${selectedIds.size} trip(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSelectedTrips(Array.from(selectedIds));
          setSelectedIds(new Set());
          setSelectionMode(false);
          loadTrips();
        },
      },
    ]);
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
      loadTrips();
    }, [loadTrips])
  );

  const todayPrefix = useMemo(
    () =>
      new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  const displayed = useMemo(
    () => (tab === 'all' ? allData : allData.filter((x) => x.timestamp.startsWith(todayPrefix))),
    [tab, allData, todayPrefix]
  );

  const renderItem = ({ item }: { item: TripRow }) => (
    <TouchableOpacity
      onPress={() => selectionMode && toggleSelection(item.deviceId)}
      className="flex-row items-center justify-between border-b border-gray-200 py-3">
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
          {selectionMode ? (
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
          )}
        </View>
      </View>

      <View className="flex-1 px-4" style={{ paddingBottom: tabH + 8 }}>
        {/* Tabs */}
        <View className="mb-4 flex-row justify-center">
          <TouchableOpacity
            onPress={() => setTab('all')}
            className={`mx-5 flex-1 items-center rounded-full border px-4 py-2 ${
              tab === 'all' ? 'border-[#1976D2] bg-[#1976D2]' : 'border-gray-300 bg-white'
            }`}>
            <Text
              className={`text-base font-medium ${tab === 'all' ? 'text-white' : 'text-black'}`}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab('today')}
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
        <View className="flex-1 rounded-[30px] bg-[#e6e6e6] p-2">
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
            ListEmptyComponent={
              <Text className="mt-5 text-center text-sm text-gray-600">No trips found.</Text>
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
