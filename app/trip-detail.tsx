// import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   Pressable,
//   ActivityIndicator,
//   TouchableOpacity,
//   Dimensions,
//   ScrollView,
//   Alert,
//   Animated,
//   Easing,
// } from 'react-native';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
// import { captureRef } from 'react-native-view-shot';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useFocusEffect } from '@react-navigation/native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { Buffer } from 'buffer'; // ← used only for URL→base64 (no expo-file-system)

// import { getTrips } from '../mmkv-storage/storage';
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

// const GOOGLE_STATIC_MAPS_KEY = 'AIzaSyDsqWho-EyUaPIe2Sxp8X2tw4x7SCLOW-A';

// /** ================== Brand / Badge config ================== **/
// const FOOTER_DOMAIN = 'log.thinxview.com';

// /** Plug YOUR hosted images here (PNG/JPG/SVG over HTTPS). */
// const LOGO_IMG_URL      = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152576/Group_17_dypt3x.png'; // e.g. 'https://cdn.example.com/brand/gnd-logo.png'
// const QOP_IMG_HIGH_URL  = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152475/Group_290108_twfkyd.png'; // show when qop >= 90
// const QOP_IMG_MED_URL   = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152476/Group_1597882844_1_ecln8w.png'; // show when 80 <= qop < 90
// const QOP_IMG_LOW_URL   = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152092/Group_1597882844_hisvca.png'; // show when qop < 80

// /** Force-embed images as data-URIs inside the PDF (most reliable). */
// const EMBED_IMAGES_AS_DATA_URI = true;

// /** Convert a remote image URL → data URI using fetch + Buffer. No expo-file-system. */
// async function urlToDataURI(url: string) {
//   try {
//     const res = await fetch(url);
//     if (!res.ok) return '';
//     const ab = await res.arrayBuffer();
//     const lower = url.split('?')[0].toLowerCase();
//     const mime = lower.endsWith('.svg')
//       ? 'image/svg+xml'
//       : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
//       ? 'image/jpeg'
//       : 'image/png';
//     const b64 = Buffer.from(ab).toString('base64');
//     return `data:${mime};base64,${b64}`;
//   } catch {
//     return '';
//   }
// }

// /** Build a tiny inline SVG fallback badge if no image URL was provided. */
// function buildBadgeSVG(label: string, fill: string, text: string) {
//   return `
//     <svg width="92" height="28" viewBox="0 0 92 28" xmlns="http://www.w3.org/2000/svg">
//       <rect x="0.5" y="0.5" width="91" height="27" rx="14" fill="${fill}" stroke="rgba(0,0,0,0.12)"/>
//       <text x="14" y="18" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#0b1220">${label}</text>
//       <text x="66" y="18" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#0b1220">${text}</text>
//     </svg>
//   `;
// }
// /** ========================================================== **/

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
//   const [error, setError] = useState<string | null>(null);
//   const [generatingPDF, setGeneratingPDF] = useState(false);
//   const chartRef = useRef(null);

//   // ===== Overlay animation =====
//   const barAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     if (generatingPDF) {
//       Animated.loop(
//         Animated.timing(barAnim, {
//           toValue: 1,
//           duration: 1200,
//           easing: Easing.linear,
//           useNativeDriver: true,
//         })
//       ).start();
//     } else {
//       barAnim.stopAnimation(() => barAnim.setValue(0));
//     }
//   }, [generatingPDF, barAnim]);
//   const translateX = barAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });

//   const fetchTripDetails = useCallback(
//     async (retryCount = 0) => {
//       setLoading(true);
//       setError(null);

//       if (!tripName) {
//         setError('No trip name provided');
//         setLoading(false);
//         return;
//       }

//       /* ======= TEST DATA (remove when wiring real API) ======= */
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
//                 minTemp: 18, maxTemp: 26, minHum: 30, maxHum: 60,
//                 samplingMinutes: 10, reportingMinutes: 60,
//               },
//             },
//             qopPercent: 92
//           },
//           records: fakeRecords,
//         });
//         setLoading(false);
//         return;
//       }
//       /* ======= END TEST ======= */

//       try {
//         const result = await getTripDetails(String(tripName));
//         if (result.success && result.data) {
//           setApiTrip(result.data);
//           setError(null);
//         } else {
//           const errorMsg = result.error || 'Failed to load trip data';
//           setError(errorMsg);
//           if (retryCount < 2) {
//             setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
//             return;
//           }
//         }
//       } catch (err: any) {
//         const errorMsg = err.message || 'Network error';
//         setError(errorMsg);
//         if (retryCount < 2) {
//           setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
//           return;
//         }
//       }
//       setLoading(false);
//     },
//     [tripName]
//   );

//   useFocusEffect(useCallback(() => { fetchTripDetails(0); }, [fetchTripDetails]));

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

//   const formatTimestamp = (unixTime: number) =>
//     new Date(unixTime * 1000).toLocaleString('en-US', {
//       month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
//     });

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

//   /** QoP: prefer API value if present */
//   const qopPercent = useMemo(() => {
//     const candidates = [
//       apiTrip?.qopPercent, apiTrip?.qop, apiTrip?.qopScore, apiTrip?.qualityOfProcess,
//       apiTrip?.tripInfo?.qopPercent, apiTrip?.tripInfo?.qop, apiTrip?.tripInfo?.qopScore, apiTrip?.tripInfo?.qualityOfProcess,
//     ];
//     const fromApi = candidates.map(v => (v == null ? undefined : Number(v))).find(n => Number.isFinite(n));
//     if (typeof fromApi === 'number') return Math.max(0, Math.min(100, Math.round(fromApi)));

//     if (!packets.length || !thresholds) return 100;
//     const ok = packets.filter(
//       p =>
//         p.temperature >= thresholds.tempMin &&
//         p.temperature <= thresholds.tempMax &&
//         p.humidity >= thresholds.humMin &&
//         p.humidity <= thresholds.humMax
//     ).length;
//     return Math.round((ok / packets.length) * 100);
//   }, [apiTrip, packets, thresholds]);

//   const durationStr = useMemo(() => {
//     if (!packets.length) return '-';
//     const start = trip?.startTime ?? packets[0].time;
//     const end = trip?.endTime ?? packets[packets.length - 1].time;
//     const minutes = Math.max(0, Math.round((end - start) / 60));
//     const h = Math.floor(minutes / 60);
//     const m = minutes % 60;
//     return `${h} Hrs ${m} min`;
//   }, [packets, trip]);

//   // ======= Map helpers (fallback SVG kept unchanged) =======
//   const TILE_SIZE = 256;
//   const clampLat = (lat: number) => Math.max(-85.05112878, Math.min(85.05112878, lat));
//   const lngToWorldX = (lng: number) => ((lng + 180) / 360) * TILE_SIZE;
//   const latToWorldY = (lat: number) => {
//     const s = Math.sin((clampLat(lat) * Math.PI) / 180);
//     const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
//     return y * TILE_SIZE;
//   };
//   function fitCenterZoom(
//     start: { latitude: number; longitude: number },
//     end: { latitude: number; longitude: number },
//     width: number, height: number, pad: number
//   ) {
//     const w0x = lngToWorldX(start.longitude), w0y = latToWorldY(start.latitude);
//     const w1x = lngToWorldX(end.longitude),   w1y = latToWorldY(end.latitude);
//     const dx0 = Math.abs(w1x - w0x) || 1e-9;
//     const dy0 = Math.abs(w1y - w0y) || 1e-9;
//     const zx = Math.log2((width - 2 * pad) / dx0);
//     const zy = Math.log2((height - 2 * pad) / dy0);
//     const zoom = Math.max(0, Math.min(21, Math.floor(Math.min(zx, zy))));
//     const centerLat = (start.latitude + end.latitude) / 2;
//     const centerLng = (start.longitude + end.longitude) / 2;
//     return { centerLat, centerLng, zoom };
//   }

//   function buildInlineMiniMap(_points: { lat: number; lng: number }[], start?: any, end?: any) {
//     if (!start || !end) {
//       return `<div style="height:320px;display:flex;align-items:center;justify-content:center;color:#6b7280;border:1px solid #e5e7eb;border-radius:10px">Path preview unavailable</div>`;
//     }
//     const s = start, e = end;
//     const W = 800, H = 300, PAD = 12;
//     let minLat = Math.min(s.latitude, e.latitude);
//     let maxLat = Math.max(s.latitude, e.latitude);
//     let minLng = Math.min(s.longitude, e.longitude);
//     let maxLng = Math.max(s.longitude, e.longitude);
//     const padDeg = 0.08 * Math.max(maxLat - minLat, maxLng - minLng, 0.01);
//     minLat -= padDeg; maxLat += padDeg; minLng -= padDeg; maxLng += padDeg;
//     const x = (lng: number) => PAD + ((lng - minLng) / Math.max(1e-6, maxLng - minLng)) * (W - 2*PAD);
//     const y = (lat: number) => PAD + (1 - (lat - minLat) / Math.max(1e-6, maxLat - minLat)) * (H - 2*PAD);

//     const x1 = x(s.longitude).toFixed(1), y1 = y(s.latitude).toFixed(1);
//     const x2 = x(e.longitude).toFixed(1), y2 = y(e.latitude).toFixed(1);

//     return `
//       <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
//         <rect x="0" y="0" width="${W}" height="${H}" fill="#eef2ff"/>
//         <path d="M ${x1} ${y1} Q ${(parseFloat(x1)+parseFloat(x2))/2} ${(Math.min(parseFloat(y1),parseFloat(y2))/2 - 60).toFixed(1)} ${x2} ${y2}"
//               fill="none" stroke="#1E3A8A" stroke-width="3" stroke-dasharray="8 6" stroke-linecap="round"/>
//         <circle cx="${x1}" cy="${y1}" r="4" fill="#428af5"/>
//         <circle cx="${x2}" cy="${y2}" r="4" fill="#ef4444"/>
//       </svg>
//     `;
//   }

