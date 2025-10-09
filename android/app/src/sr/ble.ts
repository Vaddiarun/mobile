import { BleManager, Device } from 'react-native-ble-plx';
import { ensureBlePermissions } from '../utils/blePermissions.android';

const manager = new BleManager();

function withTimeout<T>(p: Promise<T>, ms = 15000) {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error('BLE connect timeout')), ms))),
  ]);
}

export async function connectToDevice(deviceId: string) {
  const ok = await ensureBlePermissions();
  if (!ok) throw new Error('Bluetooth permission not granted');

  try {
    const device: Device = await withTimeout(
      manager.connectToDevice(deviceId, { autoConnect: true }),
      15000
    );
    await withTimeout(device.discoverAllServicesAndCharacteristics(), 15000);

    device.onDisconnected((err) => {
      console.log('BLE disconnected:', err?.message);
    });

    return device;
  } catch (e: any) {
    console.log('BLE connect failed:', e?.message ?? e);
    throw e;
  }
}

export function destroyBle() {
  manager.destroy();
}
