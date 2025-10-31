// // // app/trip-detail.tsx
// // import React, { useMemo, useState, useCallback } from 'react';
// // import { Buffer } from 'buffer';
// // import {
// //   View,
// //   Text,
// //   Pressable,
// //   ActivityIndicator,
// //   TouchableOpacity,
// //   Dimensions,
// //   ScrollView,
// //   Alert,
// //   Linking,
// // } from 'react-native';
// // import * as Print from 'expo-print';
// // import * as Sharing from 'expo-sharing';
// // import * as FileSystem from 'expo-file-system';
// // import { captureRef } from 'react-native-view-shot';
// // import { useRef } from 'react';
// // import { SafeAreaView } from 'react-native-safe-area-context';
// // import { useRouter, useLocalSearchParams } from 'expo-router';
// // import { useFocusEffect } from '@react-navigation/native';
// // import { MaterialCommunityIcons } from '@expo/vector-icons';
// // import { getTrips } from '../mmkv-storage/storage';
// // import { getTripDetails } from '../services/RestApiServices/HistoryService';
// // import DynamicLineChart from '../components/DynamicLineChart';

// // type DataPacket = {
// //   time: number;
// //   temperature: number;
// //   humidity: number;
// // };

// // export default function TripDetail() {
// //   const router = useRouter();
// //   const { tripName } = useLocalSearchParams();
// //   const [loading, setLoading] = useState(true);
// //   const [apiTrip, setApiTrip] = useState<any>(null);
// //   const [error, setError] = useState<string | null>(null);
// //   const [generatingPDF, setGeneratingPDF] = useState(false);
// //   const chartRef = useRef(null);

// //   const fetchTripDetails = useCallback(async (retryCount = 0) => {
// //     setLoading(true);
// //     setError(null);
    
// //     if (!tripName) {
// //       console.log('[TripDetail] No tripName provided');
// //       setError('No trip name provided');
// //       setLoading(false);
// //       return;
// //     }

// //     console.log('[TripDetail] Fetching trip:', tripName, 'Retry:', retryCount);

// //     /* ========== TESTING: COMMENT FROM HERE TO REMOVE TEST DATA ========== */
// //     if (tripName === 'TEST_TRIP_200') {
// //       const fakeRecords = Array.from({ length: 200 }, (_, i) => ({
// //         Timestamp: String(Math.floor(Date.now() / 1000) - (200 - i) * 60),
// //         Temperature: String(20 + Math.random() * 10),
// //         Humidity: String(50 + Math.random() * 30),
// //       }));
// //       setApiTrip({
// //         tripInfo: {
// //           tripName: 'TEST_TRIP_200',
// //           deviceid: 'TEST_DEVICE',
// //           deviceID: 'TEST_DEVICE',
// //           tripConfig: {
// //             customerProfile: { profileName: 'Test Customer' },
// //             boxProfile: {
// //               profileName: 'Test Box',
// //               minTemp: 15,
// //               maxTemp: 24,
// //               minHum: 60,
// //               maxHum: 90,
// //             },
// //           },
// //         },
// //         records: fakeRecords,
// //       });
// //       setLoading(false);
// //       return;
// //     }
// //     /* ========== TESTING: COMMENT TO HERE TO REMOVE TEST DATA ========== */

// //     try {
// //       const result = await getTripDetails(String(tripName));
// //       console.log('[TripDetail] API result:', JSON.stringify(result, null, 2));
      
// //       if (result.success && result.data) {
// //         console.log('[TripDetail] Trip data received');
// //         setApiTrip(result.data);
// //         setError(null);
// //       } else {
// //         const errorMsg = result.error || 'Failed to load trip data';
// //         console.log('[TripDetail] API failed:', errorMsg);
// //         setError(errorMsg);
        
// //         if (retryCount < 2) {
// //           console.log('[TripDetail] Retrying...');
// //           setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
// //           return;
// //         }
// //       }
// //     } catch (err: any) {
// //       const errorMsg = err.message || 'Network error';
// //       console.log('[TripDetail] Exception:', errorMsg);
// //       setError(errorMsg);
      
// //       if (retryCount < 2) {
// //         console.log('[TripDetail] Retrying after exception...');
// //         setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
// //         return;
// //       }
// //     }
    
// //     setLoading(false);
// //   }, [tripName]);

// //   useFocusEffect(
// //     useCallback(() => {
// //       fetchTripDetails(0);
// //     }, [fetchTripDetails])
// //   );

// //   const trip = apiTrip?.tripInfo;

// //   const packets = useMemo(() => {
// //     if (apiTrip?.records) {
// //       return apiTrip.records.map((r: any) => ({
// //         time: parseInt(r.Timestamp),
// //         temperature: parseFloat(r.Temperature),
// //         humidity: parseFloat(r.Humidity),
// //       }));
// //     }
// //     return [];
// //   }, [apiTrip]);

// //   const thresholds = useMemo(() => {
// //     if (!trip?.tripConfig?.boxProfile) return null;

// //     const profile = trip.tripConfig.boxProfile;
// //     return {
// //       tempMin: profile.minTemp ?? -Infinity,
// //       tempMax: profile.maxTemp ?? Infinity,
// //       humMin: profile.minHum ?? -Infinity,
// //       humMax: profile.maxHum ?? Infinity,
// //     };
// //   }, [trip]);

// //   const getValueColor = (value: number, min: number, max: number) => {
// //     if (value < min || value > max) return '#EF4444'; // Red for exceeding
// //     return '#000000'; // Black for normal
// //   };

// //   const formatTimestamp = (unixTime: number) => {
// //     const date = new Date(unixTime * 1000);
// //     return date.toLocaleString('en-US', {
// //       month: 'short',
// //       day: 'numeric',
// //       year: 'numeric',
// //       hour: '2-digit',
// //       minute: '2-digit',
// //       second: '2-digit',
// //     });
// //   };

// //   const generatePDF = async () => {
// //     setGeneratingPDF(true);
    
// //     // Allow UI to update before starting heavy PDF generation
// //     await new Promise(resolve => setTimeout(resolve, 100));
    
// //     try {
// //       // Generate SVG chart for PDF
// //       let chartSvg = '';
// //       try {
// //         if (packets.length > 0) {
// //           const tempData = packets.map((p) => p.temperature);
// //           const humData = packets.map((p) => p.humidity);

// //           const tempValues = [...tempData];
// //           if (thresholds) {
// //             tempValues.push(thresholds.tempMin, thresholds.tempMax);
// //           }
// //           const tempMin = Math.min(...tempValues) - 5;
// //           const tempMax = Math.max(...tempValues) + 5;
// //           const tempRange = tempMax - tempMin;

// //           const humValues = [...humData];
// //           if (thresholds) {
// //             humValues.push(thresholds.humMin, thresholds.humMax);
// //           }
// //           const humMin = Math.min(...humValues) - 5;
// //           const humMax = Math.max(...humValues) + 5;
// //           const humRange = humMax - humMin;

// //           const svgWidth = 600;
// //           const svgHeight = 400;
// //           const padding = 60;
// //           const chartWidth = svgWidth - 2 * padding;
// //           const chartHeight = svgHeight - 2 * padding - 60;

// //           const getX = (index) => padding + (index / (packets.length - 1)) * chartWidth;
// //           const getTempY = (value) => padding + ((tempMax - value) / tempRange) * chartHeight;
// //           const getHumY = (value) => padding + ((humMax - value) / humRange) * chartHeight;

// //           const getColor = (value, min, max, isTemp) => {
// //             if (value < min || value > max) return isTemp ? '#EF4444' : '#F97316';
// //             return isTemp ? '#3B82F6' : '#22C55E';
// //           };

// //           const createSegments = (data, isTemp) => {
// //             const segments = [];
// //             const min = thresholds ? (isTemp ? thresholds.tempMin : thresholds.humMin) : -Infinity;
// //             const max = thresholds ? (isTemp ? thresholds.tempMax : thresholds.humMax) : Infinity;
// //             const getY = isTemp ? getTempY : getHumY;

// //             for (let i = 0; i < data.length - 1; i++) {
// //               const x1 = getX(i);
// //               const y1 = getY(data[i]);
// //               const x2 = getX(i + 1);
// //               const y2 = getY(data[i + 1]);
// //               const v1 = data[i];
// //               const v2 = data[i + 1];

// //               const crossesMin = (v1 < min && v2 >= min) || (v1 >= min && v2 < min);
// //               const crossesMax = (v1 <= max && v2 > max) || (v1 > max && v2 <= max);

// //               if (!thresholds || (!crossesMin && !crossesMax)) {
// //                 const color = getColor(v1, min, max, isTemp);
// //                 segments.push(
// //                   `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2"/>`
// //                 );
// //               } else {
// //                 const points = [{ x: x1, y: y1, v: v1 }];

// //                 if (crossesMin) {
// //                   const t = (min - v1) / (v2 - v1);
// //                   const xInt = x1 + t * (x2 - x1);
// //                   const yInt = getY(min);
// //                   points.push({ x: xInt, y: yInt, v: min });
// //                 }

// //                 if (crossesMax) {
// //                   const t = (max - v1) / (v2 - v1);
// //                   const xInt = x1 + t * (x2 - x1);
// //                   const yInt = getY(max);
// //                   points.push({ x: xInt, y: yInt, v: max });
// //                 }

// //                 points.push({ x: x2, y: y2, v: v2 });
// //                 points.sort((a, b) => a.x - b.x);

// //                 for (let j = 0; j < points.length - 1; j++) {
// //                   const midValue = (points[j].v + points[j + 1].v) / 2;
// //                   const color = getColor(midValue, min, max, isTemp);
// //                   segments.push(
// //                     `<line x1="${points[j].x}" y1="${points[j].y}" x2="${points[j + 1].x}" y2="${points[j + 1].y}" stroke="${color}" stroke-width="2"/>`
// //                   );
// //                 }
// //               }
// //             }
// //             return segments.join('');
// //           };

// //           const tempSegments = createSegments(tempData, true);
// //           const humSegments = createSegments(humData, false);

// //           // Left Y-axis markings (Temperature)
// //           const tempAxisMarks = [];
// //           for (let i = 0; i <= 4; i++) {
// //             const value = tempMax - (tempRange * i) / 4;
// //             const y = padding + (i / 4) * chartHeight;
// //             tempAxisMarks.push(`
// //               <line x1="${padding - 5}" y1="${y}" x2="${padding}" y2="${y}" stroke="#000" stroke-width="1"/>
// //               <text x="${padding - 10}" y="${y + 4}" font-size="10" fill="#000" text-anchor="end">${Math.round(value)}</text>
// //             `);
// //           }

// //           // Right Y-axis markings (Humidity)
// //           const humAxisMarks = [];
// //           for (let i = 0; i <= 4; i++) {
// //             const value = humMax - (humRange * i) / 4;
// //             const y = padding + (i / 4) * chartHeight;
// //             humAxisMarks.push(`
// //               <line x1="${padding + chartWidth}" y1="${y}" x2="${padding + chartWidth + 5}" y2="${y}" stroke="#000" stroke-width="1"/>
// //               <text x="${padding + chartWidth + 10}" y="${y + 4}" font-size="10" fill="#000" text-anchor="start">${Math.round(value)}</text>
// //             `);
// //           }

// //           // X-axis markings
// //           const xAxisMarks = [];
// //           const timePoints = Math.min(6, packets.length);
// //           for (let i = 0; i < timePoints; i++) {
// //             const packetIndex = Math.floor((i / (timePoints - 1)) * (packets.length - 1));
// //             const x = padding + (i / (timePoints - 1)) * chartWidth;
// //             const time = new Date(packets[packetIndex].time * 1000).toLocaleTimeString('en-US', {
// //               hour: '2-digit',
// //               minute: '2-digit',
// //             });
// //             xAxisMarks.push(`
// //               <line x1="${x}" y1="${padding + chartHeight}" x2="${x}" y2="${padding + chartHeight + 5}" stroke="#666" stroke-width="1"/>
// //               <text x="${x}" y="${padding + chartHeight + 18}" font-size="10" fill="#666" text-anchor="middle">${time}</text>
// //             `);
// //           }

// //           chartSvg = `
// //             <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
// //               <rect width="100%" height="100%" fill="white" stroke="#ddd" stroke-width="1" rx="8"/>
              
// //               <!-- Left Y-axis (Temperature) -->
// //               <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#000" stroke-width="1"/>
// //               <text x="${padding - 25}" y="${padding - 5}" font-size="11" fill="#000" font-weight="bold" text-anchor="middle">°C</text>
// //               ${tempAxisMarks.join('')}
              
// //               <!-- Right Y-axis (Humidity) -->
// //               <line x1="${padding + chartWidth}" y1="${padding}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#000" stroke-width="1"/>
// //               <text x="${padding + chartWidth + 25}" y="${padding - 5}" font-size="11" fill="#000" font-weight="bold" text-anchor="middle">%RH</text>
// //               ${humAxisMarks.join('')}
              
// //               <!-- X-axis -->
// //               <line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#666" stroke-width="1"/>
// //               ${xAxisMarks.join('')}
              
// //               <!-- Data lines -->
// //               ${tempSegments}
// //               ${humSegments}
              
// //               <!-- Legend -->
// //               <rect x="${padding}" y="${svgHeight - 50}" width="${chartWidth}" height="40" fill="#f9f9f9" stroke="#ddd" rx="4"/>
// //               <rect x="${padding + 10}" y="${svgHeight - 40}" width="20" height="3" fill="#3B82F6"/>
// //               <text x="${padding + 35}" y="${svgHeight - 35}" font-size="10" fill="#666">Temperature</text>
// //               <rect x="${padding + 120}" y="${svgHeight - 40}" width="20" height="3" fill="#22C55E"/>
// //               <text x="${padding + 145}" y="${svgHeight - 35}" font-size="10" fill="#666">Humidity</text>
// //               <rect x="${padding + 220}" y="${svgHeight - 40}" width="20" height="3" fill="#EF4444" stroke-dasharray="2,2"/>
// //               <text x="${padding + 245}" y="${svgHeight - 35}" font-size="10" fill="#666">Temp Limits</text>
// //               <rect x="${padding + 320}" y="${svgHeight - 40}" width="20" height="3" fill="#F97316" stroke-dasharray="2,2"/>
// //               <text x="${padding + 345}" y="${svgHeight - 35}" font-size="10" fill="#666">Humid Limits</text>
// //             </svg>
// //           `;
// //         }
// //       } catch (svgError) {
// //         console.log('SVG chart generation failed, continuing without chart');
// //       }

