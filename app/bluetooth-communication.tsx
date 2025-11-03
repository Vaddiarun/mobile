import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, Easing, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { bleSessionStore } from '../services/BleSessionStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoaderModal from '../components/LoaderModel';
import StatusModal from '../components/StatusModel';
import { getTripHistory } from '../services/RestApiServices/HistoryService';

const bleManager = new BleManager();

export default function BluetoothCommunication() {
  const { qrCode } = useLocalSearchParams<{ qrCode?: string }>();
  const router = useRouter();

  // Validate qrCode parameter
  React.useEffect(() => {
    if (!qrCode) {
      console.error('No QR code provided to BluetoothCommunication');
      setTimeout(() => {
        Alert.alert('Error', 'No device code provided. Please scan QR code again.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/qr-scanner') },
        ]);
      }, 500);
      return;
    }
    console.log('BluetoothCommunication mounted with QR code:', qrCode);
  }, [qrCode, router]);

  const [loading, setLoading] = useState(false);
  const [modelLoader, setModelLoader] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalSubMessage, setModalSubMessage] = useState('');
  const [scaning, setScaning] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const mountedRef = useRef(false);
  const deviceFoundRef = useRef(false);
  const tripOperationRef = useRef<'IDLE' | 'START' | 'STOP'>('IDLE');
  const dataRef = useRef<any>({});
  const packetsArrayRef = useRef<any[]>([]);
  const receivedPacketsCountRef = useRef<any>({});
  const connectedDeviceRef = useRef<Device | null>(null);
  const monitorSubscriptionRef = useRef<any>(null);
  const hasNavigatedRef = useRef(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const checkAndScan = async () => {
      const btState = await bleManager.state();
      if (btState !== 'PoweredOn') {
        setModalMessage('Bluetooth is Off');
        setModalSubMessage('Please turn on Bluetooth to scan for devices');
        setModelLoader(true);
        return;
      }
      scanAndConnect();
    };

    checkAndScan();

    return () => {
      bleManager.stopDeviceScan();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (monitorSubscriptionRef.current && !hasNavigatedRef.current) {
        monitorSubscriptionRef.current.remove();
        monitorSubscriptionRef.current = null;
      }
      setScaning(false);
      mountedRef.current = false;
    };
  }, []);

  async function scanAndConnect() {
    if (scaning) return;

    bleManager.stopDeviceScan();
    deviceFoundRef.current = false;
    setScaning(true);

    try {
      console.log('BLE SCAN INITIATED');

      // Try cached session first for instant reconnection
      const cachedSession = bleSessionStore.getSession();
      if (cachedSession?.deviceName === qrCode && Date.now() - cachedSession.timestamp < 300000) {
        console.log('Attempting instant cached reconnection...');
        try {
          const cachedDevice = await bleManager.connectToDevice(cachedSession.deviceId, {
            timeout: 2000,
          });
          if (cachedDevice) {
            console.log('✅ INSTANT RECONNECTION SUCCESS!');
            deviceFoundRef.current = true;
            bleManager.stopDeviceScan();
            setScaning(false);
            await handleDeviceConnection(
              cachedDevice,
              cachedSession.serviceUUID,
              cachedSession.txUUID,
              cachedSession.rxUUID
            );
            return;
          }
        } catch (cacheError) {
          console.log('Cache miss, starting power scan...');
        }
      }

      // ULTRA-AGGRESSIVE: Continuous rapid scanning with device accumulation
      let scanAttempt = 0;
      const maxAttempts = 5;
      const foundDevices = new Map<string, Device>(); // Persists across all attempts
      let bestDevice: { device: Device; rssi: number } | null = null;

      // Use service UUID filter if available to cut through noise in crowded environments
      const serviceFilter = cachedSession?.serviceUUID ? [cachedSession.serviceUUID] : null;
      if (serviceFilter) {
        console.log('🎯 FILTERING BY SERVICE UUID - ignoring 100s of other devices');
      }

      const attemptScan = () => {
        scanAttempt++;
        console.log(`SCAN ${scanAttempt}/${maxAttempts}`);

        bleManager.startDeviceScan(
          serviceFilter,
          { allowDuplicates: true, scanMode: 2 },
          async (error, device) => {
            if (error) {
              console.error('Bluetooth scan error:', error);
              bleManager.stopDeviceScan();
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
                scanTimeoutRef.current = null;
              }
              if (!deviceFoundRef.current) {
                setLoading(false);
                setScaning(false);
                setModelLoader(true);
              }
              return;
            }

            if (device?.name === (qrCode as string)) {
              const rssi = device.rssi || -100;

              if (!foundDevices.has(device.id)) {
                foundDevices.set(device.id, device);
                console.log(`TARGET ACQUIRED! RSSI: ${rssi}dBm`);
              }

              if (!bestDevice || rssi > bestDevice.rssi) {
                bestDevice = { device, rssi };
              }

              // Connect INSTANTLY on ANY signal strength for weak devices
              if (!deviceFoundRef.current) {
                console.log(`⚡ INSTANT CONNECT (RSSI: ${rssi}dBm)`);
                deviceFoundRef.current = true;
                if (scanTimeoutRef.current) {
                  clearTimeout(scanTimeoutRef.current);
                  scanTimeoutRef.current = null;
                }
                bleManager.stopDeviceScan();
                setScaning(false);
                await handleDeviceConnection(device);
              }
            }
          }
        );
      };

      const scheduleTimeout = () => {
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        
        scanTimeoutRef.current = setTimeout(async () => {
          if (!deviceFoundRef.current && mountedRef.current) {
            bleManager.stopDeviceScan();

            if (scanAttempt < maxAttempts) {
              console.log(`🔄 RAPID RETRY ${scanAttempt + 1}/${maxAttempts}`);
              await new Promise((resolve) => setTimeout(resolve, 200));
              attemptScan();
              scheduleTimeout(); // Schedule next timeout
            } else if (bestDevice) {
              console.log(`🎯 CONNECTING TO BEST SIGNAL (RSSI: ${bestDevice.rssi}dBm)`);
              deviceFoundRef.current = true;
              setScaning(false);
              await handleDeviceConnection(bestDevice.device);
            } else if (foundDevices.size > 0) {
              console.log('🎯 CONNECTING TO ANY FOUND DEVICE');
              const device = Array.from(foundDevices.values())[0];
              deviceFoundRef.current = true;
              setScaning(false);
              await handleDeviceConnection(device);
            } else {
              console.log('❌ DEVICE NOT FOUND AFTER SCAN');
              setLoading(false);
              setScaning(false);
              setModelLoader(true);
            }
          }
        }, 10000); // 10 seconds per scan to catch slow-advertising devices
      };

      attemptScan();
      scheduleTimeout();
    } catch (e) {
      console.error('Scan initialization error:', e);
      setLoading(false);
      setScaning(false);
      if (!deviceFoundRef.current) {
        setModelLoader(true);
      }
    }
  }

  async function handleDeviceConnection(
    device: Device,
    cachedServiceUUID?: string,
    cachedTxUUID?: string,
    cachedRxUUID?: string
  ) {
    try {
      console.log('Connecting to device...');
      const connectedDevice = await device.connect({ timeout: 5000 });
      connectedDeviceRef.current = connectedDevice;
      console.log('Device connected, discovering services...');

      connectedDevice.onDisconnected((error, device) => {
        if (error || device?.name) {
          console.log('⚠️ Device disconnected:', device?.name, error?.message);

          if (!hasNavigatedRef.current && mountedRef.current) {
            setShowDisconnectModal(true);
          }
        }
      });

      // Add connection error handler
      connectedDevice.onDisconnected((error) => {
        if (error?.message?.includes('was disconnected')) {
          console.log('⚠️ Connection error - device disconnected');
          if (!hasNavigatedRef.current && mountedRef.current) {
            setShowDisconnectModal(true);
          }
        }
        if (monitorSubscriptionRef.current && !hasNavigatedRef.current) {
          try {
            monitorSubscriptionRef.current.remove();
            monitorSubscriptionRef.current = null;
          } catch (e) {
            console.log('Error cleaning up on disconnect:', e);
          }
        }
      });

      await connectedDevice.discoverAllServicesAndCharacteristics();
      await connectedDevice.requestMTU(241);

      let service, txChar, rxChar;

      if (cachedServiceUUID && cachedTxUUID && cachedRxUUID) {
        // Use cached UUIDs for faster setup
        console.log('Using cached service UUIDs');
        service = { uuid: cachedServiceUUID };
        txChar = { uuid: cachedTxUUID };
        rxChar = { uuid: cachedRxUUID };
      } else {
        const services = await connectedDevice.services();
        console.log('Services discovered:', services.length);
        service = services[2] || services[0];
        if (!service) {
          throw new Error('No services found on device');
        }
        const chars = await connectedDevice.characteristicsForService(service.uuid);
        txChar = chars.find((c) => c.isNotifiable || c.isIndicatable);
        rxChar = chars.find((c) => c.isWritableWithResponse);
      }

      if (txChar?.uuid && rxChar?.uuid) {
        console.log('Starting packet communication...');

        bleSessionStore.setSession({
          deviceId: connectedDevice.id,
          deviceName: qrCode as string,
          serviceUUID: service.uuid,
          rxUUID: rxChar.uuid,
          txUUID: txChar.uuid,
          timestamp: Date.now(),
        });

        startPacket(connectedDevice, service.uuid, txChar.uuid, rxChar.uuid);
      } else {
        console.error('Required characteristics not found');
        setLoading(false);
        setModelLoader(true);
      }
    } catch (connectionError: any) {
      console.error('Connection error:', connectionError);
      if (connectionError?.message?.includes('was disconnected')) {
        setShowDisconnectModal(true);
      } else {
        setLoading(false);
        setModelLoader(true);
      }
    }
  }

  // -------- BLE protocol functions --------
  function buildA1TimeResponse(deviceId: string): string {
    const buffer = Buffer.alloc(20);
    let offset = 0;
    buffer.writeUInt8(0xa1, offset++);
    buffer.writeUInt8(20, offset++);
    const idBuf = Buffer.alloc(10);
    idBuf.write(deviceId);
    idBuf.copy(buffer, offset);
    offset += 10;
    const epoch = Math.floor(Date.now() / 1000);
    buffer.writeUInt32LE(epoch, offset);
    offset += 4;
    buffer.writeUInt32LE(0, offset);
    return buffer.toString('base64');
  }

  async function sendTimeResponse(
    device: Device,
    sensorId: string,
    serviceUUID: string,
    rxUUID: string
  ) {
    const pkt = buildA1TimeResponse(sensorId);
    await device.writeCharacteristicWithResponseForService(
      serviceUUID.toLowerCase(),
      rxUUID.toLowerCase(),
      pkt
    );
  }

  function buildA4DataRequest(): string {
    const buffer = Buffer.alloc(6);
    let o = 0;
    buffer.writeUInt8(0xa4, o++);
    buffer.writeUInt8(6, o++);
    buffer.writeUInt32LE(0, o);
    return buffer.toString('base64');
  }

  async function sendDataRequest(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string
  ) {
    const pkt = buildA4DataRequest();
    await bleManager.writeCharacteristicWithResponseForDevice(
      deviceId,
      serviceUUID,
      characteristicUUID,
      pkt
    );
  }

  function buildA3Packet(interval: number, tripOn: boolean): Buffer {
    const b = Buffer.alloc(9);
    let o = 0;
    b.writeUInt8(0xa3, o++);
    b.writeUInt8(0x07, o++);
    b.writeUInt16LE(interval, o);
    o += 2;
    b.writeUInt8(tripOn ? 1 : 0, o++);
    b.writeUInt32LE(0, o);
    return b;
  }

  function buildA5DataAck(): string {
    const b = Buffer.alloc(6);
    let o = 0;
    b.writeUInt8(0xa5, o++);
    b.writeUInt8(0x06, o++);
    b.writeUInt32LE(0, o);
    return b.toString('base64');
  }

  // --- Packet parsers ---
  function parseD1Packet(b64: string) {
    const buf = Buffer.from(b64, 'base64');
    let o = 0;
    const packet_type = buf[o++];
    const payload_length = buf[o++];
    const deviceId = buf
      .slice(o, o + 10)
      .toString('ascii')
      .replace(/\0/g, '');
    o += 10;
    const tripStatus = buf[o++];
    const reserved = buf.slice(o, o + 4).toString('hex');
    return { packet_type, payload_length, deviceId, tripStatus, reserved };
  }

  function parseD4Packet(b64: string) {
    const raw = Buffer.from(b64, 'base64');
    let o = 0;
    const packetType = raw[o++];
    const payloadLength = raw[o++];
    const deviceId = raw
      .slice(o, o + 10)
      .toString('ascii')
      .replace(/\0/g, '');
    o += 10;
    const totalPackets = raw.readUInt16LE(o);
    o += 2;
    const tripStartEpoch = raw.readUInt32LE(o);
    o += 4;
    const batteryPercentage = raw.readUInt8(o++);
    const hardwareVer = raw
      .slice(o, o + 8)
      .toString('ascii')
      .replace(/\0/g, '');
    o += 8;
    const firmwareVer = raw
      .slice(o, o + 8)
      .toString('ascii')
      .replace(/\0/g, '');
    o += 8;
    const reserved = raw.slice(o, o + 4);
    return {
      packetType,
      payloadLength,
      deviceId,
      totalPackets,
      tripStartEpoch,
      batteryPercentage,
      hardwareVer,
      firmwareVer,
      reserved: reserved.toString('hex'),
    };
  }

  function parseD5DataPacket(b64: string) {
    const buf = Buffer.from(b64, 'base64');
    let o = 0;
    const packetType = buf[o++];
    const payloadLength = buf[o++];
    const num = buf.readUInt8(o++);
    const packets: any[] = [];
    for (let i = 0; i < num; i++) {
      const time = buf.readUInt32LE(o);
      o += 4;
      const temperature = buf.readInt16LE(o) / 10;
      o += 2;
      const humidity = buf.readUInt8(o++);
      packets.push({ time, temperature, humidity });
    }
    const reserved = buf.slice(o, o + 4);
    return {
      packetType,
      payloadLength,
      numDataPackets: num,
      packets,
      reserved: reserved.toString('hex'),
    };
  }

  function parseD6EndPacket(b64: string) {
    const buf = Buffer.from(b64, 'base64');
    let o = 0;
    const packetType = buf[o++];
    const payloadLength = buf[o++];
    const deviceId = buf
      .slice(o, o + 10)
      .toString('ascii')
      .replace(/\0/g, '');
    o += 10;
    const reserved = buf.slice(o, o + 4);
    return { packetType, payloadLength, deviceId, reserved: reserved.toString('hex') };
  }

  async function handlePacket(
    rawData: Buffer,
    device: Device,
    serviceUUID: string,
    txUUID: string,
    rxUUID: string
  ) {
    try {
      const packetType = rawData[0];
      const b64 = rawData.toString('base64');
      console.log('Received packet type:', `0x${packetType.toString(16)}`);

      switch (packetType) {
        case 0xd1:
          const parsed = parseD1Packet(b64);

          // Check API for active trips instead of local storage
          try {
            const historyResult = await getTripHistory('', '', 1, 1000);
            let hasActiveTrip = false;

            if (historyResult.success && historyResult.data?.trips) {
              const activeTrip = historyResult.data.trips.find(
                (trip: any) => trip.deviceid === qrCode && trip.status !== 'completed'
              );
              hasActiveTrip = !!activeTrip;
            }

            if (hasActiveTrip) {
              tripOperationRef.current = 'STOP';
              console.log('Trip operation: STOP (found active trip in API history)');
            } else if (parsed.tripStatus === 0) {
              tripOperationRef.current = 'START';
              console.log('Trip operation: START (no active trip on device)');
            } else {
              // Device has active trip but no matching trip in API (orphaned trip)
              console.log(
                '⚠️ Orphaned trip detected - device has active trip but no active trip in API'
              );
              tripOperationRef.current = 'START';
              console.log('Treating as START mode - will reset device trip and allow fresh start');

              // Send stop command to reset the device
              const stopConfig = buildA3Packet(60, false).toString('base64');
              await device.writeCharacteristicWithResponseForService(
                serviceUUID,
                rxUUID,
                stopConfig
              );
              console.log('✅ Sent A3 stop command to reset orphaned trip on device');

              // Wait a bit for device to process the stop command
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (apiError) {
            console.error('❌ Error checking API for active trips:', apiError);
            // Fallback to device status if API fails
            if (parsed.tripStatus === 0) {
              tripOperationRef.current = 'START';
              console.log('Trip operation: START (API failed, using device status)');
            } else {
              tripOperationRef.current = 'STOP';
              console.log('Trip operation: STOP (API failed, using device status)');
            }
          }

          await sendTimeResponse(
            device,
            parsed.deviceId || (qrCode as string),
            serviceUUID,
            rxUUID
          );
          break;

        case 0xd2:
          if (tripOperationRef.current === 'START') {
            console.log('⚠️ Device ready for START - keeping connection alive');
            hasNavigatedRef.current = true;

            // Remove monitor subscription so trip-configuration can set up its own
            if (monitorSubscriptionRef.current) {
              monitorSubscriptionRef.current.remove();
              monitorSubscriptionRef.current = null;
              console.log('🔇 Monitor subscription removed');
            }

            // Store device connection for trip-configuration to use
            bleSessionStore.setActiveConnection({
              device: device,
              serviceUUID: serviceUUID,
              rxUUID: rxUUID,
              txUUID: txUUID,
            });

            // Navigate to trip configuration
            try {
              const { saveData } = require('../mmkv-storage/storage');
              const tripDataKey = `trip_data_${qrCode}_${Date.now()}`;
              saveData(tripDataKey, {
                packets: {},
                packetsCount: {},
              });

              setTimeout(() => {
                router.replace({
                  pathname: '/trip-configuration',
                  params: {
                    tripDataKey,
                    tripStatus: '0',
                    deviceName: qrCode ?? '',
                  },
                });
              }, 300);
            } catch (err) {
              console.error('Navigation error:', err);
              Alert.alert('Error', 'Failed to navigate. Please try again.');
            }
          } else if (tripOperationRef.current === 'STOP') {
            console.log('⚠️ Device has active trip - keeping connection alive for Stop');
            hasNavigatedRef.current = true;

            // Remove monitor subscription so trip-configuration can set up its own
            if (monitorSubscriptionRef.current) {
              monitorSubscriptionRef.current.remove();
              monitorSubscriptionRef.current = null;
              console.log('🔇 Monitor subscription removed');
            }

            // Store device connection for trip-configuration to use
            bleSessionStore.setActiveConnection({
              device: device,
              serviceUUID: serviceUUID,
              rxUUID: rxUUID,
              txUUID: txUUID,
            });

            try {
              const { saveData } = require('../mmkv-storage/storage');
              const tripDataKey = `trip_data_${qrCode}_${Date.now()}`;
              saveData(tripDataKey, {
                packets: {},
                packetsCount: {},
              });

              setTimeout(() => {
                router.replace({
                  pathname: '/trip-configuration',
                  params: {
                    tripDataKey,
                    tripStatus: '1',
                    deviceName: qrCode ?? '',
                  },
                });
              }, 300);
            } catch (err) {
              console.error('Navigation error:', err);
              Alert.alert('Error', 'Failed to navigate. Please try again.');
            }
          }
          break;

        case 0xd4:
        case 0xd5:
        case 0xd6:
          // These packets are only processed when data is requested from trip-configuration
          // Not during scan to prevent data loss
          console.log('⚠️ Ignoring data packet during scan - data will be requested on Stop');
          break;

        case 0xd3:
          console.log('Received D3 packet (acknowledgment) - ignoring');
          break;

        default:
          console.warn('Unknown packet type:', `0x${packetType.toString(16)}`);
      }
    } catch (error) {
      console.error('Error handling packet:', error);
    }
  }

  function startPacket(device: Device, serviceUUID: string, txUUID: string, rxUUID: string) {
    monitorSubscriptionRef.current = device.monitorCharacteristicForService(
      serviceUUID.toLowerCase(),
      txUUID.toLowerCase(),
      async (error, characteristic) => {
        if (error) {
          console.log('Monitor error:', error);
          // Clean up subscription on error to prevent crash
          if (monitorSubscriptionRef.current) {
            try {
              monitorSubscriptionRef.current.remove();
              monitorSubscriptionRef.current = null;
            } catch (e) {
              console.log('Error removing subscription:', e);
            }
          }
          return;
        }
        if (characteristic?.value) {
          const raw = Buffer.from(characteristic.value, 'base64');
          handlePacket(raw, device, serviceUUID, txUUID, rxUUID);
        }
      }
    );
  }

  const handleBackPress = () => {
    bleManager.stopDeviceScan();
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    router.replace('/(tabs)/qr-scanner');
  };

  return (
    <View className="flex-1 bg-white">
      {/* Back Button */}
      <View className="absolute left-4 top-12 z-10">
        <TouchableOpacity
          onPress={handleBackPress}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/20">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="relative items-center justify-center">
          <ActivityIndicator size={120} color="#1976D2" />
          <View className="absolute items-center justify-center">
            <MaterialCommunityIcons name="bluetooth" size={60} color="#1976D2" />
          </View>
        </View>
      </View>
      <LoaderModal visible={loading} />
      <StatusModal
        visible={modelLoader}
        type="warning"
        message={modalMessage || 'Device not found and inactive'}
        subMessage={modalSubMessage}
        onClose={() => {
          setModelLoader(false);
          setModalMessage('');
          setModalSubMessage('');
          router.back();
        }}
      />
      <StatusModal
        visible={showDisconnectModal}
        type="error"
        message="Bluetooth Device Disconnected"
        subMessage="Connection lost due to weak signal. Please try again or move your mobile device closer to the sensor."
        onClose={() => {
          setShowDisconnectModal(false);
          router.back();
        }}
      />
    </View>
  );
}
