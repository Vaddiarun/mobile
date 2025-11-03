// app/trip-detail.tsx
import React, { useMemo, useState, useCallback } from 'react';
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
  Animated,
  Easing,
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
const LOGO_IMG_URL =
  'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152576/Group_17_dypt3x.png';
const QOP_IMG_HIGH_URL =
  'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152475/Group_290108_twfkyd.png';
const QOP_IMG_MED_URL =
  'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152476/Group_1597882844_1_ecln8w.png';
const QOP_IMG_LOW_URL =
  'https://res.cloudinary.com/dfxkazmkc/image/upload/v1762152092/Group_1597882844_hisvca.png';

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

  /** QoP: prefer API value if present */
  const qopPercent = useMemo(() => {
    const candidates = [
      apiTrip?.qopPercent,
      apiTrip?.qop,
      apiTrip?.qopScore,
      apiTrip?.qualityOfProcess,
      apiTrip?.tripInfo?.qopPercent,
      apiTrip?.tripInfo?.qop,
      apiTrip?.tripInfo?.qopScore,
      apiTrip?.tripInfo?.qualityOfProcess,
    ];
    const fromApi = candidates
      .map((v) => (v == null ? undefined : Number(v)))
      .find((n) => Number.isFinite(n));
    if (typeof fromApi === 'number') return Math.max(0, Math.min(100, Math.round(fromApi)));

    if (!packets.length || !thresholds) return 100;
    const ok = packets.filter(
      (p) =>
        p.temperature >= thresholds.tempMin &&
        p.temperature <= thresholds.tempMax &&
        p.humidity >= thresholds.humMin &&
        p.humidity <= thresholds.humMax
    ).length;
    return Math.round((ok / packets.length) * 100);
  }, [apiTrip, packets, thresholds]);

  const qopBucket = useMemo(() => {
    if (qopPercent >= 98) return '> 98';
    if (qopPercent >= 90) return '> 90';
    if (qopPercent >= 80) return '> 80';
    if (qopPercent >= 70) return '> 70';
    return '< 70';
  }, [qopPercent]);

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
    width: number,
    height: number,
    pad: number
  ) {
    const w0x = lngToWorldX(start.longitude),
      w0y = latToWorldY(start.latitude);
    const w1x = lngToWorldX(end.longitude),
      w1y = latToWorldY(end.latitude);
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
    lat: number,
    lng: number,
    centerLat: number,
    centerLng: number,
    zoom: number,
    width: number,
    height: number
  ) {
    const scale = Math.pow(2, zoom);
    const wx = lngToWorldX(lng) * scale,
      wy = latToWorldY(lat) * scale;
    const cx = lngToWorldX(centerLng) * scale,
      cy = latToWorldY(centerLat) * scale;
    return { x: wx - cx + width / 2, y: wy - cy + height / 2 };
  }
  /** Build Google static map + curved dashed overlay CONNECTED to the pins */
  function buildMapWithCurvedOverlayBlock(
    start?: { latitude: number; longitude: number },
    end?: { latitude: number; longitude: number }
  ) {
    if (!start || !end) return '';

    const W = 800,
      H = 390,
      PAD = 24;
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

    const dx = p1i.x - p0i.x,
      dy = p1i.y - p0i.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / dist,
      ny = dx / dist;
    const midx = (p0i.x + p1i.x) / 2,
      midy = (p0i.y + p1i.y) / 2;
    const amp = Math.max(20, Math.min(160, dist * 0.25));
    const cx = midx + nx * amp,
      cy = midy + ny * amp;

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

      // Map block with curved dashed overlay
      let mapBlock = '';
      try {
        if (trip?.startLocation && trip?.endLocation) {
          mapBlock = buildMapWithCurvedOverlayBlock(trip.startLocation, trip.endLocation);
        } else {
          mapBlock = `<div style="height:390px;border:1px solid #e5e7eb;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#6b7280">Path preview unavailable</div>`;
        }
      } catch {
        mapBlock = `<div style="height:390px;border:1px solid #e5e7eb;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#6b7280">Map unavailable</div>`;
      }

      // Brand & QoP badges  (logo smaller)
      let logoHtml = `<div style="font-weight:900;font-size:16px;color:#1e40af">GND SOLUTIONS®</div>`;
      if (LOGO_IMG_URL) {
        const logoSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(LOGO_IMG_URL) : LOGO_IMG_URL;
        if (logoSrc)
          logoHtml = `<img src="${logoSrc}" alt="GND Solutions" style="height:35px;width:auto;display:block;max-width:140px"/>`;
      }
      let badgeUrl = '';
      if (qopPercent >= 98) badgeUrl = QOP_IMG_HIGH_URL;
      else if (qopPercent >= 90) badgeUrl = QOP_IMG_HIGH_URL;
      else if (qopPercent >= 80) badgeUrl = QOP_IMG_MED_URL;
      else badgeUrl = QOP_IMG_LOW_URL;
      let qopBadgeHtml = '';
      if (badgeUrl) {
        const badgeSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(badgeUrl) : badgeUrl;
        if (badgeSrc)
          qopBadgeHtml = `<img src="${badgeSrc}" alt="Quality Process" style="height:50px;width:auto;display:block"/>`;
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
      const nowStr = new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      let footerLogoHtml = `<div style="font-weight:700;font-size:10px;color:#000">GND SOLUTIONS</div>`;
      if (LOGO_IMG_URL) {
        const logoSrc = EMBED_IMAGES_AS_DATA_URI ? await urlToDataURI(LOGO_IMG_URL) : LOGO_IMG_URL;
        if (logoSrc)
          footerLogoHtml = `<div style="display:flex;align-items:center;gap:6px"><img src="${logoSrc}" alt="GND" style="height:12px;width:auto;filter:grayscale(100%);opacity:0.7"/><span style="font-weight:700;font-size:10px;color:#000"></span></div>`;
      }

      const footerHtml = (pageNo: number) => `
        <div class="footerx">
          <div class="left">${footerLogoHtml}</div>
          <div class="center">Page ${pageNo}/${totalPages}</div>
          <div class="right">${FOOTER_DOMAIN}</div>
        </div>
      `;

      const disclaimerBox = `
        <div style="border:1px solid #60a5fa;border-radius:6px;padding:8px 12px;margin-top:10px;font-size:11px;color:#334155;line-height:1.55">
          <div style="font-weight:800;color:#0f172a;margin-bottom:6px">Disclaimer</div>
          This report is auto-generated by thinxview<sup>®</sup> based on sensor data at the time of generation. The Quality of Process (QoP) reflects site conditions during the specified interval and does not guarantee cooling quality. GND Solutions assumes no liability for consequences arising from reliance on this report.
        </div>
      `;

      const extraTablePagesHTML = extraChunks
        .map((rows, idx) => {
          const pageNo = 3 + idx;
          const startIndex = PAGE2_ROWS + OTHER_ROWS * idx;

          const isLast = idx === extraChunks.length - 1;

          return `
  <div class="pb"></div>
  <div class="page">
    <div class="page-content">
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
    ${isLast ? disclaimerBox : ''}
    </div>
  ${footerHtml(pageNo)}
  </div>`;
        })
        .join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111827; }

  .page {
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .card {
    border:1px solid #3054E54D; border-radius:10px; padding:8px; margin-bottom:6px;
    break-inside: avoid; page-break-inside: avoid;
    background:#fff;
  }
  .header-card {
    padding:8px; margin-bottom:6px;
    break-inside: avoid; page-break-inside: avoid;
    background:#fff;
  }
  .title { font-weight:800; color:#3054e5; font-size:12px; padding-bottom:4px; margin-bottom:5px; }
  .kv { display:grid; grid-template-columns: 130px 1fr; row-gap:5px; column-gap:8px; font-size:11px; }
  .kv div:nth-child(2n) { color:#111827; }
  .meta { font-size:10px; color:#6b7280; }
  .analytics { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
  .a { border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center; }
  .anum { font-size:18px; font-weight:800; }
  .acap { font-size:10px; color:#6b7280; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #e5e7eb; padding:7px; font-size:11px; }
  th { background:#e9f1ff; color:#0f172a; font-weight:700; }
  td.c { text-align:center; }
  td.t { font-weight:700; }
  .bad { color:#dc2626; font-weight:700; }

  .h2 { font-weight:800; color:#0f172a; font-size:13px; margin:6px 0 6px; }

  .footerx {
    display:grid; grid-template-columns: 1fr auto 1fr; align-items:center;
    font-size:10px; color:#6b7280;
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
    margin-top: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .footerx .left  { justify-self:start; }
  .footerx .center{ justify-self:center; font-weight:600; }
  .footerx .right { justify-self:end; }
  .pb { page-break-after: always; }

  /* HEADER — tighter columns + smaller logo to match your ref */
  .header {
    display:grid;
    grid-template-columns: 140px 1fr auto 96px;
    align-items:center;
    gap:10px;
  }
  .brand { display:flex; flex-direction:column; gap:6px; }
  .subbrand { font-style:italic; font-weight:700; color:#0b1220; font-size:16px; margin-left:4px; }

  .h1 { font-weight:800; font-size:15px; color:#0f172a; line-height:1.0; white-space:nowrap; }
  .titleBlock .meta { margin-top:2px; line-height:1.0; font-size:8px; }

  .qopBlock { display:flex; flex-direction:column; gap:6px; }
  .qopTitle { font-size:12px; font-weight:700; color:#0f172a; }
  .qopBands { display:flex; flex-wrap:wrap; gap:12px; }

  .qopItem { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#111827; }
  .cb { width:14px; height:14px; border:2px solid #CBD5E1; border-radius:3px; display:inline-block; position:relative; background:#fff; }
  .cb.checked { background:#10B981; border-color:#10B981; }
  .cb.checked::after { content:''; position:absolute; left:3px; top:1px; width:6px; height:10px; border:2px solid #fff; border-top:none; border-left:none; transform:rotate(45deg); }

  .disc {
    border:1px solid #60a5fa; border-radius:6px; padding:8px 12px; background:#fff; color:#334155;
    margin-top:10px;
  }
  .disc-title { font-weight:800; font-size:13px; color:#0f172a; margin-bottom:6px; }
  .disc-body { font-size:11px; line-height:1.55; }
</style>
</head>
<body>

 <!-- ================ PAGE 1 ================ -->
  <div class="page">
    <div class="page-content">
    <!-- HEADER -->
    <div class="header-card">
      <div class="header">
        <div class="brand">
          ${logoHtml}
          <div class="subbrand">thinxlog</div>
        </div>

        <div class="titleBlock">
          <div class="h1">Insights and Summary Report</div>
          <div class="meta">Generated: ${nowStr} | QoP: <strong>${qopPercent}%</strong></div>
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
          <div>
            <div style="margin-bottom:5px"><strong>Model No:</strong> ${trip?.modelNo ?? '—'}</div>
            <div style="margin-bottom:5px"><strong>Part No:</strong> ${trip?.partNo ?? trip?.deviceid ?? trip?.deviceID ?? '—'}</div>
            <div><strong>Sensor Accuracy:</strong> ± 0.3°C, ± 1.5 %RH</div>
          </div>
          <div>
            <div style="margin-bottom:5px"><strong>Serial No:</strong> ${trip?.serialNo ?? '—'}</div>
            <div><strong>Calibration:</strong> Valid</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="title">Trip Information</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
          <div>
            <div style="margin-bottom:5px"><strong>Trip Name:</strong> ${trip?.tripName ?? '—'}</div>
            <div style="margin-bottom:5px"><strong>Managed By:</strong> ${trip?.managedBy ?? '—'}</div>
            <div style="margin-bottom:5px"><strong>Source:</strong> ${trip?.source ?? '—'}</div>
            <div><strong>Destination:</strong> ${trip?.destination ?? '—'}</div>
          </div>
          <div>
            <div style="margin-bottom:5px"><strong>Started On:</strong> ${packets.length ? fmtIST(trip?.startTime ?? packets[0].time) : '—'}</div>
            <div><strong>Ended On:</strong> ${packets.length ? fmtIST(trip?.endTime ?? packets[packets.length - 1].time) : '—'}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="title">Thresholds</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
          <div>
            <div style="margin-bottom:5px"><strong>Temperature:</strong> ${thresholds ? `${thresholds.tempMin}°C min, ${thresholds.tempMax}°C max` : '—'}</div>
            <div><strong>Humidity:</strong> ${thresholds ? `${thresholds.humMin}%RH min, ${thresholds.humMax}%RH max` : '—'}</div>
          </div>
          <div>
            <div style="margin-bottom:5px"><strong>Sampling Interval:</strong> ${thresholds?.samplingMinutes ?? 1} minutes</div>
            <div><strong>Reporting Interval:</strong> ${thresholds?.reportingMinutes ?? 60} minutes</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="title">Analytics</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="border:1px solid #e5e7eb;padding:8px;background:#e9f1ff;font-size:11px">Total Samples</th>
              <th style="border:1px solid #e5e7eb;padding:8px;background:#e9f1ff;font-size:11px">No. of Samples in Alert</th>
              <th style="border:1px solid #e5e7eb;padding:8px;background:#e9f1ff;font-size:11px">Measured Min</th>
              <th style="border:1px solid #e5e7eb;padding:8px;background:#e9f1ff;font-size:11px">Measured Max</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="2" style="border:1px solid #e5e7eb;padding:8px;text-align:center;font-size:20px;font-weight:800">${packets.length}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;font-size:11px">Temp: ${pad2(outOfRangeTemp)}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;font-size:11px">${packets.length ? Math.min(...packets.map((p) => p.temperature)).toFixed(1) : '—'}°C</td>
              <td style="border:1px solid #e5e7eb;padding:8px;font-size:11px">${packets.length ? Math.max(...packets.map((p) => p.temperature)).toFixed(1) : '—'}°C</td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;padding:8px;font-size:11px">Humidity: ${pad2(outOfRangeHum)}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;font-size:11px">${packets.length ? Math.min(...packets.map((p) => p.humidity)).toFixed(1) : '—'}%RH</td>
              <td style="border:1px solid #e5e7eb;padding:8px;font-size:11px">${packets.length ? Math.max(...packets.map((p) => p.humidity)).toFixed(1) : '—'}%RH</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="title">Map <span style="float:right;color:#6b7280;font-weight:600">Trip Duration : ${durationStr}</span></div>
        ${mapBlock}
      </div>
    </div>
    </div>

    ${footerHtml(1)}
  </div>

  <!-- ================ PAGE 2 ================ -->
  <div class="page">
    <div class="page-content">
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
        ? `<div style="border:1px solid #60a5fa;border-radius:6px;padding:8px 12px;margin-top:10px;font-size:11px;color:#334155;line-height:1.55">
           <div style="font-weight:800;color:#0f172a;margin-bottom:6px">Disclaimer</div>
           This report is auto-generated by thinxsense™. The Quality of Process (QoP) reflects transit
           conditions during the specified interval and does not guarantee consignment quality. GND Solutions
           assumes no liability for consequential damage, data loss, or other consequences arising from reliance
           on this report. All actions based on this report are the sole responsibility of the recipient.
         </div>`
        : ''
    }
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
        <View
          ref={pdfChartRef}
          collapsable={false}
          style={{ backgroundColor: 'white', padding: 8, borderRadius: 16 }}>
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