// //       const recordsTable = packets
// //         .map((p, i) => {
// //           const tempColor = thresholds
// //             ? p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax
// //               ? '#EF4444'
// //               : '#000000'
// //             : '#000000';
// //           const humColor = thresholds
// //             ? p.humidity < thresholds.humMin || p.humidity > thresholds.humMax
// //               ? '#EF4444'
// //               : '#000000'
// //             : '#000000';
// //           return `
// //           <tr>
// //             <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${i + 1}</td>
// //             <td style="border: 1px solid #ddd; padding: 8px;">${formatTimestamp(p.time)}</td>
// //             <td style="border: 1px solid #ddd; padding: 8px; color: ${tempColor}; font-weight: bold; text-align: center;">${p.temperature}°C</td>
// //             <td style="border: 1px solid #ddd; padding: 8px; color: ${humColor}; font-weight: bold; text-align: center;">${p.humidity}%</td>
// //           </tr>
// //         `;
// //         })
// //         .join('');

// //       const html = `
// //         <html>
// //           <head>
// //             <style>
// //               body { font-family: Arial, sans-serif; margin: 20px; background-color: #f9fafb; }
// //               h1 { color: #1f2937; text-align: center; border-bottom: 3px solid #1976D2; padding-bottom: 10px; }
// //               h2 { color: #374151; margin-top: 30px; background-color: #e5e7eb; padding: 10px; border-radius: 8px; }
// //               table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: white; border-radius: 8px; overflow: hidden; }
// //               th { background-color: #1976D2; color: white; border: 1px solid #1565C0; padding: 12px; text-align: left; font-weight: bold; }
// //               td { border: 1px solid #e5e7eb; padding: 8px; }
// //               .info { margin: 20px 0; background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #1976D2; }
// //             </style>
// //           </head>
// //           <body>
// //             <h1>Trip Report: ${trip.tripName || 'Unnamed Trip'}</h1>
            
// //             <div class="info">
// //               <strong style="color: #1976D2;">Device:</strong> ${trip.deviceid || trip.deviceID || 'N/A'}<br><br>
// //               <strong style="color: #1976D2;">Customer:</strong> ${trip.tripConfig?.customerProfile?.profileName || 'N/A'}<br><br>
// //               <strong style="color: #1976D2;">Box Profile:</strong> ${trip.tripConfig?.boxProfile?.profileName || 'N/A'}<br><br>
// //               ${packets.length > 0 ? `<strong style="color: #1976D2;">Start Time:</strong> ${formatTimestamp(trip.startTime || packets[0].time)}<br><br>` : ''}
// //               ${packets.length > 0 ? `<strong style="color: #1976D2;">End Time:</strong> ${formatTimestamp(trip.endTime || packets[packets.length - 1].time)}<br><br>` : ''}
// //               ${trip.startLocation ? `<strong style="color: #1976D2;">Start Location:</strong> ${trip.startLocation.latitude.toFixed(4)}, ${trip.startLocation.longitude.toFixed(4)}<br><br>` : ''}
// //               ${trip.endLocation ? `<strong style="color: #1976D2;">End Location:</strong> ${trip.endLocation.latitude.toFixed(4)}, ${trip.endLocation.longitude.toFixed(4)}<br><br>` : ''}
// //               ${thresholds ? `<strong style="color: #EF4444;">Temperature Range:</strong> ${thresholds.tempMin}° - ${thresholds.tempMax}°C<br><br>` : ''}
// //               ${thresholds ? `<strong style="color: #F97316;">Humidity Range:</strong> ${thresholds.humMin}% - ${thresholds.humMax}%<br><br>` : ''}
// //               <strong style="color: #1976D2;">Total Records:</strong> ${packets.length}
// //             </div>

// //             ${
// //               chartSvg
// //                 ? `
// //             <h2>📊 Trip Overview Chart</h2>
// //             <div style="text-align: center; margin: 20px 0;">
// //               ${chartSvg}
// //             </div>
// //             `
// //                 : ''
// //             }

// //             <h2>📋 All Records</h2>
// //             <table>
// //               <thead>
// //                 <tr>
// //                   <th>#</th>
// //                   <th>Timestamp</th>
// //                   <th>Temperature</th>
// //                   <th>Humidity</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 ${recordsTable}
// //               </tbody>
// //             </table>
// //           </body>
// //         </html>
// //       `;

// //       const { uri } = await Print.printToFileAsync({ html });
// //       await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
// //     } catch (error) {
// //       Alert.alert('Error', 'Failed to generate PDF');
// //     } finally {
// //       setGeneratingPDF(false);
// //     }
// //   };

// //   if (loading) {
// //     return (
// //       <SafeAreaView className="flex-1 bg-white">
// //         <View className="flex-1 items-center justify-center">
// //           <ActivityIndicator size="large" color="#1976D2" />
// //         </View>
// //       </SafeAreaView>
// //     );
// //   }

// //   if (!trip && !loading) {
// //     return (
// //       <SafeAreaView className="flex-1 bg-white">
// //         <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
// //           <Pressable
// //             className="h-10 w-10 items-center justify-center"
// //             onPress={() => router.back()}
// //             accessibilityRole="button"
// //             accessibilityLabel="Back">
// //             <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
// //           </Pressable>
// //           <Text className="text-lg font-semibold text-black">Trip Details</Text>
// //           <View className="w-10" />
// //         </View>
// //         <View className="flex-1 items-center justify-center px-8">
// //           <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
// //           <Text className="mt-4 text-center text-xl font-semibold text-gray-800">
// //             {error || 'Trip not found'}
// //           </Text>
// //           <Text className="mt-2 text-center text-sm text-gray-500">
// //             {error ? 'Unable to load trip data. Please check your connection.' : 'This trip does not exist or has been deleted.'}
// //           </Text>
// //           <TouchableOpacity
// //             onPress={() => fetchTripDetails(0)}
// //             className="mt-6 rounded-lg bg-blue-600 px-8 py-3">
// //             <Text className="text-base font-semibold text-white">Retry</Text>
// //           </TouchableOpacity>
// //         </View>
// //       </SafeAreaView>
// //     );
// //   }

// //   return (
// //     <SafeAreaView className="flex-1 bg-gray-50">
// //       {/* Header */}
// //       <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
// //         <Pressable
// //           className="h-10 w-10 items-center justify-center"
// //           onPress={() => router.back()}
// //           accessibilityRole="button"
// //           accessibilityLabel="Back">
// //           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
// //         </Pressable>
// //         <Text className="text-lg font-semibold text-black">Trip Details</Text>
// //         <View className="w-10" />
// //       </View>

// //       {/* Trip Info */}
// //       <View className="border-b border-gray-200 bg-white p-4">
// //         <Text className="mb-1 text-xl font-bold text-gray-800">
// //           {trip.tripName || 'Unnamed Trip'}
// //         </Text>
// //         <View className="mt-2 flex-row items-center">
// //           <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
// //           <Text className="ml-1 text-sm text-gray-600">
// //             Device: {trip.deviceid || trip.deviceID || trip.deviceName}
// //           </Text>
// //         </View>
// //         {trip.tripConfig?.customerProfile && (
// //           <View className="mt-1 flex-row items-center">
// //             <MaterialCommunityIcons name="account" size={16} color="#666" />
// //             <Text className="ml-1 text-sm text-gray-600">
// //               {trip.tripConfig.customerProfile.profileName}
// //             </Text>
// //           </View>
// //         )}
// //         {trip.tripConfig?.boxProfile && (
// //           <View className="mt-1 flex-row items-center">
// //             <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
// //             <Text className="ml-1 text-sm text-gray-600">
// //               {trip.tripConfig.boxProfile.profileName}
// //             </Text>
// //           </View>
// //         )}

// //         <View className="mt-1 flex-row items-center">
// //           <MaterialCommunityIcons name="alarm" size={16} color="#666" />
// //           <Text className="ml-1 text-sm text-gray-600">Sampling Interval: 60 seconds</Text>
// //         </View>

// //         {packets.length > 0 && (
// //           <>
// //             <View className="mt-1 flex-row items-center">
// //               <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
// //               <Text className="ml-1 text-sm text-gray-600">
// //                 Start: {formatTimestamp(trip.startTime || packets[0].time)}
// //               </Text>
// //             </View>
// //             <View className="mt-1 flex-row items-center">
// //               <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
// //               <Text className="ml-1 text-sm text-gray-600">
// //                 End: {formatTimestamp(trip.endTime || packets[packets.length - 1].time)}
// //               </Text>
// //             </View>
// //           </>
// //         )}

// //         {/* Thresholds */}
// //         {thresholds && (
// //           <View className="mt-3 rounded-lg bg-gray-100 p-3">
// //             <View className="flex-row justify-around">
// //               <View className="items-center">
// //                 <Text className="text-xs text-gray-500">Temp Range</Text>
// //                 <Text className="text-sm font-semibold text-gray-700">
// //                   {thresholds.tempMin}° - {thresholds.tempMax}°C
// //                 </Text>
// //               </View>
// //               <View className="items-center">
// //                 <Text className="text-xs text-gray-500">Humidity Range</Text>
// //                 <Text className="text-sm font-semibold text-gray-700">
// //                   {thresholds.humMin}% - {thresholds.humMax}%
// //                 </Text>
// //               </View>
// //             </View>
// //           </View>
// //         )}
// //       </View>

// //       {/* Graph - Scrollable */}
// //       <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
// //         <Text className="mb-3 text-sm font-semibold text-gray-700">
// //           Trip Overview ({packets.length} records)
// //         </Text>

// //         {packets.length === 0 ? (
// //           <View className="flex-1 items-center justify-center">
// //             <Text className="text-gray-400">Please stop trip to view data</Text>
// //           </View>
// //         ) : (
// //           <>
// //             <View className="mb-4">
// //               <View className="mb-2 flex-row justify-start">
// //                 {/* <Text className="mr-4 text-xs font-semibold text-gray-700">°C</Text> */}
// //                 {/* <Text className="text-xs font-semibold text-gray-700">%RH</Text> */}
// //               </View>

// //               <View ref={chartRef} collapsable={false} className="rounded-2xl bg-white p-2">
// //                 <DynamicLineChart
// //                   packets={packets}
// //                   thresholds={thresholds}
// //                   width={Dimensions.get('window').width - 32}
// //                   height={220}
// //                 />
// //               </View>

// //               <View className="mt-3 items-center">
// //                 <View className="mb-2 w-full flex-row justify-between px-8">
// //                   <View className="flex-1 flex-row items-center">
// //                     <View className="mr-2 h-3 w-8 bg-blue-500" />
// //                     <Text className="text-xs text-gray-600">Temperature</Text>
// //                   </View>
// //                   <View className="flex-1 flex-row items-center">
// //                     <View className="mr-2 h-3 w-8 bg-red-500" />
// //                     <Text className="text-xs text-gray-600">Temp Breach</Text>
// //                   </View>
// //                 </View>
// //                 <View className="w-full flex-row justify-between px-8">
// //                   <View className="flex-1 flex-row items-center">
// //                     <View className="mr-2 h-3 w-8 bg-green-500" />
// //                     <Text className="text-xs text-gray-600">Humidity</Text>
// //                   </View>
// //                   <View className="flex-1 flex-row items-center">
// //                     <View className="mr-2 h-3 w-8 bg-orange-500" />
// //                     <Text className="text-xs text-gray-600">Humid Breach</Text>
// //                   </View>
// //                 </View>
// //               </View>
// //             </View>
// //             {/* Buttons */}
// //             <View className="mb-4 flex-row items-center justify-center gap-3">
// //               <TouchableOpacity
// //                 onPress={() => router.push({ pathname: '/trip-records', params: { tripName } })}
// //                 className="rounded-lg border-2 border-blue-600 px-6 py-3">
// //                 <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>
// //                   View Records
// //                 </Text>
// //               </TouchableOpacity>
// //               {trip.startLocation && trip.endLocation && (
// //                 <TouchableOpacity
// //                   onPress={() => {
// //                     router.push({
// //                       pathname: '/trip-map',
// //                       params: {
// //                         startLat: trip.startLocation.latitude,
// //                         startLng: trip.startLocation.longitude,
// //                         endLat: trip.endLocation.latitude,
// //                         endLng: trip.endLocation.longitude,
// //                       },
// //                     });
// //                   }}
// //                   className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
// //                   <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
// //                   <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>
// //                     View Path
// //                   </Text>
// //                 </TouchableOpacity>
// //               )}
// //               <TouchableOpacity
// //                 onPress={generatePDF}
// //                 disabled={generatingPDF}
// //                 className={`flex-row items-center rounded-lg border-2 px-4 py-3 ${generatingPDF ? 'border-gray-400 bg-gray-100' : 'border-blue-600'}`}>
// //                 {generatingPDF ? (
// //                   <ActivityIndicator size="small" color="#666" />
// //                 ) : (
// //                   <MaterialCommunityIcons name="download" size={20} color="#1976D2" />
// //                 )}
// //                 <Text
// //                   className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`}
// //                   numberOfLines={1}>
// //                   {generatingPDF ? 'Loading...' : 'PDF'}
// //                 </Text>
// //               </TouchableOpacity>
// //             </View>
// //           </>
// //         )}
// //       </ScrollView>
// //     </SafeAreaView>
// //   );
// // }
// // app/trip-detail.tsx
// import React, { useMemo, useState, useEffect, useRef } from 'react';
// import { Buffer } from 'buffer';
// import {
//   View,
//   Text,
//   Pressable,
//   ActivityIndicator,
//   TouchableOpacity,
//   Dimensions,
//   ScrollView,
//   Alert,
//   Linking,
// } from 'react-native';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
// import * as FileSystem from 'expo-file-system';
// import { captureRef } from 'react-native-view-shot';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { getTripDetails } from '../services/RestApiServices/HistoryService';
// import DynamicLineChart from '../components/DynamicLineChart';

// type DataPacket = {
//   time: number;
//   temperature: number;
//   humidity: number;
//   latitude?: number;
//   longitude?: number;
//   movement?: string;
//   battery?: number;
// };

// /** Put your Google Static Maps key here */
// const GOOGLE_STATIC_MAPS_KEY = 'AIzaSyDsqWho-EyUaPIe2Sxp8X2tw4x7SCLOW-A';

