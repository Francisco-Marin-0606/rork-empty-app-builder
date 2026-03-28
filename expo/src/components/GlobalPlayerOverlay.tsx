import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PropTypes from 'prop-types';
import { usePlayer } from '@/providers/PlayerProvider';
import { hapticImpact, hapticSelection } from '@/utils/haptics';
import FastImage from 'react-native-fast-image';
import { useVinylRotation } from '../hooks/useVinylRotation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CoverWithVinyl: React.FC<{ imageSize: number; spinActive?: boolean; vinylUrl?: string; coverUrl?: string; trackId?: string }> = React.memo(({ imageSize, spinActive, vinylUrl, coverUrl, trackId }) => {
  const vinylSize = useMemo(() => Math.floor(imageSize * 0.7), [imageSize]);
  const vinylLeft = useMemo(() => Math.floor(imageSize - vinylSize / 2), [imageSize, vinylSize]);
  const vinylTop = useMemo(() => Math.floor((imageSize - vinylSize) / 2), [imageSize, vinylSize]);

  const rotate = useVinylRotation(spinActive || false, trackId);

  return (
    <View style={{ position: 'relative', width: imageSize, height: imageSize }}>
      {/* Vinilo principal */}
      <Animated.Image 
        source={{ uri: vinylUrl }} 
        style={{ 
          position: 'absolute', 
          width: vinylSize, 
          height: vinylSize, 
          left: vinylLeft, 
          top: vinylTop, 
          transform: [{ rotate }] 
        }} 
        resizeMode="contain" 
        accessibilityIgnoresInvertColors 
      />
      
      {/* Sombreado sutil del vinilo */}
      <View
        style={{
          position: 'absolute',
          width: vinylSize,
          height: vinylSize,
          left: vinylLeft,
          top: vinylTop,           // Bajado 1px hacia abajo
          borderRadius: vinylSize / 2,
          overflow: 'hidden',
          zIndex: 1,
          justifyContent: 'center',   // Centrar verticalmente
          alignItems: 'center',        // Centrar horizontalmente
        }}
      >
        <View
          style={{
            width: '100%',
            height: '100%',              // Altura reducida para centrado
            borderRadius: (vinylSize / 2),  // Aumentado para contener la sombra
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={[
              'transparent',                   // Izquierda: sin sombra
              'rgba(0, 0, 0.2, 0.6)',         // Primera franja: sombra fuerte
              'rgba(0, 0, 0.2, 0.3)',         // Transición suave
              'rgba(0, 0, 0.2, 0.1)',         // Transición más suave
              'transparent'                    // Resto: sin sombra
            ]}
            start={{ x: 0.45, y: 0 }}         // Comienza desde el centro-izquierda
            end={{ x: 0.7, y: 0 }}             // Termina más allá para transición suave
            style={{
              width: '100%',
              height: '100%',
              borderRadius: (vinylSize / 2) + 2,  // Aumentado para contener la sombra
            }}
          />
        </View>
      </View>
      
      {/* Tapa del álbum */}
      <View style={{ 
        width: imageSize, 
        height: imageSize, 
        borderRadius: 12, 
        overflow: 'hidden',
        zIndex: 2,
      }}>
        <Image 
          source={{ uri: coverUrl }} 
          style={{ width: '100%', height: '100%' }} 
          resizeMode="cover" 
          accessibilityIgnoresInvertColors 
        />
      </View>
    </View>
  );
});

CoverWithVinyl.propTypes = {
  imageSize: PropTypes.number.isRequired,
  spinActive: PropTypes.bool,
  vinylUrl: PropTypes.string,
  coverUrl: PropTypes.string,
  trackId: PropTypes.string,
};

const ArrowIcon: React.FC<{ direction: 'next' | 'prev'; size?: number; testID?: string }> = ({ direction, size = 34, testID }) => {
  return (
    <FastImage source={require('@/assets/Images/FlechasPlayer.png')} style={{ width: size, height: size, transform: [{ scaleX: direction === 'prev' ? -1 : 1 }] }} resizeMode="contain" accessibilityIgnoresInvertColors testID={testID} />
  );
};

