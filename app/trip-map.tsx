// import React from 'react';
// import { View, Text, Pressable } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import MapView, { Marker, Polyline } from 'react-native-maps';
// import { MaterialCommunityIcons } from '@expo/vector-icons';

// const getCurvedPath = (start: any, end: any) => {
//   const points = [];
//   const steps = 50;
//   for (let i = 0; i <= steps; i++) {
//     const t = i / steps;
//     const lat = start.latitude + (end.latitude - start.latitude) * t;
//     const lng = start.longitude + (end.longitude - start.longitude) * t;
//     const curve = Math.sin(t * Math.PI) * 0.005;
//     points.push({
//       latitude: lat + curve,
//       longitude: lng + curve,
//     });
//   }
//   return points;
// };

// export default function TripMap() {
//   const router = useRouter();
//   const { startLat, startLng, endLat, endLng } = useLocalSearchParams();

//   const start = {
//     latitude: parseFloat(startLat as string),
//     longitude: parseFloat(startLng as string),
//   };

//   const end = {
//     latitude: parseFloat(endLat as string),
//     longitude: parseFloat(endLng as string),
//   };

//   const region = {
//     latitude: (start.latitude + end.latitude) / 2,
//     longitude: (start.longitude + end.longitude) / 2,
//     latitudeDelta: Math.abs(start.latitude - end.latitude) * 1.5 || 0.05,
//     longitudeDelta: Math.abs(start.longitude - end.longitude) * 1.5 || 0.05,
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <View className="flex-row items-center justify-between bg-white px-4 py-3">
//         <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()}>
//           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//         </Pressable>
//         <Text className="text-lg font-semibold text-black">Trip Start and End Location</Text>
//         <View className="w-10" />
//       </View>

//       <MapView style={{ flex: 1 }} initialRegion={region}>
//         <Marker coordinate={start} title="Start" pinColor="blue" />
//         <Marker coordinate={end} title="End" pinColor="red" />
//         <Polyline
//           coordinates={getCurvedPath(start, end)}
//           strokeColor="#1976D2"
//           strokeWidth={5}
//           lineDashPattern={[10, 5]}
//         />
//       </MapView>
//     </SafeAreaView>
//   );
// }
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/** --- helpers --- */
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Rough km per degree at a given latitude */
const KM_PER_DEG_LAT = 110.574;
const kmPerDegLon = (latDeg: number) => 111.320 * Math.cos(toRad(latDeg));

/** Haversine distance in KM */
function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Build an adaptive, smooth curved path between start and end.
 * - Uses a quadratic Bezier with a perpendicular offset control point.
 * - Offset magnitude auto-scales with distance so short hops aren’t over-curved.
 */
function getAdaptiveCurvedPath(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) {
  // identical or invalid => just return straight segment
  if (
    !isFinite(start.latitude) ||
    !isFinite(start.longitude) ||
    !isFinite(end.latitude) ||
    !isFinite(end.longitude) ||
    (start.latitude === end.latitude && start.longitude === end.longitude)
  ) {
    return [start, end];
  }

  const avgLat = (start.latitude + end.latitude) / 2;

  // Vector in "km-space" to get a proper perpendicular
  const dxDeg = end.longitude - start.longitude;
  const dyDeg = end.latitude - start.latitude;

  const kLon = kmPerDegLon(avgLat);
  const kLat = KM_PER_DEG_LAT;

  const vxKm = dxDeg * kLon;
  const vyKm = dyDeg * kLat;

  const segLenKm = Math.sqrt(vxKm * vxKm + vyKm * vyKm);
  const distKm = segLenKm || haversineKm(start, end);

  // If extremely short (< ~60m), just draw straight to avoid visual jitter
  if (distKm < 0.06) {
    return [start, end];
  }

  // Perpendicular unit vector (in km-space)
  // Perp of (vx, vy) is (-vy, vx)
  let uxKm = -vyKm;
  let uyKm = vxKm;
  const norm = Math.sqrt(uxKm * uxKm + uyKm * uyKm) || 1;
  uxKm /= norm;
  uyKm /= norm;

  // Curvature magnitude scales with distance:
  // - ~15% of segment length
  // - clamped to [0.2km, 80km] so both city hops and long hauls look good
  const curvKm = Math.min(80, Math.max(0.2, distKm * 0.15));

  // Control point in km-space offset from the midpoint
  const mid = {
    latitude: (start.latitude + end.latitude) / 2,
    longitude: (start.longitude + end.longitude) / 2,
  };

  // Convert km offset back into degrees at avgLat
  const offsetLatDeg = (uyKm * curvKm) / kLat;
  const offsetLonDeg = (uxKm * curvKm) / kLon;

  const control = {
    latitude: mid.latitude + offsetLatDeg,
    longitude: mid.longitude + offsetLonDeg,
  };

  // Steps scale lightly with distance for smoothness, clamped to [32, 128]
  const steps = Math.max(32, Math.min(128, Math.round(distKm * 2)));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const oneMinusT = 1 - t;
    // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * C + t^2 * P1
    const lat =
      oneMinusT * oneMinusT * start.latitude +
      2 * oneMinusT * t * control.latitude +
      t * t * end.latitude;
    const lon =
      oneMinusT * oneMinusT * start.longitude +
      2 * oneMinusT * t * control.longitude +
      t * t * end.longitude;
    pts.push({ latitude: lat, longitude: lon });
  }
  return pts;
}

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

  // Fallback if inputs are bad
  if (
    !isFinite(start.latitude) ||
    !isFinite(start.longitude) ||
    !isFinite(end.latitude) ||
    !isFinite(end.longitude)
  ) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between bg-white px-4 py-3">
          <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">Trip Start and End Location</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-gray-700">
            Invalid coordinates provided for start/end.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Initial region with reasonable minimum zoom for short hops
  const latDelta = Math.max(Math.abs(start.latitude - end.latitude) * 1.5, 0.05);
  const lonDelta = Math.max(Math.abs(start.longitude - end.longitude) * 1.5, 0.05);
  const region = {
    latitude: (start.latitude + end.latitude) / 2,
    longitude: (start.longitude + end.longitude) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };

  const mapRef = useRef<MapView | null>(null);

  // Fit both markers nicely once the map is laid out
  const fitBoth = () => {
    if (!mapRef.current) return;
    try {
      mapRef.current.fitToCoordinates([start, end], {
        edgePadding: { top: 60, bottom: 60, left: 60, right: 60 },
        animated: true,
      });
    } catch (e) {
      // no-op
    }
  };

  const curvedCoords = getAdaptiveCurvedPath(start, end);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between bg-white px-4 py-3">
        <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Trip Start and End Location</Text>
        <View className="w-10" />
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        onMapReady={fitBoth}
        onLayout={fitBoth}
      >
        <Marker coordinate={start} title="Start" pinColor="blue" />
        <Marker coordinate={end} title="End" pinColor="red" />
        <Polyline
          coordinates={curvedCoords}
          strokeColor="#1976D2"
          strokeWidth={5}
          lineDashPattern={[10, 5]}
        />
      </MapView>
    </SafeAreaView>
  );
}
