import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { BleManager, State as BleState } from 'react-native-ble-plx';
import * as IntentLauncher from 'expo-intent-launcher';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

const ble = new BleManager();

export default function QRScanner() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // When screen gets focus ensure scanning is false so Camera isActive
      setIsScanning(false);

      // cleanup not strictly necessary here, but kept for symmetry
      return () => {
        setIsScanning(false);
      };
    }, [])
  );

  // Request camera + BLE + location permissions
  useEffect(() => {
    (async () => {
      const cam = await Camera.requestCameraPermission();
      if (cam !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed.');
        return;
      }

      if (Platform.OS === 'android') {
        if (Platform.Version >= 31) {
          const permissions = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const allGranted = Object.values(permissions).every(
            (status) => status === PermissionsAndroid.RESULTS.GRANTED
          );

          if (!allGranted) {
            Alert.alert(
              'Permissions Required',
              'Bluetooth and Location permissions are required for scanning devices.'
            );
          }
        } else if (Platform.Version >= 23) {
          const hasLoc = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (!hasLoc) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              {
                title: 'Location Permission',
                message: 'Location permission is required for Bluetooth scanning.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert(
                'Permission Required',
                'Location permission is required to scan for Bluetooth devices.'
              );
            }
          }
        }
      }
    })();
  }, []);

  // Ensure Bluetooth is ON
  useEffect(() => {
    (async () => {
      try {
        const state: BleState = await ble.state();
        if (state !== 'PoweredOn' && Platform.OS === 'android') {
          await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS);
        }
      } catch (err) {
        console.log('Bluetooth state check failed', err);
      }
    })();
  }, []);

  const onScanned = useCallback(
    async (value: string) => {
      if (isScanning) return;
      
      try {
        if (!value || value.trim() === '') {
          Alert.alert('Invalid QR Code', 'Please scan a valid device QR code.');
          return;
        }

        setIsScanning(true);
        
        const s: BleState = await ble.state();
        if (s !== 'PoweredOn') {
          Alert.alert('Bluetooth Required', 'Enable Bluetooth and Location first.');
          setIsScanning(false);
          return;
        }
        
        console.log('QR Code scanned:', value);
        
        // Use setTimeout to ensure navigation happens after state update
        setTimeout(() => {
          router.push({
            pathname: '/bluetooth-communication',
            params: { qrCode: value.trim() },
          });
        }, 100);
      } catch (err) {
        console.error('Scan error:', err);
        setIsScanning(false);
      }
    },
    [router, isScanning]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (isScanning) {
        console.log('Already scanning, ignoring duplicate scan');
        return;
      }
      for (const code of codes) {
        if (code.value) {
          console.log('QR Code Value:', code.value);
          setIsScanning(true);
          onScanned(code.value);
          break;
        }
      }
    },
  });

  return (
    <View style={styles.container}>
      {device && !isScanning && (
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <MaterialIcons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Scan the Device</Text>
        <MaterialIcons name="more-vert" size={24} color="#000" />
      </View>

      {/* Overlay Frame */}
      <View style={styles.overlay}>
        <View style={styles.qrFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerText: { color: '#000', fontSize: 18, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrFrame: { width: 250, height: 250 },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'white',
    borderWidth: 4,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});
