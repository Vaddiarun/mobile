import React, { createContext, useContext, useState, useEffect } from 'react';
import CustomModal from './CustomModal';

interface NetworkErrorContextType {
  showNetworkError: () => void;
}

const NetworkErrorContext = createContext<NetworkErrorContextType | undefined>(undefined);

export function NetworkErrorProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showNetworkError = () => {
    setVisible(true);
  };

  useEffect(() => {
    setGlobalNetworkErrorHandler(showNetworkError);
  }, []);

  return (
    <NetworkErrorContext.Provider value={{ showNetworkError }}>
      {children}
      <CustomModal
        visible={visible}
        type="warning"
        title="No Network"
        message="Please connect to WiFi or mobile data to use the app"
        onClose={() => setVisible(false)}
        buttonText="OK"
      />
    </NetworkErrorContext.Provider>
  );
}

export function useNetworkError() {
  const context = useContext(NetworkErrorContext);
  if (!context) {
    throw new Error('useNetworkError must be used within NetworkErrorProvider');
  }
  return context;
}

export let globalShowNetworkError: (() => void) | null = null;

export function setGlobalNetworkErrorHandler(handler: () => void) {
  globalShowNetworkError = handler;
}