// const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
// const fmtIST = (unix: number) =>
//   new Date(unix * 1000).toLocaleString('en-GB', {
//     timeZone: 'Asia/Kolkata',
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit',
//   });

// export default function TripDetail() {
//   const router = useRouter();
//   const { tripName } = useLocalSearchParams();
//   const [loading, setLoading] = useState(true);
//   const [apiTrip, setApiTrip] = useState<any>(null);
//   const [generatingPDF, setGeneratingPDF] = useState(false);
//   const chartRef = useRef(null);

//   useEffect(() => {
//     const fetchTripDetails = async () => {
//       if (!tripName) {
//         setLoading(false);
//         return;
//       }

//       // ===== TEST DATA (remove if not needed) =====
//       if (tripName === 'TEST_TRIP_200') {
//         const now = Math.floor(Date.now() / 1000);
//         const fakeRecords = Array.from({ length: 42 }, (_, i) => ({
//           Timestamp: String(now - (42 - i) * 600),
//           Temperature: String(22 + Math.sin(i / 3) * 4 + (i % 9 === 4 ? 6 : 0)),
//           Humidity: String(34 + Math.cos(i / 2) * 6 + (i === 30 ? 20 : 0)),
//           Latitude: String(13.02 + i * 0.02),
//           Longitude: String(77.62 + i * 0.015),
//           Movement: i % 4 === 0 ? 'Moving' : 'Idle',
//           Battery: String(100 - i),
//         }));
//         setApiTrip({
//           tripInfo: {
//             tripName: 'Pharma Trip 1',
//             deviceid: 'TF6 Prime',
//             deviceID: 'TF6-PRIME',
//             serialNo: 'TF6000038',
//             modelNo: 'GTRAC6S66',
//             partNo: 'TF6 Prime',
//             startTime: Number(fakeRecords[0].Timestamp),
//             endTime: Number(fakeRecords[fakeRecords.length - 1].Timestamp),
//             startLocation: { latitude: 25.205, longitude: 55.271 },
//             endLocation: { latitude: 25.1, longitude: 55.21 },
//             managedBy: 'Rohit Sharma',
//             source: 'Pune, Maharashtra (Warehouse A)',
//             destination: 'Hyderabad, Telangana (Pharma Hub)',
//             tripConfig: {
//               customerProfile: { profileName: 'Thinxfresh' },
//               boxProfile: {
//                 profileName: 'Pharma Box',
//                 minTemp: 18,
//                 maxTemp: 26,
//                 minHum: 30,
//                 maxHum: 60,
//                 samplingMinutes: 10,
//                 reportingMinutes: 60,
//               },
//             },
//           },
//           records: fakeRecords,
//         });
//         setLoading(false);
//         return;
//       }
//       // ============================================

//       const result = await getTripDetails(String(tripName));
//       if (result?.success && result?.data) setApiTrip(result.data);
//       setLoading(false);
//     };

//     fetchTripDetails();
//   }, [tripName]);

//   const trip = apiTrip?.tripInfo;

//   const packets: DataPacket[] = useMemo(() => {
//     if (apiTrip?.records) {
//       return apiTrip.records.map((r: any) => ({
//         time: parseInt(r.Timestamp),
//         temperature: parseFloat(r.Temperature),
//         humidity: parseFloat(r.Humidity),
//         latitude: r.Latitude ? parseFloat(r.Latitude) : undefined,
//         longitude: r.Longitude ? parseFloat(r.Longitude) : undefined,
//         movement: r.Movement,
//         battery: r.Battery ? parseFloat(r.Battery) : undefined,
//       }));
//     }
//     return [];
//   }, [apiTrip]);

//   const thresholds = useMemo(() => {
//     if (!trip?.tripConfig?.boxProfile) return null;
//     const profile = trip.tripConfig.boxProfile;
//     return {
//       tempMin: profile.minTemp ?? -Infinity,
//       tempMax: profile.maxTemp ?? Infinity,
//       humMin: profile.minHum ?? -Infinity,
//       humMax: profile.maxHum ?? Infinity,
//       samplingMinutes: profile.samplingMinutes ?? undefined,
//       reportingMinutes: profile.reportingMinutes ?? undefined,
//     };
//   }, [trip]);

//   const formatTimestamp = (unixTime: number) => {
//     const date = new Date(unixTime * 1000);
//     return date.toLocaleString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//     });
//   };

//   // ---------- Analytics ----------
//   const outOfRangeTemp = useMemo(() => {
//     if (!thresholds) return 0;
//     return packets.reduce(
//       (acc, p) => acc + (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax ? 1 : 0),
//       0
//     );
//   }, [packets, thresholds]);

//   const outOfRangeHum = useMemo(() => {
//     if (!thresholds) return 0;
//     return packets.reduce(
//       (acc, p) => acc + (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax ? 1 : 0),
//       0
//     );
//   }, [packets, thresholds]);

//   const durationStr = useMemo(() => {
//     if (!packets.length) return '-';
//     const start = trip?.startTime ?? packets[0].time;
//     const end = trip?.endTime ?? packets[packets.length - 1].time;
//     const minutes = Math.max(0, Math.round((end - start) / 60));
//     const h = Math.floor(minutes / 60);
//     const m = minutes % 60;
//     return `${h} Hrs ${m} min`;
//   }, [packets, trip]);

//   const qopPercent = useMemo(() => {
//     if (!packets.length || !thresholds) return 100;
//     const ok = packets.filter(
//       (p) =>
//         p.temperature >= thresholds.tempMin &&
//         p.temperature <= thresholds.tempMax &&
//         p.humidity >= thresholds.humMin &&
//         p.humidity <= thresholds.humMax
//     ).length;
//     return Math.round((ok / packets.length) * 100);
//   }, [packets, thresholds]);

//   const qopBucket = useMemo(() => {
//     if (qopPercent >= 98) return '> 98';
//     if (qopPercent >= 90) return '> 90';
//     if (qopPercent >= 80) return '> 80';
//     if (qopPercent >= 70) return '> 70';
//     return '< 70';
//   }, [qopPercent]);

//   // ---------- Helpers for PDF ----------
//   async function toDataURL(url: string) {
//     try {
//       console.log('[StaticMap] URL:', url);
//       const res = await fetch(url);
//       if (!res.ok) {
//         const txt = await res.text().catch(() => '');
//         console.warn('[StaticMap] HTTP error:', res.status, txt?.slice(0, 180));
//         return '';
//       }
//       const buf = await res.arrayBuffer();
//       const base64 = Buffer.from(buf).toString('base64');
//       return `data:image/png;base64,${base64}`;
//     } catch (e) {
//       console.warn('[StaticMap] fetch failed, trying FileSystem:', e);
//       try {
//         const file = FileSystem.cacheDirectory + 'static-map.png';
//         const dl: any = await FileSystem.downloadAsync(url, file);
//         if (dl?.status && dl.status !== 200) {
//           console.warn('[StaticMap] downloadAsync non-200:', dl.status);
//           return '';
//         }
//         const base64 = await FileSystem.readAsStringAsync(dl.uri, {
//           encoding: FileSystem.EncodingType.Base64,
//         });
//         return `data:image/png;base64,${base64}`;
//       } catch (e2) {
//         console.warn('[StaticMap] downloadAsync failed:', e2);
//         return '';
//       }
//     }
//   }

//   function buildStaticMapURL(
//     points: { lat: number; lng: number }[],
//     start?: { latitude: number; longitude: number },
//     end?: { latitude: number; longitude: number }
//   ) {
//     const KEY = GOOGLE_STATIC_MAPS_KEY?.trim();
//     if (!KEY) return '';

//     const size = '690x220'; // fits the card
//     const markers: string[] = [];
//     if (start) markers.push(`markers=color:green|${start.latitude},${start.longitude}`);
//     if (end) markers.push(`markers=color:red|${end.latitude},${end.longitude}`);

//     const base = `https://maps.googleapis.com/maps/api/staticmap?scale=2&format=png&size=${size}&maptype=roadmap`;

//     // If we have at least 2 track points, sample & draw path
//     if (points && points.length >= 2) {
//       const maxPts = 80;
//       let sampled = points;
//       if (points.length > maxPts) {
//         sampled = [];
//         for (let i = 0; i < maxPts; i++) {
//           const idx = Math.round((i / (maxPts - 1)) * (points.length - 1));
//           sampled.push(points[idx]);
//         }
//       }
//       const path = sampled.map((p) => `${p.lat},${p.lng}`).join('|');
//       return `${base}&path=color:0x2563eb|weight:3|${encodeURIComponent(path)}&${markers.join('&')}&key=${KEY}`;
//     }

//     // Else, if we only know start/end, connect them as a short path (plus markers)
//     if (start && end) {
//       const se = `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`;
//       // center the map roughly between start & end
//       const centerLat = (start.latitude + end.latitude) / 2;
//       const centerLng = (start.longitude + end.longitude) / 2;
//       return `${base}&center=${centerLat},${centerLng}&zoom=8&path=color:0x2563eb|weight:3|${encodeURIComponent(
//         se
//       )}&${markers.join('&')}&key=${KEY}`;
//     }

//     // Fallback: center on one available point/marker
//     if (start || end) {
//       const c = start ?? end!;
//       return `${base}&center=${c.latitude},${c.longitude}&zoom=9&${markers.join('&')}&key=${KEY}`;
//     }

//     return '';
//   }

//   /** INLINE SVG FALLBACK with background + dashed Start→End */
//   function buildInlineMiniMap(_points: { lat: number; lng: number }[], start?: any, end?: any) {
//     if (!start || !end) {
//       return `<div style="height:220px;display:flex;align-items:center;justify-content:center;color:#6b7280;border:1px solid #e5e7eb;border-radius:10px">Path preview unavailable</div>`;
//     }

//     const s = start, e = end;
//     const W = 690, H = 220, PAD = 14;

//     let minLat = Math.min(s.latitude, e.latitude);
//     let maxLat = Math.max(s.latitude, e.latitude);
//     let minLng = Math.min(s.longitude, e.longitude);
//     let maxLng = Math.max(s.longitude, e.longitude);

//     const padDeg = 0.08 * Math.max(maxLat - minLat, maxLng - minLng, 0.01);
//     minLat -= padDeg; maxLat += padDeg; minLng -= padDeg; maxLng += padDeg;

//     const w = W - 2 * PAD;
//     const h = H - 2 * PAD;
//     const latRange = Math.max(1e-6, maxLat - minLat);
//     const lngRange = Math.max(1e-6, maxLng - minLng);
//     const x = (lng: number) => PAD + ((lng - minLng) / lngRange) * w;
//     const y = (lat: number) => PAD + (1 - (lat - minLat) / latRange) * h;

//     const x1 = x(s.longitude).toFixed(1);
//     const y1 = y(s.latitude).toFixed(1);
//     const x2 = x(e.longitude).toFixed(1);
//     const y2 = y(e.latitude).toFixed(1);

//     const gridCount = 9;
//     const verticalLines = Array.from({ length: gridCount + 1 }, (_, i) => {
//       const xx = PAD + (i / gridCount) * w;
//       return `<line x1="${xx.toFixed(1)}" y1="${PAD}" x2="${xx.toFixed(1)}" y2="${(PAD + h).toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
//     }).join('');
//     const horizontalLines = Array.from({ length: gridCount + 1 }, (_, i) => {
//       const yy = PAD + (i / gridCount) * h;
//       return `<line x1="${PAD}" y1="${yy.toFixed(1)}" x2="${(PAD + w).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
//     }).join('');

//     if (Math.abs(+x1 - +x2) < 0.1 && Math.abs(+y1 - +y2) < 0.1) {
//       return `
//         <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
//           <defs>
//             <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stop-color="#eef2ff"/>
//               <stop offset="100%" stop-color="#ffffff"/>
//             </linearGradient>
//           </defs>
//           <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
//           ${verticalLines}
//           ${horizontalLines}
//           <circle cx="${x1}" cy="${y1}" r="5" fill="#2563eb"/>
//         </svg>
//       `;
//     }

//     const labelOffset = 8;
//     const startLabelX = Math.max(PAD + 4, +x1 - 36);
//     const startLabelY = Math.max(PAD + 10, +y1 - labelOffset);
//     const endLabelX = Math.min(PAD + w - 4, +x2 + 36);
//     const endLabelY = Math.max(PAD + 10, +y2 - labelOffset);

//     return `
//       <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
//         <defs>
//           <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="0%" stop-color="#eef2ff"/>
//             <stop offset="100%" stop-color="#ffffff"/>
//           </linearGradient>
//         </defs>
//         <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
//         ${verticalLines}
//         ${horizontalLines}
//         <path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 6"/>
//         <circle cx="${x1}" cy="${y1}" r="4" fill="#16a34a"/>
//         <circle cx="${x2}" cy="${y2}" r="4" fill="#ef4444"/>
//         <text x="${startLabelX}" y="${startLabelY}" font-size="10" fill="#16a34a" text-anchor="end" font-weight="700">Start</text>
//         <text x="${endLabelX}" y="${endLabelY}" font-size="10" fill="#ef4444" text-anchor="start" font-weight="700">End</text>
//       </svg>
//     `;
//   }

//   // ---------- PDF generator ----------
//   const generatePDF = async () => {
//     setGeneratingPDF(true);
//     try {
//       // CHART SVG
//       let chartSvg = '';
//       try {
//         if (packets.length > 0) {
//           const tempData = packets.map((p) => p.temperature);
//           const humData = packets.map((p) => p.humidity);

//           const tMin = Math.min(...tempData, thresholds ? thresholds.tempMin : Infinity) - 2;
//           const tMax = Math.max(...tempData, thresholds ? thresholds.tempMax : -Infinity) + 2;
//           const hMin = Math.min(...humData, thresholds ? thresholds.humMin : Infinity) - 3;
//           const hMax = Math.max(...humData, thresholds ? thresholds.humMax : -Infinity) + 3;

//           const svgWidth = 690;
//           const svgHeight = 300;
//           const pad = 50;
//           const cw = svgWidth - 2 * pad;
//           const ch = svgHeight - 2 * pad;

//           const getX = (i: number) => pad + (i / (packets.length - 1)) * cw;
//           const yT = (v: number) => pad + ((tMax - v) / (tMax - tMin)) * ch;
//           const yH = (v: number) => pad + ((hMax - v) / (hMax - hMin)) * ch;

//           const makePath = (arr: number[], yfn: (v: number) => number) =>
//             arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${yfn(v)}`).join(' ');

//           const tempPath = makePath(tempData, yT);
//           const humPath = makePath(humData, yH);