export default function GlobalPlayerOverlay() {
  const { uiOpen, setUIOpen, current, previous, changeDirection, isPlaying, next, prev, pause, play } = usePlayer();
  
  const sheetHeight = Math.floor(screenHeight * 0.9);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const offsetUp = Math.floor(sheetHeight * 0.2);
  const offsetLeft = Math.floor(screenWidth * 0.03);

  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armOptimistic = useCallback((ms: number = 700) => {
    setOptimisticPlaying(true);
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
  }, []);
  useEffect(() => () => { if (optTimer.current) clearTimeout(optTimer.current); }, []);

  useEffect(() => {
    if (!isPlaying) {
      setOptimisticPlaying(false);
    }
  }, [isPlaying]);

  // Efecto específico para manejar la primera selección de track
  useEffect(() => {
    if (current && isPlaying && !previous) {
      // Cuando se selecciona un track por primera vez y está reproduciéndose,
      // asegurar que optimisticPlaying esté sincronizado
      setOptimisticPlaying(false);
    }
  }, [current, isPlaying, previous]);

  const slideProg = useRef(new Animated.Value(1)).current;
  const initialFade = useRef(new Animated.Value(0)).current;
  const [textKey, setTextKey] = useState<number>(0);
  useEffect(() => {
    if (!current) return;
    setTextKey((k) => k + 1);
    if (!previous || changeDirection === 'none') {
      initialFade.setValue(0);
      Animated.timing(initialFade, { toValue: 1, duration: 764, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
      return;
    }
    slideProg.setValue(0);
    Animated.timing(slideProg, { toValue: 1, duration: 917, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [current, previous, changeDirection, slideProg, initialFade]);

  const open = useCallback(() => {
    const smooth = Easing.bezier(0.22, 1, 0.36, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 861, easing: smooth, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 1, duration: 720, easing: smooth, useNativeDriver: true }),
    ]).start();
  }, [translateY, backdrop]);

  const close = useCallback(() => {
    const smoothIn = Easing.bezier(0.4, 0, 0.2, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight, duration: 720, easing: smoothIn, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 640, easing: smoothIn, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setUIOpen(false);
    });
  }, [translateY, backdrop, setUIOpen, sheetHeight]);

  const isSwipingHoriz = useRef<boolean>(false);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        if (isSwipingHoriz.current) return false;
        const verticalIntent = Math.abs(g.dy) > Math.abs(g.dx) && Math.abs(g.dy) > 6;
        return verticalIntent;
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        if (isSwipingHoriz.current) return false;
        const verticalIntent = Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx);
        return verticalIntent;
      },
      onPanResponderMove: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const nextY = Math.max(0, g.dy);
        translateY.setValue(nextY);
        const prog = Math.min(1, nextY / sheetHeight);
        backdrop.setValue(1 - prog);
      },
      onPanResponderRelease: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const shouldClose = g.dy > 120 || g.vy > 0.9;
        if (shouldClose) {
          hapticSelection();
          close();
        } else {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 0, duration: 600, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
            Animated.timing(backdrop, { toValue: 1, duration: 560, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
          ]).start();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  useEffect(() => { if (uiOpen) open(); }, [uiOpen, open]);

  const SWIPE_THRESHOLD = 12 as const;
  const SWIPE_VELOCITY = 0.2 as const;
  const swipeLockRef = useRef<boolean>(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => { prevRef.current = prev; }, [prev]);

  const coverSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        const should = Math.abs(g.dx) > Math.abs(g.dy) * 0.7 && Math.abs(g.dx) > 3;
        return should;
      },
      onMoveShouldSetPanResponder: (_e, g) => {
        const should = Math.abs(g.dx) > Math.abs(g.dy) * 0.75 && Math.abs(g.dx) > 3;
        if (should) {
          isSwipingHoriz.current = true;
        }
        return should;
      },
      onPanResponderGrant: () => {
        isSwipingHoriz.current = true;
        hapticSelection();
      },
      onPanResponderMove: (_e, g) => {
        if (!isSwipingHoriz.current) return;
        const damp = 0.9;
        const val = Math.max(-screenWidth, Math.min(screenWidth, g.dx * damp));
        swipeX.setValue(val);
        if (!swipeLockRef.current) {
          const distance = Math.abs(g.dx);
          const velocity = Math.abs(g.vx);
          const commit = distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
          if (commit) {
            swipeLockRef.current = true;
            const goingNext = g.dx < 0;
            hapticImpact('rigid');
            armOptimistic(800);
            if (goingNext) {
              nextRef.current?.().catch(() => {});
            } else {
              prevRef.current?.().catch(() => {});
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
      },
      onPanResponderRelease: (_e, g) => {
        const distance = Math.abs(g.dx ?? 0);
        const velocity = Math.abs(g.vx ?? 0);
        if (!swipeLockRef.current) {
          const commit = distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
          if (commit) {
            swipeLockRef.current = true;
            const goingNext = (g.dx ?? 0) < 0;
            hapticImpact('rigid');
            armOptimistic(800);
            if (goingNext) {
              nextRef.current?.().catch(() => {});
            } else {
              prevRef.current?.().catch(() => {});
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderEnd: () => {
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;


  const displayPlaying = (isPlaying || optimisticPlaying);
  const spinActive = displayPlaying && Boolean(current?.id);
  const prevBaseColor = previous?.color ?? '#063536';
  const currBaseColor = current?.color ?? '#EA580C';

  const darkenColor = useCallback((hex: string, factor: number) => {
    try {
      const cleaned = hex.replace('#', '');
      const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const nr = Math.max(0, Math.min(255, Math.floor(r * factor)));
      const ng = Math.max(0, Math.min(255, Math.floor(g * factor)));
      const nb = Math.max(0, Math.min(255, Math.floor(b * factor)));
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    } catch {
      return hex;
    }
  }, []);
  const prevColor = useMemo(() => darkenColor(prevBaseColor, 0.5), [prevBaseColor, darkenColor]);
  const currColor = useMemo(() => darkenColor(currBaseColor, 0.5), [currBaseColor, darkenColor]);
  const imageBase = Math.min(320, Math.floor(screenWidth * 0.68));
  const imageSize = Math.floor(imageBase * 0.72);
  const imageOffsetDown = 0;
  const dir = changeDirection;
  const outTo = dir === 'next' ? -screenWidth : screenWidth;
  const inFrom = dir === 'next' ? screenWidth : -screenWidth;
  const prevTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, outTo] });
  const currTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [inFrom, 0] });
  const shouldAnimate = !!previous && dir !== 'none';
  const upShift = -Math.floor(imageSize * 0.75);
  const leftShift = 0;

  return uiOpen ? (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]} pointerEvents="box-none" testID="global-player-overlay-root">
      <Animated.View testID="global-player-backdrop" style={[styles.backdrop, { opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={async () => { await hapticSelection(); close(); }} testID="global-player-backdrop-touch" />
      </Animated.View>

      <Animated.View {...panResponder.panHandlers} style={[styles.sheetContainer, { height: sheetHeight, transform: [{ translateY }], top: Math.floor(screenHeight * 0.12) }]} testID="global-player-sheet">
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && dir !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 0 }]}>
            <LinearGradient colors={[prevColor, prevColor, '#000000']} locations={[0, 0.02, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && dir !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) : initialFade }]}>
            <LinearGradient colors={[currColor, currColor, '#000000']} locations={[0, 0.02, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
        <View style={styles.sheetGrabberRow}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.sheetContent} testID="global-player-swipe-zone" accessible accessibilityLabel="Swipe zone">
          <View style={[styles.centerZone, (changeDirection === 'none') ? { paddingTop: Math.floor(sheetHeight * -0.5) } : null]}>
            <View {...coverSwipeResponder.panHandlers} style={[styles.centerBlock, { transform: [{ translateY: upShift }, { translateX: leftShift }], marginTop: -Math.floor(screenHeight * 0.01) }]} testID="global-player-cover-swipe-surface" accessible accessibilityLabel="Swipe horizontal para cambiar de canción">
              {shouldAnimate ? (
                <View>
                  <Animated.View style={[styles.coverRow, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: prevTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} testID="global-player-cover-previous">
                    <CoverWithVinyl imageSize={imageSize} spinActive={false} vinylUrl={previous?.vinylUrl} coverUrl={previous?.imageUrl} trackId={previous?.id} />
                    <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                      <Text style={styles.centerTitle} numberOfLines={3} ellipsizeMode="tail">{previous?.title ?? ''}</Text>
                      <Text style={styles.centerSubtitle} numberOfLines={2}>{previous?.subtitle ?? ''}</Text>
                    </View>
                  </Animated.View>
                  <Animated.View style={[styles.coverRow, StyleSheet.absoluteFillObject as any, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: currTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} testID="global-player-cover-current">
                    <CoverWithVinyl imageSize={imageSize} spinActive={spinActive} vinylUrl={current?.vinylUrl} coverUrl={current?.imageUrl} trackId={current?.id} />
                    <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                      <Text style={styles.centerTitle} numberOfLines={3} ellipsizeMode="tail">{current?.title ?? ''}</Text>
                      <Text style={styles.centerSubtitle} numberOfLines={2}>{current?.subtitle ?? ''}</Text>
                    </View>
                  </Animated.View>
                </View>
              ) : (
                <View>
                  <View style={{ width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignItems: 'flex-start' }}>
                    <View style={{ transform: [{ translateY: imageOffsetDown }] }}>
                      <CoverWithVinyl imageSize={imageSize} spinActive={spinActive} vinylUrl={current?.vinylUrl} coverUrl={current?.imageUrl} trackId={current?.id} />
                    </View>
                    <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                      <Text style={styles.centerTitle} numberOfLines={3} ellipsizeMode="tail">{current?.title ?? ''}</Text>
                      <Text style={styles.centerSubtitle} numberOfLines={2}>{current?.subtitle ?? ''}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
            {/* Controles separados del área de swipe para evitar conflictos */}
            <View style={styles.controlsRow} pointerEvents="box-none">
              <View style={styles.controlsInner} testID="global-player-controls">
                <TouchableOpacity testID="global-btn-back" accessibilityRole="button" onPress={async () => { 
                  await hapticImpact('medium'); 
                  armOptimistic(800); 
                  await prev(); 
                }}>
                  <ArrowIcon direction="prev" size={38} testID="global-icon-prev" />
                </TouchableOpacity>
                <TouchableOpacity testID="global-btn-toggle" accessibilityRole="button" style={styles.playButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={async () => { 
                  await hapticImpact('medium'); 
                  if (displayPlaying) { 
                    setOptimisticPlaying(false); 
                    await pause(); 
                  } else { 
                    await play(); 
                  } 
                }} accessibilityLabel={displayPlaying ? 'Pausar' : 'Reproducir'}>
                  {displayPlaying ? (
                    <FastImage source={require('@/assets/Images/PausaV3.png')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors testID="global-icon-pause" />
                  ) : (
                    <FastImage source={require('@/assets/Images/Play.png')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors testID="global-icon-play" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity testID="global-btn-forward" accessibilityRole="button" onPress={async () => { 
                  await hapticImpact('light'); 
                  armOptimistic(800); 
                  await next(); 
                }}>
                  <ArrowIcon direction="next" size={38} testID="global-icon-next" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sheetContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  sheetGrabberRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 80 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 8, marginTop: -Math.floor(screenHeight * 0.14) },
  sheetContent: { flex: 1, paddingHorizontal: 0, paddingTop: 16 },
  centerZone: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerBlock: { alignItems: 'center', justifyContent: 'center' },
  centerTextBlock: { marginTop: 12, alignItems: 'flex-start', paddingHorizontal: 0 },
  centerTitle: { color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'left' },
  centerSubtitle: { color: '#94a3b8', fontSize: 16, lineHeight: 18, marginTop: 6, textAlign: 'left' },
  controlsRow: { position: 'absolute', left: 0, right: 0, bottom: 200, alignItems: 'center', justifyContent: 'center' },
  playButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  coverRow: { paddingHorizontal: 0 },
  controlsInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '64%', alignSelf: 'center' },
});
