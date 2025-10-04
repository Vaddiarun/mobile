import React, { useState } from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-10 text-center text-3xl font-bold text-blue-600">Welcome Back</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
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
        className="mb-3 rounded-full bg-blue-600 py-3"
        onPress={() => router.replace('/(tabs)')}>
        <Text className="text-center font-semibold text-white">Login</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')}>
        <Text className="text-center font-semibold text-blue-600">Create Account</Text>
      </Pressable>
    </View>
  );
}
