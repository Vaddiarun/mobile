declare module 'react-native-bluetooth-state-manager' {
  export function useBluetoothState(): string;

  const BluetoothStateManager: {
    requestToEnable: () => Promise<boolean>;
    addListener: (cb: (state: string) => void) => () => void;
  };

  export default BluetoothStateManager;
}
