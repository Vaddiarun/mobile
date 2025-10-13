import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ModalType = 'success' | 'error' | 'info' | 'warning';

interface CustomModalProps {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
  onConfirm?: () => void;
  confirmText?: string;
}

export default function CustomModal({
  visible,
  type,
  title,
  message,
  onClose,
  buttonText = 'OK',
  onConfirm,
  confirmText = 'Confirm',
}: CustomModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: '#10B981' };
      case 'error':
        return { name: 'alert-circle', color: '#EF4444' };
      case 'warning':
        return { name: 'alert', color: '#F59E0B' };
      case 'info':
        return { name: 'information', color: '#3B82F6' };
    }
  };

  const icon = getIcon();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50" onPress={onClose}>
        <Pressable
          className="w-[85%] rounded-2xl bg-white p-6"
          onPress={(e) => e.stopPropagation()}>
          <View className="items-center">
            <MaterialCommunityIcons name={icon.name as any} size={64} color={icon.color} />
            <Text className="mt-4 text-xl font-bold text-gray-800">{title}</Text>
            <Text className="mt-2 text-center text-base text-gray-600">{message}</Text>
          </View>

          {onConfirm ? (
            <View className="mt-6 flex-row space-x-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 rounded-full bg-gray-300 py-3"
                activeOpacity={0.8}>
                <Text className="text-center text-base font-semibold text-gray-700">{buttonText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                className="flex-1 rounded-full bg-red-600 py-3"
                activeOpacity={0.8}>
                <Text className="text-center text-base font-semibold text-white">{confirmText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onClose}
              className="mt-6 rounded-full bg-blue-600 py-3"
              activeOpacity={0.8}>
              <Text className="text-center text-base font-semibold text-white">{buttonText}</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
