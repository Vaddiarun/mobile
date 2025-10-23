# Mobile App File Documentation

This document provides a comprehensive overview of what each file contributes to the ThinxLog mobile application - a React Native/Expo app for IoT sensor data collection via Bluetooth.

## 📱 Core App Structure

### Root Configuration Files
- **`package.json`** - Project dependencies, scripts, and metadata for the React Native/Expo app
- **`app.json`** - Expo configuration including app name, permissions, icons, and platform-specific settings
- **`index.ts`** - Main entry point that registers the app with Expo
- **`global.css`** - Global CSS styles for NativeWind/Tailwind CSS
- **`tsconfig.json`** - TypeScript configuration for the project
- **`babel.config.js`** - Babel transpiler configuration for React Native
- **`metro.config.js`** - Metro bundler configuration with SVG transformer and NativeWind support
- **`tailwind.config.js`** - Tailwind CSS configuration for styling
- **`eslint.config.js`** - ESLint configuration for code linting
- **`prettier.config.js`** - Prettier configuration for code formatting
- **`nativewind-env.d.ts`** - TypeScript declarations for NativeWind
- **`eas.json`** - Expo Application Services configuration for builds and deployments

## 🚀 App Navigation & Screens

### Main App Structure
- **`app/index.tsx`** - App entry point that redirects to splash screen
- **`app/_layout.tsx`** - Root layout component with navigation stack and screen configurations
- **`app/tw-interop.ts`** - TailwindCSS interop configuration for React Native

### Authentication Flow
- **`app/splash.tsx`** - Splash screen that checks user authentication and redirects accordingly
- **`app/register.tsx`** - User registration screen with form validation and OTP request
- **`app/login.tsx`** - User login screen (basic implementation)
- **`app/verifyotp.tsx`** - OTP verification screen with 6-digit input and timer
- **`app/otp-success.tsx`** - Success screen after OTP verification

### Main App Tabs
- **`app/(tabs)/_layout.tsx`** - Tab navigation layout with custom styling and icons
- **`app/(tabs)/index.tsx`** - Home screen showing trip statistics, recent activity, and device overview
- **`app/(tabs)/qr-scanner.tsx`** - QR code scanner for device pairing using camera
- **`app/(tabs)/history.tsx`** - Trip history list with filtering (All/Today) and trip details navigation

### Core Functionality Screens
- **`app/bluetooth-communication.tsx`** - Bluetooth device connection, protocol handling, and trip status detection
- **`app/trip-configuration.tsx`** - Trip setup with customer/box profiles, location, and start/stop functionality
- **`app/trip-detail.tsx`** - Detailed trip view with charts, data visualization, and PDF export
- **`app/trip-records.tsx`** - Paginated table view of all trip sensor readings

### Settings & Support
- **`app/settings.tsx`** - User profile settings and logout functionality
- **`app/help-support.tsx`** - Contact information for customer support

## 🔧 Services & API Integration

### API Services
- **`services/apiClient.ts`** - Axios HTTP client configuration with base URL and interceptors
- **`services/endPoints.ts`** - API endpoint constants for all backend services
- **`services/useApiSuccessError.ts`** - Custom hook for handling API success/error states

### REST API Services
- **`services/RestApiServices/AuthenticateService.ts`** - User registration and OTP verification API calls
- **`services/RestApiServices/HistoryService.ts`** - Trip history and details API calls
- **`services/RestApiServices/ProfileServices.ts`** - Customer and box profile API calls

### Bluetooth & Device Management
- **`services/BleSessionStore.ts`** - Bluetooth session management and device connection caching
- **`types/bluetooth-state-manager.d.ts`** - TypeScript definitions for Bluetooth state management

### Mock Data (Development) - NOT USED ANYMORE
- **`services/MockDataServices/BoxProfileData.json`** - Sample box profile configurations
- **`services/MockDataServices/CustomerProfileData.json`** - Sample customer profile data
- **`services/MockDataServices/dataPackets.json`** - Sample sensor data packets for testing

## 💾 Data Storage & State Management

### Local Storage
- **`mmkv-storage/storage.ts`** - MMKV-based local storage for user data, trips, and temporary data with encryption

## 🎨 UI Components

### Reusable Components
- **`components/CustomModal.tsx`** - Reusable modal component for success/error/warning messages

### Specialized Modals
- **`components/BluetoothModel/BluetoothModel.tsx`** - Bluetooth-specific modal component
- **`components/BluetoothModel/index.ts`** - Export file for Bluetooth modal
- **`components/LoaderModel/LoaderModel.tsx`** - Loading spinner modal component
- **`components/LoaderModel/index.ts`** - Export file for loader modal
- **`components/StatusModel/StatusModel.tsx`** - Status message modal component (main modal for display)
- **`components/StatusModel/index.ts`** - Export file for status modal

## 🖼️ Assets & Resources

