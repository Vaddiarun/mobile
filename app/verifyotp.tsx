import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';

export default function VerifyOTP() {
  const router = useRouter();
  const { name, email, phone } = useLocalSearchParams();
  const [otp, setOtp] = useState(Array(6).fill(''));
  const inputs = useRef<(RNTextInput | null)[]>([]);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => setTimer((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text: string, i: number) => {
    const newOtp = [...otp];
    newOtp[i] = text;
    setOtp(newOtp);
    if (text && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length < 6) {
      setError('Enter 6-digit OTP');
      return;
    }
    try {
      await axios.post('https://yourapi.com/verify', { phone, otp: enteredOtp });
      router.replace('/(tabs)');
    } catch {
      setError('Invalid or expired OTP');
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="mb-1 text-2xl font-bold text-gray-700">Verify your number</Text>
      <Text className="mb-8 text-gray-500">We’ve sent a code to +91 {phone}</Text>

      <View className="mb-4 flex-row justify-between">
        {otp.map((d, i) => (
          <RNTextInput
            key={i}
            ref={(r) => {
              inputs.current[i] = r;
            }}
            className="h-12 w-12 rounded-xl border border-blue-400 text-center text-lg text-gray-800"
            value={d}
            onChangeText={(t) => handleChange(t, i)}
            keyboardType="number-pad"
            maxLength={1}
          />
        ))}
      </View>

      {error ? <Text className="mb-3 text-sm text-red-500">{error}</Text> : null}

      <TouchableOpacity
        className="w-1/2 self-center rounded-full bg-blue-600 py-3"
        onPress={handleVerify}>
        <Text className="text-center font-semibold text-white">Verify</Text>
      </TouchableOpacity>

      <TouchableOpacity disabled={timer > 0} onPress={() => setTimer(60)} className="mt-4">
        <Text
          className={`text-center font-medium ${timer > 0 ? 'text-gray-400' : 'text-blue-600'}`}>
          {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
