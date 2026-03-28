import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

export interface SkeletonProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ width, height, borderRadius = 8, style, testID }) => {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    try { console.log('[ui] Skeleton mount'); } catch {}
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.7, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      try { console.log('[ui] Skeleton unmount'); } catch {}
      opacity.stopAnimation();
    };
  }, [opacity]);

  const containerStyle = useMemo(() => [
    styles.base,
    { width, height, borderRadius },
    style,
  ], [width, height, borderRadius, style]);

  return (
    <Animated.View testID={testID ?? 'skeleton'} style={[containerStyle, { opacity }]} />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#2a2a2a',
  },
});

export default React.memo(Skeleton);