//   // ---------- PDF generator ----------
//   const generatePDF = async () => {
//     setGeneratingPDF(true);
//     try {
//       // Chart snapshot (kept)
//       let chartImgTag = '';
//       try {
//         await new Promise((r) => setTimeout(r, 120));
//         if (chartRef.current) {
//           const base64 = await captureRef(chartRef.current, {
//             result: 'base64', format: 'png', quality: 1, pixelRatio: 2,
//           });
//           if (base64 && typeof base64 === 'string') {
//             chartImgTag = `<img src="data:image/png;base64,${base64}" alt="chart" style="width:100%;height:300px;border-radius:8px;border:1px solid #e5e7eb;object-fit:contain;background:#fff"/>`;
//           }
//         }
//       } catch {
//         chartImgTag = `<div style="height:300px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280">Chart preview unavailable</div>`;
//       }

//       // Map image (remote is fine; we keep as <img src="...">)
//       const latlngs = packets.filter(p => p.latitude!=null && p.longitude!=null)
//         .map(p => ({ lat: p.latitude as number, lng: p.longitude as number }));
//       let mapBlock = '';
//       try {
//         if (trip?.startLocation && trip?.endLocation) {
//           const W = 800, H = 300, PAD = 24;
//           const { centerLat, centerLng, zoom } = fitCenterZoom(trip.startLocation, trip.endLocation, W, H, PAD);
//           const KEY = GOOGLE_STATIC_MAPS_KEY?.trim();
//           const base = `https://maps.googleapis.com/maps/api/staticmap?scale=1&format=png&size=${W}x${H}&maptype=roadmap`;
//           const markers = [
//             `markers=color:blue|${trip.startLocation.latitude},${trip.startLocation.longitude}`,
//             `markers=color:red|${trip.endLocation.latitude},${trip.endLocation.longitude}`,
//           ].join('&');
//           const mapUrl = `${base}&center=${centerLat},${centerLng}&zoom=${zoom}&${markers}&key=${KEY}`;
//           mapBlock = `<img src="${mapUrl}" alt="map" style="width:${W}px;height:${H}px;max-width:100%;margin:0 auto;display:block;border-radius:10px;border:1px solid #e5e7eb"/>`;
//         } else {
//           mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//         }
//       } catch {
//         mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//       }

//       // ---------- Brand & QoP badges (ALWAYS show something) ----------
//       // Logo
//       let logoHtml = `<div style="font-weight:900;font-size:16px;color:#1e40af">GND SOLUTIONS®</div>`;
//       if (LOGO_IMG_URL) {
//         const logoSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(LOGO_IMG_URL) : LOGO_IMG_URL;
//         if (logoSrc) logoHtml = `<img src="${logoSrc}" alt="GND Solutions" style="height:22px;display:block"/>`;
//       }

//       // QoP badge URL selection
//       let badgeUrl = '';
//       if (qopPercent >= 90) badgeUrl = QOP_IMG_HIGH_URL;
//       else if (qopPercent >= 80) badgeUrl = QOP_IMG_MED_URL;
//       else badgeUrl = QOP_IMG_LOW_URL;

//       // If you set URLs, we embed them; else we draw a small SVG fallback per range
//       let qopBadgeHtml = '';
//       if (badgeUrl) {
//         const badgeSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(badgeUrl) : badgeUrl;
//         if (badgeSrc) qopBadgeHtml = `<img src="${badgeSrc}" alt="QoP Badge" style="height:28px;display:block"/>`;
//       }
//       if (!qopBadgeHtml) {
//         // Fallback colored pills
//         if (qopPercent >= 90) {
//           qopBadgeHtml = buildBadgeSVG('QoP', '#bbf7d0', '≥90');
//         } else if (qopPercent >= 80) {
//           qopBadgeHtml = buildBadgeSVG('QoP', '#fde68a', '≥80');
//         } else {
//           qopBadgeHtml = buildBadgeSVG('QoP', '#fecaca', '<80');
//         }
//       }

//       // ---------- Pagination helpers ----------
//       const PAGE2_ROWS = 21;
//       const OTHER_ROWS = 32;
//       const chunk = <T,>(arr: T[], size: number): T[][] => {
//         const out: T[][] = [];
//         for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
//         return out;
//       };
//       const page2Data = packets.slice(0, PAGE2_ROWS);
//       const otherData = packets.slice(PAGE2_ROWS);
//       const extraChunks = chunk(otherData, OTHER_ROWS);
//       const totalPages = 2 + extraChunks.length;

//       const renderTableRows = (rows: DataPacket[], startIndex: number) =>
//         rows
//           .map((p, i) => {
//             const idx = startIndex + i + 1;
//             const tempBad = thresholds && (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax);
//             const humBad  = thresholds && (p.humidity    < thresholds.humMin  || p.humidity    > thresholds.humMax);
//             return `
//               <tr>
//                 <td class="c t">${pad2(idx)}</td>
//                 <td class="c ${tempBad ? 'bad' : ''}">${p.temperature?.toFixed(0) ?? '—'}</td>
//                 <td class="c ${humBad ? 'bad' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
//                 <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
//                 <td class="c">${fmtIST(p.time)}</td>
//               </tr>
//             `;
//           })
//           .join('');

//       const page2Rows = renderTableRows(page2Data, 0);

//       const nowStr = new Date().toLocaleString('en-GB', {
//         timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
//       });

//       const footerHtml = (pageNo: number) => `
//         <div class="footerx">
//           <div class="left">
//             ${LOGO_IMG_URL ? `<img src="${EMBED_IMAGES_AS_DATA_URI ? '' : LOGO_IMG_URL}" alt="GND Solutions" style="height:16px;display:block"/>` : `<span style="font-weight:800;">GND SOLUTIONS®</span>`}
//           </div>
//           <div class="center">Page ${pageNo}/${totalPages}</div>
//           <div class="right">${FOOTER_DOMAIN}</div>
//         </div>
//       `;

//       const disclaimerBox = `
//         <div class="disc">
//           <div class="disc-title">Disclaimer</div>
//           <div class="disc-body">
//             This report is auto-generated by thinxview<sup>®</sup>, the IoT platform of GND Solutions, and is provided for informational purposes only based on sensor data at the time of generation. The Quality of Process (QoP) reflects sight conditions during the specified interval and does not guarantee cooling quality. GND Solutions assumes no liability for damage, data loss, or other consequences arising from reliance on this report, including events such as natural calamities, transit accidents, mishandling, negligence, misplacement, or unlawful use. All decisions or actions based on this report are the sole responsibility of the recipient.
//           </div>
//         </div>
//       `;

//       const extraTablePagesHTML = extraChunks
//         .map((rows, idx) => {
//           const pageNo = 3 + idx;
//           const startIndex = PAGE2_ROWS + OTHER_ROWS * idx;
//           const isLast = idx === extraChunks.length - 1;
//           return `
//   <div class="pb"></div>
//   <div>
//     <div class="h2">Report Summary (continued)</div>
//     <table>
//       <thead>
//         <tr>
//           <th>Sl No</th>
//           <th>Temp °C</th>
//           <th>Hum %RH</th>
//           <th>Battery</th>
//           <th>Timestamp (IST)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${renderTableRows(rows, startIndex)}
//       </tbody>
//     </table>

//     ${isLast ? `${disclaimerBox}` : ''}

//     ${footerHtml(pageNo)}
//   </div>`;
//         })
//         .join('');

//       const is98 = qopPercent >= 98;
//       const is90 = qopPercent >= 90 && qopPercent < 98;
//       const is80 = qopPercent >= 80 && qopPercent < 90;
//       const is70 = qopPercent >= 70 && qopPercent < 80;
//       const isLt70 = qopPercent < 70;

//       const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4; margin: 12mm; }
//   body { font-family: Arial, Helvetica, sans-serif; color:#111827; }
//   .card {
//     border:1px solid #e5e7eb; border-radius:10px; padding:10px; margin-bottom:8px;
//     break-inside: avoid; page-break-inside: avoid; -webkit-region-break-inside: avoid;
//   }
//   .title { font-weight:800; color:#0f172a; font-size:12px; border-bottom:1.5px solid #60a5fa; padding-bottom:5px; margin-bottom:6px; }
//   .kv { display:grid; grid-template-columns: 130px 1fr; row-gap:4px; column-gap:8px; font-size:11px; }
//   .kv div:nth-child(2n) { color:#111827; }
//   .meta { font-size:10px; color:#6b7280; }
//   .analytics { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
//   .a { border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center; }
//   .anum { font-size:18px; font-weight:800; }
//   .acap { font-size:10px; color:#6b7280; }

//   table { width:100%; border-collapse:collapse; }
//   th, td { border:1px solid #e5e7eb; padding:7px; font-size:11px; }
//   th { background:#e9f1ff; color:#0f172a; font-weight:700; }
//   td.c { text-align:center; }
//   td.t { font-weight:700; }
//   .h2 { font-weight:800; color:#0f172a; font-size:13px; margin:6px 0 6px; }

//   .footerx {
//     display:grid; grid-template-columns: 1fr auto 1fr; align-items:center;
//     font-size:10px; color:#6b7280; margin-top:8px;
//   }
//   .footerx .left { justify-self:start; }
//   .footerx .center { justify-self:center; font-weight:600; }
//   .footerx .right { justify-self:end; }

//   .pb { page-break-after: always; }

//   .pill { display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border:1px solid #d1d5db; border-radius:999px; font-size:10px; font-weight:700; margin-right:6px; color:#334155; }
//   .pill.selected { background:#dcfce7; border-color:#86efac; color:#065f46; }
//   .pill.bad { background:#fee2e2; border-color:#fecaca; color:#991b1b; }
//   .tick { font-weight:900; }

//   .disc {
//     border:1.5px solid #c7d2fe; border-radius:12px; padding:12px 14px; background:#f8fbff; color:#334155;
//     margin-top:10px;
//   }
//   .disc-title { font-weight:800; font-size:13px; color:#0f172a; margin-bottom:6px; }
//   .disc-body { font-size:11px; line-height:1.55; }
// </style>
// </head>
// <body>

