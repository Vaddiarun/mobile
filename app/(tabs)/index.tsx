import { useEffect } from 'react';
import { Platform, PermissionsAndroid, Alert, View } from 'react-native';
import { Image } from 'expo-image';
import { Camera } from 'react-native-vision-camera';

export default function Home() {
  // Android BLE runtime permissions + camera permission (for QR flow later)
  useEffect(() => {
    const req = async () => {
      const cam = await Camera.requestCameraPermission();
      if (cam !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed.');
        return;
      }
      if (Platform.OS !== 'android') return;

      // Android 12+ requires explicit BLE permissions
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
    req();
  }, []);

  return (
    <View className="flex-1 bg-white">
      {/* Simple header */}
      <View className="px-4 pb-3 pt-12">
        <Image
          source={require('../../assets/images/office.jpg')}
          contentFit="contain"
          style={{ width: 200, height: 80 }}
        />
      </View>
    </View>
  );
}
