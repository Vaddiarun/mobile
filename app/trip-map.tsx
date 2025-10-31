import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const getCurvedPath = (start: any, end: any) => {
  const points = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.latitude + (end.latitude - start.latitude) * t;
    const lng = start.longitude + (end.longitude - start.longitude) * t;
    const curve = Math.sin(t * Math.PI) * 0.005;
    points.push({
      latitude: lat + curve,
      longitude: lng + curve,
    });
  }
  return points;
};

export default function TripMap() {
  const router = useRouter();
  const { startLat, startLng, endLat, endLng } = useLocalSearchParams();

  const start = {
    latitude: parseFloat(startLat as string),
    longitude: parseFloat(startLng as string),
  };

  const end = {
    latitude: parseFloat(endLat as string),
    longitude: parseFloat(endLng as string),
  };

  const region = {
    latitude: (start.latitude + end.latitude) / 2,
    longitude: (start.longitude + end.longitude) / 2,
    latitudeDelta: Math.abs(start.latitude - end.latitude) * 1.5 || 0.05,
    longitudeDelta: Math.abs(start.longitude - end.longitude) * 1.5 || 0.05,
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between bg-white px-4 py-3">
        <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Trip Start and End Location</Text>
        <View className="w-10" />
      </View>

      <MapView style={{ flex: 1 }} initialRegion={region}>
        <Marker coordinate={start} title="Start" pinColor="blue" />
        <Marker coordinate={end} title="End" pinColor="red" />
        <Polyline
          coordinates={getCurvedPath(start, end)}
          strokeColor="#1976D2"
          strokeWidth={5}
          lineDashPattern={[10, 5]}
        />
      </MapView>
    </SafeAreaView>
  );
}