//   <!-- ================ PAGE 1 ================ -->
//   <div>
//     <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
//       <div style="display:flex;gap:12px;align-items:center;">
//         ${logoHtml}
//         <div>
//           <div style="font-weight:800;font-size:15px;">Insights &amp; Summary Report</div>
//           <div class="meta">Report Generated On: ${nowStr}</div>
//           <div class="meta">QoP: <strong>${qopPercent}%</strong></div>
//         </div>
//       </div>

//       <div style="display:flex;align-items:center;gap:12px;">
//         ${qopBadgeHtml}
//         <div>
//           <div class="meta" style="margin-bottom:3px;">Quality of Process bands</div>
//           <div>
//             <span class="pill ${is98 ? 'selected' : ''}"><span class="tick">${is98 ? '✓' : ''}</span>&ge; 98</span>
//             <span class="pill ${is90 ? 'selected' : ''}"><span class="tick">${is90 ? '✓' : ''}</span>&ge; 90</span>
//             <span class="pill ${is80 ? 'selected' : ''}"><span class="tick">${is80 ? '✓' : ''}</span>&ge; 80</span>
//             <span class="pill ${is70 ? 'selected' : ''}"><span class="tick">${is70 ? '✓' : ''}</span>&ge; 70</span>
//             <span class="pill ${isLt70 ? 'bad selected' : 'bad'}"><span class="tick">${isLt70 ? '✓' : ''}</span>&lt; 70</span>
//           </div>
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
//         <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length - 1].time) : '—'}</div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Analytics</div>
//       <div class="analytics">
//         <div class="a">
//           <div class="anum">${packets.length}</div>
//           <div class="acap">Total Samples</div>
//         </div>
//         <div class="a">
//           <div class="anum">${pad2(outOfRangeTemp)}</div>
//           <div class="acap">Temp samples in alert</div>
//         </div>
//         <div class="a">
//           <div class="anum">${pad2(outOfRangeHum)}</div>
//           <div class="acap">Humidity samples in alert</div>
//         </div>
//         <div class="a">
//           <div class="anum">${durationStr}</div>
//           <div class="acap">Trip Duration</div>
//         </div>
//       </div>
//     </div>

//     <div class="card">
//       <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
//       ${mapBlock}
//     </div>

//     ${footerHtml(1)}
//   </div>
//   <div class="pb"></div>

//   <!-- ================ PAGE 2 ================ -->
//   <div>
//     <div class="card">
//       <div class="title">Graphs</div>
//       <div style="display:flex;justify-content:center">${chartImgTag}</div>
//       <div style="display:flex;gap:16px;font-size:11px;color:#475467;margin-top:6px">
//         <span><i style="display:inline-block;width:26px;height:4px;background:#3B82F6;margin-right:6px;border-radius:2px"></i>Temperature (°C)</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#22C55E;margin-right:6px;border-radius:2px"></i>Humidity (%RH)</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temperature Breach</span>
//         <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humidity Breach</span>
//       </div>
//     </div>

//     <div class="h2">Report Summary</div>
//     <table>
//       <thead>
//         <tr>
//           <th>Sl No</th>
//           <th>Temp °C</th>
//           <th>Hum %RH</th>
//           <th>Battery</th>
//           <th>Timestamp (IST)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${page2Rows}
//       </tbody>
//     </table>

//     ${extraChunks.length === 0 ? `${disclaimerBox}` : ''}

//     ${footerHtml(2)}
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

//   // ---------- UI ----------
//   if (loading) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color="#1976D2" />
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (!trip && !loading) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
//           <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
//             <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//           </Pressable>
//           <Text className="text-lg font-semibold text-black">Trip Details</Text>
//           <View className="w-10" />
//         </View>
//         <View className="flex-1 items-center justify-center px-8">
//           <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
//           <Text className="mt-4 text-center text-xl font-semibold text-gray-800">{error || 'Trip not found'}</Text>
//           <Text className="mt-2 text-center text-sm text-gray-500">
//             {error ? 'Unable to load trip data. Please check your connection.' : 'This trip does not exist or has been deleted.'}
//           </Text>
//           <TouchableOpacity onPress={() => fetchTripDetails(0)} className="mt-6 rounded-lg bg-blue-600 px-8 py-3">
//             <Text className="text-base font-semibold text-white">Retry</Text>
//           </TouchableOpacity>
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
//         <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
//           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//         </Pressable>
//         <Text className="text-lg font-semibold text-black">Trip Details</Text>
//         <View className="w-10" />
//       </View>

//       {/* Trip Info */}
//       <View className="border-b border-gray-200 bg-white p-4">
//         <Text className="mb-1 text-xl font-bold text-gray-800">{trip.tripName || 'Unnamed Trip'}</Text>
//         <View className="mt-2 flex-row items-center">
//           <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">Device: {trip.deviceid || trip.deviceID || trip.deviceName}</Text>
//         </View>
//         {trip.tripConfig?.customerProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="account" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">{trip.tripConfig.customerProfile.profileName}</Text>
//           </View>
//         )}
//         {trip.tripConfig?.boxProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">{trip.tripConfig.boxProfile.profileName}</Text>
//           </View>
//         )}
//         <View className="mt-1 flex-row items-center">
//           <MaterialCommunityIcons name="alarm" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">Sampling Interval: {samplingMinutes} minutes</Text>
//         </View>

//         {packets.length > 0 && (
//           <>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">Start: {formatTimestamp(trip.startTime || packets[0].time)}</Text>
//             </View>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">End: {formatTimestamp(trip.endTime || packets[packets.length - 1].time)}</Text>
//             </View>
//           </>
//         )}

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

//       {/* Graphs & actions */}
//       <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
//         <Text className="mb-3 text-sm font-semibold text-gray-700">Trip Overview ({packets.length} records)</Text>

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
//                     <Text className="text-xs text-gray-600">Temp Breach</Text>
//                   </View>
//                 </View>
//                 <View className="w-full flex-row justify-between px-8">
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-green-500" />
//                     <Text className="text-xs text-gray-600">Humidity</Text>
//                   </View>
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-orange-500" />
//                     <Text className="text-xs text-gray-600">Humid Breach</Text>
//                   </View>
//                 </View>
//               </View>
//             </View>

//             <View className="mb-4 flex-row items-center justify-center gap-3">
//               <TouchableOpacity
//                 onPress={() =>
//                   router.push({
//                     pathname: '/trip-records',
//                     params: { tripName: String(tripName ?? '') },
//                   })
//                 }
//                 className="rounded-lg border-2 border-blue-600 px-6 py-3">
//                 <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>View Records</Text>
//               </TouchableOpacity>

//               {trip.startLocation && trip.endLocation && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     router.push({
//                       pathname: '/trip-map',
//                       params: {
//                         startLat: String(trip.startLocation.latitude),
//                         startLng: String(trip.startLocation.longitude),
//                         endLat: String(trip.endLocation.latitude),
//                         endLng: String(trip.endLocation.longitude),
//                       },
//                     });
//                   }}
//                   className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
//                   <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
//                   <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>View Path</Text>
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
//                 <Text className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`} numberOfLines={1}>
//                   {generatingPDF ? 'Loading...' : 'PDF'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </>
//         )}
//       </ScrollView>

//       {/* Fullscreen overlay */}
//       {generatingPDF && (
//         <View
//           pointerEvents="auto"
//           style={{
//             position: 'absolute', zIndex: 9999, top: 0, left: 0, right: 0, bottom: 0,
//             backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center',
//           }}
//         >
//           <View
//             style={{
//               width: 280, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#0B1220',
//               borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', shadowColor: '#000', shadowOpacity: 0.3,
//               shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, alignItems: 'center',
//             }}
//           >
//             <ActivityIndicator size="large" color="#ffffff" />
//             <Text style={{ color: '#E5E7EB', marginTop: 12, fontWeight: '700' }}>Generating PDF…</Text>
//             <Text style={{ color: '#94A3B8', marginTop: 4, fontSize: 12, textAlign: 'center' }}>
//               Please keep the app open while your report is prepared.
//             </Text>
//             <View style={{ width: 240, height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 14 }}>
//               <Animated.View style={{ width: 120, height: 6, borderRadius: 999, backgroundColor: '#60A5FA', transform: [{ translateX }] }} />
//             </View>
//           </View>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }
// app/trip-detail.tsx
// import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   Pressable,
//   ActivityIndicator,
//   TouchableOpacity,
//   Dimensions,
//   ScrollView,
//   Alert,
//   Animated,
//   Easing,
// } from 'react-native';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
// import { captureRef } from 'react-native-view-shot';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useFocusEffect } from '@react-navigation/native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { Buffer } from 'buffer';

// import { getTrips } from '../mmkv-storage/storage';
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

// const GOOGLE_STATIC_MAPS_KEY = 'AIzaSyDsqWho-EyUaPIe2Sxp8X2tw4x7SCLOW-A';

// /** ================== Brand / Badge config ================== **/
// const FOOTER_DOMAIN = 'log.thinxview.com';

// // Hosted images (use your own URLs)
// const LOGO_IMG_URL      = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152576/Group_17_dypt3x.png';
// const QOP_IMG_HIGH_URL  = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152475/Group_290108_twfkyd.png';
// const QOP_IMG_MED_URL   = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152476/Group_1597882844_1_ecln8w.png';
// const QOP_IMG_LOW_URL   = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152092/Group_1597882844_hisvca.png';

// const EMBED_IMAGES_AS_DATA_URI = true;

// // URL → data:URI (no expo-file-system)
// async function urlToDataURI(url: string) {
//   try {
//     const res = await fetch(url);
//     if (!res.ok) return '';
//     const ab = await res.arrayBuffer();
//     const lower = url.split('?')[0].toLowerCase();
//     const mime = lower.endsWith('.svg')
//       ? 'image/svg+xml'
//       : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
//       ? 'image/jpeg'
//       : 'image/png';
//     const b64 = Buffer.from(ab).toString('base64');
//     return `data:${mime};base64,${b64}`;
//   } catch {
//     return '';
//   }
// }

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
//   const [error, setError] = useState<string | null>(null);
//   const [generatingPDF, setGeneratingPDF] = useState(false);
//   const chartRef = useRef(null);

