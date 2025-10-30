// app/trip-detail.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { Buffer } from 'buffer';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrips } from '../mmkv-storage/storage';
import { getTripDetails } from '../services/RestApiServices/HistoryService';
import DynamicLineChart from '../components/DynamicLineChart';

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
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const chartRef = useRef(null);

  const fetchTripDetails = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    
    if (!tripName) {
      console.log('[TripDetail] No tripName provided');
      setError('No trip name provided');
      setLoading(false);
      return;
    }

    console.log('[TripDetail] Fetching trip:', tripName, 'Retry:', retryCount);

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
            boxProfile: {
              profileName: 'Test Box',
              minTemp: 15,
              maxTemp: 24,
              minHum: 60,
              maxHum: 90,
            },
          },
        },
        records: fakeRecords,
      });
      setLoading(false);
      return;
    }
    /* ========== TESTING: COMMENT TO HERE TO REMOVE TEST DATA ========== */

    try {
      const result = await getTripDetails(String(tripName));
      console.log('[TripDetail] API result:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log('[TripDetail] Trip data received');
        setApiTrip(result.data);
        setError(null);
      } else {
        const errorMsg = result.error || 'Failed to load trip data';
        console.log('[TripDetail] API failed:', errorMsg);
        setError(errorMsg);
        
        if (retryCount < 2) {
          console.log('[TripDetail] Retrying...');
          setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
          return;
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Network error';
      console.log('[TripDetail] Exception:', errorMsg);
      setError(errorMsg);
      
      if (retryCount < 2) {
        console.log('[TripDetail] Retrying after exception...');
        setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
        return;
      }
    }
    
    setLoading(false);
  }, [tripName]);

  useFocusEffect(
    useCallback(() => {
      fetchTripDetails(0);
    }, [fetchTripDetails])
  );

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
    return '#000000'; // Black for normal
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

  const generatePDF = async () => {
    setGeneratingPDF(true);
    
    // Allow UI to update before starting heavy PDF generation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      // Generate SVG chart for PDF
      let chartSvg = '';
      try {
        if (packets.length > 0) {
          const tempData = packets.map((p) => p.temperature);
          const humData = packets.map((p) => p.humidity);

          const tempValues = [...tempData];
          if (thresholds) {
            tempValues.push(thresholds.tempMin, thresholds.tempMax);
          }
          const tempMin = Math.min(...tempValues) - 5;
          const tempMax = Math.max(...tempValues) + 5;
          const tempRange = tempMax - tempMin;

          const humValues = [...humData];
          if (thresholds) {
            humValues.push(thresholds.humMin, thresholds.humMax);
          }
          const humMin = Math.min(...humValues) - 5;
          const humMax = Math.max(...humValues) + 5;
          const humRange = humMax - humMin;

          const svgWidth = 600;
          const svgHeight = 400;
          const padding = 60;
          const chartWidth = svgWidth - 2 * padding;
          const chartHeight = svgHeight - 2 * padding - 60;

          const getX = (index) => padding + (index / (packets.length - 1)) * chartWidth;
          const getTempY = (value) => padding + ((tempMax - value) / tempRange) * chartHeight;
          const getHumY = (value) => padding + ((humMax - value) / humRange) * chartHeight;

          const getColor = (value, min, max, isTemp) => {
            if (value < min || value > max) return isTemp ? '#EF4444' : '#F97316';
            return isTemp ? '#3B82F6' : '#22C55E';
          };

          const createSegments = (data, isTemp) => {
            const segments = [];
            const min = thresholds ? (isTemp ? thresholds.tempMin : thresholds.humMin) : -Infinity;
            const max = thresholds ? (isTemp ? thresholds.tempMax : thresholds.humMax) : Infinity;
            const getY = isTemp ? getTempY : getHumY;

            for (let i = 0; i < data.length - 1; i++) {
              const x1 = getX(i);
              const y1 = getY(data[i]);
              const x2 = getX(i + 1);
              const y2 = getY(data[i + 1]);
              const v1 = data[i];
              const v2 = data[i + 1];

              const crossesMin = (v1 < min && v2 >= min) || (v1 >= min && v2 < min);
              const crossesMax = (v1 <= max && v2 > max) || (v1 > max && v2 <= max);

              if (!thresholds || (!crossesMin && !crossesMax)) {
                const color = getColor(v1, min, max, isTemp);
                segments.push(
                  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2"/>`
                );
              } else {
                const points = [{ x: x1, y: y1, v: v1 }];

                if (crossesMin) {
                  const t = (min - v1) / (v2 - v1);
                  const xInt = x1 + t * (x2 - x1);
                  const yInt = getY(min);
                  points.push({ x: xInt, y: yInt, v: min });
                }

                if (crossesMax) {
                  const t = (max - v1) / (v2 - v1);
                  const xInt = x1 + t * (x2 - x1);
                  const yInt = getY(max);
                  points.push({ x: xInt, y: yInt, v: max });
                }

                points.push({ x: x2, y: y2, v: v2 });
                points.sort((a, b) => a.x - b.x);

                for (let j = 0; j < points.length - 1; j++) {
                  const midValue = (points[j].v + points[j + 1].v) / 2;
                  const color = getColor(midValue, min, max, isTemp);
                  segments.push(
                    `<line x1="${points[j].x}" y1="${points[j].y}" x2="${points[j + 1].x}" y2="${points[j + 1].y}" stroke="${color}" stroke-width="2"/>`
                  );
                }
              }
            }
            return segments.join('');
          };

          const tempSegments = createSegments(tempData, true);
          const humSegments = createSegments(humData, false);

          // Left Y-axis markings (Temperature)
          const tempAxisMarks = [];
          for (let i = 0; i <= 4; i++) {
            const value = tempMax - (tempRange * i) / 4;
            const y = padding + (i / 4) * chartHeight;
            tempAxisMarks.push(`
              <line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#000" stroke-width="1"/>
              <text x="${padding - 10}" y="${y + 4}" font-size="10" fill="#000" text-anchor="end">${Math.round(value)}</text>
            `);
          }

          // Right Y-axis markings (Humidity)
          const humAxisMarks = [];
          for (let i = 0; i <= 4; i++) {
            const value = humMax - (humRange * i) / 4;
            const y = padding + (i / 4) * chartHeight;
            humAxisMarks.push(`
              <line x1="${padding + chartWidth}" y1="${y}" x2="${padding + chartWidth + 5}" y2="${y}" stroke="#000" stroke-width="1"/>
              <text x="${padding + chartWidth + 10}" y="${y + 4}" font-size="10" fill="#000" text-anchor="start">${Math.round(value)}</text>
            `);
          }

          // X-axis markings
          const xAxisMarks = [];
          const timePoints = Math.min(6, packets.length);
          for (let i = 0; i < timePoints; i++) {
            const packetIndex = Math.floor((i / (timePoints - 1)) * (packets.length - 1));
            const x = padding + (i / (timePoints - 1)) * chartWidth;
            const time = new Date(packets[packetIndex].time * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            xAxisMarks.push(`
              <line x1="${x}" y1="${padding + chartHeight}" x2="${x}" y2="${padding + chartHeight + 5}" stroke="#666" stroke-width="1"/>
              <text x="${x}" y="${padding + chartHeight + 18}" font-size="10" fill="#666" text-anchor="middle">${time}</text>
            `);
          }

          chartSvg = `
            <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="white" stroke="#ddd" stroke-width="1" rx="8"/>
              
              <!-- Left Y-axis (Temperature) -->
              <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#000" stroke-width="1"/>
              <text x="${padding - 25}" y="${padding - 5}" font-size="11" fill="#000" font-weight="bold" text-anchor="middle">°C</text>
              ${tempAxisMarks.join('')}
              
              <!-- Right Y-axis (Humidity) -->
              <line x1="${padding + chartWidth}" y1="${padding}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#000" stroke-width="1"/>
              <text x="${padding + chartWidth + 25}" y="${padding - 5}" font-size="11" fill="#000" font-weight="bold" text-anchor="middle">%RH</text>
              ${humAxisMarks.join('')}
              
              <!-- X-axis -->
              <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#666" stroke-width="1"/>
              ${xAxisMarks.join('')}
              
              <!-- Data lines -->
              ${tempSegments}
              ${humSegments}
              
              <!-- Legend -->
              <rect x="${padding}" y="${svgHeight - 50}" width="${chartWidth}" height="40" fill="#f9f9f9" stroke="#ddd" rx="4"/>
              <rect x="${padding + 10}" y="${svgHeight - 40}" width="20" height="3" fill="#3B82F6"/>
              <text x="${padding + 35}" y="${svgHeight - 35}" font-size="10" fill="#666">Temperature</text>
              <rect x="${padding + 120}" y="${svgHeight - 40}" width="20" height="3" fill="#22C55E"/>
              <text x="${padding + 145}" y="${svgHeight - 35}" font-size="10" fill="#666">Humidity</text>
              <rect x="${padding + 220}" y="${svgHeight - 40}" width="20" height="3" fill="#EF4444" stroke-dasharray="2,2"/>
              <text x="${padding + 245}" y="${svgHeight - 35}" font-size="10" fill="#666">Temp Limits</text>
              <rect x="${padding + 320}" y="${svgHeight - 40}" width="20" height="3" fill="#F97316" stroke-dasharray="2,2"/>
              <text x="${padding + 345}" y="${svgHeight - 35}" font-size="10" fill="#666">Humid Limits</text>
            </svg>
          `;
        }
      } catch (svgError) {
        console.log('SVG chart generation failed, continuing without chart');
      }

      const recordsTable = packets
        .map((p, i) => {
          const tempColor = thresholds
            ? p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax
              ? '#EF4444'
              : '#000000'
            : '#000000';
          const humColor = thresholds
            ? p.humidity < thresholds.humMin || p.humidity > thresholds.humMax
              ? '#EF4444'
              : '#000000'
            : '#000000';
          return `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formatTimestamp(p.time)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: ${tempColor}; font-weight: bold; text-align: center;">${p.temperature}°C</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: ${humColor}; font-weight: bold; text-align: center;">${p.humidity}%</td>
          </tr>
        `;
        })
        .join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; background-color: #f9fafb; }
              h1 { color: #1f2937; text-align: center; border-bottom: 3px solid #1976D2; padding-bottom: 10px; }
              h2 { color: #374151; margin-top: 30px; background-color: #e5e7eb; padding: 10px; border-radius: 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: white; border-radius: 8px; overflow: hidden; }
              th { background-color: #1976D2; color: white; border: 1px solid #1565C0; padding: 12px; text-align: left; font-weight: bold; }
              td { border: 1px solid #e5e7eb; padding: 8px; }
              .info { margin: 20px 0; background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #1976D2; }
            </style>
          </head>
          <body>
            <h1>Trip Report: ${trip.tripName || 'Unnamed Trip'}</h1>
            
            <div class="info">
              <strong style="color: #1976D2;">Device:</strong> ${trip.deviceid || trip.deviceID || 'N/A'}<br><br>
              <strong style="color: #1976D2;">Customer:</strong> ${trip.tripConfig?.customerProfile?.profileName || 'N/A'}<br><br>
              <strong style="color: #1976D2;">Box Profile:</strong> ${trip.tripConfig?.boxProfile?.profileName || 'N/A'}<br><br>
              ${packets.length > 0 ? `<strong style="color: #1976D2;">Start Time:</strong> ${formatTimestamp(trip.startTime || packets[0].time)}<br><br>` : ''}
              ${packets.length > 0 ? `<strong style="color: #1976D2;">End Time:</strong> ${formatTimestamp(trip.endTime || packets[packets.length - 1].time)}<br><br>` : ''}
              ${trip.startLocation ? `<strong style="color: #1976D2;">Start Location:</strong> ${trip.startLocation.latitude.toFixed(4)}, ${trip.startLocation.longitude.toFixed(4)}<br><br>` : ''}
              ${trip.endLocation ? `<strong style="color: #1976D2;">End Location:</strong> ${trip.endLocation.latitude.toFixed(4)}, ${trip.endLocation.longitude.toFixed(4)}<br><br>` : ''}
              ${thresholds ? `<strong style="color: #EF4444;">Temperature Range:</strong> ${thresholds.tempMin}° - ${thresholds.tempMax}°C<br><br>` : ''}
              ${thresholds ? `<strong style="color: #F97316;">Humidity Range:</strong> ${thresholds.humMin}% - ${thresholds.humMax}%<br><br>` : ''}
              <strong style="color: #1976D2;">Total Records:</strong> ${packets.length}
            </div>

            ${
              chartSvg
                ? `
            <h2>📊 Trip Overview Chart</h2>
            <div style="text-align: center; margin: 20px 0;">
              ${chartSvg}
            </div>
            `
                : ''
            }

            <h2>📋 All Records</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Timestamp</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                </tr>
              </thead>
              <tbody>
                ${recordsTable}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
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

  if (!trip && !loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
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
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-center text-xl font-semibold text-gray-800">
            {error || 'Trip not found'}
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            {error ? 'Unable to load trip data. Please check your connection.' : 'This trip does not exist or has been deleted.'}
          </Text>
          <TouchableOpacity
            onPress={() => fetchTripDetails(0)}
            className="mt-6 rounded-lg bg-blue-600 px-8 py-3">
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
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
          <Text className="ml-1 text-sm text-gray-600">
            Device: {trip.deviceid || trip.deviceID || trip.deviceName}
          </Text>
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

        <View className="mt-1 flex-row items-center">
          <MaterialCommunityIcons name="alarm" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600">Sampling Interval: 60 seconds</Text>
        </View>

        {packets.length > 0 && (
          <>
            <View className="mt-1 flex-row items-center">
              <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
              <Text className="ml-1 text-sm text-gray-600">
                Start: {formatTimestamp(trip.startTime || packets[0].time)}
              </Text>
            </View>
            <View className="mt-1 flex-row items-center">
              <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
              <Text className="ml-1 text-sm text-gray-600">
                End: {formatTimestamp(trip.endTime || packets[packets.length - 1].time)}
              </Text>
            </View>
          </>
        )}

        {/* Thresholds */}
        {thresholds && (
          <View className="mt-3 rounded-lg bg-gray-100 p-3">
            <View className="flex-row justify-around">
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
          </View>
        )}
      </View>

      {/* Graph - Scrollable */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm font-semibold text-gray-700">
          Trip Overview ({packets.length} records)
        </Text>

        {packets.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-400">Please stop trip to view data</Text>
          </View>
        ) : (
          <>
            <View className="mb-4">
              <View className="mb-2 flex-row justify-start">
                {/* <Text className="mr-4 text-xs font-semibold text-gray-700">°C</Text> */}
                {/* <Text className="text-xs font-semibold text-gray-700">%RH</Text> */}
              </View>

              <View ref={chartRef} collapsable={false} className="rounded-2xl bg-white p-2">
                <DynamicLineChart
                  packets={packets}
                  thresholds={thresholds}
                  width={Dimensions.get('window').width - 32}
                  height={220}
                />
              </View>

              <View className="mt-3 items-center">
                <View className="mb-2 w-full flex-row justify-between px-8">
                  <View className="flex-1 flex-row items-center">
                    <View className="mr-2 h-3 w-8 bg-blue-500" />
                    <Text className="text-xs text-gray-600">Temperature</Text>
                  </View>
                  <View className="flex-1 flex-row items-center">
                    <View className="mr-2 h-3 w-8 bg-red-500" />
                    <Text className="text-xs text-gray-600">Temp Breach</Text>
                  </View>
                </View>
                <View className="w-full flex-row justify-between px-8">
                  <View className="flex-1 flex-row items-center">
                    <View className="mr-2 h-3 w-8 bg-green-500" />
                    <Text className="text-xs text-gray-600">Humidity</Text>
                  </View>
                  <View className="flex-1 flex-row items-center">
                    <View className="mr-2 h-3 w-8 bg-orange-500" />
                    <Text className="text-xs text-gray-600">Humid Breach</Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Buttons */}
            <View className="mb-4 flex-row items-center justify-center gap-3">
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/trip-records', params: { tripName } })}
                className="rounded-lg border-2 border-blue-600 px-6 py-3">
                <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>
                  View Records
                </Text>
              </TouchableOpacity>
              {trip.startLocation && trip.endLocation && (
                <TouchableOpacity
                  onPress={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&origin=${trip.startLocation.latitude},${trip.startLocation.longitude}&destination=${trip.endLocation.latitude},${trip.endLocation.longitude}`;
                    Linking.openURL(url).catch(() =>
                      Alert.alert('Error', 'Unable to open Google Maps')
                    );
                  }}
                  className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
                  <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
                  <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>
                    View Path
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={generatePDF}
                disabled={generatingPDF}
                className={`flex-row items-center rounded-lg border-2 px-4 py-3 ${generatingPDF ? 'border-gray-400 bg-gray-100' : 'border-blue-600'}`}>
                {generatingPDF ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <MaterialCommunityIcons name="download" size={20} color="#1976D2" />
                )}
                <Text
                  className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`}
                  numberOfLines={1}>
                  {generatingPDF ? 'Loading...' : 'PDF'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
