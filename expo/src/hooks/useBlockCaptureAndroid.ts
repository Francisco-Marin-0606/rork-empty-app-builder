import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

export function useBlockCaptureAndroid() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      ScreenCapture.preventScreenCaptureAsync();
      
      return () => {
        ScreenCapture.allowScreenCaptureAsync();
      };
    }
  }, []);
}