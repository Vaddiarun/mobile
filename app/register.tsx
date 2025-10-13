import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../services/apiClient';
import { EndPoints } from '../services/endPoints';
import CustomModal from '../components/CustomModal';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; mobile?: string }>({});
  const [modal, setModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

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
      const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
      await axios.post(`${BASE_URL}/${EndPoints.REGISTER}`, {
        username: name,
        email,
        phone: formattedPhone,
      });

      setModal({
        visible: true,
        type: 'success',
        title: 'OTP Sent',
        message: 'OTP has been sent to your mobile number. Please check your phone.',
      });
    } catch (e: any) {
      if (axios.isAxiosError(e)) {
        console.log('Register error:', e.response?.data || e.message);
        const errorMsg = e.response?.data?.message || 'Registration failed';
        setModal({
          visible: true,
          type: 'error',
          title: 'Registration Failed',
          message: errorMsg.includes('already')
            ? 'This phone number is already registered. Please login instead.'
            : errorMsg,
        });
      } else {
        setModal({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="mb-8 items-center">
        <Image
          source={require('../assets/images/Glogo.png')}
          className="h-26 w-26 mb-3 mt-6"
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold text-gray-700">Create your account</Text>
        <Text className="mt-1 text-center text-gray-500">
          It only takes a moment to set things up.
        </Text>
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
        onPress={!loading ? handleSubmit : undefined}
        className={`mt-4 w-1/2 items-center self-center rounded-full ${
          loading ? 'bg-gray-400' : 'bg-blue-600'
        } py-3`}>
        <Text className="text-base font-semibold text-white">
          {loading ? 'Loading...' : 'Register'}
        </Text>
      </Pressable>

      <CustomModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.type === 'success') {
            router.push({ pathname: '/verifyotp', params: { name, email, phone: mobile } });
          }
        }}
      />
    </View>
  );
}
