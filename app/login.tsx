import React, { useState } from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../services/apiClient';
import { EndPoints } from '../services/endPoints';
import { saveUser } from '../mmkv-storage/storage';
import CustomModal from '../components/CustomModal';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setModal({
        visible: true,
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please enter username and password',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/${EndPoints.LOGIN}`, {
        username,
        password,
        rememberMe,
      });

      if (res.data?.valid && res.data?.data?.token) {
        saveUser(res.data);
        router.replace('/(tabs)');
      } else {
        setModal({
          visible: true,
          type: 'error',
          title: 'Login Failed',
          message: res.data?.message || 'Invalid credentials',
        });
      }
    } catch (e: any) {
      setModal({
        visible: true,
        type: 'error',
        title: 'Login Failed',
        message: e.response?.data?.message || 'Invalid username or password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-10 text-center text-3xl font-bold text-blue-600">Welcome Back</Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        className="mb-4 rounded-lg border border-blue-400 px-4 py-3 text-gray-800"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="mb-6 rounded-lg border border-blue-400 px-4 py-3 text-gray-800"
      />

      <Pressable
        className={`mb-3 rounded-full py-3 ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
        onPress={!loading ? handleLogin : undefined}>
        <Text className="text-center font-semibold text-white">{loading ? 'Loading...' : 'Login'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')}>
        <Text className="text-center font-semibold text-blue-600">Create Account</Text>
      </Pressable>

      <CustomModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, visible: false })}
      />
    </View>
  );
}