//   // ===== Overlay animation =====
//   const barAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     if (generatingPDF) {
//       Animated.loop(
//         Animated.timing(barAnim, {
//           toValue: 1,
//           duration: 1200,
//           easing: Easing.linear,
//           useNativeDriver: true,
//         })
//       ).start();
//     } else {
//       barAnim.stopAnimation(() => barAnim.setValue(0));
//     }
//   }, [generatingPDF, barAnim]);
//   const translateX = barAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });

//   const fetchTripDetails = useCallback(
//     async (retryCount = 0) => {
//       setLoading(true);
//       setError(null);

//       if (!tripName) {
//         setError('No trip name provided');
//         setLoading(false);
//         return;
//       }

//       /* ======= TEST DATA (remove when wiring real API) ======= */
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
//                 minTemp: 18, maxTemp: 26, minHum: 30, maxHum: 60,
//                 samplingMinutes: 10, reportingMinutes: 60,
//               },
//             },
//             qopPercent: 92
//           },
//           records: fakeRecords,
//         });
//         setLoading(false);
//         return;
//       }
//       /* ======= END TEST ======= */

//       try {
//         const result = await getTripDetails(String(tripName));
//         if (result.success && result.data) {
//           setApiTrip(result.data);
//           setError(null);
//         } else {
//           const errorMsg = result.error || 'Failed to load trip data';
//           setError(errorMsg);
//           if (retryCount < 2) {
//             setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
//             return;
//           }
//         }
//       } catch (err: any) {
//         const errorMsg = err.message || 'Network error';
//         setError(errorMsg);
//         if (retryCount < 2) {
//           setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
//           return;
//         }
//       }
//       setLoading(false);
//     },
//     [tripName]
//   );

//   useFocusEffect(useCallback(() => { fetchTripDetails(0); }, [fetchTripDetails]));

//   const trip = apiTrip?.tripInfo;

//   const packets = useMemo<DataPacket[]>(() => {
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

//   const formatTimestamp = (unixTime: number) =>
//     new Date(unixTime * 1000).toLocaleString('en-US', {
//       month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
//     });

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

//   /** QoP: prefer API value if present */
//   const qopPercent = useMemo(() => {
//     const candidates = [
//       apiTrip?.qopPercent, apiTrip?.qop, apiTrip?.qopScore, apiTrip?.qualityOfProcess,
//       apiTrip?.tripInfo?.qopPercent, apiTrip?.tripInfo?.qop, apiTrip?.tripInfo?.qopScore, apiTrip?.tripInfo?.qualityOfProcess,
//     ];
//     const fromApi = candidates.map(v => (v == null ? undefined : Number(v))).find(n => Number.isFinite(n));
//     if (typeof fromApi === 'number') return Math.max(0, Math.min(100, Math.round(fromApi)));

//     if (!packets.length || !thresholds) return 100;
//     const ok = packets.filter(
//       p =>
//         p.temperature >= thresholds.tempMin &&
//         p.temperature <= thresholds.tempMax &&
//         p.humidity >= thresholds.humMin &&
//         p.humidity <= thresholds.humMax
//     ).length;
//     return Math.round((ok / packets.length) * 100);
//   }, [apiTrip, packets, thresholds]);

//   const durationStr = useMemo(() => {
//     if (!packets.length) return '-';
//     const start = trip?.startTime ?? packets[0].time;
//     const end = trip?.endTime ?? packets[packets.length - 1].time;
//     const minutes = Math.max(0, Math.round((end - start) / 60));
//     const h = Math.floor(minutes / 60);
//     const m = minutes % 60;
//     return `${h} Hrs ${m} min`;
//   }, [packets, trip]);

//   // ======= Simple inline path fallback (kept) =======
//   function buildInlineMiniMap(_points: { lat: number; lng: number }[], start?: any, end?: any) {
//     if (!start || !end) {
//       return `<div style="height:320px;display:flex;align-items:center;justify-content:center;color:#6b7280;border:1px solid #e5e7eb;border-radius:10px">Path preview unavailable</div>`;
//     }
//     const s = start, e = end;
//     const W = 800, H = 300, PAD = 12;
//     let minLat = Math.min(s.latitude, e.latitude);
//     let maxLat = Math.max(s.latitude, e.latitude);
//     let minLng = Math.min(s.longitude, e.longitude);
//     let maxLng = Math.max(s.longitude, e.longitude);
//     const padDeg = 0.08 * Math.max(maxLat - minLat, maxLng - minLng, 0.01);
//     minLat -= padDeg; maxLat += padDeg; minLng -= padDeg; maxLng += padDeg;
//     const x = (lng: number) => PAD + ((lng - minLng) / Math.max(1e-6, maxLng - minLng)) * (W - 2*PAD);
//     const y = (lat: number) => PAD + (1 - (lat - minLat) / Math.max(1e-6, maxLat - minLat)) * (H - 2*PAD);

//     const x1 = x(s.longitude).toFixed(1), y1 = y(s.latitude).toFixed(1);
//     const x2 = x(e.longitude).toFixed(1), y2 = y(e.latitude).toFixed(1);

//     return `
//       <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="border:1px solid #e5e7eb;border-radius:10px">
//         <rect x="0" y="0" width="${W}" height="${H}" fill="#eef2ff"/>
//         <path d="M ${x1} ${y1} Q ${(parseFloat(x1)+parseFloat(x2))/2} ${(Math.min(parseFloat(y1),parseFloat(y2))/2 - 60).toFixed(1)} ${x2} ${y2}"
//               fill="none" stroke="#1E3A8A" stroke-width="3" stroke-dasharray="8 6" stroke-linecap="round"/>
//         <circle cx="${x1}" cy="${y1}" r="4" fill="#428af5"/>
//         <circle cx="${x2}" cy="${y2}" r="4" fill="#ef4444"/>
//       </svg>
//     `;
//   }

//   // ---------- PDF generator ----------
//   const generatePDF = async () => {
//     setGeneratingPDF(true);
//     try {
//       // Chart snapshot
//       let chartImgTag = '';
//       try {
//         await new Promise((r) => setTimeout(r, 120));
//         if (chartRef.current) {
//           const base64 = await captureRef(chartRef.current, {
//             result: 'base64', format: 'png', quality: 1, pixelRatio: 2,
//           });
//           if (base64 && typeof base64 === 'string') {
//             chartImgTag = `<img src="data:image/png;base64,${base64}" alt="chart" style="width:100%;height:300px;border-radius:8px;border:1px solid #e5e7eb;object-fit:contain;background:#fff"/>`;
//           }
//         }
//       } catch {
//         chartImgTag = `<div style="height:300px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280">Chart preview unavailable</div>`;
//       }

//       // Map image (remote)
//       const latlngs = packets.filter(p => p.latitude!=null && p.longitude!=null)
//         .map(p => ({ lat: p.latitude as number, lng: p.longitude as number }));
//       let mapBlock = '';
//       try {
//         if (trip?.startLocation && trip?.endLocation) {
//           const W = 800, H = 300, zoom = 6;
//           const KEY = GOOGLE_STATIC_MAPS_KEY?.trim();
//           const base = `https://maps.googleapis.com/maps/api/staticmap?scale=1&format=png&size=${W}x${H}&maptype=roadmap`;
//           const markers = [
//             `markers=color:blue|${trip.startLocation.latitude},${trip.startLocation.longitude}`,
//             `markers=color:red|${trip.endLocation.latitude},${trip.endLocation.longitude}`,
//           ].join('&');
//           const mapUrl = `${base}&${markers}&zoom=${zoom}&key=${KEY}`;
//           mapBlock = `<img src="${mapUrl}" alt="map" style="width:${W}px;height:${H}px;max-width:100%;margin:0 auto;display:block;border-radius:10px;border:1px solid #e5e7eb"/>`;
//         } else {
//           mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//         }
//       } catch {
//         mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
//       }

//       // Brand & QoP badges
//       let logoHtml = `<div style="font-weight:900;font-size:16px;color:#1e40af">GND SOLUTIONS®</div>`;
//       if (LOGO_IMG_URL) {
//         const logoSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(LOGO_IMG_URL) : LOGO_IMG_URL;
//         if (logoSrc) logoHtml = `<img src="${logoSrc}" alt="GND Solutions" style="height:28px;width:20px;display:block"/>`;
//       }

//       let badgeUrl = '';
//       if (qopPercent >= 98) badgeUrl = QOP_IMG_HIGH_URL;
//       else if (qopPercent >= 90) badgeUrl = QOP_IMG_HIGH_URL;
//       else if (qopPercent >= 80) badgeUrl = QOP_IMG_MED_URL;
//       else badgeUrl = QOP_IMG_LOW_URL;

//       let qopBadgeHtml = '';
//       if (badgeUrl) {
//         const badgeSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(badgeUrl) : badgeUrl;
//         if (badgeSrc) qopBadgeHtml = `<img src="${badgeSrc}" alt="Quality Process" style="height:58px;display:block"/>`;
//       }

//       // Helpers: checkbox-style chips (horizontal)
//       const checkbox = (label: string, checked: boolean) =>
//         `<span class="qopItem"><i class="cb ${checked ? 'checked' : ''}"></i><span>${label}</span></span>`;

//       const is98 = qopPercent > 98;
//       const is90 = qopPercent >= 90 && qopPercent <= 97;
//       const is80 = qopPercent >= 80 && qopPercent < 90;
//       const is70 = qopPercent >= 70 && qopPercent < 80;
//       const isLt60 = qopPercent < 60;

