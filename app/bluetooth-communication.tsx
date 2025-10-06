import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LoaderModal from '../components/LoaderModel';
import StatusModal from '../components/StatusModel';

const bleManager = new BleManager();

export default function BluetoothCommunication() {
  const { qrCode } = useLocalSearchParams<{ qrCode?: string }>();
  const router = useRouter();

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const [modelLoader, setModelLoader] = useState(false);
  const [scaning, setScaning] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

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
      // stop device scan and clear interval exactly once
      bleManager.stopDeviceScan();
      if (scanIntervalRef.current) {
        clearTimeout(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setScaning(false);
      mountedRef.current = false;
    };
  }, []);

  async function scanAndConnect() {
    if (scaning) return; // already scanning

    bleManager.stopDeviceScan();
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
      setScaning(false);
    }

    try {
      setScaning(true);
      bleManager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          setLoading(false);
          setScaning(false);
          bleManager.stopDeviceScan();
          return;
        }

        setDevices([]);
        if (device?.name === (qrCode as string)) {
          bleManager.stopDeviceScan();
          if (scanIntervalRef.current) {
            clearTimeout(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }

          setScaning(false);

          const connectedDevice = await device.connect();
          await connectedDevice.discoverAllServicesAndCharacteristics();
          await connectedDevice.requestMTU(241);
          const services = await connectedDevice.services();
          const service = services[2] || services[0];

          const chars = await connectedDevice.characteristicsForService(service.uuid);
          const txChar = chars.find((c) => c.isNotifiable || c.isIndicatable);
          const rxChar = chars.find((c) => c.isWritableWithResponse);

          if (txChar?.uuid && rxChar?.uuid) {
            startPacket(device, service.uuid, txChar.uuid, rxChar.uuid);
          } else {
            setLoading(false);
            setScaning(false);
            setModelLoader(true);
          }
        }
      });
    } catch (e) {
      console.log(e);
    }

    scanIntervalRef.current = setTimeout(() => {
      bleManager.stopDeviceScan();
      setLoading(false);
      setScaning(false);
      setModelLoader(true);
      scanIntervalRef.current = null;
    }, 5000);
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

  let tripOperation: 'IDLE' | 'START' | 'STOP' = 'IDLE';
  let data: any = {};
  let packetsArray: any[] = [];
  let receivedPacketsCount: any = {};

  async function handlePacket(
    rawData: Buffer,
    device: Device,
    serviceUUID: string,
    txUUID: string,
    rxUUID: string
  ) {
    const packetType = rawData[0];
    const b64 = rawData.toString('base64');
    const parsed = parseD1Packet(b64);

    switch (packetType) {
      case 0xd1:
        tripOperation = parsed.tripStatus === 0 ? 'START' : 'STOP';
        await sendTimeResponse(device, 'TF900001', serviceUUID, rxUUID);
        break;

      case 0xd2:
        if (tripOperation === 'START') {
          const config = buildA3Packet(10, true).toString('base64');
          await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, config);
        } else if (tripOperation === 'STOP') {
          await sendDataRequest(device.id, serviceUUID, rxUUID);
        }
        break;

      case 0xd4:
        if (tripOperation === 'STOP') {
          const res = parseD4Packet(b64);
          receivedPacketsCount = { expected: res };
          const ack = buildA5DataAck();
          await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, ack);
        }
        break;

      case 0xd5:
        if (tripOperation === 'STOP') {
          const res = parseD5DataPacket(b64);
          const ack = buildA5DataAck();
          await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, ack);
          packetsArray = [...packetsArray, ...res.packets];
          data = { ...data, allData: res, packets: packetsArray };
        }
        break;

      case 0xd6:
        if (tripOperation === 'STOP') {
          const ack = buildA5DataAck();
          const ok = await device.writeCharacteristicWithResponseForService(
            serviceUUID,
            rxUUID,
            ack
          );
          if (ok) {
            const stop = buildA3Packet(10, false).toString('base64');
            await device.writeCharacteristicWithResponseForService(serviceUUID, rxUUID, stop);
            tripOperation = 'IDLE';
          }
        }
        break;

      default:
        router.replace({
          pathname: '/trip-configuration',
          params: {
            packets: JSON.stringify(data),
            tripStatus: tripOperation === 'START' ? 0 : 1,
            deviceName: qrCode ?? '',
            packetsCount: JSON.stringify(receivedPacketsCount),
          },
        });
        if (tripOperation === 'START') {
          await bleManager.cancelDeviceConnection(device.id);
        }
    }
  }

  function startPacket(device: Device, serviceUUID: string, txUUID: string, rxUUID: string) {
    device.monitorCharacteristicForService(
      serviceUUID.toLowerCase(),
      txUUID.toLowerCase(),
      async (error, characteristic) => {
        if (error) return;
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
