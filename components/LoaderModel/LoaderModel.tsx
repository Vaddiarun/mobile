import React from "react";
import { Modal, View, ActivityIndicator, StyleSheet } from "react-native";

interface LoaderModalProps {
  visible: boolean;
}

export default function LoaderModal({ visible }: LoaderModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)", // light transparent background
  },
  loaderBox: {
    height: 50,
    width: 50,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
