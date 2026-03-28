import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import Skeleton from './Skeleton';

export interface ImageWithSkeletonProps {
  uri: string;
  width: number;
  height: number;
  borderRadius?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({ uri, width, height, borderRadius = 0, resizeMode = 'cover', style, testID }) => {
  const [loaded, setLoaded] = useState<boolean>(false);

  const onLoadEnd = useCallback(() => {
    try { console.log('[img] loaded', uri); } catch {}
    setLoaded(true);
  }, [uri]);

  const src = useMemo(() => ({ uri } as ImageSourcePropType), [uri]);

  return (
    <View style={{ width, height }}>
      {!loaded ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Skeleton width={width} height={height} borderRadius={borderRadius} testID={(testID ?? 'image') + '-skeleton'} />
        </View>
      ) : null}
      <Image
        source={src}
        onLoadEnd={onLoadEnd}
        onError={() => { try { console.warn('[img] error loading', uri); } catch {} setLoaded(true); }}
        style={[{ width, height, borderRadius }, style]}
        resizeMode={resizeMode}
        testID={testID}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
};

export default React.memo(ImageWithSkeleton);
