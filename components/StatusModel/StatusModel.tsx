import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | null;
  message: string;
  subMessage?: string;
  onClose: () => void;
};

export default function StatusModal({ visible, type, message, subMessage, onClose }: Props) {
  const icon = {
    success: '✅',
    error: '⛔',
    warning: '⚠️',
    info: 'ℹ️',
  }[type || 'info'];

  // ✅ Auto close for success & info
  useEffect(() => {
    if ((type === 'success' || type === 'info') && visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [type, visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.message, { fontWeight: 'bold', fontSize: 16 }]}>{message}</Text>
          {subMessage ? <Text style={styles.message}>{subMessage}</Text> : null}

          {/* Show button only for error/warning */}
          {(type === 'error' || type === 'warning') && (
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.btnText}>OK</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  box: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 30,
    alignItems: 'center',
    width: '80%',
  },
  icon: { fontSize: 40, marginBottom: 10 },
  message: { textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#1976D2', padding: 10, borderRadius: 5 },
  btnText: { color: '#fff' },
});
