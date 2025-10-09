import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, Easing, Alert } from 'react-native';
import { Image } from 'expo-image';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoaderModal from '../components/LoaderModel';
import StatusModal from '../components/StatusModel';
import { getTrips } from '../mmkv-storage/storage';

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

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [modelLoader, setModelLoader] = useState(false);
  const [scaning, setScaning] = useState(false);
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

  // rotation animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnim]);

  const flipInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['90deg', '210deg'],
  });

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    scanAndConnect();

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
      console.log('Starting Bluetooth scan for device:', qrCode);

      // Set scan timeout to 30 seconds
      scanTimeoutRef.current = setTimeout(() => {
        if (!deviceFoundRef.current && mountedRef.current) {
          console.log('Scan timeout - device not found within 30 seconds');
          bleManager.stopDeviceScan();
          setLoading(false);
          setScaning(false);
          setModelLoader(true);
        }
      }, 30000);

      bleManager.startDeviceScan(null, null, async (error, device) => {
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
          console.log('Device found:', device.name);
          deviceFoundRef.current = true;
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
            scanTimeoutRef.current = null;
          }

          bleManager.stopDeviceScan();
          setScaning(false);

          try {
            console.log('Connecting to device...');
            const connectedDevice = await device.connect();
            connectedDeviceRef.current = connectedDevice;
            console.log('Device connected, discovering services...');

            // Add disconnection listener to prevent crash
            connectedDevice.onDisconnected((error, device) => {
              console.log('Device disconnected:', device?.name, error?.message);
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
            const services = await connectedDevice.services();
            console.log('Services discovered:', services.length);

            const service = services[2] || services[0];
            if (!service) {
              throw new Error('No services found on device');
            }

            const chars = await connectedDevice.characteristicsForService(service.uuid);
            const txChar = chars.find((c) => c.isNotifiable || c.isIndicatable);
            const rxChar = chars.find((c) => c.isWritableWithResponse);

            if (txChar?.uuid && rxChar?.uuid) {
              console.log('Starting packet communication...');
              startPacket(connectedDevice, service.uuid, txChar.uuid, rxChar.uuid);
            } else {
              console.error('Required characteristics not found');
              setLoading(false);
              setModelLoader(true);
            }
          } catch (connectionError) {
            console.error('Connection error:', connectionError);
            setLoading(false);
            setModelLoader(true);
          }
        }
      });
    } catch (e) {
      console.error('Scan initialization error:', e);
      setLoading(false);
      setScaning(false);
      if (!deviceFoundRef.current) {
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

          const allTrips = getTrips() || [];
          const existingTrip = allTrips.find(
            (trip: any) => trip.deviceID === qrCode && trip.status === 'Started'
          );

          if (existingTrip) {
            tripOperationRef.current = 'STOP';
            console.log('Trip operation: STOP (found active trip in local storage)');
          } else {
            tripOperationRef.current = parsed.tripStatus === 0 ? 'START' : 'STOP';
            console.log('Trip operation:', tripOperationRef.current, '(from device)');
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
            const config = buildA3Packet(10, true).toString('base64');
            await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, config);
            console.log('Trip started on device, waiting for confirmation...');

            await new Promise((resolve) => setTimeout(resolve, 1500));

            await bleManager.cancelDeviceConnection(device.id);
            console.log(
              'Disconnected from device - it will continue recording and stay in fast advertising mode'
            );

            hasNavigatedRef.current = true;

            // Store data in MMKV instead of passing large JSON in params
            try {
              const { saveData } = require('../mmkv-storage/storage');
              const tripDataKey = `trip_data_${qrCode}_${Date.now()}`;
              saveData(tripDataKey, {
                packets: dataRef.current,
                packetsCount: receivedPacketsCountRef.current,
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
            console.log('Device has active trip, requesting data from device...');
            await sendDataRequest(device.id, serviceUUID, rxUUID);
          }
          break;

        case 0xd4:
          if (tripOperationRef.current === 'STOP') {
            const res = parseD4Packet(b64);
            receivedPacketsCountRef.current = { expected: res };
            console.log('Received D4 packet, total packets:', res.totalPackets);
            const ack = buildA5DataAck();
            await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, ack);
          }
          break;

        case 0xd5:
          if (tripOperationRef.current === 'STOP') {
            const res = parseD5DataPacket(b64);
            const ack = buildA5DataAck();
            await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, ack);
            packetsArrayRef.current = [...packetsArrayRef.current, ...res.packets];
            dataRef.current = {
              ...dataRef.current,
              allData: res,
              packets: packetsArrayRef.current,
            };
            console.log('Received data packets, total so far:', packetsArrayRef.current.length);
          }
          break;

        case 0xd6:
          if (tripOperationRef.current === 'STOP') {
            const ack = buildA5DataAck();
            const ok = await device.writeCharacteristicWithResponseForService(
              serviceUUID,
              rxUUID,
              ack
            );
            if (ok) {
              const stop = buildA3Packet(10, false).toString('base64');
              await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, stop);
              tripOperationRef.current = 'IDLE';
              console.log(
                'Navigating to trip configuration - STOP, packets:',
                packetsArrayRef.current.length
              );
              console.log('Trip data collected:', JSON.stringify(dataRef.current, null, 2));
              hasNavigatedRef.current = true;

              // Store data in MMKV instead of passing large JSON in params
              try {
                const { saveData } = require('../mmkv-storage/storage');
                const tripDataKey = `trip_data_${qrCode}_${Date.now()}`;
                saveData(tripDataKey, {
                  packets: dataRef.current,
                  packetsCount: receivedPacketsCountRef.current,
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

              await bleManager.cancelDeviceConnection(device.id);
            }
          }
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

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="items-center">
        <Image
          source={require('../assets/images/device.jpg')}
          style={{ width: 180, height: 180 }}
          contentFit="contain"
        />
        <Animated.View style={{ transform: [{ rotate: flipInterpolate }] }}>
          <Image
            source={require('../assets/images/transfer.png')}
            style={{ width: 60, height: 60 }}
            contentFit="contain"
          />
        </Animated.View>
        <Image
          source={require('../assets/images/sensor.png')}
          style={{ width: 180, height: 180, marginTop: 20, marginLeft: 20 }}
          contentFit="contain"
        />
      </View>
      <LoaderModal visible={loading} />
      <StatusModal
        visible={modelLoader}
        type="warning"
        message="Device not found and inactive"
        subMessage=""
        onClose={() => {
          setModelLoader(false);
          router.back();
        }}
      />
    </View>
  );
}
