// app/trip-configuration.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Geolocation from 'react-native-geolocation-service';
import Geocoder from 'react-native-geocoding';
import {
  AutocompleteDropdown,
  AutocompleteDropdownContextProvider,
} from 'react-native-autocomplete-dropdown';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import axios from 'axios';

import {
  getUser,
  getTrips,
  saveTrip,
  updateTrip,
  getData,
  clearData,
} from '../mmkv-storage/storage';
import LoaderModal from '../components/LoaderModel';
import StatusModal from '../components/StatusModel';
import { BASE_URL } from '../services/apiClient';
import { EndPoints } from '../services/endPoints';
import { getTripHistory } from '../services/RestApiServices/HistoryService';
import { Buffer } from 'buffer';
import { BleManager } from 'react-native-ble-plx';
import { bleSessionStore } from '../services/BleSessionStore';

const bleManager = new BleManager();

const VITE_GOOGLE_API_KEY = 'AIzaSyDsqWho-EyUaPIe2Sxp8X2tw4x7SCLOW-A';

type TripStatus = 0 | 1;
type PacketsPayload = any;

export default function TripConfiguration() {
  const router = useRouter();
  const { tripDataKey, tripStatus: ts, deviceName: dn } = useLocalSearchParams();

  // Retrieve data from MMKV storage instead of params
  const tripData = useMemo(() => {
    if (typeof tripDataKey === 'string' && tripDataKey) {
      const data = getData(tripDataKey);
      // Clean up after retrieval
      if (data) {
        setTimeout(() => clearData(tripDataKey), 1000);
      }
      return data || {};
    }
    return {};
  }, [tripDataKey]);

  const packets: PacketsPayload = tripData.packets || {};
  const packetsCount: any = tripData.packetsCount || {};

  const deviceName = typeof dn === 'string' ? dn : '';
  const initialStatus: TripStatus = ((typeof ts === 'string' ? Number(ts) : ts) as TripStatus) ?? 0;

  const [statusTrip, setStatusTrip] = useState<TripStatus>(initialStatus); // 0 not started, 1 started
  const [customer, setCustomer] = useState<any | string>('');
  const [fileName, setFileName] = useState('');
  const [box, setBox] = useState<any>('');
  const [location, setLocation] = useState<string>('');
  const [locationsRaw, setLocationsRaw] = useState('');
  const [tripName, setTripName] = useState('');
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [profilesData, setProfilesData] = useState<any>(null);
  const [boxProfiles, setBoxProfiles] = useState<any[] | null>(null);
  const [customizeBox, setCustomizeBox] = useState(false);
  const [tempMin, setTempMin] = useState(0);
  const [tempMax, setTempMax] = useState(0);
  const [humMin, setHumMin] = useState(0);
  const [humMax, setHumMax] = useState(0);
  const [modelLoader, setModelLoader] = useState(false);
  const [startLat, setStartLat] = useState({ latitude: 0, longitude: 0 });
  const [stopLat, setStopLat] = useState({ latitude: 0, longitude: 0 });
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [modalMessage, setModalMessage] = useState('');
  const [modalSubMessage, setModalSubMessage] = useState('');
  const [apiTripData, setApiTripData] = useState<any>(null);

  const user = getUser() || {
    data: {
      token: 'dev-token',
      user: {
        Username: 'dev-user',
        Email: 'dev@test.com',
        Phone: '1234567890',
      },
    },
  };

  const userEmail = user?.data?.user?.Email || user?.data?.user?.email || user?.data?.Email || user?.data?.email || 'dev@test.com';
  const userPhone = user?.data?.user?.Phone || user?.data?.user?.phone || user?.data?.Phone || user?.data?.phone || '1234567890';

  const customizeProfile = {
    profileName: 'customize_profile',
    minTemp: 0,
    maxTemp: 0,
    minHum: 0,
    maxHum: 0,
    creator: userEmail,
    createdBy: userEmail,
    phoneNumber: userPhone,
  };

  const allTrips = getTrips() || [];

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to track trip data.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else if (Platform.Version >= 23) {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (hasPermission) return true;

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to track trip data.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  const fetchLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to fetch your current location.'
      );
      return;
    }

    setLoading(true);
    Geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          if (latitude == null || longitude == null) throw new Error('Lat/Lng undefined');

          const coord = `${latitude}, ${longitude}`;
          setLocationsRaw(coord);
          if (statusTrip === 0) {
            setStartLat({ latitude, longitude });
          } else {
            setStopLat({ latitude, longitude });
          }

          const geo = await Geocoder.from(latitude, longitude);
          const address = geo?.results?.[0]?.formatted_address;
          if (!address) throw new Error('No address from coords');
          setLocation(address);
        } catch (e: any) {
          Alert.alert('Location Error', e?.message || 'Something went wrong');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        Alert.alert('Location Error', err.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  const Counter = ({
    value,
    setValue,
    label,
    showLabel = true,
    isHumidity = false,
  }: {
    value: number;
    setValue: (n: number) => void;
    label: string;
    showLabel?: boolean;
    isHumidity?: boolean;
  }) => {
    const [inputValue, setInputValue] = useState(value.toString());

    return (
      <View className="items-center">
        {showLabel && (
          <Text className="mb-1 text-[14px] font-semibold text-[#1a50db]">{label}</Text>
        )}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => {
              const newVal = Math.max(isHumidity ? 0 : -20, value - 1);
              setValue(newVal);
              setInputValue(newVal.toString());
            }}>
            <Text className="text-[20px] font-bold text-[#1a50db]">-</Text>
          </TouchableOpacity>

          <TextInput
            className="h-[40px] w-[50px] rounded-md border border-[#1a50db] text-center text-base text-black"
            value={inputValue}
            onChangeText={(text) => {
              if (text === '' || text === '-' || /^-?\d+$/.test(text)) {
                setInputValue(text);
              }
            }}
            onBlur={() => {
              const num = parseInt(inputValue);
              if (isNaN(num) || inputValue === '' || inputValue === '-') {
                setValue(0);
                setInputValue('0');
              } else {
                const clamped = isHumidity ? Math.max(0, Math.min(100, num)) : num;
                setValue(clamped);
                setInputValue(clamped.toString());
              }
            }}
            keyboardType="numeric"
            returnKeyType="done"
          />

          <TouchableOpacity
            onPress={() => {
              const newVal = Math.min(isHumidity ? 100 : 100, value + 1);
              setValue(newVal);
              setInputValue(newVal.toString());
            }}>
            <Text className="text-[20px] font-bold text-[#1a50db]">+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getProfiles = async (token: string) => {
    if (!deviceName) {
      console.error('❌ No deviceName available for getProfiles');
      setTimeout(() => {
        Alert.alert(
          'Configuration Error',
          'Device name is missing. Please scan the QR code again.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/qr-scanner') }]
        );
      }, 500);
      return;
    }

    setApiLoading(true);
    const apiUrl = `${BASE_URL}/${EndPoints.GET_CUSTOMER_BOX_PROFILES}?deviceID=${deviceName}`;
    const authToken = token || 'dev-token';

    console.log('📡 Fetching profiles...');
    console.log('  URL:', apiUrl);
    console.log('  Device ID:', deviceName);
    console.log('  Token:', authToken ? `${authToken.substring(0, 20)}...` : 'none');

    try {
      const res = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000,
      });

      console.log('✅ Profile API Response:', {
        status: res.status,
        hasData: !!res.data,
        hasCustomerProfiles: !!res.data?.data?.customerProfiles,
        hasBoxProfiles: !!res.data?.data?.boxProfiles,
      });

      const customerProfiles = res?.data?.data?.customerProfiles ?? [];
      const boxList: any[] = res?.data?.data?.boxProfiles ?? [];

      // Check if profiles are empty
      if (customerProfiles.length === 0 || boxList.length === 0) {
        console.error('❌ Empty profiles received from API');
        setModalType('error');
        setModalMessage('No Profiles Available');
        setModalSubMessage('No customer or box profiles found for this device. Cannot start trip.');
        setModelLoader(true);
        return;
      }

      const customized = [...boxList, { boxProfile: customizeProfile }];
      setBoxProfiles(customized);
      setProfilesData(res.data?.data);
      console.log('✅ Profiles loaded successfully:', {
        customerProfiles: customerProfiles.length,
        boxProfiles: boxList.length,
      });
    } catch (e: any) {
      const errorDetails = {
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        message: e?.response?.data?.message || e?.message,
        data: e?.response?.data,
      };

      console.error('❌ Error loading profiles:', errorDetails);

      if (e?.response?.status === 401) {
        console.error('❌ 401 Unauthorized - Token is invalid or expired');
        console.error('   Token used:', authToken ? `${authToken.substring(0, 20)}...` : 'none');
      }

      setModalType('error');
      setModalMessage('Profiles Not Found');
      setModalSubMessage('Unable to load customer and box profiles. Please try again later.');
      setModelLoader(true);
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    Geocoder.init(VITE_GOOGLE_API_KEY, { language: 'en' });
    const now = Date.now();
    setTripName(`Trip_${deviceName}_${now}`);
    setFileName(`${deviceName}_${now}`);
  }, [deviceName]);

  useEffect(() => {
    if (!deviceName) {
      console.error('No deviceName provided');
      setTimeout(() => {
        Alert.alert(
          'Configuration Error',
          'Device name is missing. Please scan the QR code again.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/qr-scanner') }]
        );
      }, 500);
      return;
    }

    console.log('Loading profiles for device:', deviceName);
    console.log('User:', user ? 'authenticated' : 'using dev mode');
    getProfiles(user?.data?.token);
    fetchLocation();

    // Load trip data from API for stop view
    if (statusTrip === 1) {
      const loadTripData = async () => {
        try {
          const historyResult = await getTripHistory('', '', 1, 1000);
          if (historyResult.success && historyResult.data?.trips) {
            const activeTrip = historyResult.data.trips.find(
              (trip: any) => trip.deviceid === deviceName && trip.status !== 'completed'
            );
            if (activeTrip) {
              setApiTripData(activeTrip);
            }
          }
        } catch (error) {
          console.error('Error loading trip data for stop view:', error);
        }
      };
      loadTripData();
    }
  }, [deviceName, statusTrip]);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!customer) e.customer = 'Customer profile is required';
    if (!box) e.box = 'Box profile is required';
    if (!location) e.location = 'Location is required';
    if (!tripName) e.tripName = 'Trip name is required';

    if (customizeBox) {
      if (tempMin >= tempMax) e.temp = 'Min temperature must be less than max temperature';
      if (humMin < 0 || humMin > 100) e.humidity = 'Humidity must be between 0 and 100';
      else if (humMax < 0 || humMax > 100) e.humidity = 'Humidity must be between 0 and 100';
      else if (humMin >= humMax) e.humidity = 'Min humidity must be less than max humidity';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const hasConfiguration = () => {
    return customer !== '' || box !== '';
  };

  const handleBackPress = async () => {
    // Disconnect device and clear active connection if user goes back without stopping
    const activeConn = bleSessionStore.getActiveConnection();
    if (activeConn) {
      try {
        await bleManager.cancelDeviceConnection(activeConn.device.id);
        console.log('🔌 Disconnected device on back press');
      } catch (e) {
        console.log('ℹ️ Device already disconnected');
      }
      bleSessionStore.clearActiveConnection();
    }
    router.push('/(tabs)/qr-scanner');
  };

  const handleReset = () => {
    setCustomer('');
    setBox('');
    setTripName('');
    setStartLat({ latitude: 0, longitude: 0 });
    setStopLat({ latitude: 0, longitude: 0 });
    setLocation('');
    setLocationsRaw('');
    setTempMax(0);
    setTempMin(0);
    setHumMax(0);
    setHumMin(0);
    router.replace('/(tabs)');
  };

  const handleReset2 = () => {
    setCustomer('');
    setBox('');
    setTripName('');
    setStartLat({ latitude: 0, longitude: 0 });
    setStopLat({ latitude: 0, longitude: 0 });
    setLocation('');
    setLocationsRaw('');
    setStatusTrip(0);
    router.replace('/(tabs)');
  };

  const handleStartTrip = async () => {
    if (!validateForm()) return;

    const tripConfig = {
      customerProfile: customer?.customerProfile,
      boxProfile:
        box?.boxProfile?.profileName === 'customize_profile'
          ? {
              ...customizeProfile,
              minTemp: tempMin,
              maxTemp: tempMax,
              minHum: humMin,
              maxHum: humMax,
            }
          : box?.boxProfile,
    };

    const tripStartTime = Date.now();
    const body = {
      username: user?.data?.user?.Username || user?.data?.user?.username || user?.data?.Username || user?.data?.username,
      email: user?.data?.user?.Email || user?.data?.user?.email || user?.data?.Email || user?.data?.email,
      phone: user?.data?.user?.Phone || user?.data?.user?.phone || user?.data?.Phone || user?.data?.phone,
      tripName,
      deviceID: deviceName,
      startLocation: startLat,
      tripConfig,
    };

    console.log('📡 Starting trip...');
    console.log('  Device ID:', deviceName);

    setApiLoading(true);

    try {
      console.log('🔵 Using active connection to send start command...');

      const activeConn = bleSessionStore.getActiveConnection();
      if (!activeConn) {
        throw new Error('No active connection available');
      }

      const { device: connected, serviceUUID, rxUUID, txUUID } = activeConn;

      // Wait for D3 acknowledgment
      const ackPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Start acknowledgment timeout'));
        }, 5000);

        const subscription = connected.monitorCharacteristicForService(
          serviceUUID,
          txUUID,
          async (error, characteristic) => {
            if (error) {
              clearTimeout(timeout);
              subscription.remove();
              reject(error);
              return;
            }
            if (characteristic?.value) {
              const raw = Buffer.from(characteristic.value, 'base64');
              const packetType = raw[0];

              if (packetType === 0xd3) {
                console.log('✅ Received D3 acknowledgment for start command');
                clearTimeout(timeout);
                subscription.remove();
                resolve();
              }
            }
          }
        );
      });

      // Build and send A3 start packet
      const startBuffer = Buffer.alloc(9);
      let offset = 0;
      startBuffer.writeUInt8(0xa3, offset++);
      startBuffer.writeUInt8(0x07, offset++);
      startBuffer.writeUInt16LE(60, offset); // 60 second interval
      offset += 2;
      startBuffer.writeUInt8(1, offset++); // tripOn = true
      startBuffer.writeUInt32LE(0, offset);
      const startCommand = startBuffer.toString('base64');

      await connected.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, startCommand);
      console.log('✅ Sent A3 start command to device (interval: 60s)');

      // Wait for acknowledgment
      await ackPromise;

      // Disconnect after successful start
      await bleManager.cancelDeviceConnection(connected.id);
      bleSessionStore.clearActiveConnection();
      console.log('✅ Device started and disconnected');
    } catch (bleError: any) {
      console.error('❌ BLE error:', bleError);
      bleSessionStore.clearActiveConnection();
      setApiLoading(false);
      const errorMsg = bleError?.message || '';
      if (errorMsg.includes('No active connection') || errorMsg.includes('cancelled')) {
        setModalType('error');
        setModalMessage('Connection Lost');
        setModalSubMessage('Bluetooth connection was lost. Please restart Bluetooth on your phone and try scanning the device again.');
        setModelLoader(true);
      } else {
        setModalType('error');
        setModalMessage('Communication Error');
        setModalSubMessage('Failed to communicate with device. Please try again.');
        setModelLoader(true);
      }
      return;
    }

    // Now make the API call
    axios
      .post(`${BASE_URL}/${EndPoints.START_TRIP}`, body, {
        headers: { Authorization: `Bearer ${user?.data?.token}` },
      })
      .then((res) => {
        console.log('✅ Trip started successfully:', res.data);
        // Store trip with start time for filtering later
        saveTrip({ ...body, tripStartTime });
        setModalType('success');
        setModelLoader(true);
      })
      .catch((err) => {
        console.error('❌ Start trip error:', err?.response?.data || err?.message);
        const isValidationError =
          err?.response?.status === 400 ||
          err?.response?.status === 403 ||
          err?.response?.data?.message?.toLowerCase().includes('validation');
        const errorMsg = isValidationError
          ? 'You cannot start/stop a trip for another user'
          : err?.response?.data?.message || 'Failed to start trip. Please try again.';
        setModalType('error');
        setModalMessage('Cannot Start Trip');
        setModalSubMessage(errorMsg);
        setModelLoader(true);
      })
      .finally(() => setApiLoading(false));
  };

  const handleStopTrip = async () => {
    if (stopLat.latitude === 0) {
      Alert.alert('Location', 'Location is required');
      return;
    }

    // Check API for active trip instead of local storage
    let activeTrip = null;
    try {
      const historyResult = await getTripHistory('', '', 1, 1000);
      if (historyResult.success && historyResult.data?.trips) {
        activeTrip = historyResult.data.trips.find(
          (trip: any) => trip.deviceid === deviceName && trip.status !== 'completed'
        );
        setApiTripData(activeTrip); // Store for display
      }
    } catch (error) {
      console.error('Error checking for active trip:', error);
    }

    if (!activeTrip) {
      Alert.alert('Error', 'No active trip found for this device');
      return;
    }

    setApiLoading(true);

    let actualPackets: any[] = [];
    let actualTotalPackets = 0;
    let batteryPercentage = 0;
    let payloadLength: number | undefined;

    try {
      console.log('🔵 Using active connection to request data and send stop command...');

      const activeConn = bleSessionStore.getActiveConnection();
      if (!activeConn) {
        throw new Error('No active connection available');
      }

      const { device: connected, serviceUUID, rxUUID, txUUID } = activeConn;
      const collectedPackets: any[] = [];
      let d4Info: any = null;

      // Request data from device
      console.log('📥 Requesting data from device...');

      const dataPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Data request timeout'));
        }, 15000);

        const subscription = connected.monitorCharacteristicForService(
          serviceUUID,
          txUUID,
          async (error, characteristic) => {
            if (error) {
              clearTimeout(timeout);
              subscription.remove();
              reject(error);
              return;
            }
            if (characteristic?.value) {
              const raw = Buffer.from(characteristic.value, 'base64');
              const packetType = raw[0];

              if (packetType === 0xd4) {
                const parsed = {
                  totalPackets: raw.readUInt16LE(12),
                  batteryPercentage: raw.readUInt8(18),
                };
                d4Info = parsed;
                console.log('📦 D4: Total packets:', parsed.totalPackets);
                const ack = Buffer.alloc(6);
                ack.writeUInt8(0xa5, 0);
                ack.writeUInt8(0x06, 1);
                ack.writeUInt32LE(0, 2);
                await connected.writeCharacteristicWithResponseForService(
                  serviceUUID,
                  rxUUID,
                  ack.toString('base64')
                );
              } else if (packetType === 0xd5) {
                let o = 2;
                const num = raw.readUInt8(o++);
                for (let i = 0; i < num; i++) {
                  const time = raw.readUInt32LE(o);
                  o += 4;
                  const temperature = raw.readInt16LE(o) / 10;
                  o += 2;
                  const humidity = raw.readUInt8(o++);
                  collectedPackets.push({ time, temperature, humidity });
                }
                console.log('📦 D5: Collected', num, 'packets, total:', collectedPackets.length);
                const ack = Buffer.alloc(6);
                ack.writeUInt8(0xa5, 0);
                ack.writeUInt8(0x06, 1);
                ack.writeUInt32LE(0, 2);
                await connected.writeCharacteristicWithResponseForService(
                  serviceUUID,
                  rxUUID,
                  ack.toString('base64')
                );
              } else if (packetType === 0xd6) {
                console.log('📦 D6: Data transfer complete');
                try {
                  const ack = Buffer.alloc(6);
                  ack.writeUInt8(0xa5, 0);
                  ack.writeUInt8(0x06, 1);
                  ack.writeUInt32LE(0, 2);
                  await connected.writeCharacteristicWithResponseForService(
                    serviceUUID,
                    rxUUID,
                    ack.toString('base64')
                  );

                  // Send stop command immediately while still connected
                  const stopBuffer = Buffer.alloc(9);
                  stopBuffer.writeUInt8(0xa3, 0);
                  stopBuffer.writeUInt8(0x07, 1);
                  stopBuffer.writeUInt16LE(60, 2);
                  stopBuffer.writeUInt8(0, 4);
                  stopBuffer.writeUInt32LE(0, 5);
                  await connected.writeCharacteristicWithResponseForService(
                    serviceUUID,
                    rxUUID,
                    stopBuffer.toString('base64')
                  );
                  console.log('✅ Sent A3 stop command');
                } catch (writeError) {
                  console.log('ℹ️ Device disconnected during stop command (expected)');
                }

                clearTimeout(timeout);
                subscription.remove();
                resolve();
              }
            }
          }
        );
      });

      // Send A4 data request
      const a4Buffer = Buffer.alloc(6);
      a4Buffer.writeUInt8(0xa4, 0);
      a4Buffer.writeUInt8(6, 1);
      a4Buffer.writeUInt32LE(0, 2);
      await connected.writeCharacteristicWithResponseForService(
        serviceUUID,
        rxUUID,
        a4Buffer.toString('base64')
      );

      await dataPromise;

      // HARD FILTER: Remove all packets before trip start time
      // Extract timestamp from trip name: Trip_TF900001_1761717702649
      let tripStartTime = 0;
      const tripNameMatch = activeTrip.tripName?.match(/_([0-9]+)$/);
      if (tripNameMatch) {
        tripStartTime = parseInt(tripNameMatch[1]);
      }

      // Fallback: check local storage
      if (!tripStartTime) {
        const localTrips = getTrips() || [];
        const localTrip = localTrips.find((t: any) => t.deviceID === deviceName);
        tripStartTime = localTrip?.tripStartTime || 0;
      }

      const tripStartSeconds = Math.floor(tripStartTime / 1000);

      // console.log('📊 FILTERING packets:');
      // console.log('  Trip name:', activeTrip.tripName);
      // console.log('  Trip start time (ms):', tripStartTime);
      // console.log('  Trip start time (seconds):', tripStartSeconds);
      // console.log('  Total packets from device:', collectedPackets.length);

      if (collectedPackets.length > 0) {
        // console.log('  First packet time:', collectedPackets[0].time);
        // console.log('  Last packet time:', collectedPackets[collectedPackets.length - 1].time);
      }

      // Filter: Only keep packets where packet.time >= trip start time (in seconds)
      actualPackets = collectedPackets.filter((packet: any) => {
        const keep = packet.time >= tripStartSeconds;
        if (!keep) {
          // console.log('  ❌ Removing packet with time:', packet.time, '(before trip start)');
        }
        return keep;
      });

      actualTotalPackets = d4Info?.totalPackets || collectedPackets.length;
      batteryPercentage = d4Info?.batteryPercentage || 0;

      // console.log('✅ Filtering complete:');
      // console.log('  Packets kept:', actualPackets.length);
      // console.log('  Packets removed:', collectedPackets.length - actualPackets.length);

      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        await bleManager.cancelDeviceConnection(connected.id);
      } catch (e: any) {
        // Device may have already powered off after stop command - this is expected
        console.log('ℹ️ Device already disconnected (powered off)');
      }
      bleSessionStore.clearActiveConnection();
      console.log('✅ Device stopped and disconnected');
    } catch (bleError: any) {
      console.log('⚠️ BLE error:', bleError);
      bleSessionStore.clearActiveConnection();
      setApiLoading(false);
      const errorMsg = bleError?.message || '';
      if (errorMsg.includes('No active connection') || errorMsg.includes('cancelled')) {
        setModalType('error');
        setModalMessage('Connection Lost');
        setModalSubMessage('Bluetooth connection was lost. Please restart Bluetooth on your phone and try scanning the device again.');
        setModelLoader(true);
      } else {
        setModalType('error');
        setModalMessage('Communication Error');
        setModalSubMessage('Failed to communicate with device. Please try again.');
        setModelLoader(true);
      }
      return;
    }

    const bufferOne = Buffer.from(JSON.stringify(actualPackets));
    const dataString = Array.from(bufferOne).join(',');

    const body = {
      tripName: activeTrip.tripName,
      fileName: `${fileName}.csv`,
      data: dataString,
      endLocation: stopLat,
      Battery: `${batteryPercentage}`,
      totalPackets: actualTotalPackets || actualPackets.length,
      deviceName,
      packetType: 213,
      ...(payloadLength != null && { payloadLength }),
    };

    console.log('📡 Stopping trip with', actualPackets.length, 'packets');

    // Now make the API call
    axios
      .post(`${BASE_URL}/${EndPoints.STOP_TRIP}`, body, {
        headers: {
          Authorization: `Bearer ${user?.data?.token}`,
          'Content-Type': 'application/json',
        },
      })
      .then((res) => {
        console.log('✅ Trip stopped successfully:', res.data);
        const bufferOne = Buffer.from(JSON.stringify(actualPackets));
        const dataString = Array.from(bufferOne).join(',');
        updateTrip(deviceName, {
          status: 'Stopped',
          stopTimestamp: Date.now(),
          stopLocation: stopLat,
          data: dataString,
          packets: actualPackets,
          batteryPercentage: batteryPercentage,
          totalPackets: actualTotalPackets || actualPackets.length,
        });
        setModalType('success');
        setModelLoader(true);
      })
      .catch((err) => {
        console.error('❌ Stop trip error:', err?.response?.data || err?.message);
        const isValidationError =
          err?.response?.status === 400 ||
          err?.response?.status === 403 ||
          err?.response?.data?.message?.toLowerCase().includes('validation');
        const errorMsg = isValidationError
          ? 'You cannot start/stop a trip for another user'
          : err?.response?.data?.message || 'Failed to stop trip. Please try again.';
        setModalType('error');
        setModalMessage('Cannot Stop Trip');
        setModalSubMessage(errorMsg);
        setModelLoader(true);
      })
      .finally(() => setApiLoading(false));
  };

  return (
    <AutocompleteDropdownContextProvider>
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-1">
          <Pressable
            className="h-10 w-10 items-center justify-center"
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <MaterialCommunityIcons name="arrow-left" size={22} color="#000" />
          </Pressable>
          <Text className="text-base font-semibold text-black">Trip Configuration</Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Start view */}
          {statusTrip === 0 ? (
            <View>
              {/* Customer */}
              <Text className="mt-3 text-sm font-medium text-black">Customer Profile:</Text>
              <AutocompleteDropdown
                clearOnFocus={false}
                closeOnBlur
                closeOnSubmit={false}
                initialValue={customer?.customerProfile?.profileName || ''}
                dataSet={profilesData?.customerProfiles}
                editable={false}
                showClear={false}
                textInputProps={{
                  placeholder: 'Select customer profile',
                  placeholderTextColor: '#000',
                  value: customer?.customerProfile?.profileName || '',
                  style: { color: '#000' },
                }}
                containerStyle={{ elevation: 0, backgroundColor: '#fff', height: 60 }}
                inputContainerStyle={{
                  borderWidth: 0.8,
                  borderColor: '#7D94EF',
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: '#fff',
                }}
                suggestionsListContainerStyle={{
                  borderWidth: 0.8,
                  borderColor: '#7D94EF',
                  height: 205,
                }}
                renderItem={(item: any) => (
                  <Text key={`customer-${item.id}`} style={{ color: '#000', padding: 15 }}>
                    {item.customerProfile.profileName}
                  </Text>
                )}
                onSelectItem={(item) => setCustomer(item as never)}
              />
              {errors.customer ? (
                <Text className="ml-1 mt-1 text-[12px] text-red-600">{errors.customer}</Text>
              ) : null}

              {/* Box */}
              <Text className="mt-3 text-sm font-medium text-black">Box Profile:</Text>
              {box?.boxProfile?.profileName !== 'customize_profile' ? (
                <AutocompleteDropdown
                  clearOnFocus={false}
                  closeOnBlur
                  closeOnSubmit={false}
                  initialValue={box?.boxProfile?.profileName || ''}
                  dataSet={boxProfiles || []}
                  editable={false}
                  showClear={false}
                  textInputProps={{
                    placeholder: 'Select box profile',
                    placeholderTextColor: '#000',
                    value: box?.boxProfile?.profileName || '',
                    style: { color: '#000' },
                  }}
                  containerStyle={{ elevation: 0, backgroundColor: '#fff', height: 60 }}
                  inputContainerStyle={{
                    borderWidth: 0.8,
                    borderColor: '#7D94EF',
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: '#fff',
                  }}
                  suggestionsListContainerStyle={{
                    borderWidth: 0.8,
                    borderColor: '#7D94EF',
                    height: 205,
                  }}
                  renderItem={(item: any) => (
                    <Text
                      key={`box-${item.id || item.boxProfile?.profileName}`}
                      style={{ color: '#000', padding: 15 }}>
                      {item?.boxProfile?.profileName}
                    </Text>
                  )}
                  onSelectItem={(item: any) => {
                    if (item?.boxProfile?.profileName === 'customize_profile') {
                      setCustomizeBox(true);
                      setBox(item);
                    } else {
                      setCustomizeBox(false);
                      setBox(item);
                    }
                  }}
                />
              ) : (
                <View className="mt-2 rounded-md border border-[#1a50db] p-3">
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-[16px] text-[#444]">Temp (°C)</Text>
                    <View className="flex-row items-center gap-6">
                      <Counter value={tempMin} setValue={setTempMin} label="Min" />
                      <Counter value={tempMax} setValue={setTempMax} label="Max" />
                    </View>
                  </View>

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-[16px] text-[#444]">Humid (%Rh)</Text>
                    <View className="flex-row items-center gap-6">
                      <Counter
                        value={humMin}
                        setValue={setHumMin}
                        label="Min"
                        showLabel={false}
                        isHumidity={true}
                      />
                      <Counter
                        value={humMax}
                        setValue={setHumMax}
                        label="Max"
                        showLabel={false}
                        isHumidity={true}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    className="self-end pt-2"
                    onPress={() => {
                      setCustomizeBox(false);
                      setBox('');
                      setHumMax(0);
                      setHumMin(0);
                      setTempMax(0);
                      setTempMin(0);
                    }}>
                    <Text className="text-center font-bold text-[#1a50db]">Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {errors.box ? (
                <Text className="ml-1 mt-1 text-[12px] text-red-600">{errors.box}</Text>
              ) : null}
              {errors.temp ? (
                <Text className="ml-1 mt-1 text-[12px] text-red-600">{errors.temp}</Text>
              ) : null}
              {errors.humidity ? (
                <Text className="ml-1 mt-1 text-[12px] text-red-600">{errors.humidity}</Text>
              ) : null}

              {/* Location */}
              <Text className="mt-3 text-sm font-medium text-black">Location:</Text>
              <View className="mt-1 flex-row items-center">
                <TextInput
                  className="flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                  style={{ height: location === '' ? 60 : undefined, paddingRight: 40 }}
                  value={location}
                  editable={false}
                  placeholder="Current Location"
                  placeholderTextColor="#000"
                  selection={{ start: 0, end: 0 }}
                  multiline
                />
                <TouchableOpacity
                  className="absolute right-3 h-8 w-8 items-center justify-center rounded-md"
                  onPress={fetchLocation}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#1a50db" />
                  ) : (
                    <MaterialIcons name="my-location" size={24} color="#1a50db" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.location ? (
                <Text className="ml-1 mt-1 text-[12px] text-red-600">{errors.location}</Text>
              ) : null}

              {/* Trip Name */}
              <Text className="mt-3 text-sm font-medium text-black">Trip Name:</Text>
              <View className="mt-1 flex-row items-center">
                <TextInput
                  className="h-[60px] flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                  value={tripName}
                  onChangeText={setTripName}
                  editable={false}
                  selection={{ start: 0, end: 0 }}
                />
              </View>
              {errors.tripName ? (
                <Text className="ml-1 mt-1 text-[12px] text-red-600">{errors.tripName}</Text>
              ) : null}
            </View>
          ) : (
            // Started view - Load trip data from API on mount
            <View>
              <Text className="mt-3 text-sm font-medium text-black">Customer Profile:</Text>
              <TextInput
                className="mt-1 h-[60px] flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                value={apiTripData?.tripConfig?.customerProfile?.profileName || ''}
                editable={false}
                selection={{ start: 0, end: 0 }}
              />

              <Text className="mt-3 text-sm font-medium text-black">Box Profile:</Text>
              <TextInput
                className="mt-1 h-[60px] flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                value={apiTripData?.tripConfig?.boxProfile?.profileName || ''}
                editable={false}
                selection={{ start: 0, end: 0 }}
              />

              <Text className="mt-3 text-sm font-medium text-black">Location:</Text>
              <View className="mt-1 flex-row items-center">
                <TextInput
                  className="flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                  style={{ height: location === '' ? 60 : undefined, paddingRight: 40 }}
                  value={location}
                  editable={false}
                  placeholder="Current Location"
                  placeholderTextColor="#000"
                  selection={{ start: 0, end: 0 }}
                  multiline
                />
                <TouchableOpacity
                  className="absolute right-3 h-8 w-8 items-center justify-center rounded-md"
                  onPress={fetchLocation}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#1a50db" />
                  ) : (
                    <MaterialIcons name="my-location" size={24} color="#1a50db" />
                  )}
                </TouchableOpacity>
              </View>

              <Text className="mt-3 text-sm font-medium text-black">Trip Name:</Text>
              <TextInput
                className="mt-1 h-[60px] flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                value={apiTripData?.tripName || ''}
                editable={false}
                selection={{ start: 0, end: 0 }}
              />
            </View>
          )}

          {/* Submit */}
          <View className="items-center py-5">
            <TouchableOpacity
              disabled={
                location === '' ||
                (statusTrip === 0 &&
                  (!profilesData?.customerProfiles?.length || !boxProfiles?.length))
              }
              onPress={statusTrip === 0 ? handleStartTrip : handleStopTrip}
              className={`h-[56px] w-1/2 items-center justify-center rounded-full ${
                location === '' ||
                (statusTrip === 0 &&
                  (!profilesData?.customerProfiles?.length || !boxProfiles?.length))
                  ? 'bg-gray-300'
                  : 'bg-[#1a50db]'
              }`}>
              <Text
                className={`text-center text-base font-semibold ${location === '' || (statusTrip === 0 && (!profilesData?.customerProfiles?.length || !boxProfiles?.length)) ? 'text-gray-600' : 'text-white'}`}>
                {statusTrip === 0 ? 'Start' : 'Stop'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <LoaderModal visible={apiLoading} />
        <StatusModal
          visible={modelLoader}
          type={modalType}
          message={
            modalMessage ||
            (statusTrip === 0 ? `${deviceName} Sensor Started` : `${deviceName} Sensor Stopped`)
          }
          subMessage={
            modalSubMessage ||
            (statusTrip === 0
              ? 'Your device is now recording data. All set!'
              : 'The device has been turned off. Data capture has ended.')
          }
          onClose={() => {
            setModelLoader(false);
            const wasError = modalType === 'error';
            setModalMessage('');
            setModalSubMessage('');
            if (modalType === 'success') {
              if (statusTrip === 0) {
                handleReset();
              } else {
                handleReset2();
              }
            } else if (wasError && modalMessage === 'Profiles Not Found') {
              router.replace('/(tabs)');
            }
          }}
        />
      </SafeAreaView>
    </AutocompleteDropdownContextProvider>
  );
}
