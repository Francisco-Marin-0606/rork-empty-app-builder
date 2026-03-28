import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { colors } from '@/constants/tokens';

interface ImageSkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  width = '100%',
  height = 200,
  borderRadius = 8,
  style
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            borderRadius,
            opacity: shimmerOpacity,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default ImageSkeleton; 