//       const qopBandsHtml = [
//         checkbox('&gt; 98', is98),
//         checkbox('90 – 97', is90),
//         checkbox('80 – 90', is80),
//         checkbox('70 – 80', is70),
//         checkbox('&lt; 60', isLt60),
//       ].join(' ');

//       // Pagination
//       const PAGE2_ROWS = 21;
//       const OTHER_ROWS = 32;
//       const chunk = <T,>(arr: T[], size: number): T[][] => {
//         const out: T[][] = [];
//         for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
//         return out;
//       };
//       const page2Data = packets.slice(0, PAGE2_ROWS);
//       const otherData = packets.slice(PAGE2_ROWS);
//       const extraChunks = chunk(otherData, OTHER_ROWS);
//       const totalPages = 2 + extraChunks.length;

//       const renderTableRows = (rows: DataPacket[], startIndex: number) =>
//         rows
//           .map((p, i) => {
//             const idx = startIndex + i + 1;
//             const tempBad = thresholds && (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax);
//             const humBad  = thresholds && (p.humidity    < thresholds.humMin  || p.humidity    > thresholds.humMax);
//             return `
//               <tr>
//                 <td class="c t">${pad2(idx)}</td>
//                 <td class="c ${tempBad ? 'bad' : ''}">${p.temperature?.toFixed(0) ?? '—'}</td>
//                 <td class="c ${humBad ? 'bad' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
//                 <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
//                 <td class="c">${fmtIST(p.time)}</td>
//               </tr>
//             `;
//           })
//           .join('');

//       const page2Rows = renderTableRows(page2Data, 0);

//       const nowStr = new Date().toLocaleString('en-GB', {
//         timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
//       });

//       const footerHtml = (pageNo: number) => `
//         <div class="footerx">
//           <div class="left">GND SOLUTIONS®</div>
//           <div class="center">Page ${pageNo}/${totalPages}</div>
//           <div class="right">${FOOTER_DOMAIN}</div>
//         </div>
//       `;

//       const disclaimerBox = `
//         <div class="disc">
//           <div class="disc-title">Disclaimer</div>
//           <div class="disc-body">
//             This report is auto-generated by thinxview<sup>®</sup> based on sensor data at the time of generation. The Quality of Process (QoP) reflects site conditions during the specified interval and does not guarantee cooling quality. GND Solutions assumes no liability for consequences arising from reliance on this report.
//           </div>
//         </div>
//       `;

//       const extraTablePagesHTML = extraChunks
//         .map((rows, idx) => {
//           const pageNo = 3 + idx;
//           const startIndex = PAGE2_ROWS + OTHER_ROWS * idx;
//           const isLast = idx === extraChunks.length - 1;
//           return `
//   <div class="page">
//     <div></div>
//     <div>
//       <div class="h2">Report Summary (continued)</div>
//       <table>
//         <thead>
//           <tr>
//             <th>Sl No</th>
//             <th>Temp °C</th>
//             <th>Hum %RH</th>
//             <th>Battery</th>
//             <th>Timestamp (IST)</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${renderTableRows(rows, startIndex)}
//         </tbody>
//       </table>
//       ${isLast ? `${disclaimerBox}` : ''}
//     </div>
//     ${footerHtml(pageNo)}
//   </div>`;
//         })
//         .join('');

//       // ---------- FINAL HTML (header like image-2 + fixed footer) ----------
//       const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4; margin: 12mm; }
//   body { font-family: Arial, Helvetica, sans-serif; color:#111827; }

//   /* Each page is a 3-row grid: header/content/footer */
//   .page {
//     height: calc(297mm - 24mm); /* page height minus top/bottom margins */
//     display: grid;
//     grid-template-rows: auto 1fr auto;
//     gap: 6px;
//     page-break-after: always;
//   }
//   .page:last-child { page-break-after: auto; }

//   .card {
//     border:1px solid #e5e7eb; border-radius:10px; padding:10px; margin-bottom:8px;
//     break-inside: avoid; page-break-inside: avoid;
//   }
//   .title { font-weight:800; color:#0f172a; font-size:12px; border-bottom:1.5px solid #60a5fa; padding-bottom:5px; margin-bottom:6px; }
//   .kv { display:grid; grid-template-columns: 130px 1fr; row-gap:4px; column-gap:8px; font-size:11px; }
//   .kv div:nth-child(2n) { color:#111827; }
//   .meta { font-size:10px; color:#6b7280; }
//   .analytics { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
//   .a { border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center; }
//   .anum { font-size:18px; font-weight:800; }
//   .acap { font-size:10px; color:#6b7280; }

//   table { width:100%; border-collapse:collapse; }
//   th, td { border:1px solid #e5e7eb; padding:7px; font-size:11px; }
//   th { background:#e9f1ff; color:#0f172a; font-weight:700; }
//   td.c { text-align:center; }
//   td.t { font-weight:700; }
//   .h2 { font-weight:800; color:#0f172a; font-size:13px; margin:6px 0 6px; }

//   /* Fixed-in-page footer row */
//   .footerx {
//     display:grid; grid-template-columns: 1fr auto 1fr; align-items:center;
//     font-size:10px; color:#6b7280;
//   }
//   .footerx .left  { justify-self:start; }
//   .footerx .center{ justify-self:center; font-weight:600; }
//   .footerx .right { justify-self:end; }

//   /* HEADER like image-2 */
//   .header {
//     display:grid;
//     grid-template-columns: 190px 1fr auto 110px; /* brand | title | qop | badge */
//     align-items:center;
//     gap:16px;
//   }
//   .brand { display:flex; flex-direction:column; gap:6px; }
//   .subbrand { font-style:italic; font-weight:700; color:#0b1220; font-size:18px; margin-left:6px; }

//   .h1 { font-weight:800; font-size:22px; color:#0f172a; line-height:1.1; }
//   .titleBlock .meta { margin-top:4px; }

//   .qopBlock { display:flex; flex-direction:column; gap:6px; }
//   .qopTitle { font-size:12px; font-weight:700; color:#0f172a; }
//   .qopBands { display:flex; flex-wrap:wrap; gap:12px; }

//   .qopItem { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#111827; }
//   .cb { width:14px; height:14px; border:2px solid #CBD5E1; border-radius:3px; display:inline-block; position:relative; background:#fff; }
//   .cb.checked { background:#10B981; border-color:#10B981; }
//   .cb.checked::after { content:''; position:absolute; left:3px; top:1px; width:6px; height:10px; border:2px solid #fff; border-top:none; border-left:none; transform:rotate(45deg); }

//   .disc {
//     border:1.5px solid #c7d2fe; border-radius:12px; padding:12px 14px; background:#f8fbff; color:#334155;
//     margin-top:10px;
//   }
//   .disc-title { font-weight:800; font-size:13px; color:#0f172a; margin-bottom:6px; }
//   .disc-body { font-size:11px; line-height:1.55; }
// </style>
// </head>
// <body>

//   <!-- ================ PAGE 1 (grid) ================ -->
//   <div class="page">
//     <!-- HEADER CARD -->
//     <div class="card">
//       <div class="header">
//         <div class="brand">
//           ${logoHtml}
//           <div class="subbrand">thinxfresh</div>
//         </div>

//         <div class="titleBlock">
//           <div class="h1">Insights &amp; Summary Report</div>
//           <div class="meta">Report Generated On: ${nowStr}</div>
//           <div class="meta">QoP: <strong>${qopPercent}%</strong></div>
//         </div>

//         <div class="qopBlock">
//           <div class="qopTitle">Quality of Process:</div>
//           <div class="qopBands">
//             ${qopBandsHtml}
//           </div>
//         </div>

//         <div class="badge">
//           ${qopBadgeHtml}
//         </div>
//       </div>
//     </div>

//     <!-- CONTENT -->
//     <div>
//       <div class="card">
//         <div class="title">Sensor Information</div>
//         <div class="kv">
//           <div>Model No</div><div>: ${trip?.modelNo ?? '—'}</div>
//           <div>Part No</div><div>: ${trip?.partNo ?? trip?.deviceid ?? trip?.deviceID ?? '—'}</div>
//           <div>Sensor Accuracy</div><div>: ± 0.3°C, ± 1.5 %RH</div>
//           <div>Serial No</div><div>: ${trip?.serialNo ?? '—'}</div>
//           <div>Calibration</div><div>: Valid</div>
//         </div>
//       </div>

//       <div class="card">
//         <div class="title">Trip Information</div>
//         <div class="kv">
//           <div>Trip Name</div><div>: ${trip?.tripName ?? '—'}</div>
//           <div>Managed By</div><div>: ${trip?.managedBy ?? '—'}</div>
//           <div>Source</div><div>: ${trip?.source ?? '—'}</div>
//           <div>Destination</div><div>: ${trip?.destination ?? '—'}</div>
//           <div>Started On</div><div>: ${packets.length ? fmtIST(trip?.startTime ?? packets[0].time) : '—'}</div>
//           <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length - 1].time) : '—'}</div>
//         </div>
//       </div>

//       <div class="card">
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
//             <div class="anum">${durationStr}</div>
//             <div class="acap">Trip Duration</div>
//           </div>
//         </div>
//       </div>

//       <div class="card">
//         <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
//         ${mapBlock}
//       </div>
//     </div>

//     <!-- FOOTER (fixed in the page grid) -->
//     ${footerHtml(1)}
//   </div>

//   <!-- ================ PAGE 2 (grid) ================ -->
//   <div class="page">
//     <div></div>
//     <div>
//       <div class="card">
//         <div class="title">Graphs</div>
//         <div style="display:flex;justify-content:center">${chartImgTag}</div>
//         <div style="display:flex;gap:16px;font-size:11px;color:#475467;margin-top:6px">
//           <span><i style="display:inline-block;width:26px;height:4px;background:#3B82F6;margin-right:6px;border-radius:2px"></i>Temperature (°C)</span>
//           <span><i style="display:inline-block;width:26px;height:4px;background:#22C55E;margin-right:6px;border-radius:2px"></i>Humidity (%RH)</span>
//           <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temperature Breach</span>
//           <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humidity Breach</span>
//         </div>
//       </div>

