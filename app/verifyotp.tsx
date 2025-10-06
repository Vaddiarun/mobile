import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput as RNTextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../services/apiClient';
import { EndPoints } from '../services/endPoints';
import { saveUser } from '../mmkv-storage/storage';

export default function VerifyOTP() {
  const router = useRouter();
  const { name, email, phone } = useLocalSearchParams();

  const [otp, setOtp] = useState(Array(6).fill(''));
  const inputs = useRef<(RNTextInput | null)[]>([]);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // use longer time for safety

  useEffect(() => {
    const interval = setInterval(() => setTimer((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (text: string, i: number) => {
    if (/^[a-zA-Z0-9]+$/.test(text) || text === '') {
      const newOtp = [...otp];
      if (text.length > 1) {
        const chars = text.split('').slice(0, 6);
        chars.forEach((c, idx) => (newOtp[idx] = c));
        setOtp(newOtp);
        if (chars.length < 6) inputs.current[chars.length]?.focus();
        else inputs.current[5]?.blur();
      } else {
        newOtp[i] = text;
        setOtp(newOtp);
        if (text && i < 5) inputs.current[i + 1]?.focus();
      }
      setError('');
    } else {
      setError('Enter letters & numbers only');
    }
  };

  const handleKeyPress = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      const newOtp = [...otp];
      newOtp[i - 1] = '';
      setOtp(newOtp);
      inputs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const entered = otp.join('');
    if (entered.length < 6) {
      setError('Enter 6-digit OTP');
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/${EndPoints.OTP_VERIFY}`, {
        phone: `+91${phone}`,
        otp: entered,
      });

      console.log('✅ OTP verification response:', JSON.stringify(res.data, null, 2));

      // Check if verification was successful (token might be at different levels)
      const token = res.data?.token || res.data?.data?.token || null;
      const responseUser = res.data?.user || res.data?.data?.user || null;

      if (res.data) {
        // Save user data with token to storage
        const userData = {
          data: {
            token: token || 'dev-token',
            user: {
              Username: name || responseUser?.username || responseUser?.Username || 'User',
              Email: email || responseUser?.email || responseUser?.Email || '',
              Phone: `+91${phone}`,
            },
          },
        };

        console.log('💾 Saving user data to storage');
        console.log('   Token:', token ? `${token.substring(0, 20)}...` : 'none - using dev-token');
        console.log('   User:', userData.data.user);
        saveUser(userData);

        Alert.alert('Success', 'Account verified successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        console.error('❌ Invalid response:', res.data);
        setError('OTP verification failed');
      }
    } catch (err: any) {
      console.log('❌ OTP verify error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Invalid or expired OTP');
    }
  };

  const handleResend = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/${EndPoints.REGISTER}`, {
        username: name,
        email,
        phone: `+91${phone}`, // ✅ Fixed here too
      });

      console.log('🔄 Resend response:', res.data);
      setOtp(Array(6).fill(''));
      setTimer(300);
      setError('');
    } catch (e: any) {
      console.log('❌ Resend error:', e.response?.data || e.message);
      setError('Failed to resend OTP');
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
            ref={(r) => (inputs.current[i] = r)}
            className="h-12 w-12 rounded-xl border border-blue-400 text-center text-lg text-gray-800"
            value={d}
            onChangeText={(t) => handleChange(t, i)}
            keyboardType="number-pad"
            maxLength={1}
            onKeyPress={(e) => handleKeyPress(e, i)}
          />
        ))}
      </View>

      {error ? <Text className="mb-3 text-sm text-red-500">{error}</Text> : null}

      <TouchableOpacity
        className="w-1/2 self-center rounded-full bg-blue-600 py-3"
        onPress={handleVerify}>
        <Text className="text-center font-semibold text-white">Verify</Text>
      </TouchableOpacity>

      <TouchableOpacity disabled={timer > 0} onPress={handleResend} className="mt-4">
        <Text
          className={`text-center font-medium ${timer > 0 ? 'text-gray-400' : 'text-blue-600'}`}>
          {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
