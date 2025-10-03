import { StatusBar } from 'expo-status-bar';
import { Hello } from 'components/Hello';

import './global.css';

export default function App() {
  return (
    <>
      <Hello />
      <StatusBar style="auto" />
    </>
  );
}