//           chartSvg = `
//             <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
//               <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="white" rx="8"/>
//               <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${pad + ch}" stroke="#d1d5db"/>
//               <line x1="${pad}" y1="${pad + ch}" x2="${pad + cw}" y2="${pad + ch}" stroke="#d1d5db"/>
//               <path d="${tempPath}" fill="none" stroke="#3B82F6" stroke-width="2"/>
//               <path d="${humPath}" fill="none" stroke="#22C55E" stroke-width="2"/>
//               ${
//                 thresholds
//                   ? `
//                     <line x1="${pad}" y1="${yT(thresholds.tempMin)}" x2="${pad + cw}" y2="${yT(
//                       thresholds.tempMin
//                     )}" stroke="#EF4444" stroke-width="1" stroke-dasharray="4,3"/>
//                     <line x1="${pad}" y1="${yT(thresholds.tempMax)}" x2="${pad + cw}" y2="${yT(
//                       thresholds.tempMax
//                     )}" stroke="#EF4444" stroke-width="1" stroke-dasharray="4,3"/>
//                     <line x1="${pad}" y1="${yH(thresholds.humMin)}" x2="${pad + cw}" y2="${yH(
//                       thresholds.humMin
//                     )}" stroke="#F97316" stroke-width="1" stroke-dasharray="4,3"/>
//                     <line x1="${pad}" y1="${yH(thresholds.humMax)}" x2="${pad + cw}" y2="${yH(
//                       thresholds.humMax
//                     )}" stroke="#F97316" stroke-width="1" stroke-dasharray="4,3"/>
//                   `
//                   : ''
//               }
//             </svg>
//           `;
//         }
//       } catch (e) {
//         console.warn('Chart SVG generation failed:', e);
//       }

//       // Map: Static → base64; else inline dashed Start→End with background
//       const latlngs = packets
//         .filter((p) => p.latitude != null && p.longitude != null)
//         .map((p) => ({ lat: p.latitude as number, lng: p.longitude as number }));

//       const url = buildStaticMapURL(latlngs, trip?.startLocation, trip?.endLocation);
//       let mapBlock = '';
//       if (url) {
//         const dataURL = await toDataURL(url);
//         mapBlock = dataURL
//           ? `<img src="${dataURL}" alt="map" style="width:100%;height:220px;border-radius:10px;border:1px solid #e5e7eb;object-fit:cover"/>`
//           : buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//       } else {
//         mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//       }

//       // ---------- AUTO PAGINATION ----------
//       const ROWS_PER_TABLE_PAGE = 18;

//       const chunk = <T,>(arr: T[], size: number): T[][] => {
//         const out: T[][] = [];
//         for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
//         return out;
//       };

//       const tableChunks = chunk(packets, ROWS_PER_TABLE_PAGE);
//       const extraChunks = tableChunks.slice(1);
//       const totalPages = 2 + Math.max(0, tableChunks.length - 1);

//       const renderTableRows = (rows: DataPacket[], startIndex: number) =>
//         rows
//           .map((p, i) => {
//             const idx = startIndex + i + 1;
//             const humBad =
//               thresholds && (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax);
//             return `
//               <tr>
//                 <td class="c t">${pad2(idx)}</td>
//                 <td class="c">${p.temperature?.toFixed(0) ?? '—'}</td>
//                 <td class="c ${humBad ? 'bad' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
//                 <td class="c">${p.latitude?.toFixed(6) ?? '—'}</td>
//                 <td class="c">${p.longitude?.toFixed(6) ?? '—'}</td>
//                 <td class="c">${p.movement ?? (i % 3 === 0 ? 'Moving' : 'Idle')}</td>
//                 <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
//                 <td class="c">${fmtIST(p.time)}</td>
//               </tr>
//             `;
//           })
//           .join('');

//       const page2Rows = tableChunks.length ? renderTableRows(tableChunks[0], 0) : '';

//       const extraTablePagesHTML = extraChunks
//         .map((rows, idx) => {
//           const pageNo = 3 + idx;
//           const startIndex = ROWS_PER_TABLE_PAGE * (idx + 1);
//           const isLast = idx === extraChunks.length - 1;

//           return `
//   <div class="pb"></div>
//   <div>
//     <div style="font-weight:800;color:#0f172a;font-size:13px;margin:8px 0 6px">Report Summary (continued)</div>
//     <table>
//       <thead>
//         <tr>
//           <th>Sl No</th>
//           <th>Temp °C</th>
//           <th>Hum %RH</th>
//           <th>Latitude</th>
//           <th>Longitude</th>
//           <th>Movement</th>
//           <th>Battery</th>
//           <th>Timestamp (IST)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${renderTableRows(rows, startIndex)}
//       </tbody>
//     </table>
//     ${
//       isLast
//         ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px">
//             This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
//             conditions during the specified interval and does not guarantee consignment quality. GND Solutions
//             assumes no liability for consequential damage, data loss, or other consequences arising from reliance
//             on this report. All actions based on this report are the sole responsibility of the recipient.
//           </div>`
//         : ''
//     }
//     <div class="footer"><div>fresh.thinxfresh.com</div><div>Page ${pageNo}/${totalPages}</div></div>
//   </div>`;
//         })
//         .join('');

//       const nowStr = new Date().toLocaleString('en-GB', {
//         timeZone: 'Asia/Kolkata',
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//       });

//       const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4; margin: 12mm; }
//   body { font-family: Arial, Helvetica, sans-serif; color:#111827; }
//   .pill { padding:2px 8px; border:1px solid #d1d5db; border-radius:999px; font-size:11px; font-weight:700; margin-right:6px; }
//   .ok { background:#dcfce7; border-color:#86efac; }
//   .bad { color:#dc2626; font-weight:700; }
//   .card { border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin-bottom:12px; }
//   .title { font-weight:800; color:#0f172a; font-size:13px; border-bottom:2px solid #60a5fa; padding-bottom:6px; margin-bottom:8px; }
//   .kv { display:grid; grid-template-columns: 140px 1fr; row-gap:6px; column-gap:10px; font-size:12px; }
//   .kv div:nth-child(2n) { color:#111827; }
//   .meta { font-size:11px; color:#6b7280; }
//   .analytics { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
//   .a { border:1px solid #e5e7eb; border-radius:10px; padding:10px; text-align:center; }
//   .anum { font-size:22px; font-weight:800; }
//   .acap { font-size:11px; color:#6b7280; }
//   table { width:100%; border-collapse:collapse; }
//   th, td { border:1px solid #e5e7eb; padding:8px; font-size:11px; }
//   th { background:#e9f1ff; color:#0f172a; font-weight:700; }
//   td.c { text-align:center; }
//   td.t { font-weight:700; }
//   .footer { display:flex; justify-content:space-between; font-size:10px; color:#6b7280; margin-top:6px; }
//   .pb { page-break-after: always; }
// </style>
// </head>
// <body>

//   <!-- ================ PAGE 1 ================ -->
//   <div>
//     <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
//       <div style="display:flex;gap:14px;align-items:center;">
//         <div style="font-weight:900;font-size:18px;color:#1e40af">GND SOLUTIONS®</div>
//         <div>
//           <div style="font-weight:800;font-size:16px;">Insights &amp; Summary Report</div>
//           <div class="meta">Report Generated On: ${nowStr}</div>
//         </div>
//       </div>
//       <div style="display:flex;align-items:center;gap:12px;">
//         <div>
//           <div class="meta" style="margin-bottom:4px;">Quality of Process:</div>
//           <div>
//             <span class="pill ${qopBucket==='> 98' ? 'ok':''}">&gt; 98</span>
//             <span class="pill ${qopBucket==='> 90' ? 'ok':''}">&gt; 90</span>
//             <span class="pill ${qopBucket==='> 80' ? 'ok':''}">&gt; 80</span>
//             <span class="pill ${qopBucket==='> 70' ? 'ok':''}">&gt; 70</span>
//             <span class="pill ${qopBucket==='< 70' ? 'bad':''}">&lt; 70</span>
//           </div>
//         </div>
//         <div style="border:2px solid #10b981;color:#10b981;font-weight:800;border-radius:40px;padding:8px 12px;font-size:12px">
//           RESULT: ${qopPercent >= 90 ? 'ACCEPT' : qopPercent >= 80 ? 'REVIEW' : 'REJECT'}
//         </div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Sensor Information</div>
//       <div class="kv">
//         <div>Model No</div><div>: ${trip?.modelNo ?? '—'}</div>
//         <div>Part No</div><div>: ${trip?.partNo ?? trip?.deviceid ?? trip?.deviceID ?? '—'}</div>
//         <div>Sensor Accuracy</div><div>: ± 0.3°C, ± 1.5 %RH</div>
//         <div>Serial No</div><div>: ${trip?.serialNo ?? '—'}</div>
//         <div>Calibration</div><div>: Valid</div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Trip Information</div>
//       <div class="kv">
//         <div>Trip Name</div><div>: ${trip?.tripName ?? '—'}</div>
//         <div>Managed By</div><div>: ${trip?.managedBy ?? '—'}</div>
//         <div>Source</div><div>: ${trip?.source ?? '—'}</div>
//         <div>Destination</div><div>: ${trip?.destination ?? '—'}</div>
//         <div>Started On</div><div>: ${packets.length ? fmtIST(trip?.startTime ?? packets[0].time) : '—'}</div>
//         <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length-1].time) : '—'}</div>
//       </div>
//     </div>

//     <div style="display:flex;gap:12px;">
//       <div class="card" style="flex:1">
//         <div class="title">Thresholds</div>
//         <div class="kv">
//           <div>Temperature</div><div>: ${thresholds ? `${thresholds.tempMin}°C min   ${thresholds.tempMax}°C max` : '—'}</div>
//           <div>Humidity</div><div>: ${thresholds ? `${thresholds.humMin} %RH min   ${thresholds.humMax} %RH max` : '—'}</div>
//           <div>Sampling Interval</div><div>: ${thresholds?.samplingMinutes ?? 1} minutes</div>
//           <div>Reporting Interval</div><div>: ${thresholds?.reportingMinutes ?? 60} minutes</div>
//         </div>
//       </div>

//       <div class="card" style="flex:1">
//         <div class="title">Analytics</div>
//         <div class="analytics">
//           <div class="a">
//             <div class="anum">${packets.length}</div>
//             <div class="acap">Total Samples</div>
//           </div>
//           <div class="a">
//             <div class="anum">${pad2(outOfRangeTemp)}</div>
//             <div class="acap">Temp samples in alert</div>
//           </div>
//           <div class="a">
//             <div class="anum">${pad2(outOfRangeHum)}</div>
//             <div class="acap">Humidity samples in alert</div>
//           </div>
//           <div class="a">
//             <div class="anum">${durationStr.replace(' ', '<br/>')}</div>
//             <div class="acap">Trip Duration</div>
//           </div>
//         </div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
//       ${mapBlock}
//     </div>

//     <div class="footer"><div>fresh.thinxfresh.com</div><div>Page 1/${totalPages}</div></div>
//   </div>
//   <div class="pb"></div>

//   <!-- ================ PAGE 2 ================ -->
//   <div>
//     <div class="card">
//       <div class="title">Graphs</div>
//       <div style="display:flex;justify-content:center">${chartSvg}</div>
//       <div style="display:flex;gap:18px;font-size:11px;color:#475467;margin-top:6px">
//         <span><i style="display:inline-block;width:26px;height:4px;background:#3B82F6;margin-right:6px;border-radius:2px"></i>Temperature (°C)</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#22C55E;margin-right:6px;border-radius:2px"></i>Humidity (%RH)</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temp Limits</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humid Limits</span>
//       </div>
//     </div>

//     <div style="font-weight:800;color:#0f172a;font-size:13px;margin:8px 0 6px">Report Summary</div>
//     <table>
//       <thead>
//         <tr>
//           <th>Sl No</th>
//           <th>Temp °C</th>
//           <th>Hum %RH</th>
//           <th>Latitude</th>
//           <th>Longitude</th>
//           <th>Movement</th>
//           <th>Battery</th>
//           <th>Timestamp (IST)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${page2Rows}
//       </tbody>
//     </table>

//     ${tableChunks.length <= 1
//       ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px">
//            This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
//            conditions during the specified interval and does not guarantee consignment quality. GND Solutions
//            assumes no liability for consequential damage, data loss, or other consequences arising from reliance
//            on this report. All actions based on this report are the sole responsibility of the recipient.
//          </div>`
//       : ''}

//     <div class="footer"><div>fresh.thinxfresh.com</div><div>Page 2/${totalPages}</div></div>
//   </div>

//   ${extraTablePagesHTML}

// </body>
// </html>
//       `;

//       const { uri } = await Print.printToFileAsync({ html });
//       await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
//     } catch (error) {
//       console.error(error);
//       Alert.alert('Error', 'Failed to generate PDF');
//     } finally {
//       setGeneratingPDF(false);
//     }
//   };

//   // ======== Screen UI (unchanged) ========
//   if (loading) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color="#1976D2" />
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (!trip) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-1 items-center justify-center">
//           <Text className="text-gray-500">Trip not found</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const samplingMinutes =
//     thresholds?.samplingMinutes ??
//     (packets.length > 1 ? Math.round((packets[1].time - packets[0].time) / 60) : 1);

//   return (
//     <SafeAreaView className="flex-1 bg-gray-50">
//       {/* Header */}
//       <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
//         <Pressable
//           className="h-10 w-10 items-center justify-center"
//           onPress={() => router.back()}
//           accessibilityRole="button"
//           accessibilityLabel="Back">
//           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//         </Pressable>
//         <Text className="text-lg font-semibold text-black">Trip Details</Text>
//         <View className="w-10" />
//       </View>

//       {/* Trip Info */}
//       <View className="border-b border-gray-200 bg-white p-4">
//         <Text className="mb-1 text-xl font-bold text-gray-800">
//           {trip.tripName || 'Unnamed Trip'}
//         </Text>
//         <View className="mt-2 flex-row items-center">
//           <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">
//             Device: {trip.deviceid || trip.deviceID || trip.deviceName}
//           </Text>
//         </View>
//         {trip.tripConfig?.customerProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="account" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">
//               {trip.tripConfig.customerProfile.profileName}
//             </Text>
//           </View>
//         )}
//         {trip.tripConfig?.boxProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">
//               {trip.tripConfig.boxProfile.profileName}
//             </Text>
//           </View>
//         )}

