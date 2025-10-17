import { colors, fontSize } from '@/constants/tokens';
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ViewStyle, TextStyle } from 'react-native';

interface LoadingScreenProps {
  containerStyle?: any;
  spinnerStyle?: ViewStyle;
  spinnerColor?: string;
  spinnerBorderColor?: string;
  textStyle?: TextStyle;
  text?: string;
  hideProgressBar?: boolean;
}

const LoadingScreen = ({
  containerStyle,
  spinnerStyle,
  spinnerColor,
  spinnerBorderColor,
  textStyle,
  text = 'Cargando...',
  hideProgressBar = false
}: LoadingScreenProps) => {
  // Create animated value for rotation
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create infinite spinning animation
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      })
    );
    
    spin.start();

    return () => spin.stop();
  }, []);

  // Create interpolation for 360 degree rotation
  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Custom spinner styles
  const customSpinnerStyle = {
    borderColor: spinnerBorderColor || colors.tertiary,
    borderTopColor: spinnerColor || colors.primary,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Logo text */}
      {/* <Text style={styles.logo}>mental</Text> */}
    
      {/* Loading spinner container */}
      {!hideProgressBar && (
      <View style={styles.loaderContainer}>
        {/* Spinning circle */}
        <Animated.View 
          style={[
            styles.spinner, 
            customSpinnerStyle,
            spinnerStyle, 
            { transform: [{ rotate }] }
          ]} 
        />
        
        {/* Center dot */}
        {/* <View style={styles.centerDot} /> */}
      </View>
      )}
      
      {/* Loading text */}
      {!hideProgressBar && (
        <Text style={[styles.loadingText, textStyle]}>{text}</Text>
      )}
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#FF9B5E',
    fontSize: 20,
    fontWeight: '300',
    marginBottom: 64,
  },
  loaderContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: colors.tertiary,
    borderTopColor: colors.primary,
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  loadingText: {
    marginTop: 32,
    color: colors.text,
    fontSize: fontSize.base,
  },
});

export default LoadingScreen;