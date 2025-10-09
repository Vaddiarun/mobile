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

import { getUser, getTrips, saveTrip, updateTrip, getData, clearData } from '../mmkv-storage/storage';
import LoaderModal from '../components/LoaderModel';
import StatusModal from '../components/StatusModel';
import { BASE_URL } from '../services/apiClient';
import { EndPoints } from '../services/endPoints';
import { Buffer } from 'buffer';

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
  const [stopLat, setStopLong] = useState({ latitude: 0, longitude: 0 });
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

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

  const customizeProfile = {
    profileName: 'customize_profile',
    minTemp: 0,
    maxTemp: 0,
    minHum: 0,
    maxHum: 0,
    creator: user?.data?.user?.Email || 'dev@test.com',
    createdBy: user?.data?.user?.Email || 'dev@test.com',
    phoneNumber: user?.data?.user?.Phone || '1234567890',
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
          setStopLong({ latitude, longitude });

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

  const Counter = ({ value, setValue }: { value: number; setValue: (n: number) => void }) => (
    <View className="items-center">
      <View className="flex-row items-center gap-4">
        <TouchableOpacity onPress={() => setValue(value - 1)}>
          <Text className="text-[26px] font-bold text-[#1a50db]">-</Text>
        </TouchableOpacity>

        <View className="h-[35px] w-[35px] items-center justify-center rounded-md border border-[#1a50db]">
          <Text className="text-base">{value}</Text>
        </View>

        <TouchableOpacity onPress={() => setValue(value + 1)}>
          <Text className="text-[26px] font-bold text-[#1a50db]">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

      const boxList: any[] = res?.data?.data?.boxProfiles ?? [];
      const customized = [...boxList, { boxProfile: customizeProfile }];
      setBoxProfiles(customized);
      setProfilesData(res.data?.data);
      console.log('✅ Profiles loaded successfully:', {
        customerProfiles: res.data?.data?.customerProfiles?.length,
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

      console.log('⚠️ Using development mode - loading default profiles');

      const defaultCustomerProfile = {
        id: 'default-customer',
        customerProfile: {
          profileName: 'Default Customer',
          email: user?.data?.user?.Email || 'dev@test.com',
          phone: user?.data?.user?.Phone || '1234567890',
        },
      };

      const defaultBoxProfile = {
        id: 'default-box',
        boxProfile: {
          profileName: 'Default Box',
          minTemp: -20,
          maxTemp: 60,
          minHum: 10,
          maxHum: 90,
        },
      };

      setProfilesData({
        customerProfiles: [defaultCustomerProfile],
        boxProfiles: [defaultBoxProfile],
      });
      setBoxProfiles([defaultBoxProfile, { boxProfile: customizeProfile }]);
      console.log('✅ Default profiles loaded for development mode');
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
  }, [deviceName]);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!customer) e.customer = 'Customer profile is required';
    if (!box) e.box = 'Box profile is required';
    if (!location) e.location = 'Location is required';
    if (!tripName) e.tripName = 'Trip name is required';

    if (customizeBox) {
      if (tempMin === 0) e.temp = 'Temperature min is required';
      else if (tempMax === 0) e.temp = 'Temperature max is required';
      else if (tempMin < -20 || tempMin > 80) e.temp = 'Temperature min must be between -20 and 80';
      else if (tempMax < -20 || tempMax > 80) e.temp = 'Temperature max must be between -20 and 80';
      else if (tempMin > tempMax) e.temp = 'Temperature min cannot be greater than max';
      if (humMin === 0) e.humidity = 'Humidity min is required';
      else if (humMax === 0) e.humidity = 'Humidity max is required';
      else if (humMin < 0 || humMin > 100) e.humidity = 'Humidity min must be between 0 and 100';
      else if (humMax < 0 || humMax > 100) e.humidity = 'Humidity max must be between 0 and 100';
      else if (humMin > humMax) e.humidity = 'Humidity min cannot be greater than max';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReset = () => {
    setCustomer('');
    setBox('');
    setTripName('');
    setStopLong({ latitude: 0, longitude: 0 });
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
    setStopLong({ latitude: 0, longitude: 0 });
    setLocation('');
    setLocationsRaw('');
    setStatusTrip(0);
    router.replace('/(tabs)');
  };

  const handleStartTrip = () => {
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
      username: user?.data?.user?.Username,
      email: user?.data?.user?.Email,
      phone: user?.data?.user?.Phone,
      tripName,
      deviceID: deviceName,
      location: locationsRaw,
      tripConfig,
      timestamp: tripStartTime,
      createdAt: tripStartTime,
      status: 'Started',
    };

    console.log('📡 Starting trip...');
    console.log('  Device ID:', deviceName);
    console.log('  Token:', user?.data?.token ? `${user.data.token.substring(0, 20)}...` : 'none');

    setApiLoading(true);
    axios
      .post(`${BASE_URL}/${EndPoints.START_TRIP}`, body, {
        headers: { Authorization: `Bearer ${user?.data?.token}` },
      })
      .then((res) => {
        console.log('✅ Trip started successfully:', res.data);
        saveTrip(body);
        setModalType('success');
        setModelLoader(true);
      })
      .catch((err) => {
        console.error('❌ Start trip error:', err?.response?.data || err?.message);
        Alert.alert(
          'Error',
          err?.response?.data?.message || 'Failed to start trip. Please try again.'
        );
      })
      .finally(() => setApiLoading(false));
  };

  const handleStopTrip = () => {
    if (stopLat.latitude === 0) {
      Alert.alert('Location', 'Location is required');
      return;
    }

    const actualPackets = packets?.packets || [];
    const bufferOne = Buffer.from(JSON.stringify(actualPackets));
    const dataString = Array.from(bufferOne).join(',');

    const actualTotalPackets = packetsCount?.expected?.totalPackets ?? actualPackets.length ?? 0;

    // Find the active trip for this device
    const activeTrip = allTrips.find(
      (trip: any) => trip.deviceID === deviceName && trip.status === 'Started'
    );

    if (!activeTrip) {
      Alert.alert('Error', 'No active trip found for this device');
      return;
    }

    const body = {
      tripName: activeTrip.tripName,
      fileName: `${fileName}.csv`,
      data: dataString,
      location: stopLat,
      Battery: `${packetsCount?.expected?.batteryPercentage ?? 0}`,
      totalPackets: actualTotalPackets,
      deviceName,
      packetType: 213,
      ...(packets?.allData?.payloadLength != null && {
        payloadLength: packets.allData.payloadLength,
      }),
    };

    console.log('📡 Stopping trip...');
    console.log('  Device Name:', deviceName);
    console.log('  Total Packets:', actualTotalPackets);
    console.log('  Actual Data Packets:', actualPackets.length);
    console.log('  Packets Data:', JSON.stringify(actualPackets, null, 2)); // Pretty print

    console.log('  Token:', user?.data?.token ? `${user.data.token.substring(0, 20)}...` : 'none');

    setApiLoading(true);
    axios
      .post(`${BASE_URL}/${EndPoints.STOP_TRIP}`, body, {
        headers: {
          Authorization: `Bearer ${user?.data?.token}`,
          'Content-Type': 'application/json',
        },
      })
      .then((res) => {
        console.log('✅ Trip stopped successfully:', res.data);
        updateTrip(deviceName, {
          status: 'Stopped',
          stopTimestamp: Date.now(),
          stopLocation: stopLat,
        });
        setModalType('success');
        setModelLoader(true);
      })
      .catch((err) => {
        console.error('❌ Stop trip error:', err?.response?.data || err?.message);
        Alert.alert(
          'Error',
          err?.response?.data?.message || 'Failed to stop trip. Please try again.'
        );
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
            onPress={() => router.push('/(tabs)/qr-scanner')}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <MaterialCommunityIcons name="arrow-left" size={22} color="#000" />
          </Pressable>
          <Text className="text-base font-semibold text-black">Trip Configuration</Text>
          <Pressable className="h-10 w-10 items-center justify-center">
            <MaterialCommunityIcons name="dots-vertical" size={20} color="#000" />
          </Pressable>
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
                  <Text key={item.id} style={{ color: '#000', padding: 15 }}>
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
                    <Text key={item.id} style={{ color: '#000', padding: 15 }}>
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
                  <View className="flex-row items-center justify-end gap-16 pr-4">
                    <Text className="text-[16px] font-semibold text-[#1a50db]">Min</Text>
                    <Text className="text-[16px] font-semibold text-[#1a50db]">Max</Text>
                  </View>

                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-[16px] text-[#444]">Temperature</Text>
                    <View className="w-2/3 flex-row items-center justify-between">
                      <Counter value={tempMin} setValue={setTempMin} />
                      <Counter value={tempMax} setValue={setTempMax} />
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-[16px] text-[#444]">Humidity</Text>
                    <View className="w-2/3 flex-row items-center justify-between">
                      <Counter value={humMin} setValue={setHumMin} />
                      <Counter value={humMax} setValue={setHumMax} />
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
                  style={{ height: location === '' ? 60 : undefined }}
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
            // Started view
            <View>
              <Text className="mt-3 text-sm font-medium text-black">Customer Profile:</Text>
              <TextInput
                className="mt-1 h-[60px] flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                value={
                  allTrips?.[0]?.tripConfig?.customerProfile &&
                  typeof allTrips[0].tripConfig.customerProfile === 'object'
                    ? allTrips[0].tripConfig.customerProfile.profileName || ''
                    : ''
                }
                editable={false}
                selection={{ start: 0, end: 0 }}
              />

              <Text className="mt-3 text-sm font-medium text-black">Box Profile:</Text>
              <TextInput
                className="mt-1 h-[60px] flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                value={
                  allTrips?.[0]?.tripConfig?.boxProfile &&
                  typeof allTrips[0].tripConfig.boxProfile === 'object'
                    ? allTrips[0].tripConfig.boxProfile.profileName || ''
                    : ''
                }
                editable={false}
                selection={{ start: 0, end: 0 }}
              />

              <Text className="mt-3 text-sm font-medium text-black">Location:</Text>
              <View className="mt-1 flex-row items-center">
                <TextInput
                  className="flex-1 rounded-md border border-[#7D94EF] bg-white p-3 text-black"
                  style={{ height: location === '' ? 60 : undefined }}
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
                value={allTrips?.[0]?.tripName || ''}
                editable={false}
                selection={{ start: 0, end: 0 }}
              />
            </View>
          )}

          {/* Submit */}
          <View className="items-center py-5">
            <TouchableOpacity
              disabled={location === ''}
              onPress={statusTrip === 0 ? handleStartTrip : handleStopTrip}
              className={`h-[56px] w-1/2 items-center justify-center rounded-full ${
                location === '' ? 'bg-gray-300' : 'bg-[#1a50db]'
              }`}>
              <Text
                className={`text-center text-base font-semibold ${location === '' ? 'text-gray-600' : 'text-white'}`}>
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
            statusTrip === 0 ? `${deviceName} Sensor Started` : `${deviceName} Sensor Stopped`
          }
          subMessage={
            statusTrip === 0
              ? 'Your device is now recording data. All set!'
              : 'The device has been turned off. Data capture has ended.'
          }
          onClose={() => {
            setModelLoader(false);
            if (modalType === 'success') {
              if (statusTrip === 0) {
                handleReset();
              } else {
                handleReset2();
              }
            }
          }}
        />
      </SafeAreaView>
    </AutocompleteDropdownContextProvider>
  );
}
