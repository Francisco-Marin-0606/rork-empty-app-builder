import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Platform, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";

import { usePlayer } from "../providers/PlayerProvider";
import { hapticSelection } from "../utils/haptics";
import { useSegments } from "expo-router";
import { MovingText } from "./MovingText";
import { defaultStyles } from "@/styles";
import { fontSize } from "@/store/themeStore";
import { useNetworkStore } from "@/store/networkStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAutoPauseOnCapture } from "@/hooks/useAutoPauseOnCapture";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function StickyPlayer() {
  const { current, previous, changeDirection, userPaused, isPlaying, next, prev, uiOpen, setUIOpen, pause, play } = usePlayer();
  const { isConnected } = useNetworkStore();

  const segments = useSegments();
  
  // Detectar si estamos en Aura (con o sin contenido)
  const isInAura = useMemo(() => {
    return String(segments).includes('aura') && String(segments).includes('index')
  }, [segments]);

  // Detectar si estamos en Aura sin contenido
  const isInAuraWithoutContent = useMemo(() => {
    return isInAura && !current
  }, [isInAura, current]);

  // Anti-flicker: reproducción optimista en cambios de track
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armOptimistic = useCallback((ms: number = 700) => {
    setOptimisticPlaying(true);
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
  }, []);
  useEffect(() => {
    return () => { if (optTimer.current) clearTimeout(optTimer.current); };
  }, []);

  const TAB_BAR_HEIGHT = 84 as const;
  const opacity = useRef(new Animated.Value(1)).current;
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const { isVisible } = useAutoPauseOnCapture(async () => {
    await pause();
  });



  useEffect(() => {
    const shouldShow = !!current && !uiOpen && !dismissed;

    // Prevent stale animations from finishing and overriding final values
    try { /* ignore */ } catch { /* ignore */ }
    try { opacity.stopAnimation?.(); } catch { /* ignore */ }

    if (shouldShow) {
      // Animar opacity en lugar de slideY para mantener la posición CSS
      Animated.timing(opacity, { toValue: 1, duration: 350, easing: (t)=>t, useNativeDriver: false }).start();

    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, easing: (t)=>t, useNativeDriver: false }).start();

    }
  }, [current, uiOpen, dismissed, opacity]);

  useEffect(() => {
    const shouldOptimistic = previous && changeDirection !== 'none' && !userPaused && (isPlaying || optimisticPlaying);

    if (shouldOptimistic) {
      armOptimistic(750);
    }
  }, [previous, changeDirection, userPaused, isPlaying, optimisticPlaying, armOptimistic]);

  useEffect(() => {
    if (!isPlaying) {
      setOptimisticPlaying(false);
    }
  }, [isPlaying]);

  const onLayout = useCallback((e: any) => {
    try { console.log('[ui] sticky layout', e.nativeEvent.layout.height); } catch { /* ignore */ }
    setContainerHeight(e.nativeEvent.layout.height ?? null);
  }, []);

  const displayPlaying = isPlaying || optimisticPlaying;

  // Si estamos en la sección de chat/psilocogo, profile o suscripción, no mostrar el sticky player
  if (segments.some(segment => 
    String(segment).includes('chat') || 
    String(segment).includes('profile') || 
    String(segment).includes('suscripción') || 
    String(segment).includes('subscription') ||
    String(segment).includes('hypnosisBottomSheetScreen') ||
    String(segment).includes('new-player') ||
    String(segment).includes('requestHipnosis')  ||
    String(segment).includes('questionsForm')  ||
    String(segment).includes('userPersonalDataFormInitial') ||
    isVisible
  )) {
    return null;
  }

  if (!current) return null;
  
  // Ocultar StickyPlayer si estamos en Aura (para evitar problemas de navegación)
  if (isInAura) return null;

  // No renderizar si no hay contenido o si está oculto
  if (!current || dismissed) return null;

	const bottomBarHeight = () => {
		if (Platform.OS === 'android') {
			return insets.bottom
		}
		return 0
	}
	
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      <AnimatedPressable
        style={[
          styles.container, 
          { 
            opacity,
            bottom: !isConnected 
              ? (Platform.OS === 'android' ? 130 : 140) + bottomBarHeight()  // Más arriba cuando no hay conexión
              : (Platform.OS === 'android' ? 80 : 90) + bottomBarHeight()    // Posición normal
          }
        ]}
        onLayout={onLayout}
        onPress={async () => {
          
          await hapticSelection();
          setUIOpen(true);
        }}
      >
        <View style={styles.leftRow}>
          <Image
            source={{ uri:  current?.imageUrl }}
            style={styles.cover}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
              </View>
        <View style={styles.trackTitleContainer}>
          <MovingText style={styles.trackTitle} text={ current?.title} animationThreshold={18}/>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => { try { console.log('[ui] sticky prev track'); } catch { /* ignore */ };
              if (isPlaying || optimisticPlaying) armOptimistic(800);
              await prev();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 28 }}
            testID="sticky-prev"
          >
            <Image
              source={require('@/assets/Images/FlechasPlayer.png') }
              style={{ width: 21, height: 21, transform: [{ scaleX: -1 as const }] }}
              resizeMode="contain"
              
              accessibilityIgnoresInvertColors
              
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => { try { console.log('[ui] sticky toggle'); } catch { /* ignore */ };
              if (displayPlaying) {
                setOptimisticPlaying(false);
                await pause();
              } else {
                armOptimistic(800);
                await play();
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="sticky-toggle"
          >
            {displayPlaying ? (
              <Image
                source={require('@/assets/Images/PausaV3.png')}
                style={{ width: 21, height: 21 }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                testID="sticky-icon-pause"
              />
            ) : (
              <Image
                source={require('@/assets/Images/Play.png')}
                style={{ width: 21, height: 21 }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                testID="sticky-icon-play"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={async () => { try { console.log('[ui] sticky next track'); } catch { /* ignore */ };
              if (isPlaying || optimisticPlaying) armOptimistic(800);
              await next();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginLeft: 28, marginRight: 12 }}
            testID="sticky-next"
          >
            <Image
              source={require('@/assets/Images/FlechasPlayer.png') }
              style={{ width: 21, height: 21}}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </TouchableOpacity>
        </View>
        
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100, // Z-index más bajo para no interferir con modales
    ...(Platform.OS !== 'web' ? { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 } : null as any),

  },
  leftRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  cover: { width: 41, height: 41 },
  title: { color: '#fff', fontSize: 17, fontWeight: '500', marginLeft: 10, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center'},
   trackTitleContainer: {
        flex: 1,
        overflow: 'hidden',
        marginLeft: 0,
        marginRight: 10,
    },
  testButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 1000, // Asegúrate de que esté por encima del sticky player
  },
  testInfo: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  testInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#262626',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  testButtonActive: {
    backgroundColor: '#4a4a4a',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 20,
  },
   trackTitle: {
        ...defaultStyles.text,
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
});