//         <View className="mt-1 flex-row items-center">
//           <MaterialCommunityIcons name="alarm" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">
//             Sampling Interval: {samplingMinutes} minutes
//           </Text>
//         </View>

//         {packets.length > 0 && (
//           <>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">
//                 Start: {formatTimestamp(trip.startTime || packets[0].time)}
//               </Text>
//             </View>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">
//                 End: {formatTimestamp(trip.endTime || packets[packets.length - 1].time)}
//               </Text>
//             </View>
//           </>
//         )}

//         {/* Thresholds */}
//         {thresholds && (
//           <View className="mt-3 rounded-lg bg-gray-100 p-3">
//             <View className="flex-row justify-around">
//               <View className="items-center">
//                 <Text className="text-xs text-gray-500">Temp Range</Text>
//                 <Text className="text-sm font-semibold text-gray-700">
//                   {thresholds.tempMin}° - {thresholds.tempMax}°C
//                 </Text>
//               </View>
//               <View className="items-center">
//                 <Text className="text-xs text-gray-500">Humidity Range</Text>
//                 <Text className="text-sm font-semibold text-gray-700">
//                   {thresholds.humMin}% - {thresholds.humMax}%
//                 </Text>
//               </View>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* Graph - Scrollable */}
//       <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
//         <Text className="mb-3 text-sm font-semibold text-gray-700">
//           Trip Overview ({packets.length} records)
//         </Text>

//         {packets.length === 0 ? (
//           <View className="flex-1 items-center justify-center">
//             <Text className="text-gray-400">Please stop trip to view data</Text>
//           </View>
//         ) : (
//           <>
//             <View className="mb-4">
//               <View ref={chartRef} collapsable={false} className="rounded-2xl bg-white p-2">
//                 <DynamicLineChart
//                   packets={packets}
//                   thresholds={thresholds ?? undefined}
//                   width={Dimensions.get('window').width - 32}
//                   height={220}
//                 />
//               </View>

//               <View className="mt-3 items-center">
//                 <View className="mb-2 w-full flex-row justify-between px-8">
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-blue-500" />
//                     <Text className="text-xs text-gray-600">Temperature</Text>
//                   </View>
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-red-500" />
//                     <Text className="text-xs text-gray-600">Temp Limits</Text>
//                   </View>
//                 </View>
//                 <View className="w-full flex-row justify-between px-8">
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-green-500" />
//                     <Text className="text-xs text-gray-600">Humidity</Text>
//                   </View>
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-orange-500" />
//                     <Text className="text-xs text-gray-600">Humid Limits</Text>
//                   </View>
//                 </View>
//               </View>
//             </View>

//             {/* Buttons */}
//             <View className="mb-4 flex-row items-center justify-center gap-3">
//               <TouchableOpacity
//                 onPress={() => router.push({ pathname: '/trip-records', params: { tripName } })}
//                 className="rounded-lg border-2 border-blue-600 px-6 py-3">
//                 <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>
//                   View Records
//                 </Text>
//               </TouchableOpacity>
//               {trip.startLocation && trip.endLocation && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     const url = `https://www.google.com/maps/dir/?api=1&origin=${trip.startLocation.latitude},${trip.startLocation.longitude}&destination=${trip.endLocation.latitude},${trip.endLocation.longitude}`;
//                     Linking.openURL(url).catch(() =>
//                       Alert.alert('Error', 'Unable to open Google Maps')
//                     );
//                   }}
//                   className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
//                   <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
//                   <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>
//                     View Path
//                   </Text>
//                 </TouchableOpacity>
//               )}
//               <TouchableOpacity
//                 onPress={generatePDF}
//                 disabled={generatingPDF}
//                 className={`flex-row items-center rounded-lg border-2 px-4 py-3 ${generatingPDF ? 'border-gray-400 bg-gray-100' : 'border-blue-600'}`}>
//                 {generatingPDF ? (
//                   <ActivityIndicator size="small" color="#666" />
//                 ) : (
//                   <MaterialCommunityIcons name="download" size={20} color="#1976D2" />
//                 )}
//                 <Text
//                   className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`}
//                   numberOfLines={1}>
//                   {generatingPDF ? 'Loading...' : 'PDF'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }



// app/trip-detail.tsx
// import React, { useMemo, useState, useEffect, useRef } from 'react';
// import { Buffer } from 'buffer';
// import {
//   View,
//   Text,
//   Pressable,
//   ActivityIndicator,
//   TouchableOpacity,
//   Dimensions,
//   ScrollView,
//   Alert,
//   Linking,
// } from 'react-native';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
// import * as FileSystem from 'expo-file-system';
// import { captureRef } from 'react-native-view-shot';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { getTripDetails } from '../services/RestApiServices/HistoryService';
// import DynamicLineChart from '../components/DynamicLineChart';

// type DataPacket = {
//   time: number;
//   temperature: number;
//   humidity: number;
//   latitude?: number;
//   longitude?: number;
//   movement?: string;
//   battery?: number;
// };

// /** Put your Google Static Maps key here */
// const GOOGLE_STATIC_MAPS_KEY = 'AIzaSyDsqWho-EyUaPIe2Sxp8X2tw4x7SCLOW-A';

// const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
// const fmtIST = (unix: number) =>
//   new Date(unix * 1000).toLocaleString('en-GB', {
//     timeZone: 'Asia/Kolkata',
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit',
//   });

// export default function TripDetail() {
//   const router = useRouter();
//   const { tripName } = useLocalSearchParams();
//   const [loading, setLoading] = useState(true);
//   const [apiTrip, setApiTrip] = useState<any>(null);
//   const [generatingPDF, setGeneratingPDF] = useState(false);
//   const chartRef = useRef<View | null>(null);

//   useEffect(() => {
//     const fetchTripDetails = async () => {
//       if (!tripName) {
//         setLoading(false);
//         return;
//       }

//       // ===== TEST DATA (remove if not needed) =====
//       if (tripName === 'TEST_TRIP_200') {
//         const now = Math.floor(Date.now() / 1000);
//         const fakeRecords = Array.from({ length: 42 }, (_, i) => ({
//           Timestamp: String(now - (42 - i) * 600),
//           Temperature: String(22 + Math.sin(i / 3) * 4 + (i % 9 === 4 ? 6 : 0)),
//           Humidity: String(34 + Math.cos(i / 2) * 6 + (i === 30 ? 20 : 0)),
//           Latitude: String(13.02 + i * 0.02),
//           Longitude: String(77.62 + i * 0.015),
//           Movement: i % 4 === 0 ? 'Moving' : 'Idle',
//           Battery: String(100 - i),
//         }));
//         setApiTrip({
//           tripInfo: {
//             tripName: 'Pharma Trip 1',
//             deviceid: 'TF6 Prime',
//             deviceID: 'TF6-PRIME',
//             serialNo: 'TF6000038',
//             modelNo: 'GTRAC6S66',
//             partNo: 'TF6 Prime',
//             startTime: Number(fakeRecords[0].Timestamp),
//             endTime: Number(fakeRecords[fakeRecords.length - 1].Timestamp),
//             startLocation: { latitude: 25.205, longitude: 55.271 },
//             endLocation: { latitude: 25.1, longitude: 55.21 },
//             managedBy: 'Rohit Sharma',
//             source: 'Pune, Maharashtra (Warehouse A)',
//             destination: 'Hyderabad, Telangana (Pharma Hub)',
//             tripConfig: {
//               customerProfile: { profileName: 'Thinxfresh' },
//               boxProfile: {
//                 profileName: 'Pharma Box',
//                 minTemp: 18,
//                 maxTemp: 26,
//                 minHum: 30,
//                 maxHum: 60,
//                 samplingMinutes: 10,
//                 reportingMinutes: 60,
//               },
//             },
//           },
//           records: fakeRecords,
//         });
//         setLoading(false);
//         return;
//       }
//       // ============================================

//       const result = await getTripDetails(String(tripName));
//       if (result?.success && result?.data) setApiTrip(result.data);
//       setLoading(false);
//     };

//     fetchTripDetails();
//   }, [tripName]);

//   const trip = apiTrip?.tripInfo;

//   const packets: DataPacket[] = useMemo(() => {
//     if (apiTrip?.records) {
//       return apiTrip.records.map((r: any) => ({
//         time: parseInt(r.Timestamp),
//         temperature: parseFloat(r.Temperature),
//         humidity: parseFloat(r.Humidity),
//         latitude: r.Latitude ? parseFloat(r.Latitude) : undefined,
//         longitude: r.Longitude ? parseFloat(r.Longitude) : undefined,
//         movement: r.Movement,
//         battery: r.Battery ? parseFloat(r.Battery) : undefined,
//       }));
//     }
//     return [];
//   }, [apiTrip]);

//   const thresholds = useMemo(() => {
//     if (!trip?.tripConfig?.boxProfile) return null;
//     const profile = trip.tripConfig.boxProfile;
//     return {
//       tempMin: profile.minTemp ?? -Infinity,
//       tempMax: profile.maxTemp ?? Infinity,
//       humMin: profile.minHum ?? -Infinity,
//       humMax: profile.maxHum ?? Infinity,
//       samplingMinutes: profile.samplingMinutes ?? undefined,
//       reportingMinutes: profile.reportingMinutes ?? undefined,
//     };
//   }, [trip]);

//   const formatTimestamp = (unixTime: number) => {
//     const date = new Date(unixTime * 1000);
//     return date.toLocaleString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//     });
//   };

//   // ---------- Analytics ----------
//   const outOfRangeTemp = useMemo(() => {
//     if (!thresholds) return 0;
//     return packets.reduce(
//       (acc, p) => acc + (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax ? 1 : 0),
//       0
//     );
//   }, [packets, thresholds]);

//   const outOfRangeHum = useMemo(() => {
//     if (!thresholds) return 0;
//     return packets.reduce(
//       (acc, p) => acc + (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax ? 1 : 0),
//       0
//     );
//   }, [packets, thresholds]);

//   const durationStr = useMemo(() => {
//     if (!packets.length) return '-';
//     const start = trip?.startTime ?? packets[0].time;
//     const end = trip?.endTime ?? packets[packets.length - 1].time;
//     const minutes = Math.max(0, Math.round((end - start) / 60));
//     const h = Math.floor(minutes / 60);
//     const m = minutes % 60;
//     return `${h} Hrs ${m} min`;
//   }, [packets, trip]);

//   const qopPercent = useMemo(() => {
//     if (!packets.length || !thresholds) return 100;
//     const ok = packets.filter(
//       (p) =>
//         p.temperature >= thresholds.tempMin &&
//         p.temperature <= thresholds.tempMax &&
//         p.humidity >= thresholds.humMin &&
//         p.humidity <= thresholds.humMax
//     ).length;
//     return Math.round((ok / packets.length) * 100);
//   }, [packets, thresholds]);

//   const qopBucket = useMemo(() => {
//     if (qopPercent >= 98) return '> 98';
//     if (qopPercent >= 90) return '> 90';
//     if (qopPercent >= 80) return '> 80';
//     if (qopPercent >= 70) return '> 70';
//     return '< 70';
//   }, [qopPercent]);

//   // ---------- Helpers for PDF ----------
//   async function toDataURL(url: string) {
//     try {
//       console.log('[StaticMap] URL:', url);
//       const res = await fetch(url);
//       if (!res.ok) {
//         const txt = await res.text().catch(() => '');
//         console.warn('[StaticMap] HTTP error:', res.status, txt?.slice(0, 180));
//         return '';
//       }
//       const buf = await res.arrayBuffer();
//       const base64 = Buffer.from(buf).toString('base64');
//       return `data:image/png;base64,${base64}`;
//     } catch (e) {
//       console.warn('[StaticMap] fetch failed, trying FileSystem:', e);
//       try {
//         const file = FileSystem.cacheDirectory + 'static-map.png';
//         const dl: any = await FileSystem.downloadAsync(url, file);
//         if (dl?.status && dl.status !== 200) {
//           console.warn('[StaticMap] downloadAsync non-200:', dl.status);
//           return '';
//         }
//         const base64 = await FileSystem.readAsStringAsync(dl.uri, {
//           encoding: FileSystem.EncodingType.Base64,
//         });
//         return `data:image/png;base64,${base64}`;
//       } catch (e2) {
//         console.warn('[StaticMap] downloadAsync failed:', e2);
//         return '';
//       }
//     }
//   }

//   function buildStaticMapURL(
//     points: { lat: number; lng: number }[],
//     start?: { latitude: number; longitude: number },
//     end?: { latitude: number; longitude: number }
//   ) {
//     const KEY = GOOGLE_STATIC_MAPS_KEY?.trim();
//     if (!KEY) return '';

//     const size = '690x220'; // fits the card
//     const markers: string[] = [];
//     if (start) markers.push(`markers=color:green|${start.latitude},${start.longitude}`);
//     if (end) markers.push(`markers=color:red|${end.latitude},${end.longitude}`);

//     const base = `https://maps.googleapis.com/maps/api/staticmap?scale=2&format=png&size=${size}&maptype=roadmap`;

//     if (points && points.length >= 2) {
//       const maxPts = 80;
//       let sampled = points;
//       if (points.length > maxPts) {
//         sampled = [];
//         for (let i = 0; i < maxPts; i++) {
//           const idx = Math.round((i / (maxPts - 1)) * (points.length - 1));
//           sampled.push(points[idx]);
//         }
//       }
//       const path = sampled.map((p) => `${p.lat},${p.lng}`).join('|');
//       return `${base}&path=color:0x2563eb|weight:3|${encodeURIComponent(path)}&${markers.join('&')}&key=${KEY}`;
//     }

//     if (start && end) {
//       const se = `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`;
//       const centerLat = (start.latitude + end.latitude) / 2;
//       const centerLng = (start.longitude + end.longitude) / 2;
//       return `${base}&center=${centerLat},${centerLng}&zoom=8&path=color:0x2563eb|weight:3|${encodeURIComponent(
//         se
//       )}&${markers.join('&')}&key=${KEY}`;
//     }

//     if (start || end) {
//       const c = start ?? end!;
//       return `${base}&center=${c.latitude},${c.longitude}&zoom=9&${markers.join('&')}&key=${KEY}`;
//     }

//     return '';
//   }

//   /** INLINE SVG FALLBACK with background + dashed Start→End */
//   function buildInlineMiniMap(_points: { lat: number; lng: number }[], start?: any, end?: any) {
//     if (!start || !end) {
//       return `<div style="height:220px;display:flex;align-items:center;justify-content:center;color:#6b7280;border:1px solid #e5e7eb;border-radius:10px">Path preview unavailable</div>`;
//     }

