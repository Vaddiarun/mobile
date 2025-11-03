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
import StatusModal from '../../components/StatusModel';

const ble = new BleManager();

export default function QRScanner() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      // Reset camera state when screen gets focus
      setIsScanning(false);
      setCameraActive(true);
      setRetryCount(0);

      // Failsafe: restart camera after 2 seconds if device is not available
      const failsafeTimer = setTimeout(() => {
        if (!device) {
          console.log('Camera failsafe: restarting camera');
          setCameraActive(false);
          setTimeout(() => setCameraActive(true), 100);
        }
      }, 2000);

      return () => {
        clearTimeout(failsafeTimer);
        setIsScanning(false);
      };
    }, [device])
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

  // Bluetooth state will be checked in bluetooth-communication screen

  const onScanned = useCallback(
    async (value: string) => {
      if (isScanning) return;

      try {
        const trimmedValue = value?.trim();
        
        // Validate QR code format (should be alphanumeric, 6-20 chars)
        if (!trimmedValue || trimmedValue.length < 6 || trimmedValue.length > 20) {
          setErrorMessage('Invalid QR code format. Please scan a valid device QR code.');
          setShowErrorModal(true);
          return;
        }
        
        // Check if contains only valid characters (alphanumeric)
        if (!/^[a-zA-Z0-9]+$/.test(trimmedValue)) {
          setErrorMessage('QR code contains invalid characters. Please scan a valid device QR code.');
          setShowErrorModal(true);
          return;
        }

        setIsScanning(true);
        console.log('QR Code scanned:', trimmedValue);

        setTimeout(() => {
          router.push({
            pathname: '/bluetooth-communication',
            params: { qrCode: trimmedValue },
          });
        }, 100);
      } catch (err) {
        console.error('Scan error:', err);
        setErrorMessage('Failed to process QR code. Please try again.');
        setShowErrorModal(true);
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

  // Camera restart function
  const restartCamera = useCallback(() => {
    if (retryCount < 3) {
      console.log(`Restarting camera (attempt ${retryCount + 1})`);
      setCameraActive(false);
      setRetryCount(prev => prev + 1);
      setTimeout(() => setCameraActive(true), 200);
    }
  }, [retryCount]);

  return (
    <View style={styles.container}>
      {device && !isScanning && cameraActive && (
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
          onError={(error) => {
            console.error('Camera error:', error);
            // Trigger failsafe for session/invalid-output-configuration or any camera error
            if (error?.message?.includes('session/invalid-output-configuration') || error?.message?.includes('session/')) {
              console.log('Camera session error detected - triggering failsafe');
            }
            restartCamera();
          }}
        />
      )}
      
      {/* Camera not working fallback */}
      {(!device || !cameraActive) && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20 }}>Camera not available</Text>
          <TouchableOpacity 
            onPress={restartCamera}
            style={{ backgroundColor: '#1a50db', padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>Retry Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <MaterialIcons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Scan the Device</Text>
        <View style={{ width: 28 }} />
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
      
      <StatusModal
        visible={showErrorModal}
        type="error"
        message="Invalid QR Code"
        subMessage={errorMessage}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage('');
          setIsScanning(false);
          // Restart camera smoothly
          setCameraActive(false);
          setTimeout(() => setCameraActive(true), 100);
        }}
      />
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
