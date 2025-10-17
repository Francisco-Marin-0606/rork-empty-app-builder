import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface PulsingLoaderProps {
  size?: number;
  color?: string;
  minScale?: number;
  maxScale?: number;
  duration?: number;
}

const PulsingLoader: React.FC<PulsingLoaderProps> = ({
  size = 20,
  color = 'white',
  minScale = 0.5,
  maxScale = 0.7,
  duration = 1000,
}) => {
  const scaleAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: maxScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: minScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
    
    return () => {
      scaleAnim.stopAnimation();
    };
  }, [scaleAnim, minScale, maxScale, duration]);

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  circle: {
    alignSelf: 'center',
  },
});

export default PulsingLoader; 