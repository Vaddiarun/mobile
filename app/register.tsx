import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; mobile?: string }>({});

  const validateName = (val: string) =>
    !val.trim() ? 'Name is required' : val.length < 4 ? 'At least 4 characters' : '';

  const validateEmail = (val: string) =>
    !val.trim()
      ? 'Email is required'
      : !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,3}$/.test(val)
        ? 'Enter valid email'
        : '';

  const validateMobile = (val: string) =>
    !val.trim()
      ? 'Mobile number required'
      : !/^[6-9]\d{9}$/.test(val)
        ? 'Enter valid mobile number'
        : '';

  const handleSubmit = async () => {
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const mobileErr = validateMobile(mobile);
    setErrors({ name: nameErr, email: emailErr, mobile: mobileErr });
    if (nameErr || emailErr || mobileErr) return;

    setLoading(true);
    try {
      // Example request — update with your API
      await axios.post('https://yourapi.com/register', { username: name, email, phone: mobile });
      router.push({ pathname: '/verifyotp', params: { name, email, phone: mobile } });
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="mb-8">
        <Image
          source={require('../assets/images/Glogo.png')}
          className="mb-3 h-14 w-14 opacity-50"
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold text-gray-700">Create your account</Text>
        <Text className="mt-1 text-gray-500">It only takes a moment to set things up.</Text>
      </View>

      {[
        {
          label: 'Name',
          value: name,
          setValue: setName,
          error: errors.name,
          placeholder: 'Enter Name',
        },
        {
          label: 'Email',
          value: email,
          setValue: setEmail,
          error: errors.email,
          placeholder: 'Enter Email',
        },
        {
          label: 'Mobile',
          value: mobile,
          setValue: setMobile,
          error: errors.mobile,
          placeholder: 'Enter Mobile Number',
          keyboardType: 'number-pad' as const,
        },
      ].map((field, idx) => (
        <View key={idx} className="mb-6">
          <Text className="mb-1 font-semibold text-gray-700">{field.label}*</Text>
          <TextInput
            placeholder={field.placeholder}
            value={field.value}
            onChangeText={field.setValue}
            keyboardType={field.keyboardType}
            className={`rounded-lg border px-4 py-3 text-gray-800 ${
              field.error ? 'border-red-500' : 'border-blue-400'
            }`}
          />
          {field.error && <Text className="mt-1 text-sm text-red-500">{field.error}</Text>}
        </View>
      ))}

      <Pressable
        onPress={handleSubmit}
        className="mt-4 w-1/2 items-center self-center rounded-full bg-blue-600 py-3">
        <Text className="text-base font-semibold text-white">
          {loading ? 'Loading...' : 'Register'}
        </Text>
      </Pressable>
    </View>
  );
}