//     const s = start, e = end;
//     const W = 690, H = 220, PAD = 14;

//     let minLat = Math.min(s.latitude, e.latitude);
//     let maxLat = Math.max(s.latitude, e.latitude);
//     let minLng = Math.min(s.longitude, e.longitude);
//     let maxLng = Math.max(s.longitude, e.longitude);

//     const padDeg = 0.08 * Math.max(maxLat - minLat, maxLng - minLng, 0.01);
//     minLat -= padDeg; maxLat += padDeg; minLng -= padDeg; maxLng += padDeg;

//     const w = W - 2 * PAD;
//     const h = H - 2 * PAD;
//     const latRange = Math.max(1e-6, maxLat - minLat);
//     const lngRange = Math.max(1e-6, maxLng - minLng);
//     const x = (lng: number) => PAD + ((lng - minLng) / lngRange) * w;
//     const y = (lat: number) => PAD + (1 - (lat - minLat) / latRange) * h;

//     const x1 = x(s.longitude).toFixed(1);
//     const y1 = y(s.latitude).toFixed(1);
//     const x2 = x(e.longitude).toFixed(1);
//     const y2 = y(e.latitude).toFixed(1);

//     const gridCount = 9;
//     const verticalLines = Array.from({ length: gridCount + 1 }, (_, i) => {
//       const xx = PAD + (i / gridCount) * w;
//       return `<line x1="${xx.toFixed(1)}" y1="${PAD}" x2="${xx.toFixed(1)}" y2="${(PAD + h).toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
//     }).join('');
//     const horizontalLines = Array.from({ length: gridCount + 1 }, (_, i) => {
//       const yy = PAD + (i / gridCount) * h;
//       return `<line x1="${PAD}" y1="${yy.toFixed(1)}" x2="${(PAD + w).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
//     }).join('');

//     if (Math.abs(+x1 - +x2) < 0.1 && Math.abs(+y1 - +y2) < 0.1) {
//       return `
//         <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
//           <defs>
//             <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0%" stop-color="#eef2ff"/>
//               <stop offset="100%" stop-color="#ffffff"/>
//             </linearGradient>
//           </defs>
//           <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
//           ${verticalLines}
//           ${horizontalLines}
//           <circle cx="${x1}" cy="${y1}" r="5" fill="#2563eb"/>
//         </svg>
//       `;
//     }

//     const labelOffset = 8;
//     const startLabelX = Math.max(PAD + 4, +x1 - 36);
//     const startLabelY = Math.max(PAD + 10, +y1 - labelOffset);
//     const endLabelX = Math.min(PAD + w - 4, +x2 + 36);
//     const endLabelY = Math.max(PAD + 10, +y2 - labelOffset);

//     return `
//       <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
//         <defs>
//           <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="0%" stop-color="#eef2ff"/>
//             <stop offset="100%" stop-color="#ffffff"/>
//           </linearGradient>
//         </defs>
//         <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
//         ${verticalLines}
//         ${horizontalLines}
//         <path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 6"/>
//         <circle cx="${x1}" cy="${y1}" r="4" fill="#16a34a"/>
//         <circle cx="${x2}" cy="${y2}" r="4" fill="#ef4444"/>
//         <text x="${startLabelX}" y="${startLabelY}" font-size="10" fill="#16a34a" text-anchor="end" font-weight="700">Start</text>
//         <text x="${endLabelX}" y="${endLabelY}" font-size="10" fill="#ef4444" text-anchor="start" font-weight="700">End</text>
//       </svg>
//     `;
//   }

//   // ---------- PDF generator ----------
//   const generatePDF = async () => {
//     setGeneratingPDF(true);
//     try {
//       // 1) Capture your existing on-screen chart as PNG (base64)
//       let chartImgTag = '';
//       try {
//         // let UI settle
//         await new Promise((r) => setTimeout(r, 120));

//         if (chartRef.current) {
//           const base64 = await captureRef(chartRef.current, {
//             result: 'base64',
//             format: 'png',
//             quality: 1,
//             pixelRatio: 2,            // crisp in PDF
//           });
//           if (base64 && typeof base64 === 'string') {
//             chartImgTag = `<img src="data:image/png;base64,${base64}" alt="chart" style="width:100%;height:300px;border-radius:8px;border:1px solid #e5e7eb;object-fit:contain;background:#fff"/>`;
//           }
//         }
//       } catch (e) {
//         console.warn('Chart capture failed:', e);
//         chartImgTag = `<div style="height:300px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280">Chart preview unavailable</div>`;
//       }

//       // 2) Map: Static → base64; else inline dashed Start→End with background
//       const latlngs = packets
//         .filter((p) => p.latitude != null && p.longitude != null)
//         .map((p) => ({ lat: p.latitude as number, lng: p.longitude as number }));

//       const url = buildStaticMapURL(latlngs, trip?.startLocation, trip?.endLocation);
//       let mapBlock = '';
//       if (url) {
//         const dataURL = await toDataURL(url);
//         mapBlock = dataURL
//           ? `<img src="${dataURL}" alt="map" style="width:100%;height:220px;border-radius:10px;border:1px solid #e5e7eb;object-fit:cover"/>`
//           : buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//       } else {
//         mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//       }

//       // 3) AUTO PAGINATION (unchanged)
//       const ROWS_PER_TABLE_PAGE = 18;
//       const chunk = <T,>(arr: T[], size: number): T[][] => {
//         const out: T[][] = [];
//         for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
//         return out;
//       };

//       const tableChunks = chunk(packets, ROWS_PER_TABLE_PAGE);
//       const extraChunks = tableChunks.slice(1);
//       const totalPages = 2 + Math.max(0, tableChunks.length - 1);

//       const renderTableRows = (rows: DataPacket[], startIndex: number) =>
//         rows
//           .map((p, i) => {
//             const idx = startIndex + i + 1;
//             const humBad =
//               thresholds && (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax);
//             return `
//               <tr>
//                 <td class="c t">${pad2(idx)}</td>
//                 <td class="c">${p.temperature?.toFixed(0) ?? '—'}</td>
//                 <td class="c ${humBad ? 'bad' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
//                 <td class="c">${p.latitude?.toFixed(6) ?? '—'}</td>
//                 <td class="c">${p.longitude?.toFixed(6) ?? '—'}</td>
//                 <td class="c">${p.movement ?? (i % 3 === 0 ? 'Moving' : 'Idle')}</td>
//                 <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
//                 <td class="c">${fmtIST(p.time)}</td>
//               </tr>
//             `;
//           })
//           .join('');

//       const page2Rows = tableChunks.length ? renderTableRows(tableChunks[0], 0) : '';

//       const extraTablePagesHTML = extraChunks
//         .map((rows, idx) => {
//           const pageNo = 3 + idx;
//           const startIndex = ROWS_PER_TABLE_PAGE * (idx + 1);
//           const isLast = idx === extraChunks.length - 1;

//           return `
//   <div class="pb"></div>
//   <div>
//     <div style="font-weight:800;color:#0f172a;font-size:13px;margin:8px 0 6px">Report Summary (continued)</div>
//     <table>
//       <thead>
//         <tr>
//           <th>Sl No</th>
//           <th>Temp °C</th>
//           <th>Hum %RH</th>
//           <th>Latitude</th>
//           <th>Longitude</th>
//           <th>Movement</th>
//           <th>Battery</th>
//           <th>Timestamp (IST)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${renderTableRows(rows, startIndex)}
//       </tbody>
//     </table>
//     ${
//       isLast
//         ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px">
//             This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
//             conditions during the specified interval and does not guarantee consignment quality. GND Solutions
//             assumes no liability for consequential damage, data loss, or other consequences arising from reliance
//             on this report. All actions based on this report are the sole responsibility of the recipient.
//           </div>`
//         : ''
//     }
//     <div class="footer"><div>fresh.thinxfresh.com</div><div>Page ${pageNo}/${totalPages}</div></div>
//   </div>`;
//         })
//         .join('');

//       const nowStr = new Date().toLocaleString('en-GB', {
//         timeZone: 'Asia/Kolkata',
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//       });

//       const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4; margin: 12mm; }
//   body { font-family: Arial, Helvetica, sans-serif; color:#111827; }
//   .pill { padding:2px 8px; border:1px solid #d1d5db; border-radius:999px; font-size:11px; font-weight:700; margin-right:6px; }
//   .ok { background:#dcfce7; border-color:#86efac; }
//   .bad { color:#dc2626; font-weight:700; }
//   .card { border:1px solid #e5e7eb; border-radius:10px; padding:12px; margin-bottom:12px; }
//   .title { font-weight:800; color:#0f172a; font-size:13px; border-bottom:2px solid #60a5fa; padding-bottom:6px; margin-bottom:8px; }
//   .kv { display:grid; grid-template-columns: 140px 1fr; row-gap:6px; column-gap:10px; font-size:12px; }
//   .kv div:nth-child(2n) { color:#111827; }
//   .meta { font-size:11px; color:#6b7280; }
//   .analytics { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
//   .a { border:1px solid #e5e7eb; border-radius:10px; padding:10px; text-align:center; }
//   .anum { font-size:22px; font-weight:800; }
//   .acap { font-size:11px; color:#6b7280; }
//   table { width:100%; border-collapse:collapse; }
//   th, td { border:1px solid #e5e7eb; padding:8px; font-size:11px; }
//   th { background:#e9f1ff; color:#0f172a; font-weight:700; }
//   td.c { text-align:center; }
//   td.t { font-weight:700; }
//   .footer { display:flex; justify-content:space-between; font-size:10px; color:#6b7280; margin-top:6px; }
//   .pb { page-break-after: always; }
// </style>
// </head>
// <body>

//   <!-- ================ PAGE 1 ================ -->
//   <div>
//     <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
//       <div style="display:flex;gap:14px;align-items:center;">
//         <div style="font-weight:900;font-size:18px;color:#1e40af">GND SOLUTIONS®</div>
//         <div>
//           <div style="font-weight:800;font-size:16px;">Insights &amp; Summary Report</div>
//           <div class="meta">Report Generated On: ${nowStr}</div>
//         </div>
//       </div>
//       <div style="display:flex;align-items:center;gap:12px;">
//         <div>
//           <div class="meta" style="margin-bottom:4px;">Quality of Process:</div>
//           <div>
//             <span class="pill ${qopBucket==='> 98' ? 'ok':''}">&gt; 98</span>
//             <span class="pill ${qopBucket==='> 90' ? 'ok':''}">&gt; 90</span>
//             <span class="pill ${qopBucket==='> 80' ? 'ok':''}">&gt; 80</span>
//             <span class="pill ${qopBucket==='> 70' ? 'ok':''}">&gt; 70</span>
//             <span class="pill ${qopBucket==='< 70' ? 'bad':''}">&lt; 70</span>
//           </div>
//         </div>
//         <div style="border:2px solid #10b981;color:#10b981;font-weight:800;border-radius:40px;padding:8px 12px;font-size:12px">
//           RESULT: ${qopPercent >= 90 ? 'ACCEPT' : qopPercent >= 80 ? 'REVIEW' : 'REJECT'}
//         </div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Sensor Information</div>
//       <div class="kv">
//         <div>Model No</div><div>: ${trip?.modelNo ?? '—'}</div>
//         <div>Part No</div><div>: ${trip?.partNo ?? trip?.deviceid ?? trip?.deviceID ?? '—'}</div>
//         <div>Sensor Accuracy</div><div>: ± 0.3°C, ± 1.5 %RH</div>
//         <div>Serial No</div><div>: ${trip?.serialNo ?? '—'}</div>
//         <div>Calibration</div><div>: Valid</div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Trip Information</div>
//       <div class="kv">
//         <div>Trip Name</div><div>: ${trip?.tripName ?? '—'}</div>
//         <div>Managed By</div><div>: ${trip?.managedBy ?? '—'}</div>
//         <div>Source</div><div>: ${trip?.source ?? '—'}</div>
//         <div>Destination</div><div>: ${trip?.destination ?? '—'}</div>
//         <div>Started On</div><div>: ${packets.length ? fmtIST(trip?.startTime ?? packets[0].time) : '—'}</div>
//         <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length-1].time) : '—'}</div>
//       </div>
//     </div>

//     <div style="display:flex;gap:12px;">
//       <div class="card" style="flex:1">
//         <div class="title">Thresholds</div>
//         <div class="kv">
//           <div>Temperature</div><div>: ${thresholds ? `${thresholds.tempMin}°C min   ${thresholds.tempMax}°C max` : '—'}</div>
//           <div>Humidity</div><div>: ${thresholds ? `${thresholds.humMin} %RH min   ${thresholds.humMax} %RH max` : '—'}</div>
//           <div>Sampling Interval</div><div>: ${thresholds?.samplingMinutes ?? 1} minutes</div>
//           <div>Reporting Interval</div><div>: ${thresholds?.reportingMinutes ?? 60} minutes</div>
//         </div>
//       </div>

//       <div class="card" style="flex:1">
//         <div class="title">Analytics</div>
//         <div class="analytics">
//           <div class="a">
//             <div class="anum">${packets.length}</div>
//             <div class="acap">Total Samples</div>
//           </div>
//           <div class="a">
//             <div class="anum">${pad2(outOfRangeTemp)}</div>
//             <div class="acap">Temp samples in alert</div>
//           </div>
//           <div class="a">
//             <div class="anum">${pad2(outOfRangeHum)}</div>
//             <div class="acap">Humidity samples in alert</div>
//           </div>
//           <div class="a">
//             <div class="anum">${durationStr.replace(' ', '<br/>')}</div>
//             <div class="acap">Trip Duration</div>
//           </div>
//         </div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
//       ${mapBlock}
//     </div>

//     <div class="footer"><div>fresh.thinxfresh.com</div><div>Page 1/${totalPages}</div></div>
//   </div>
//   <div class="pb"></div>

//   <!-- ================ PAGE 2 ================ -->
//   <div>
//     <div class="card">
//       <div class="title">Graphs</div>
//       <div style="display:flex;justify-content:center">${chartImgTag}</div>
//       <div style="display:flex;gap:18px;font-size:11px;color:#475467;margin-top:6px">
//         <span><i style="display:inline-block;width:26px;height:4px;background:#3B82F6;margin-right:6px;border-radius:2px"></i>Temperature (°C)</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#22C55E;margin-right:6px;border-radius:2px"></i>Humidity (%RH)</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temp Limits</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humid Limits</span>
//       </div>
//     </div>

