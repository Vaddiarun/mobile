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
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const chartRef = useRef(null);
  const pdfChartRef = useRef(null);

  const fetchTripDetails = useCallback(
    async (retryCount = 0) => {
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
    },
    [tripName]
  );

  useFocusEffect(
    useCallback(() => {
      fetchTripDetails(0);
    }, [fetchTripDetails])
  );

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

  // ---------- Analytics ----------
  const outOfRangeTemp = useMemo(() => {
    if (!thresholds) return 0;
    return packets.reduce(
      (acc, p) =>
        acc + (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax ? 1 : 0),
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
    if (start) markers.push(`markers=color:blue|${start.latitude},${start.longitude}`);
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
      return `<div style="height:320px;display:flex;align-items:center;justify-content:center;color:#6b7280;border:1px solid #e5e7eb;border-radius:10px">Path preview unavailable</div>`;
    }

    const s = start,
      e = end;
    const W = 800,
      H = 300,
      PAD = 12;

    let minLat = Math.min(s.latitude, e.latitude);
    let maxLat = Math.max(s.latitude, e.latitude);
    let minLng = Math.min(s.longitude, e.longitude);
    let maxLng = Math.max(s.longitude, e.longitude);

    const padDeg = 0.08 * Math.max(maxLat - minLat, maxLng - minLng, 0.01);
    minLat -= padDeg;
    maxLat += padDeg;
    minLng -= padDeg;
    maxLng += padDeg;

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
       <!-- Curved dotted path (arc) -->
<path 
  d="
    M ${x1} ${y1}
    Q ${((parseFloat(x1) + parseFloat(x2)) / 2).toFixed(1)} ${(Math.min(parseFloat(y1), parseFloat(y2)) - 60).toFixed(1)}
      ${x2} ${y2}
  "
  fill="none"
  stroke="#1E3A8A"
  stroke-width="3"
  stroke-dasharray="8 6"
  stroke-linecap="round"
/>


        <circle cx="${x1}" cy="${y1}" r="4" fill="#428af5"/>
        <circle cx="${x2}" cy="${y2}" r="4" fill="#ef4444"/>
      </svg>
    `;
  }

  // ---------- PDF generator ----------
  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      // Capture wider chart for PDF
      let chartImgTag = '';
      try {
        await new Promise((r) => setTimeout(r, 120));
        if (pdfChartRef.current) {
          const base64 = await captureRef(pdfChartRef.current, {
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
          ? `<img src="${dataURL}" alt="map" style="width:100%;height:320px;border-radius:10px;border:1px solid #e5e7eb;object-fit:cover"/>`
          : buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
      } else {
        mapBlock = buildInlineMiniMap(latlngs, trip?.startLocation, trip?.endLocation);
      }

      // Pagination helpers
      const PAGE2_ROWS = 21;
      const OTHER_ROWS = 32;

      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      // Page 2 slice (first 21)
      const page2Data = packets.slice(0, PAGE2_ROWS);

      // Remaining pages (groups of 32)
      const otherData = packets.slice(PAGE2_ROWS);
      const extraChunks = chunk(otherData, OTHER_ROWS);

      const totalPages = 2 + extraChunks.length;

      const renderTableRows = (rows: DataPacket[], startIndex: number) =>
        rows
          .map((p, i) => {
            const idx = startIndex + i + 1;
            const tempBad =
              thresholds &&
              (p.temperature < thresholds.tempMin || p.temperature > thresholds.tempMax);

            const humBad =
              thresholds && (p.humidity < thresholds.humMin || p.humidity > thresholds.humMax);
            return `
              <tr>
                <td class="c t">${pad2(idx)}</td>
                <td class="c ${tempBad ? 'bad' : ''}">${p.temperature?.toFixed(0) ?? '—'}</td>
                <td class="c ${humBad ? 'bad' : ''}">${p.humidity?.toFixed(0) ?? '—'}</td>
                <td class="c">${p.battery != null ? `${Math.round(p.battery)}%` : '—'}</td>
                <td class="c">${fmtIST(p.time)}</td>
              </tr>
            `;
          })
          .join('');

      const page2Rows = renderTableRows(page2Data, 0);

      const extraTablePagesHTML = extraChunks
        .map((rows, idx) => {
          const pageNo = 3 + idx;
          const startIndex = PAGE2_ROWS + OTHER_ROWS * idx;

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
            <span class="pill ${qopBucket === '> 98' ? 'ok' : ''}">&gt; 98</span>
            <span class="pill ${qopBucket === '> 90' ? 'ok' : ''}">&gt; 90</span>
            <span class="pill ${qopBucket === '> 80' ? 'ok' : ''}">&gt; 80</span>
            <span class="pill ${qopBucket === '> 70' ? 'ok' : ''}">&gt; 70</span>
            <span class="pill ${qopBucket === '< 70' ? 'bad' : ''}">&lt; 70</span>
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
        <div>Ended On</div><div>: ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length - 1].time) : '—'}</div>
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
          <div class="anum">${durationStr}</div>

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
        <span><i style="display:inline-block;width:26px;height:4px;background:#EF4444;margin-right:6px;border-radius:2px"></i>Temperature Breach</span>
        <span><i style="display:inline-block;width:26px;height:4px;background:#F97316;margin-right:6px;border-radius:2px"></i>Humidity Breach</span>
      </div>
    </div>

    <div style="font-weight:800;color:#0f172a;font-size:13px;margin:6px 0 6px">Report Summary</div>
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

    ${
      extraChunks.length === 0
        ? `<div style="font-size:10px;color:#6b7280;line-height:1.4;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px">
           This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
           conditions during the specified interval and does not guarantee consignment quality. GND Solutions
           assumes no liability for consequential damage, data loss, or other consequences arising from reliance
           on this report. All actions based on this report are the sole responsibility of the recipient.
         </div>`
        : ''
    }

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
            {error
              ? 'Unable to load trip data. Please check your connection.'
              : 'This trip does not exist or has been deleted.'}
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
              <View className="mb-2 flex-row justify-start">
                {/* <Text className="mr-4 text-xs font-semibold text-gray-700">°C</Text> */}
                {/* <Text className="text-xs font-semibold text-gray-700">%RH</Text> */}
              </View>

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
                    router.push({
                      pathname: '/trip-map',
                      params: {
                        startLat: trip.startLocation.latitude,
                        startLng: trip.startLocation.longitude,
                        endLat: trip.endLocation.latitude,
                        endLng: trip.endLocation.longitude,
                      },
                    });
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
      
      {/* Hidden wider chart for PDF generation only */}
      <View style={{ position: 'absolute', left: -9999, top: 0 }}>
        <View ref={pdfChartRef} collapsable={false} style={{ backgroundColor: 'white', padding: 8, borderRadius: 16 }}>
          <DynamicLineChart
            packets={packets}
            thresholds={thresholds ?? undefined}
            width={700}
            height={220}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