//       <div class="h2">Report Summary</div>
//       <table>
//         <thead>
//           <tr>
//             <th>Sl No</th>
//             <th>Temp °C</th>
//             <th>Hum %RH</th>
//             <th>Battery</th>
//             <th>Timestamp (IST)</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${page2Rows}
//         </tbody>
//       </table>

//       ${extraChunks.length === 0 ? `${disclaimerBox}` : ''}
//     </div>
//     ${footerHtml(2)}
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

//   // ---------- UI ----------
//   if (loading) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color="#1976D2" />
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (!trip && !loading) {
//     return (
//       <SafeAreaView className="flex-1 bg-white">
//         <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3 pt-1">
//           <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
//             <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//           </Pressable>
//           <Text className="text-lg font-semibold text-black">Trip Details</Text>
//           <View className="w-10" />
//         </View>
//         <View className="flex-1 items-center justify-center px-8">
//           <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
//           <Text className="mt-4 text-center text-xl font-semibold text-gray-800">{error || 'Trip not found'}</Text>
//           <Text className="mt-2 text-center text-sm text-gray-500">
//             {error ? 'Unable to load trip data. Please check your connection.' : 'This trip does not exist or has been deleted.'}
//           </Text>
//           <TouchableOpacity onPress={() => fetchTripDetails(0)} className="mt-6 rounded-lg bg-blue-600 px-8 py-3">
//             <Text className="text-base font-semibold text-white">Retry</Text>
//           </TouchableOpacity>
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
//         <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
//           <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
//         </Pressable>
//         <Text className="text-lg font-semibold text-black">Trip Details</Text>
//         <View className="w-10" />
//       </View>

//       {/* Trip Info */}
//       <View className="border-b border-gray-200 bg-white p-4">
//         <Text className="mb-1 text-xl font-bold text-gray-800">{trip.tripName || 'Unnamed Trip'}</Text>
//         <View className="mt-2 flex-row items-center">
//           <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">Device: {trip.deviceid || trip.deviceID || trip.deviceName}</Text>
//         </View>
//         {trip.tripConfig?.customerProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="account" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">{trip.tripConfig.customerProfile.profileName}</Text>
//           </View>
//         )}
//         {trip.tripConfig?.boxProfile && (
//           <View className="mt-1 flex-row items-center">
//             <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
//             <Text className="ml-1 text-sm text-gray-600">{trip.tripConfig.boxProfile.profileName}</Text>
//           </View>
//         )}
//         <View className="mt-1 flex-row items-center">
//           <MaterialCommunityIcons name="alarm" size={16} color="#666" />
//           <Text className="ml-1 text-sm text-gray-600">Sampling Interval: {samplingMinutes} minutes</Text>
//         </View>

//         {packets.length > 0 && (
//           <>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">Start: {formatTimestamp(trip.startTime || packets[0].time)}</Text>
//             </View>
//             <View className="mt-1 flex-row items-center">
//               <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
//               <Text className="ml-1 text-sm text-gray-600">End: {formatTimestamp(trip.endTime || packets[packets.length - 1].time)}</Text>
//             </View>
//           </>
//         )}

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

//       {/* Graphs & actions */}
//       <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
//         <Text className="mb-3 text-sm font-semibold text-gray-700">Trip Overview ({packets.length} records)</Text>

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
//                     <Text className="text-xs text-gray-600">Temp Breach</Text>
//                   </View>
//                 </View>
//                 <View className="w-full flex-row justify-between px-8">
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-green-500" />
//                     <Text className="text-xs text-gray-600">Humidity</Text>
//                   </View>
//                   <View className="flex-1 flex-row items-center">
//                     <View className="mr-2 h-3 w-8 bg-orange-500" />
//                     <Text className="text-xs text-gray-600">Humid Breach</Text>
//                   </View>
//                 </View>
//               </View>
//             </View>

//             <View className="mb-4 flex-row items-center justify-center gap-3">
//               <TouchableOpacity
//                 onPress={() =>
//                   router.push({
//                     pathname: '/trip-records',
//                     params: { tripName: String(tripName ?? '') },
//                   })
//                 }
//                 className="rounded-lg border-2 border-blue-600 px-6 py-3">
//                 <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>View Records</Text>
//               </TouchableOpacity>

//               {trip.startLocation && trip.endLocation && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     router.push({
//                       pathname: '/trip-map',
//                       params: {
//                         startLat: String(trip.startLocation.latitude),
//                         startLng: String(trip.startLocation.longitude),
//                         endLat: String(trip.endLocation.latitude),
//                         endLng: String(trip.endLocation.longitude),
//                       },
//                     });
//                   }}
//                   className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
//                   <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
//                   <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>View Path</Text>
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
//                 <Text className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`} numberOfLines={1}>
//                   {generatingPDF ? 'Loading...' : 'PDF'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </>
//         )}
//       </ScrollView>

//       {/* Fullscreen overlay */}
//       {generatingPDF && (
//         <View
//           pointerEvents="auto"
//           style={{
//             position: 'absolute', zIndex: 9999, top: 0, left: 0, right: 0, bottom: 0,
//             backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center',
//           }}
//         >
//           <View
//             style={{
//               width: 280, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#0B1220',
//               borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', shadowColor: '#000', shadowOpacity: 0.3,
//               shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, alignItems: 'center',
//             }}
//           >
//             <ActivityIndicator size="large" color="#ffffff" />
//             <Text style={{ color: '#E5E7EB', marginTop: 12, fontWeight: '700' }}>Generating PDF…</Text>
//             <Text style={{ color: '#94A3B8', marginTop: 4, fontSize: 12, textAlign: 'center' }}>
//               Please keep the app open while your report is prepared.
//             </Text>
//             <View style={{ width: 240, height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 14 }}>
//               <Animated.View style={{ width: 120, height: 6, borderRadius: 999, backgroundColor: '#60A5FA', transform: [{ translateX }] }} />
//             </View>
//           </View>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }
// app/trip-detail.tsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Buffer } from 'buffer';

import { getTrips } from '../mmkv-storage/storage';
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

/** ================== Brand / Badge config ================== **/
const FOOTER_DOMAIN = 'log.thinxview.com';

// Hosted images (use your own URLs)
const LOGO_IMG_URL      = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152576/Group_17_dypt3x.png';
const QOP_IMG_HIGH_URL  = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152475/Group_290108_twfkyd.png';
const QOP_IMG_MED_URL   = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152476/Group_1597882844_1_ecln8w.png';
const QOP_IMG_LOW_URL   = 'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152092/Group_1597882844_hisvca.png';

const EMBED_IMAGES_AS_DATA_URI = true;

// URL → data:URI (no expo-file-system)
async function urlToDataURI(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const ab = await res.arrayBuffer();
    const lower = url.split('?')[0].toLowerCase();
    const mime = lower.endsWith('.svg')
      ? 'image/svg+xml'
      : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png';
    const b64 = Buffer.from(ab).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return '';
  }
}

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
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const chartRef = useRef(null);

  // ===== Overlay animation =====
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (generatingPDF) {
      Animated.loop(
        Animated.timing(barAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      barAnim.stopAnimation(() => barAnim.setValue(0));
    }
  }, [generatingPDF, barAnim]);
  const translateX = barAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });

  const fetchTripDetails = useCallback(
    async (retryCount = 0) => {
      setLoading(true);
      setError(null);

      if (!tripName) {
        setError('No trip name provided');
        setLoading(false);
        return;
      }

      /* ======= TEST DATA (remove when wiring real API) ======= */
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
                minTemp: 18, maxTemp: 26, minHum: 30, maxHum: 60,
                samplingMinutes: 10, reportingMinutes: 60,
              },
            },
            qopPercent: 92
          },
          records: fakeRecords,
        });
        setLoading(false);
        return;
      }
      /* ======= END TEST ======= */

      try {
        const result = await getTripDetails(String(tripName));
        if (result.success && result.data) {
          setApiTrip(result.data);
          setError(null);
        } else {
          const errorMsg = result.error || 'Failed to load trip data';
          setError(errorMsg);
          if (retryCount < 2) {
            setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
            return;
          }
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Network error';
        setError(errorMsg);
        if (retryCount < 2) {
          setTimeout(() => fetchTripDetails(retryCount + 1), 1000);
          return;
        }
      }
      setLoading(false);
    },
    [tripName]
  );

  useFocusEffect(useCallback(() => { fetchTripDetails(0); }, [fetchTripDetails]));

  const trip = apiTrip?.tripInfo;

  const packets = useMemo<DataPacket[]>(() => {
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

  const formatTimestamp = (unixTime: number) =>
    new Date(unixTime * 1000).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

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

  /** QoP: prefer API value if present */
  const qopPercent = useMemo(() => {
    const candidates = [
      apiTrip?.qopPercent, apiTrip?.qop, apiTrip?.qopScore, apiTrip?.qualityOfProcess,
      apiTrip?.tripInfo?.qopPercent, apiTrip?.tripInfo?.qop, apiTrip?.tripInfo?.qopScore, apiTrip?.tripInfo?.qualityOfProcess,
    ];
    const fromApi = candidates.map(v => (v == null ? undefined : Number(v))).find(n => Number.isFinite(n));
    if (typeof fromApi === 'number') return Math.max(0, Math.min(100, Math.round(fromApi)));

    if (!packets.length || !thresholds) return 100;
    const ok = packets.filter(
      p =>
        p.temperature >= thresholds.tempMin &&
        p.temperature <= thresholds.tempMax &&
        p.humidity >= thresholds.humMin &&
        p.humidity <= thresholds.humMax
    ).length;
    return Math.round((ok / packets.length) * 100);
  }, [apiTrip, packets, thresholds]);

  const durationStr = useMemo(() => {
    if (!packets.length) return '-';
    const start = trip?.startTime ?? packets[0].time;
    const end = trip?.endTime ?? packets[packets.length - 1].time;
    const minutes = Math.max(0, Math.round((end - start) / 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} Hrs ${m} min`;
  }, [packets, trip]);

  /* ======= Web-Mercator math for overlay path alignment (for PDF map) ======= */
  const TILE_SIZE = 256;
  const clampLat = (lat: number) => Math.max(-85.05112878, Math.min(85.05112878, lat));
  const lngToWorldX = (lng: number) => ((lng + 180) / 360) * TILE_SIZE;
  const latToWorldY = (lat: number) => {
    const s = Math.sin((clampLat(lat) * Math.PI) / 180);
    const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
    return y * TILE_SIZE;
  };
  function fitCenterZoom(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    width: number, height: number, pad: number
  ) {
    const w0x = lngToWorldX(start.longitude), w0y = latToWorldY(start.latitude);
    const w1x = lngToWorldX(end.longitude),   w1y = latToWorldY(end.latitude);
    const dx0 = Math.abs(w1x - w0x) || 1e-9;
    const dy0 = Math.abs(w1y - w0y) || 1e-9;
    const zx = Math.log2((width - 2 * pad) / dx0);
    const zy = Math.log2((height - 2 * pad) / dy0);
    const zoom = Math.max(0, Math.min(21, Math.floor(Math.min(zx, zy))));
    const centerLat = (start.latitude + end.latitude) / 2;
    const centerLng = (start.longitude + end.longitude) / 2;
    return { centerLat, centerLng, zoom };
  }
  function projectToPixel(
    lat: number, lng: number,
    centerLat: number, centerLng: number,
    zoom: number, width: number, height: number
  ) {
    const scale = Math.pow(2, zoom);
    const wx = lngToWorldX(lng) * scale, wy = latToWorldY(lat) * scale;
    const cx = lngToWorldX(centerLng) * scale, cy = latToWorldY(centerLat) * scale;
    return { x: wx - cx + width / 2, y: wy - cy + height / 2 };
  }
  /** Build Google static map + curved dashed overlay CONNECTED to the pins */
  function buildMapWithCurvedOverlayBlock(
    start?: { latitude: number; longitude: number },
    end?: { latitude: number; longitude: number }
  ) {
    if (!start || !end) return '';

    const W = 800, H = 600, PAD = 24;
    const { centerLat, centerLng, zoom } = fitCenterZoom(start, end, W, H, PAD);
    const KEY = GOOGLE_STATIC_MAPS_KEY?.trim();
    if (!KEY) return '';

    const base = `https://maps.googleapis.com/maps/api/staticmap?scale=1&format=png&size=${W}x${H}&maptype=roadmap`;
    const markers = [
      `markers=color:blue|${start.latitude},${start.longitude}`,
      `markers=color:red|${end.latitude},${end.longitude}`,
    ].join('&');
    const url = `${base}&center=${centerLat},${centerLng}&zoom=${zoom}&${markers}&key=${KEY}`;

    const p0 = projectToPixel(start.latitude, start.longitude, centerLat, centerLng, zoom, W, H);
    const p1 = projectToPixel(end.latitude, end.longitude, centerLat, centerLng, zoom, W, H);

    // **Connect directly to the pin tips (no gaps)**
    const p0i = { x: p0.x, y: p0.y };
    const p1i = { x: p1.x, y: p1.y };

    const dx = p1i.x - p0i.x, dy = p1i.y - p0i.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / dist, ny = dx / dist;
    const midx = (p0i.x + p1i.x) / 2, midy = (p0i.y + p1i.y) / 2;
    const amp = Math.max(20, Math.min(160, dist * 0.25));
    const cx = midx + nx * amp, cy = midy + ny * amp;

    const halo = `
      <path d="M ${p0i.x.toFixed(1)} ${p0i.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p1i.x.toFixed(1)} ${p1i.y.toFixed(1)}"
            fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="6" stroke-linecap="round" />
    `;
    const curve = `
      <path d="M ${p0i.x.toFixed(1)} ${p0i.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p1i.x.toFixed(1)} ${p1i.y.toFixed(1)}"
            fill="none" stroke="#1976D2" stroke-width="3" stroke-dasharray="8 6" stroke-linecap="round" />
    `;

    return `
      <div style="position:relative;width:${W}px;height:${H}px;max-width:100%;margin:0 auto;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden">
        <img src="${url}" alt="map" style="position:absolute;inset:0;width:${W}px;height:${H}px;image-rendering:auto" />
        <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0">
          ${halo}
          ${curve}
        </svg>
      </div>
    `;
  }

  // ---------- PDF generator ----------
  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Chart snapshot
      let chartImgTag = '';
      try {
        await new Promise((r) => setTimeout(r, 120));
        if (chartRef.current) {
          const base64 = await captureRef(chartRef.current, {
            result: 'base64', format: 'png', quality: 1, pixelRatio: 2,
          });
          if (base64 && typeof base64 === 'string') {
            chartImgTag = `<img src="data:image/png;base64,${base64}" alt="chart" style="width:100%;height:300px;border-radius:8px;border:1px solid #e5e7eb;object-fit:contain;background:#fff"/>`;
          }
        }
      } catch {
        chartImgTag = `<div style="height:300px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:8px;color:#6b7280">Chart preview unavailable</div>`;
      }

      // Map block with curved dashed overlay
      let mapBlock = '';
      try {
        if (trip?.startLocation && trip?.endLocation) {
          mapBlock = buildMapWithCurvedOverlayBlock(trip.startLocation, trip.endLocation);
        } else {
          mapBlock = `<div style="height:300px;border:1px solid #e5e7eb;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#6b7280">Path preview unavailable</div>`;
        }
      } catch {
        mapBlock = `<div style="height:300px;border:1px solid #e5e7eb;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#6b7280">Map unavailable</div>`;
      }

      // Brand & QoP badges  (logo smaller)
      let logoHtml = `<div style="font-weight:900;font-size:16px;color:#1e40af">GND SOLUTIONS®</div>`;
      if (LOGO_IMG_URL) {
        const logoSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(LOGO_IMG_URL) : LOGO_IMG_URL;
        if (logoSrc) logoHtml = `<img src="${logoSrc}" alt="GND Solutions" style="height:18px;width:auto;display:block;max-width:140px"/>`;
      }
      let badgeUrl = '';
      if (qopPercent >= 98) badgeUrl = QOP_IMG_HIGH_URL;
      else if (qopPercent >= 90) badgeUrl = QOP_IMG_HIGH_URL;
      else if (qopPercent >= 80) badgeUrl = QOP_IMG_MED_URL;
      else badgeUrl = QOP_IMG_LOW_URL;
      let qopBadgeHtml = '';
      if (badgeUrl) {
        const badgeSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(badgeUrl) : badgeUrl;
        if (badgeSrc) qopBadgeHtml = `<img src="${badgeSrc}" alt="Quality Process" style="height:50px;width:auto;display:block"/>`;
      }

      const checkbox = (label: string, checked: boolean) =>
        `<span class="qopItem"><i class="cb ${checked ? 'checked' : ''}"></i><span>${label}</span></span>`;

      const is98 = qopPercent > 98;
      const is90 = qopPercent >= 90 && qopPercent <= 97;
      const is80 = qopPercent >= 80 && qopPercent < 90;
      const is70 = qopPercent >= 70 && qopPercent < 80;
      const isLt60 = qopPercent < 60;
      const qopBandsHtml = [
        checkbox('&gt; 98', is98),
        checkbox('90 – 97', is90),
        checkbox('80 – 90', is80),
        checkbox('70 – 80', is70),
        checkbox('&lt; 60', isLt60),
      ].join(' ');

      // Pagination helpers
      const PAGE2_ROWS = 21;
      const OTHER_ROWS = 32;
      function chunk<T>(arr: T[], size: number): T[][] {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      }
      const page2Data = packets.slice(0, PAGE2_ROWS);
      const otherData = packets.slice(PAGE2_ROWS);
      const extraChunks = chunk(otherData, OTHER_ROWS);
      const totalPages = 2 + extraChunks.length;

      // breach classes per cell
      const renderTableRows = (rows: DataPacket[], startIndex: number) =>
        rows
          .map((p, i) => {
            const idx = startIndex + i + 1;
            const tempBad = thresholds && (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax);
            const humBad  = thresholds && (p.humidity    < thresholds.humMin  || p.humidity    > thresholds.humMax);
            return `
              <tr>
                <td class="c t">${pad2(idx)}</td>
                <td class="c ${tempBad ? 'badT' : ''}">${p.temperature?.toFixed(0) ?? '—'}</td>
                <td class="c ${humBad ? 'badH' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
                <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
                <td class="c">${fmtIST(p.time)}</td>
              </tr>
            `;
          })
          .join('');

      const page2Rows = renderTableRows(page2Data, 0);

      const nowStr = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      });

      const footerHtml = (pageNo: number) => `
        <div class="footerx">
          <div class="left">GND SOLUTIONS®</div>
          <div class="center">Page ${pageNo}/${totalPages}</div>
          <div class="right">${FOOTER_DOMAIN}</div>
        </div>
      `;

      const disclaimerBox = `
        <div class="disc">
          <div class="disc-title">Disclaimer</div>
          <div class="disc-body">
            This report is auto-generated by thinxview<sup>®</sup> based on sensor data at the time of generation. The Quality of Process (QoP) reflects site conditions during the specified interval and does not guarantee cooling quality. GND Solutions assumes no liability for consequences arising from reliance on this report.
          </div>
        </div>
      `;

      const extraTablePagesHTML = extraChunks
        .map((rows, idx) => {
          const pageNo = 3 + idx;
          const startIndex = PAGE2_ROWS + OTHER_ROWS * idx;
          const isLast = idx === extraChunks.length - 1;
          return `
  <div class="page">
    <div></div>
    <div>
      <div class="h2">Report Summary (continued)</div>
      <table>
        <thead>
          <tr>
            <th>Sl No</th>
            <th>Temp °C</th>
            <th>Hum %RH</th>
            <th>Battery</th>
            <th>Timestamp (IST)</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows(rows, startIndex)}
        </tbody>
      </table>
      ${isLast ? `${disclaimerBox}` : ''}
    </div>
    ${footerHtml(pageNo)}
  </div>`;
        })
        .join('');

      // ---------- FINAL HTML ----------
      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111827; }

  /* Each page: header/content/footer grid (no forced height to avoid stretch) */
  .page {
    min-height: calc(297mm - 24mm);
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 6px;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  .card {
    border:1px solid #e5e7eb; border-radius:10px; padding:10px; margin-bottom:8px;
    break-inside: avoid; page-break-inside: avoid;
    background:#fff; /* clean white */
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
  th, td { border:1px solid #e5e7eb; padding:7px; font-size:11px; background:#fff; } /* remove colored bg */
  th { color:#0f172a; font-weight:700; } /* no blue fill */
  td.c { text-align:center; }
  td.t { font-weight:700; }

  /* breach highlighting stays */
  td.badT { color:#b91c1c; background:#fee2e2; font-weight:700; }
  td.badH { color:#9a3412; background:#ffedd5; font-weight:700; }

  .h2 { font-weight:800; color:#0f172a; font-size:13px; margin:6px 0 6px; }

  .footerx {
    display:grid; grid-template-columns: 1fr auto 1fr; align-items:center;
    font-size:10px; color:#6b7280;
  }
  .footerx .left  { justify-self:start; }
  .footerx .center{ justify-self:center; font-weight:600; }
  .footerx .right { justify-self:end; }

  /* HEADER — tighter columns + smaller logo to match your ref */
  .header {
    display:grid;
    grid-template-columns: 160px 1fr auto 96px; /* brand | title | qop | badge */
    align-items:center;
    gap:12px;
  }
  .brand { display:flex; flex-direction:column; gap:6px; }
  .subbrand { font-style:italic; font-weight:700; color:#0b1220; font-size:16px; margin-left:4px; }

  .h1 { font-weight:800; font-size:20px; color:#0f172a; line-height:1.1; }
  .titleBlock .meta { margin-top:4px; }

  .qopBlock { display:flex; flex-direction:column; gap:6px; }
  .qopTitle { font-size:12px; font-weight:700; color:#0f172a; }
  .qopBands { display:flex; flex-wrap:wrap; gap:12px; }

  .qopItem { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#111827; }
  .cb { width:14px; height:14px; border:2px solid #CBD5E1; border-radius:3px; display:inline-block; position:relative; background:#fff; }
  .cb.checked { background:#10B981; border-color:#10B981; }
  .cb.checked::after { content:''; position:absolute; left:3px; top:1px; width:6px; height:10px; border:2px solid #fff; border-top:none; border-left:none; transform:rotate(45deg); }

  .disc {
    border:1.5px solid #c7d2fe; border-radius:12px; padding:12px 14px; background:#fff; color:#334155; /* remove tinted bg */
    margin-top:10px;
  }
  .disc-title { font-weight:800; font-size:13px; color:#0f172a; margin-bottom:6px; }
  .disc-body { font-size:11px; line-height:1.55; }
</style>
</head>
<body>

  <!-- ================ PAGE 1 ================ -->
  <div class="page">
    <!-- HEADER -->
    <div class="card">
      <div class="header">
        <div class="brand">
          ${logoHtml}
          <div class="subbrand">thinxfresh</div>
        </div>

        <div class="titleBlock">
          <div class="h1">Insights &amp; Summary Report</div>
          <div class="meta">Report Generated On: ${nowStr}</div>
          <div class="meta">QoP: <strong>${qopPercent}%</strong></div>
        </div>

        <div class="qopBlock">
          <div class="qopTitle">Quality of Process:</div>
          <div class="qopBands">
            ${qopBandsHtml}
          </div>
        </div>

        <div class="badge">
          ${qopBadgeHtml}
        </div>
      </div>
    </div>

    <!-- CONTENT -->
    <div>
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
          <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length - 1].time) : '—'}</div>
        </div>
      </div>

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
            <div class="anum">${durationStr}</div>
            <div class="acap">Trip Duration</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
        ${mapBlock}
      </div>
    </div>

    <!-- FOOTER -->
    ${footerHtml(1)}
  </div>

  <!-- ================ PAGE 2 ================ -->
  <div class="page">
    <div></div>
    <div>
      <div class="card">
        <div class="title">Graphs</div>
        <div style="display:flex;justify-content:center">${chartImgTag}</div>
        <div style="display:flex;gap:16px;font-size:11px;color:#475467;margin-top:6px">
          <span><i style="display:inline-block;width:26px;height:4px;background:#3B82F6;margin-right:6px;border-radius:2px"></i>Temperature (°C)</span>
          <span><i style="display:inline-block;width:26px;height:4px;background:#22C55E;margin-right:6px;border-radius:2px"></i>Humidity (%RH)</span>
          <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temperature Breach</span>
          <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humidity Breach</span>
        </div>
      </div>

      <div class="h2">Report Summary</div>
      <table>
        <thead>
          <tr>
            <th>Sl No</th>
            <th>Temp °C</th>
            <th>Hum %RH</th>
            <th>Battery</th>
            <th>Timestamp (IST)</th>
          </tr>
        </thead>
        <tbody>
          ${page2Rows}
        </tbody>
      </table>

      ${extraChunks.length === 0 ? `${disclaimerBox}` : ''}
    </div>
    ${footerHtml(2)}
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

  // ---------- UI (unchanged) ----------
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
          <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </Pressable>
          <Text className="text-lg font-semibold text-black">Trip Details</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-center text-xl font-semibold text-gray-800">{error || 'Trip not found'}</Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            {error ? 'Unable to load trip data. Please check your connection.' : 'This trip does not exist or has been deleted.'}
          </Text>
          <TouchableOpacity onPress={() => fetchTripDetails(0)} className="mt-6 rounded-lg bg-blue-600 px-8 py-3">
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
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
        <Pressable className="h-10 w-10 items-center justify-center" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-semibold text-black">Trip Details</Text>
        <View className="w-10" />
      </View>

      {/* Trip Info */}
      <View className="border-b border-gray-200 bg-white p-4">
        <Text className="mb-1 text-xl font-bold text-gray-800">{trip?.tripName || 'Unnamed Trip'}</Text>
        <View className="mt-2 flex-row items-center">
          <MaterialCommunityIcons name="thermometer" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600">Device: {trip?.deviceid || trip?.deviceID || trip?.deviceName || '—'}</Text>
        </View>
        {trip?.tripConfig?.customerProfile && (
          <View className="mt-1 flex-row items-center">
            <MaterialCommunityIcons name="account" size={16} color="#666" />
            <Text className="ml-1 text-sm text-gray-600">{trip?.tripConfig?.customerProfile?.profileName}</Text>
          </View>
        )}
        {trip?.tripConfig?.boxProfile && (
          <View className="mt-1 flex-row items-center">
            <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
            <Text className="ml-1 text-sm text-gray-600">{trip?.tripConfig?.boxProfile?.profileName}</Text>
          </View>
        )}
        <View className="mt-1 flex-row items-center">
          <MaterialCommunityIcons name="alarm" size={16} color="#666" />
          <Text className="ml-1 text-sm text-gray-600">Sampling Interval: {samplingMinutes} minutes</Text>
        </View>

        {packets.length > 0 && (
          <>
            <View className="mt-1 flex-row items-center">
              <MaterialCommunityIcons name="clock-start" size={16} color="#666" />
              <Text className="ml-1 text-sm text-gray-600">Start: {formatTimestamp(trip?.startTime ?? packets[0].time)}</Text>
            </View>
            <View className="mt-1 flex-row items-center">
              <MaterialCommunityIcons name="clock-end" size={16} color="#666" />
              <Text className="ml-1 text-sm text-gray-600">End: {formatTimestamp(trip?.endTime ?? packets[packets.length - 1].time)}</Text>
            </View>
          </>
        )}

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

      {/* Graphs & actions */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm font-semibold text-gray-700">Trip Overview ({packets.length} records)</Text>

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

            <View className="mb-4 flex-row items-center justify-center gap-3">
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/trip-records',
                    params: { tripName: String(tripName ?? '') },
                  })
                }
                className="rounded-lg border-2 border-blue-600 px-6 py-3">
                <Text className="text-base font-semibold text-blue-600" numberOfLines={1}>View Records</Text>
              </TouchableOpacity>

              {trip?.startLocation && trip?.endLocation && (
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: '/trip-map',
                      params: {
                        startLat: String(trip?.startLocation?.latitude ?? ''),
                        startLng: String(trip?.startLocation?.longitude ?? ''),
                        endLat: String(trip?.endLocation?.latitude ?? ''),
                        endLng: String(trip?.endLocation?.longitude ?? ''),
                      },
                    });
                  }}
                  className="flex-row items-center rounded-lg border-2 border-blue-600 px-4 py-3">
                  <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976D2" />
                  <Text className="ml-2 text-base font-semibold text-blue-600" numberOfLines={1}>View Path</Text>
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
                <Text className={`ml-2 text-base font-semibold ${generatingPDF ? 'text-gray-500' : 'text-blue-600'}`} numberOfLines={1}>
                  {generatingPDF ? 'Loading...' : 'PDF'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Fullscreen overlay */}
      {generatingPDF && (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute', zIndex: 9999, top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 280, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#0B1220',
              borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', shadowColor: '#000', shadowOpacity: 0.3,
              shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={{ color: '#E5E7EB', marginTop: 12, fontWeight: '700' }}>Generating PDF…</Text>
            <Text style={{ color: '#94A3B8', marginTop: 4, fontSize: 12, textAlign: 'center' }}>
              Please keep the app open while your report is prepared.
            </Text>
            <View style={{ width: 240, height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 14 }}>
              <Animated.View style={{ width: 120, height: 6, borderRadius: 999, backgroundColor: '#60A5FA', transform: [{ translateX }] }} />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
