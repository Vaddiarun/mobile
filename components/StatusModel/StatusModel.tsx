import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TickSvg from '../../assets/images/tick.svg';
import ErrorSvg from '../../assets/images/error.svg';
import CrossSvg from '../../assets/images/cross.svg';
import ExclaimSvg from '../../assets/images/exclaim.svg';

type Props = {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | null;
  message: string;
  subMessage?: string;
  onClose: () => void;
};

export default function StatusModal({ visible, type, message, subMessage, onClose }: Props) {
  const getIconComponent = () => {
    switch (type) {
      case 'success':
        return <TickSvg width={80} height={80} style={{ marginBottom: 10 }} />;
      case 'error':
        return <ErrorSvg width={80} height={80} style={{ marginBottom: 10 }} />;
      case 'warning':
        return <CrossSvg width={80} height={80} style={{ marginBottom: 10 }} />;
      case 'info':
        return <ExclaimSvg width={80} height={80} style={{ marginBottom: 10 }} />;
      default:
        return <ExclaimSvg width={40} height={40} style={{ marginBottom: 10 }} />;
    }
  };

  // ✅ Auto close for success, info & warning
  useEffect(() => {
    if ((type === 'success' || type === 'info' || type === 'warning') && visible) {
      const timer = setTimeout(
        () => {
          onClose();
        },
        type === 'warning' ? 4000 : 5000
      );
      return () => clearTimeout(timer);
    }
  }, [type, visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          {getIconComponent()}
          <Text style={[styles.message, { fontWeight: 'bold', fontSize: 16 }]}>{message}</Text>
          {subMessage ? <Text style={styles.message}>{subMessage}</Text> : null}

          {/* Show button only for error */}
          {type === 'error' && (
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
