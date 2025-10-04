import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import BluetoothStateManager, { useBluetoothState } from 'react-native-bluetooth-state-manager';

export default function QRScanner() {
  const router = useRouter();
  const device = useCameraDevice('back'); // current API
  const btState = useBluetoothState();
  const [isScanning, setIsScanning] = useState(false);

  // permissions: camera + Android BLE runtime
  useEffect(() => {
    const ask = async () => {
      const cam = await Camera.requestCameraPermission();
      if (cam !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed.');
        return;
      }
      if (Platform.OS !== 'android') return;

      if (Platform.Version >= 31) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
      } else if (Platform.Version >= 23) {
        const hasLoc = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!hasLoc) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
      }
    };
    ask();
  }, []);

  // prompt to enable BT if off
  useEffect(() => {
    if (btState === 'PoweredOff') {
      // Android-only prompt to enable BT
      BluetoothStateManager.requestToEnable();
    }
  }, [btState]);

  const onScanned = useCallback(
    (value: string) => {
      if (btState !== 'PoweredOn') {
        Alert.alert('Bluetooth needed', 'Enable Bluetooth and Location first.');
        return;
      }
      setIsScanning(true);
      router.push({ pathname: '/bluetooth-communication', params: { qrCode: value } });
    },
    [btState, router]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (isScanning) return;
      for (const c of codes) if (c.value) onScanned(c.value);
    },
  });

  return (
    <View className="flex-1 bg-black">
      {device && (
        <Camera
          style={{ ...StyleSheet.absoluteFillObject }}
          device={device}
          isActive={!isScanning}
          codeScanner={!isScanning ? codeScanner : undefined}
        />
      )}

      {/* header */}
      <View className="absolute left-5 right-5 top-12 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-white">Scan the Device</Text>
        <MaterialIcons name="more-vert" size={24} color="#fff" />
      </View>

      {/* overlay frame */}
      <View className="flex-1 items-center justify-center">
        <View className="h-64 w-64">
          <View className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-white" />
          <View className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-white" />
          <View className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white" />
          <View className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white" />
        </View>
      </View>
    </View>
  );
}
