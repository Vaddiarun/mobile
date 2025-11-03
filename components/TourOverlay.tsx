import React from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface TourOverlayProps {
  visible: boolean;
  message: string;
  onNext: () => void;
  onSkip: () => void;
  highlightArea?: { x: number; y: number; width: number; height: number };
  step: number;
  totalSteps: number;
  tooltipPosition?: 'top' | 'middle' | 'bottom';
}

export default function TourOverlay({
  visible,
  message,
  onNext,
  onSkip,
  highlightArea,
  step,
  totalSteps,
  tooltipPosition = 'bottom',
}: TourOverlayProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']} pointerEvents="box-none">
        <View className="flex-1" pointerEvents="box-none">
          {/* Transparent overlay - blocks all touches */}
          <View className="absolute inset-0 bg-transparent" pointerEvents="auto" />

          {/* Highlight area */}
          {highlightArea && (
            <View
              style={{
                position: 'absolute',
                left: highlightArea.x,
                top: highlightArea.y,
                width: highlightArea.width,
                height: highlightArea.height,
                borderWidth: 3,
                borderColor: '#3B82F6',
                borderRadius: 12,
                backgroundColor: 'transparent',
              }}
            />
          )}

          {/* Tooltip */}
          <View
            style={{
              position: 'absolute',
              top: tooltipPosition === 'top' ? 60 : tooltipPosition === 'middle' ? height / 2 - 100 : undefined,
              bottom: tooltipPosition === 'bottom' ? 100 : undefined,
              left: 20,
              right: 20,
            }}
            className="rounded-2xl bg-white p-6 shadow-lg">
            <Text className="mb-1 text-xs font-semibold text-gray-500">
              Step {step} of {totalSteps}
            </Text>
            <Text className="mb-6 text-base leading-6 text-gray-800">{message}</Text>

            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={onSkip}
                className="rounded-lg border border-gray-300 px-6 py-3">
                <Text className="font-semibold text-gray-700">Skip Tour</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onNext} className="rounded-lg bg-blue-600 px-8 py-3">
                <Text className="font-semibold text-white">
                  {step === totalSteps ? 'Finish' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
