import React from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

function Root() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        await new Promise(resolve => setTimeout(resolve, 100));
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        console.error('Error during initialization:', e);
        setAppIsReady(true);
      }
    };

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Slot />
    </View>
  );
}

export default Root;