### Images
- **`assets/images/cross.svg`** - Cross/close icon
- **`assets/images/device.jpg`** - Device illustration for Bluetooth communication
- **`assets/images/error.svg`** - Error icon for modals
- **`assets/images/exclaim.svg`** - Exclamation/warning icon
- **`assets/images/G8.png`** - G8 device product image
- **`assets/images/Glogo.png`** - Company logo
- **`assets/images/GND.svg`** - GND company logo SVG
- **`assets/images/Group.svg`** - Generic group icon
- **`assets/images/logo_splash.png`** - Splash screen logo
- **`assets/images/noti-logo.png`** - Notification icon
- **`assets/images/office.jpg`** - Office/building illustration
- **`assets/images/otp_lock.svg`** - OTP lock icon for verification screen
- **`assets/images/otp_verified.svg`** - OTP success verification icon
- **`assets/images/security.png`** - Security/shield icon
- **`assets/images/sensor.png`** - Sensor device illustration
- **`assets/images/splash_logo.png`** - Alternative splash screen logo
- **`assets/images/success.png`** - Success checkmark icon
- **`assets/images/tick.svg`** - Tick/checkmark SVG icon
- **`assets/images/transfer.png`** - Data transfer animation icon

### App Icons & Splash
- **`assets/adaptive-icon.png`** - Android adaptive icon
- **`assets/favicon.png`** - Web favicon
- **`assets/icon.png`** - Main app icon
- **`assets/splash.png`** - Splash screen background

## 🔨 Build & Development Tools

### Build Scripts
- [EXCESS, JUST USE : npm i && npx expo run:android] **`BUILD_COMMANDS.md`** - Comprehensive build commands and troubleshooting guide
- **`SETUP_NEW_MACHINE.bat`** - Setup script for new development environment (USE THIS FIRST)
- **`QUICK_BUILD.bat`** - Quick build script for development (USE THIS SECOND)
- **`GET_CRASH_LOGS.bat`** - Script to extract crash logs from device (TO GET LOGS FROM DEVICE while standalone apk is running)
- **`BUILD_AAB.bat`** - Windows batch script to build Android App Bundle for playstore release

### Documentation & Fixes (IGNORE THESE PLEASE)
- **`README_BUILD.md`** - Build process documentation
- **`EMERGENCY_FIX.md`** - Emergency fixes and workarounds
- **`FINAL_FIX.md`** - Final production fixes
- **`MANUAL_FIX.md`** - Manual fix procedures
- **`RELEASE_BUILD_FIX.md`** - Release build specific fixes
- **`TRIP_START_BUG_FIX.md`** - Trip start functionality bug fixes

### Configuration Files
- **`.gitignore`** - Git ignore patterns for the project
- **`cesconfig.jsonc`** - Code Editor Services configuration
- **`success.png`** - Success state image (duplicate)

## 🔧 Patches & Customizations

### Third-party Patches
- **`patches/react-native-ble-plx+3.5.0.patch`** - Custom patch for Bluetooth library fixes

## 🏗️ Platform-Specific Code

### Android
- **`android/`** - Complete Android project structure
- **`android/app/build.gradle`** - Android app build configuration
- **`android/app/debug.keystore`** - Debug signing keystore
- **`android/app/proguard-rules.pro`** - ProGuard obfuscation rules
- **`android/build.gradle`** - Root Android build configuration
- **`android/gradle.properties`** - Gradle properties and settings
- **`android/settings.gradle`** - Gradle project settings
- **`android/gradlew`** - Gradle wrapper script (Unix)
- **`android/gradlew.bat`** - Gradle wrapper script (Windows)

### Legacy BLE App
- **`BleApp/`** - Legacy Bluetooth Low Energy app (React Native CLI project)
- **`BleApp/android/`** - Legacy Android configuration
- **`BleApp/ios/`** - Legacy iOS configuration

### Expo Generated
- **`.expo/`** - Expo development files and cache
- **`.expo/devices.json`** - Registered development devices
- **`.expo/README.md`** - Expo folder documentation

## 🔄 Utils & Helpers

### Utility Functions
- **`utils/`** - Utility functions directory (currently empty but reserved for helper functions)

## 📊 What This App Does

This is a **ThinxLog IoT Sensor Data Collection App** that:

1. **Authenticates users** via phone number and OTP verification
2. **Scans QR codes** to identify IoT sensor devices
3. **Connects via Bluetooth** to temperature/humidity sensors
4. **Configures trips** with customer profiles and sensor thresholds
5. **Starts/stops data collection** on remote sensors
6. **Downloads sensor data** when trips are completed
7. **Visualizes data** with charts and tables
8. **Exports reports** as PDF files
9. **Manages trip history** with filtering and search
10. **Provides user settings** and support contact information

The app follows a complete IoT workflow from device discovery to data analysis, making it a comprehensive solution for temperature and humidity monitoring in logistics and supply chain applications.