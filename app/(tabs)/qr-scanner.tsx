import React, { useCallback, useEffect, useState } from 'react';
import { useTour } from '../../components/AppTourContext';
import TourOverlay from '../../components/TourOverlay';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import StatusModal from '../../components/StatusModel';

export default function QRScanner() {
  const router = useRouter();
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { tourActive, currentStep, nextStep, skipTour } = useTour();

  useFocusEffect(
    useCallback(() => {
      console.log('QR Scanner: Screen focused - enabling camera');
      setIsScanning(false);
      setCameraActive(true);

      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          console.log('App active - restarting camera');
          setCameraActive(false);
          setTimeout(() => setCameraActive(true), 100);
        } else {
          console.log('App backgrounded - disabling camera');
          setCameraActive(false);
        }
      });

      return () => {
        console.log('QR Scanner: Screen unfocused - disabling camera');
        subscription.remove();
        setCameraActive(false);
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
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          ]);

          const allGranted = Object.values(permissions).every(
            (status) => status === PermissionsAndroid.RESULTS.GRANTED
          );

          // Permissions requested silently
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

            // Request storage permission
            await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            ]);
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

        router.push({
          pathname: '/bluetooth-communication',
          params: { qrCode: trimmedValue },
        });
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
          onScanned(code.value);
          break;
        }
      }
    },
  });



  const handleTourNext = () => {
    router.push('/(tabs)/history' as any);
    setTimeout(() => nextStep(), 500);
  };

  return (
    <View style={styles.container}>
      {device && cameraActive && !isScanning && (
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
          onError={(error) => {
            console.error('Camera error:', error);
          }}
        />
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
        }}
      />

      <TourOverlay
        visible={tourActive && currentStep === 4}
        message="Scan the QR code on your device to establish connection. Ensure Bluetooth, Location, and WiFi are enabled for optimal connectivity."
        onNext={handleTourNext}
        onSkip={skipTour}
        step={5}
        totalSteps={6}
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
