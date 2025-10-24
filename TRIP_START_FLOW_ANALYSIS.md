# TRIP START FLOW ANALYSIS

## Complete Flow: QR Scan → Start Trip

---

## **PHASE 1: QR Code Scan (qr-scanner.tsx)**

**What happens:**
- User scans QR code (e.g., "G8_DEVICE_001")
- `onScanned()` function is triggered
- Navigation to `/bluetooth-communication` with `qrCode` parameter

**Code executed:**
```typescript
router.push({
  pathname: '/bluetooth-communication',
  params: { qrCode: value.trim() }
});
```

---

## **PHASE 2: Bluetooth Scan & Connection (bluetooth-communication.tsx)**

### **Step 2.1: Initialize Bluetooth Scan**
- Component mounts, checks Bluetooth state
- If Bluetooth is OFF → shows error modal
- If Bluetooth is ON → calls `scanAndConnect()`

### **Step 2.2: BLE Device Discovery**
- Starts 30-second timeout for device discovery
- Scans for BLE devices using `bleManager.startDeviceScan()`
- Filters devices by name matching QR code value
- When device found → stops scan, clears timeout

**Code:**
```typescript
bleManager.startDeviceScan(null, null, async (error, device) => {
  if (device?.name === qrCode) {
    // Device found!
  }
});
```

### **Step 2.3: Device Connection**
- Connects to device: `device.connect()`
- Discovers services: `discoverAllServicesAndCharacteristics()`
- Requests MTU 241 bytes: `requestMTU(241)`
- Gets service list, selects service (typically services[2])
- Finds characteristics:
  - **TX characteristic**: Notifiable (device → phone)
  - **RX characteristic**: Writable (phone → device)

**UUIDs cached:**
```typescript
bleSessionStore.setSession({
  deviceId: connectedDevice.id,
  deviceName: qrCode,
  serviceUUID: service.uuid,
  rxUUID: rxChar.uuid,
  txUUID: txChar.uuid,
  timestamp: Date.now()
});
```

### **Step 2.4: Start Packet Communication**
- Sets up monitoring on TX characteristic
- Device automatically sends **D1 packet** (Device Status)

---

## **PHASE 3: Packet Exchange Protocol**

### **Packet 1: D1 (Device Status) - Device → Phone**

**Structure (16 bytes):**
```
Byte 0:    0xD1 (packet type)
Byte 1:    Payload length
Bytes 2-11: Device ID (10 bytes ASCII)
Byte 12:   Trip Status (0=not started, 1=started)
Bytes 13-16: Reserved (4 bytes)
```

**What happens:**
```typescript
const parsed = parseD1Packet(b64);
// parsed = { deviceId: "G8_DEVICE_001", tripStatus: 0, ... }
```

**Decision Logic:**
1. Check local storage for active trip with this deviceID
2. If active trip exists → `tripOperationRef.current = 'STOP'`
3. If no active trip AND `tripStatus === 0` → `tripOperationRef.current = 'START'`
4. If no active trip BUT `tripStatus === 1` → Orphaned trip detected:
   - Sends A3 stop command to reset device
   - Sets mode to 'START'

### **Packet 2: A1 (Time Sync) - Phone → Device**

**Structure (20 bytes):**
```
Byte 0:    0xA1 (packet type)
Byte 1:    20 (payload length)
Bytes 2-11: Device ID (10 bytes)
Bytes 12-15: Current Unix timestamp (4 bytes, little-endian)
Bytes 16-19: Reserved (4 bytes, all zeros)
```

**Purpose:** Synchronizes device's internal clock with phone's time

**Code:**
```typescript
const epoch = Math.floor(Date.now() / 1000);
buffer.writeUInt32LE(epoch, offset);
```

### **Packet 3: D2 (Acknowledgment) - Device → Phone**

**What happens:**
- Device confirms time sync received
- Phone determines next action based on `tripOperationRef.current`

