import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

type Props = {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | null;
  message: string;
  onClose: () => void;
};

export default function BluetoothModal({
  visible,
  type,
  message,
  onClose,
}: Props) {
  const icon = {
    success: '✅',
    error: '⛔',
    warning: '⚠️',
  }[type || 'warning'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
            <Text style={{ fontWeight: "bold"}}>G4200030</Text>
            <ActivityIndicator size={"large"} color={"#1976D2"} />
          <Text style={styles.message}>{message}</Text>
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
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 10
  },
  icon: { fontSize: 40, marginBottom: 10 },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#1976D2', padding: 10, borderRadius: 5 },
  btnText: { color: '#fff' },
});
