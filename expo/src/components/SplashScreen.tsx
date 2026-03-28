// components/CustomSplashScreen.tsx
import { View, Image, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/constants/tokens';
import FastImage from 'react-native-fast-image';

interface CustomSplashScreenProps {
  onFinish?: () => void;
}

const CustomSplashScreen = ({ onFinish }: CustomSplashScreenProps) => {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = 1;
    
    const timer = setTimeout(() => {
      opacity.value = withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 200 }, () => {
          if (onFinish) {
            runOnJS(onFinish)();
          }
        })
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom
        },
        animatedStyle
      ]}
    >
      <View style={styles.contentContainer}>
        <Animated.View 
          entering={FadeIn.delay(400).springify()}
          style={styles.logoContainer}
        >
          <FastImage 
            source={require('../../assets/Logo_Blanco_M_PNG.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 70,  // Ajusta este valor según el tamaño que necesites
    height: 70, // Ajusta este valor según el tamaño que necesites
  },
  loader: {
    marginTop: 20,
  },
});

export default CustomSplashScreen;