**For START mode:**
1. Stores active connection in `bleSessionStore`
2. Keeps BLE connection alive (doesn't disconnect)
3. Removes monitor subscription (trip-configuration will set up its own)
4. Navigates to `/trip-configuration` with:
   - `tripStatus: '0'` (not started)
   - `deviceName: qrCode`
   - `tripDataKey` (for passing data via MMKV storage)

---

## **PHASE 4: Trip Configuration Screen (trip-configuration.tsx)**

### **Step 4.1: Screen Initialization**
- Loads customer profiles and box profiles from API
- Fetches current GPS location
- Generates trip name: `Trip_{deviceName}_{timestamp}`
- User fills form: customer profile, box profile, location, trip name

### **Step 4.2: Form Validation**
When user clicks "Start" button:
```typescript
validateForm() checks:
- Customer profile selected
- Box profile selected
- Location obtained
- Trip name provided
- If customized profile: temperature/humidity ranges valid
```

---

## **PHASE 5: Start Trip Execution (handleStartTrip)**

### **Step 5.1: Prepare Trip Configuration**
```typescript
const tripConfig = {
  customerProfile: customer?.customerProfile,
  boxProfile: customizeBox ? {
    minTemp: tempMin,
    maxTemp: tempMax,
    minHum: humMin,
    maxHum: humMax
  } : box?.boxProfile
};
```

### **Step 5.2: Build API Request Body**
```typescript
const body = {
  username: user.data.user.Username,
  email: user.data.user.Email,
  phone: user.data.user.Phone,
  tripName: "Trip_G8_DEVICE_001_1234567890",
  deviceID: "G8_DEVICE_001",
  startLocation: { latitude: 37.7749, longitude: -122.4194 },
  tripConfig: { customerProfile: {...}, boxProfile: {...} },
  timestamp: 1234567890000,
  createdAt: 1234567890000,
  status: 'Started'
};
```

### **Step 5.3: Retrieve Active BLE Connection**
```typescript
const activeConn = bleSessionStore.getActiveConnection();
// Returns: { device, serviceUUID, rxUUID, txUUID }
```

**This is the SAME connection from bluetooth-communication screen!**
- No re-scanning needed
- Device is still connected
- Characteristics already discovered

### **Step 5.4: Set Up D3 Acknowledgment Listener**

**Creates promise that waits for D3 packet:**
```typescript
const ackPromise = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Start acknowledgment timeout'));
  }, 5000);

  const subscription = connected.monitorCharacteristicForService(
    serviceUUID, txUUID,
    async (error, characteristic) => {
      const raw = Buffer.from(characteristic.value, 'base64');
      const packetType = raw[0];
      
      if (packetType === 0xD3) {
        // Device acknowledged!
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }
    }
  );
});
```

### **Step 5.5: Send A3 Start Command - Phone → Device**

**Packet Structure (9 bytes):**
```
Byte 0:    0xA3 (packet type)
Byte 1:    0x07 (payload length = 7)
Bytes 2-3: Interval in seconds (60 = 0x003C, little-endian)
Byte 4:    Trip ON flag (1 = start, 0 = stop)
Bytes 5-8: Reserved (4 bytes, all zeros)
```

**Example for 60-second interval:**
```
A3 07 3C 00 01 00 00 00 00
│  │  │  │  │  └─────────┘
│  │  │  │  │      Reserved
│  │  │  │  └─ Trip ON (1)
│  │  └──┴─ Interval: 60 seconds (little-endian)
│  └─ Payload length
└─ Packet type
```

**Code:**
```typescript
const startBuffer = Buffer.alloc(9);
startBuffer.writeUInt8(0xA3, 0);      // Packet type
startBuffer.writeUInt8(0x07, 1);      // Payload length
startBuffer.writeUInt16LE(60, 2);     // 60 second interval
startBuffer.writeUInt8(1, 4);         // tripOn = true
startBuffer.writeUInt32LE(0, 5);      // Reserved

await connected.writeCharacteristicWithResponseForService(
  serviceUUID, rxUUID, startCommand
);
```

**What this does on the device:**
- Device receives A3 packet
- Starts recording temperature/humidity every 60 seconds
- Stores data in internal memory
- Sets internal trip status to "active"

### **Step 5.6: Wait for D3 Acknowledgment - Device → Phone**

**D3 Packet Structure:**
```
Byte 0: 0xD3 (acknowledgment packet type)
Remaining bytes: Device-specific data
```

**What happens:**
- Device processes A3 command
- Sends D3 back to confirm trip started
- Phone's `ackPromise` resolves
- Timeout is cleared, subscription removed

### **Step 5.7: Disconnect Device**
```typescript
await bleManager.cancelDeviceConnection(connected.id);
bleSessionStore.clearActiveConnection();
```

**Why disconnect?**
- Trip is now running on device independently
- Device will record data to internal memory
- No need to maintain BLE connection
- Saves battery on both phone and device

### **Step 5.8: Make API Call to Backend**
```typescript
axios.post(`${BASE_URL}/start-trip`, body, {
  headers: { Authorization: `Bearer ${token}` }
})
.then((res) => {
  // Save trip to local storage
  saveTrip(body);
  
  // Show success modal
  setModalType('success');
  setModelLoader(true);
})
.catch((err) => {
  // Check if validation error (another user's trip)
  const isValidationError = 
    err?.response?.status === 400 || 
    err?.response?.status === 403 || 
    err?.response?.data?.message?.toLowerCase().includes('validation');
  
  const errorMsg = isValidationError 
    ? 'You cannot start/stop a trip for another user'
    : (err?.response?.data?.message || 'Failed to start trip');
  
  // Show error modal
  setModalMessage('Cannot Start Trip');
  setModalSubMessage(errorMsg);
  setModelLoader(true);
});
```

**API validates:**
- User authentication (JWT token)
- Device ownership (is this user allowed to control this device?)
- No existing active trip for this device
- Valid trip configuration

---

## **PHASE 6: Success/Error Handling**

### **Success Path:**
1. Success modal shows: "G8_DEVICE_001 Sensor Started"
2. Trip saved to local MMKV storage
3. User clicks OK → navigates back to home screen
4. Device continues recording data independently

### **Error Path (Validation Error):**
1. Error modal shows: "Cannot Start Trip"
2. Sub-message: "You cannot start/stop a trip for another user"
3. User clicks OK → stays on configuration screen
4. Device was already sent stop command (if orphaned trip was detected)

---

## **SUMMARY OF PACKETS**

| Packet | Direction | Purpose | When Sent |
|--------|-----------|---------|-----------|
| **D1** | Device → Phone | Device status (trip active/inactive) | Immediately after connection |
| **A1** | Phone → Device | Time synchronization | Response to D1 |
| **D2** | Device → Phone | Acknowledgment of time sync | Response to A1 |
| **A3** | Phone → Device | Start/Stop trip command | When user clicks Start/Stop |
| **D3** | Device → Phone | Acknowledgment of A3 command | Response to A3 |

---

## **WHEN DOES DEVICE START RECORDING?**

### **When You Scan (bluetooth-communication.tsx)**

**Packets exchanged:**
1. **D1** (Device → Phone): Device reports its current status
2. **A1** (Phone → Device): Phone syncs time with device
3. **D2** (Device → Phone): Device acknowledges time sync

**Result:** Device does NOTHING. It just reports status and syncs time. **No recording starts.**

---

### **When You Press Start Button (trip-configuration.tsx)**

**This is the ONLY command that tells device to start recording:**

The **A3 packet with `tripOn=1`** is what triggers the device to:
1. Start its internal timer
2. Begin recording temperature/humidity every 60 seconds
3. Store data in internal memory
4. Set its trip status flag to "active"

**The critical byte is Byte 4:**
- `tripOn = 1` → Device starts recording
- `tripOn = 0` → Device stops recording

---

## **Timeline**

```
[Scan QR] → [Connect] → [D1/A1/D2 exchange] → [Navigate to config screen]
                                                        ↓
                                              [Fill form] → [Press Start]
                                                                  ↓
                                                          [A3 with tripOn=1]
                                                                  ↓
                                                    **DEVICE STARTS RECORDING**
```

**Answer:** The device starts recording **AFTER** you press Start, when it receives the A3 packet with `tripOn=1`.

---

## **KEY INSIGHTS**

1. **Connection Reuse**: The BLE connection from bluetooth-communication is kept alive and reused in trip-configuration. No re-scanning occurs.

2. **Orphaned Trip Handling**: If device has active trip but no local storage record, system sends stop command first, then allows fresh start.

3. **Async Operations**: A3 command is sent BEFORE API call. Device starts recording immediately, API call happens after for cloud sync.

4. **Validation Error Detection**: Checks HTTP status 400/403 or "validation" keyword to show custom error message "You cannot start/stop a trip for another user".

5. **Disconnect After Start**: Device is disconnected after successful start because it records data independently. Reconnection only needed for stop.

6. **Recording Trigger**: Device ONLY starts recording when it receives A3 packet with `tripOn=1` after user presses Start button. Scanning and connecting does NOT start recording.