//     <div style="font-weight:800;color:#0f172a;font-size:13px;margin:8px 0 6px">Report Summary</div>
//     <table>
//       <thead>
//         <tr>
//           <th>Sl No</th>
//           <th>Temp °C</th>
//           <th>Hum %RH</th>
//           <th>Latitude</th>
//           <th>Longitude</th>
//           <th>Movement</th>
//           <th>Battery</th>
//           <th>Timestamp (IST)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${page2Rows}
//       </tbody>
//     </table>

//     ${tableChunks.length <= 1
//       ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px">
//            This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
//            conditions during the specified interval and does not guarantee consignment quality. GND Solutions
//            assumes no liability for consequential damage, data loss, or other consequences arising from reliance
//            on this report. All actions based on this report are the sole responsibility of the recipient.
//          </div>`
//       : ''}

//     <div class="footer"><div>fresh.thinxfresh.com</div><div>Page 2/${totalPages}</div></div>
//   </div>

//   ${extraTablePagesHTML}

// </body>
// </html>
//       `;

//       const { uri } = await Print.printToFileAsync({ html });
//       await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
//     } catch (error) {
//       console.error(error);
//       Alert.alert('Error', 'Failed to generate PDF');
//     } finally {
//       setGeneratingPDF(false);
//     }
//   };

//   // ======== Screen UI (unchanged) ========
//   if (loading) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color="#1976D2" />
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (!trip) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-1 items-center justify-center">
//           <Text className="text-gray-500">Trip not found</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const samplingMinutes =
//     thresholds?.samplingMinutes ??
//     (packets.length > 1 ? Math.round((packets[1].time - packets[0].time) / 60) : 1);

//   return (
//     <SafeAreaView className="flex-1 bg-gray-50">
//       {/* Header */}
//       <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
//         <Pressable
//           className="h-10 w-10 items-center justify-center"
//           onPress={() => router.back()}
//           accessibilityRole="button"
//           accessibilityLabel="Back">
//           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//         </Pressable>
//         <Text className="text-lg font-semibold text-black">Trip Details</Text>
//         <View className="w-10" />
//       </View>

//       {/* Trip Info */}
//       <View className="border-b border-gray-200 bg-white p-4">
//         <Text className="mb-1 text-xl font-bold text-gray-800">
//           {trip.tripName || 'Unnamed Trip'}
//         </Text>
//         <View className="mt-2 flex-row items-center">
//           <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">
//             Device: {trip.deviceid || trip.deviceID || trip.deviceName}
//           </Text>
//         </View>
//         {trip.tripConfig?.customerProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="account" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">
//               {trip.tripConfig.customerProfile.profileName}
//             </Text>
//           </View>
//         )}
//         {trip.tripConfig?.boxProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">
//               {trip.tripConfig.boxProfile.profileName}
//             </Text>
//           </View>
//         )}

//         <View className="mt-1 flex-row items-center">
//           <MaterialCommunityIcons name="alarm" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">
//             Sampling Interval: {samplingMinutes} minutes
//           </Text>
//         </View>

//         {packets.length > 0 && (
//           <>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">
//                 Start: {formatTimestamp(trip.startTime || packets[0].time)}
//               </Text>
//             </View>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">
//                 End: {formatTimestamp(trip.endTime || packets[packets.length - 1].time)}
//               </Text>
//             </View>
//           </>
//         )}

//         {/* Thresholds */}
//         {thresholds && (
//           <View className="mt-3 rounded-lg bg-gray-100 p-3">
//             <View className="flex-row justify-around">
//               <View className="items-center">
//                 <Text className="text-xs text-gray-500">Temp Range</Text>
//                 <Text className="text-sm font-semibold text-gray-700">
//                   {thresholds.tempMin}° - {thresholds.tempMax}°C
//                 </Text>
//               </View>
//               <View className="items-center">
//                 <Text className="text-xs text-gray-500">Humidity Range</Text>
//                 <Text className="text-sm font-semibold text-gray-700">
//                   {thresholds.humMin}% - {thresholds.humMax}%
//                 </Text>
//               </View>
//             </View>
//           </View>
//         )}
//       </View>

//       {/* Graph - Scrollable */}
//       <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
//         <Text className="mb-3 text-sm font-semibold text-gray-700">
//           Trip Overview ({packets.length} records)
//         </Text>

//         {packets.length === 0 ? (
//           <View className="flex-1 items-center justify-center">
//             <Text className="text-gray-400">Please stop trip to view data</Text>
//           </View>
//         ) : (
//           <>
//             <View className="mb-4">
//               <View ref={chartRef} collapsable={false} className="rounded-2xl bg-white p-2">
//                 <DynamicLineChart
//                   packets={packets}
//                   thresholds={thresholds ?? undefined}
//                   width={Dimensions.get('window').width - 32}
//                   height={220}
//                 />
//               </View>

//               <View className="mt-3 items-center">
//                 <View className="mb-2 w-full flex-row justify-between px-8">
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-blue-500" />
//                     <Text className="text-xs text-gray-600">Temperature</Text>
//                   </View>
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-red-500" />
//                     <Text className="text-xs text-gray-600">Temp Limits</Text>
//                   </View>
//                 </View>
//                 <View className="w-full flex-row justify-between px-8">
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-green-500" />
//                     <Text className="text-xs text-gray-600">Humidity</Text>
//                   </View>
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-orange-500" />
//                     <Text className="text-xs text-gray-600">Humid Limits</Text>
//                   </View>
//                 </View>
//               </View>
//             </View>

//             {/* Buttons */}
//             <View className="mb-4 flex-row items-center justify-center gap-3">
//               <TouchableOpacity
//                 onPress={() => router.push({ pathname: '/trip-records', params: { tripName } })}
//                 className="rounded-lg border-2 border-blue-600 px-6 py-3">
//                 <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>
//                   View Records
//                 </Text>
//               </TouchableOpacity>
//               {trip.startLocation && trip.endLocation && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     const url = `https://www.google.com/maps/dir/?api=1&origin=${trip.startLocation.latitude},${trip.startLocation.longitude}&destination=${trip.endLocation.latitude},${trip.endLocation.longitude}`;
//                     Linking.openURL(url).catch(() =>
//                       Alert.alert('Error', 'Unable to open Google Maps')
//                     );
//                   }}
//                   className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
//                   <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
//                   <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>
//                     View Path
//                   </Text>
//                 </TouchableOpacity>
//               )}
//               <TouchableOpacity
//                 onPress={generatePDF}
//                 disabled={generatingPDF}
//                 className={`flex-row items-center rounded-lg border-2 px-4 py-3 ${generatingPDF ? 'border-gray-400 bg-gray-100' : 'border-blue-600'}`}>
//                 {generatingPDF ? (
//                   <ActivityIndicator size="small" color="#666" />
//                 ) : (
//                   <MaterialCommunityIcons name="download" size={20} color="#1976D2" />
//                 )}
//                 <Text
//                   className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`}
//                   numberOfLines={1}>
//                   {generatingPDF ? 'Loading...' : 'PDF'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
// app/trip-detail.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTripDetails } from '../services/RestApiServices/HistoryService';
import DynamicLineChart from '../components/DynamicLineChart';

type DataPacket = {
  time: number;
  temperature: number;
  humidity: number;
  latitude?: number;
  longitude?: number;
  movement?: string;
  battery?: number;
};

