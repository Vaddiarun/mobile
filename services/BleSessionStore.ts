// Shared BLE session store to cache device connection info
// This avoids rescanning when user clicks Start/Stop Trip buttons

interface BleSessionData {
  deviceId: string;
  deviceName: string;
  serviceUUID: string;
  rxUUID: string;
  txUUID: string;
  timestamp: number;
}

class BleSessionStore {
  private session: BleSessionData | null = null;

  setSession(data: BleSessionData) {
    this.session = {
      ...data,
      timestamp: Date.now(),
    };
    console.log('📝 BLE session cached:', this.session.deviceName);
  }

  getSession(): BleSessionData | null {
    if (!this.session) return null;

    const age = Date.now() - this.session.timestamp;
    if (age > 5 * 60 * 1000) {
      console.log('⚠️ BLE session expired (>5 min), clearing cache');
      this.clearSession();
      return null;
    }

    return this.session;
  }

  clearSession() {
    this.session = null;
    console.log('🗑️ BLE session cleared');
  }
}

export const bleSessionStore = new BleSessionStore();
