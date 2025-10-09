import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureBlePermissions() {
  if (Platform.OS === 'android') return true;
  const sdk = Number(Platform.Version);

  try {
    if (sdk >= 31) {
      const res = await PermissionsAndroid.requestMultiple([
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
      ]);
      return (
        res['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        res['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const loc = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return loc === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch {
    return false;
  }
}