const GOOGLE_STATIC_MAPS_KEY = 'AIzaSyDsqWho-EyUaPIe2Sxp8X2tw4x7SCLOW-A';

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const fmtIST = (unix: number) =>
  new Date(unix * 1000).toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TripDetail() {
  const router = useRouter();
  const { tripName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [apiTrip, setApiTrip] = useState<any>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const chartRef = useRef<View | null>(null);

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!tripName) {
        setLoading(false);
        return;
      }

      // ===== TEST DATA (remove if not needed) =====
      if (tripName === 'TEST_TRIP_200') {
        const now = Math.floor(Date.now() / 1000);
        const fakeRecords = Array.from({ length: 42 }, (_, i) => ({
          Timestamp: String(now - (42 - i) * 600),
          Temperature: String(22 + Math.sin(i / 3) * 4 + (i % 9 === 4 ? 6 : 0)),
          Humidity: String(34 + Math.cos(i / 2) * 6 + (i === 30 ? 20 : 0)),
          Latitude: String(13.02 + i * 0.02),
          Longitude: String(77.62 + i * 0.015),
          Movement: i % 4 === 0 ? 'Moving' : 'Idle',
          Battery: String(100 - i),
        }));
        setApiTrip({
          tripInfo: {
            tripName: 'Pharma Trip 1',
            deviceid: 'TF6 Prime',
            deviceID: 'TF6-PRIME',
            serialNo: 'TF6000038',
            modelNo: 'GTRAC6S66',
            partNo: 'TF6 Prime',
            startTime: Number(fakeRecords[0].Timestamp),
            endTime: Number(fakeRecords[fakeRecords.length - 1].Timestamp),
            startLocation: { latitude: 25.205, longitude: 55.271 },
            endLocation: { latitude: 25.1, longitude: 55.21 },
            managedBy: 'Rohit Sharma',
            source: 'Pune, Maharashtra (Warehouse A)',
            destination: 'Hyderabad, Telangana (Pharma Hub)',
            tripConfig: {
              customerProfile: { profileName: 'Thinxfresh' },
              boxProfile: {
                profileName: 'Pharma Box',
                minTemp: 18,
                maxTemp: 26,
                minHum: 30,
                maxHum: 60,
                samplingMinutes: 10,
                reportingMinutes: 60,
              },
            },
          },
          records: fakeRecords,
        });
        setLoading(false);
        return;
      }
      // ============================================

      const result = await getTripDetails(String(tripName));
      if (result?.success && result?.data) setApiTrip(result.data);
      setLoading(false);
    };

    fetchTripDetails();
  }, [tripName]);

  const trip = apiTrip?.tripInfo;

  const packets: DataPacket[] = useMemo(() => {
    if (apiTrip?.records) {
      return apiTrip.records.map((r: any) => ({
        time: parseInt(r.Timestamp),
        temperature: parseFloat(r.Temperature),
        humidity: parseFloat(r.Humidity),
        latitude: r.Latitude ? parseFloat(r.Latitude) : undefined,
        longitude: r.Longitude ? parseFloat(r.Longitude) : undefined,
        movement: r.Movement,
        battery: r.Battery ? parseFloat(r.Battery) : undefined,
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
      samplingMinutes: profile.samplingMinutes ?? undefined,
      reportingMinutes: profile.reportingMinutes ?? undefined,
    };
  }, [trip]);

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

  // ---------- Analytics ----------
  const outOfRangeTemp = useMemo(() => {
    if (!thresholds) return 0;
    return packets.reduce(
      (acc, p) => acc + (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax ? 1 : 0),
      0
    );
  }, [packets, thresholds]);

  const outOfRangeHum = useMemo(() => {
    if (!thresholds) return 0;
    return packets.reduce(
      (acc, p) => acc + (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax ? 1 : 0),
      0
    );
  }, [packets, thresholds]);

  const durationStr = useMemo(() => {
    if (!packets.length) return '-';
    const start = trip?.startTime ?? packets[0].time;
    const end = trip?.endTime ?? packets[packets.length - 1].time;
    const minutes = Math.max(0, Math.round((end - start) / 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} Hrs ${m} min`;
  }, [packets, trip]);

  const qopPercent = useMemo(() => {
    if (!packets.length || !thresholds) return 100;
    const ok = packets.filter(
      (p) =>
        p.temperature >= thresholds.tempMin &&
        p.temperature <= thresholds.tempMax &&
        p.humidity >= thresholds.humMin &&
        p.humidity <= thresholds.humMax
    ).length;
    return Math.round((ok / packets.length) * 100);
  }, [packets, thresholds]);

  const qopBucket = useMemo(() => {
    if (qopPercent >= 98) return '> 98';
    if (qopPercent >= 90) return '> 90';
    if (qopPercent >= 80) return '> 80';
    if (qopPercent >= 70) return '> 70';
    return '< 70';
  }, [qopPercent]);

  // ---------- Helpers for PDF ----------
  async function toDataURL(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        await res.text().catch(() => null);
        return '';
      }
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch {
      try {
        const file = FileSystem.cacheDirectory + 'static-map.png';
        const dl: any = await FileSystem.downloadAsync(url, file);
        if (dl?.status && dl.status !== 200) return '';
        const base64 = await FileSystem.readAsStringAsync(dl.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/png;base64,${base64}`;
      } catch {
        return '';
      }
    }
  }

  function buildStaticMapURL(
    points: { lat: number; lng: number }[],
    start?: { latitude: number; longitude: number },
    end?: { latitude: number; longitude: number }
  ) {
    const KEY = GOOGLE_STATIC_MAPS_KEY?.trim();
    if (!KEY) return '';

    const size = '690x180'; // compact to keep map on Page 1
    const markers: string[] = [];
    if (start) markers.push(`markers=color:green|${start.latitude},${start.longitude}`);
    if (end) markers.push(`markers=color:red|${end.latitude},${end.longitude}`);

    const base = `https://maps.googleapis.com/maps/api/staticmap?scale=2&format=png&size=${size}&maptype=roadmap`;

    if (points && points.length >= 2) {
      const maxPts = 80;
      let sampled = points;
      if (points.length > maxPts) {
        sampled = [];
        for (let i = 0; i < maxPts; i++) {
          const idx = Math.round((i / (maxPts - 1)) * (points.length - 1));
          sampled.push(points[idx]);
        }
      }
      const path = sampled.map((p) => `${p.lat},${p.lng}`).join('|');
      return `${base}&path=color:0x2563eb|weight:3|${encodeURIComponent(path)}&${markers.join('&')}&key=${KEY}`;
    }

    if (start && end) {
      const se = `${start.latitude},${start.longitude}|${end.latitude},${end.longitude}`;
      const centerLat = (start.latitude + end.latitude) / 2;
      const centerLng = (start.longitude + end.longitude) / 2;
      return `${base}&center=${centerLat},${centerLng}&zoom=8&path=color:0x2563eb|weight:3|${encodeURIComponent(
        se
      )}&${markers.join('&')}&key=${KEY}`;
    }

    if (start || end) {
      const c = start ?? end!;
      return `${base}&center=${c.latitude},${c.longitude}&zoom=9&${markers.join('&')}&key=${KEY}`;
    }

    return '';
  }

  /** INLINE SVG FALLBACK (height 180) */
  function buildInlineMiniMap(_points: { lat: number; lng: number }[], start?: any, end?: any) {
    if (!start || !end) {
      return `<div style="height:180px;display:flex;align-items:center;justify-content:center;color:#6b7280;border:1px solid #e5e7eb;border-radius:10px">Path preview unavailable</div>`;
    }

    const s = start, e = end;
    const W = 690, H = 180, PAD = 12;

    let minLat = Math.min(s.latitude, e.latitude);
    let maxLat = Math.max(s.latitude, e.latitude);
    let minLng = Math.min(s.longitude, e.longitude);
    let maxLng = Math.max(s.longitude, e.longitude);

    const padDeg = 0.08 * Math.max(maxLat - minLat, maxLng - minLng, 0.01);
    minLat -= padDeg; maxLat += padDeg; minLng -= padDeg; maxLng += padDeg;

    const w = W - 2 * PAD;
    const h = H - 2 * PAD;
    const latRange = Math.max(1e-6, maxLat - minLat);
    const lngRange = Math.max(1e-6, maxLng - minLng);
    const x = (lng: number) => PAD + ((lng - minLng) / lngRange) * w;
    const y = (lat: number) => PAD + (1 - (lat - minLat) / latRange) * h;

    const x1 = x(s.longitude).toFixed(1);
    const y1 = y(s.latitude).toFixed(1);
    const x2 = x(e.longitude).toFixed(1);
    const y2 = y(e.latitude).toFixed(1);

    const gridCount = 8;
    const verticalLines = Array.from({ length: gridCount + 1 }, (_, i) => {
      const xx = PAD + (i / gridCount) * w;
      return `<line x1="${xx.toFixed(1)}" y1="${PAD}" x2="${xx.toFixed(1)}" y2="${(PAD + h).toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
    }).join('');
    const horizontalLines = Array.from({ length: gridCount + 1 }, (_, i) => {
      const yy = PAD + (i / gridCount) * h;
      return `<line x1="${PAD}" y1="${yy.toFixed(1)}" x2="${(PAD + w).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
    }).join('');

    return `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#eef2ff"/>
            <stop offset="100%" stop-color="#ffffff"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
        ${verticalLines}
        ${horizontalLines}
        <path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 6"/>
        <circle cx="${x1}" cy="${y1}" r="4" fill="#16a34a"/>
        <circle cx="${x2}" cy="${y2}" r="4" fill="#ef4444"/>
      </svg>
    `;
  }

  // ---------- PDF generator ----------
  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Capture existing chart as PNG (unchanged)
      let chartImgTag = '';
      try {
        await new Promise((r) => setTimeout(r, 120));
        if (chartRef.current) {
          const base64 = await captureRef(chartRef.current, {
            result: 'base64',
            format: 'png',
            quality: 1,
            pixelRatio: 2,
          });
          if (base64 && typeof base64 === 'string') {
            chartImgTag = `<img src="data:image/png;base64,${base64}" alt="chart" style="width:100%;height:300px;border-radius:8px;border:1px solid #e5e7eb;object-fit:contain;background:#fff"/>`;
          }
        }
      } catch {
        chartImgTag = `<div style="height:300px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280">Chart preview unavailable</div>`;
      }

      // Map block (compact height)
      const latlngs = packets
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({ lat: p.latitude as number, lng: p.longitude as number }));

      const url = buildStaticMapURL(latlngs, trip?.startLocation, trip?.endLocation);
      let mapBlock = '';
      if (url) {
        const dataURL = await toDataURL(url);
        mapBlock = dataURL
          ? `<img src="${dataURL}" alt="map" style="width:100%;height:180px;border-radius:10px;border:1px solid #e5e7eb;object-fit:cover"/>`
          : buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
      } else {
        mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
      }

      // Pagination helpers
      const ROWS_PER_TABLE_PAGE = 18;
      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      const tableChunks = chunk(packets, ROWS_PER_TABLE_PAGE);
      const extraChunks = tableChunks.slice(1);
      const totalPages = 2 + Math.max(0, tableChunks.length - 1);

      const renderTableRows = (rows: DataPacket[], startIndex: number) =>
        rows
          .map((p, i) => {
            const idx = startIndex + i + 1;
            const humBad =
              thresholds && (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax);
            return `
              <tr>
                <td class="c t">${pad2(idx)}</td>
                <td class="c">${p.temperature?.toFixed(0) ?? '—'}</td>
                <td class="c ${humBad ? 'bad' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
                <td class="c">${p.latitude?.toFixed(6) ?? '—'}</td>
                <td class="c">${p.longitude?.toFixed(6) ?? '—'}</td>
                <td class="c">${p.movement ?? (i % 3 === 0 ? 'Moving' : 'Idle')}</td>
                <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
                <td class="c">${fmtIST(p.time)}</td>
              </tr>
            `;
          })
          .join('');

      const page2Rows = tableChunks.length ? renderTableRows(tableChunks[0], 0) : '';

      const extraTablePagesHTML = extraChunks
        .map((rows, idx) => {
          const pageNo = 3 + idx;
          const startIndex = ROWS_PER_TABLE_PAGE * (idx + 1);
          const isLast = idx === extraChunks.length - 1;

          return `
  <div class="pb"></div>
  <div>
    <div style="font-weight:800;color:#0f172a;font-size:13px;margin:6px 0 6px">Report Summary (continued)</div>
    <table>
      <thead>
        <tr>
          <th>Sl No</th>
          <th>Temp °C</th>
          <th>Hum %RH</th>
          <th>Latitude</th>
          <th>Longitude</th>
          <th>Movement</th>
          <th>Battery</th>
          <th>Timestamp (IST)</th>
        </tr>
      </thead>
      <tbody>
        ${renderTableRows(rows, startIndex)}
      </tbody>
    </table>
    ${
      isLast
        ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px">
            This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
            conditions during the specified interval and does not guarantee consignment quality. GND Solutions
            assumes no liability for consequential damage, data loss, or other consequences arising from reliance
            on this report. All actions based on this report are the sole responsibility of the recipient.
          </div>`
        : ''
    }
    <div class="footer"><div>fresh.thinxfresh.com</div><div>Page ${pageNo}/${totalPages}</div></div>
  </div>`;
        })
        .join('');

      const nowStr = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111827; }

  /* Compact cards to keep MAP on page 1 */
  .card {
    border:1px solid #e5e7eb; border-radius:10px; padding:10px; margin-bottom:8px;
    break-inside: avoid; page-break-inside: avoid; -webkit-region-break-inside: avoid;
  }
  .title { font-weight:800; color:#0f172a; font-size:12px; border-bottom:1.5px solid #60a5fa; padding-bottom:5px; margin-bottom:6px; }
  .kv { display:grid; grid-template-columns: 130px 1fr; row-gap:4px; column-gap:8px; font-size:11px; }
  .kv div:nth-child(2n) { color:#111827; }
  .meta { font-size:10px; color:#6b7280; }
  .analytics { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
  .a { border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center; }
  .anum { font-size:18px; font-weight:800; }
  .acap { font-size:10px; color:#6b7280; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #e5e7eb; padding:7px; font-size:11px; }
  th { background:#e9f1ff; color:#0f172a; font-weight:700; }
  td.c { text-align:center; }
  td.t { font-weight:700; }
  .footer { display:flex; justify-content:space-between; font-size:10px; color:#6b7280; margin-top:6px; }
  .pb { page-break-after: always; }
  .pill { padding:2px 8px; border:1px solid #d1d5db; border-radius:999px; font-size:10px; font-weight:700; margin-right:6px; }
  .ok { background:#dcfce7; border-color:#86efac; }
  .bad { color:#dc2626; font-weight:700; }
</style>
</head>
<body>

  <!-- ================ PAGE 1 ================ -->
  <div>
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="font-weight:900;font-size:16px;color:#1e40af">GND SOLUTIONS®</div>
        <div>
          <div style="font-weight:800;font-size:15px;">Insights &amp; Summary Report</div>
          <div class="meta">Report Generated On: ${nowStr}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div>
          <div class="meta" style="margin-bottom:3px;">Quality of Process:</div>
          <div>
            <span class="pill ${qopBucket==='> 98' ? 'ok':''}">&gt; 98</span>
            <span class="pill ${qopBucket==='> 90' ? 'ok':''}">&gt; 90</span>
            <span class="pill ${qopBucket==='> 80' ? 'ok':''}">&gt; 80</span>
            <span class="pill ${qopBucket==='> 70' ? 'ok':''}">&gt; 70</span>
            <span class="pill ${qopBucket==='< 70' ? 'bad':''}">&lt; 70</span>
          </div>
        </div>
        <div style="border:2px solid #10b981;color:#10b981;font-weight:800;border-radius:40px;padding:6px 10px;font-size:11px">
          RESULT: ${qopPercent >= 90 ? 'ACCEPT' : qopPercent >= 80 ? 'REVIEW' : 'REJECT'}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="title">Sensor Information</div>
      <div class="kv">
        <div>Model No</div><div>: ${trip?.modelNo ?? '—'}</div>
        <div>Part No</div><div>: ${trip?.partNo ?? trip?.deviceid ?? trip?.deviceID ?? '—'}</div>
        <div>Sensor Accuracy</div><div>: ± 0.3°C, ± 1.5 %RH</div>
        <div>Serial No</div><div>: ${trip?.serialNo ?? '—'}</div>
        <div>Calibration</div><div>: Valid</div>
      </div>
    </div>

    <div class="card">
      <div class="title">Trip Information</div>
      <div class="kv">
        <div>Trip Name</div><div>: ${trip?.tripName ?? '—'}</div>
        <div>Managed By</div><div>: ${trip?.managedBy ?? '—'}</div>
        <div>Source</div><div>: ${trip?.source ?? '—'}</div>
        <div>Destination</div><div>: ${trip?.destination ?? '—'}</div>
        <div>Started On</div><div>: ${packets.length ? fmtIST(trip?.startTime ?? packets[0].time) : '—'}</div>
        <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length-1].time) : '—'}</div>
      </div>
    </div>

    <div class="card">
      <div class="title">Thresholds</div>
      <div class="kv">
        <div>Temperature</div><div>: ${thresholds ? `${thresholds.tempMin}°C min   ${thresholds.tempMax}°C max` : '—'}</div>
        <div>Humidity</div><div>: ${thresholds ? `${thresholds.humMin} %RH min   ${thresholds.humMax} %RH max` : '—'}</div>
        <div>Sampling Interval</div><div>: ${thresholds?.samplingMinutes ?? 1} minutes</div>
        <div>Reporting Interval</div><div>: ${thresholds?.reportingMinutes ?? 60} minutes</div>
      </div>
    </div>

    <!-- Analytics in its own box -->
    <div class="card">
      <div class="title">Analytics</div>
      <div class="analytics">
        <div class="a">
          <div class="anum">${packets.length}</div>
          <div class="acap">Total Samples</div>
        </div>
        <div class="a">
          <div class="anum">${pad2(outOfRangeTemp)}</div>
          <div class="acap">Temp samples in alert</div>
        </div>
        <div class="a">
          <div class="anum">${pad2(outOfRangeHum)}</div>
          <div class="acap">Humidity samples in alert</div>
        </div>
        <div class="a">
          <div class="anum">${durationStr.replace(' ', '<br/>')}</div>
          <div class="acap">Trip Duration</div>
        </div>
      </div>
    </div>

    <!-- Map kept on Page 1 by compact height -->
    <div class="card">
      <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
      ${mapBlock}
    </div>

    <div class="footer"><div>fresh.thinxfresh.com</div><div>Page 1/${totalPages}</div></div>
  </div>
  <div class="pb"></div>

  <!-- ================ PAGE 2 ================ -->
  <div>
    <div class="card">
      <div class="title">Graphs</div>
      <div style="display:flex;justify-content:center">${chartImgTag}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:#475467;margin-top:6px">
        <span><i style="display:inline-block;width:26px;height:4px;background:#3B82F6;margin-right:6px;border-radius:2px"></i>Temperature (°C)</span>
        <span><i style="display:inline-block;width:26px;height:4px;background:#22C55E;margin-right:6px;border-radius:2px"></i>Humidity (%RH)</span>
        <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temp Limits</span>
        <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humid Limits</span>
      </div>
    </div>

    <div style="font-weight:800;color:#0f172a;font-size:13px;margin:6px 0 6px">Report Summary</div>
    <table>
      <thead>
        <tr>
          <th>Sl No</th>
          <th>Temp °C</th>
          <th>Hum %RH</th>
          <th>Latitude</th>
          <th>Longitude</th>
          <th>Movement</th>
          <th>Battery</th>
          <th>Timestamp (IST)</th>
        </tr>
      </thead>
      <tbody>
        ${page2Rows}
      </tbody>
    </table>

    ${tableChunks.length <= 1
      ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px">
           This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
           conditions during the specified interval and does not guarantee consignment quality. GND Solutions
           assumes no liability for consequential damage, data loss, or other consequences arising from reliance
           on this report. All actions based on this report are the sole responsibility of the recipient.
         </div>`
      : ''}

    <div class="footer"><div>fresh.thinxfresh.com</div><div>Page 2/${totalPages}</div></div>
  </div>

  ${extraTablePagesHTML}

</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ======== Screen UI (unchanged) ========
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

  const samplingMinutes =
    thresholds?.samplingMinutes ??
    (packets.length > 1 ? Math.round((packets[1].time - packets[0].time) / 60) : 1);

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
          <Text className="ml-1 text-sm text-gray-600">
            Sampling Interval: {samplingMinutes} minutes
          </Text>
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
              <View ref={chartRef} collapsable={false} className="rounded-2xl bg-white p-2">
                <DynamicLineChart
                  packets={packets}
                  thresholds={thresholds ?? undefined}
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
                    <Text className="text-xs text-gray-600">Temp Limits</Text>
                  </View>
                </View>
                <View className="w-full flex-row justify-between px-8">
                  <View className="flex-1 flex-row items-center">
                    <View className="mr-2 h-3 w-8 bg-green-500" />
                    <Text className="text-xs text-gray-600">Humidity</Text>
                  </View>
                  <View className="flex-1 flex-row items-center">
                    <View className="mr-2 h-3 w-8 bg-orange-500" />
                    <Text className="text-xs text-gray-600">Humid Limits</Text>
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
