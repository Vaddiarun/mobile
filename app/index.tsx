// app/index.tsx
import { Redirect } from 'expo-router';
import 'react-native-gesture-handler'; // if used
global.Buffer = global.Buffer || require('buffer').Buffer;
export default function Entry() {
  return <Redirect href="/splash" />;
}
