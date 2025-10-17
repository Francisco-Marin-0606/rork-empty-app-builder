import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from "../providers/PlayerProvider";

const { height: screenHeight } = Dimensions.get('window');

const COVER_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png' as const;
const COVER_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers2.png' as const;
const COVER_URL_3 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers1.png' as const;

export default function FullPlayerOverlay() {
  const { current, isPlaying, uiOpen, setUIOpen, next, prev, toggle } = usePlayer();

  const coverUrl = useState(() => {
    const n = Number(current?.id ?? '');
    if (Number.isFinite(n)) {
      const idx = ((n - 1) % 3 + 3) % 3;
      return [COVER_URL_1, COVER_URL_2, COVER_URL_3][idx];
    }
    return COVER_URL_1;
  })[0];

  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    try { console.log('[ui] FullPlayerOverlay uiOpen', uiOpen); } catch {}
    if (uiOpen) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 320, easing: (t)=>t, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0.6, duration: 280, easing: (t)=>t, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: screenHeight, duration: 260, easing: (t)=>t, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, easing: (t)=>t, useNativeDriver: true }),
      ]).start();
    }
  }, [uiOpen, translateY, backdropOpacity]);

  if (!current) return null;

  return (
    <View pointerEvents={uiOpen ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { try { console.log('[ui] overlay backdrop press'); } catch {}; setUIOpen(false); }} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        testID="full-player-overlay"
      >
        <LinearGradient
          colors={[current.color ?? '#0f172a', '#000']}
          locations={[0, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        <View style={styles.content}>
          <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
          <Text style={styles.title} numberOfLines={2}>{current.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>Reproduciendo ahora</Text>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={async () => { try { console.log('[ui] full prev'); } catch {}; await prev(); }}
              style={styles.ctrlBtn}
              testID="full-prev"
            >
              <Image source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }} style={{ width: 28, height: 28, tintColor: '#fff', transform: [{ scaleX: -1 as const }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={async () => { try { console.log('[ui] full toggle'); } catch {}; await toggle(); }}
              style={[styles.ctrlBtn, styles.ctrlPrimary]}
              testID="full-toggle"
            >
              <Image source={{ uri: isPlaying ? 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' : 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }} style={{ width: 30, height: 30 }} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={async () => { try { console.log('[ui] full next'); } catch {}; await next(); }}
              style={styles.ctrlBtn}
              testID="full-next"
            >
              <Image source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }} style={{ width: 28, height: 28, tintColor: '#fff' }} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { try { console.log('[ui] full close'); } catch {}; setUIOpen(false); }}
            style={styles.closeBtn}
            testID="full-close"
          >
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const SHEET_TOP_RADIUS = 24 as const;

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: Math.floor(screenHeight * 0.08),
    backgroundColor: '#0b0b0b',
    borderTopLeftRadius: SHEET_TOP_RADIUS,
    borderTopRightRadius: SHEET_TOP_RADIUS,
    overflow: 'hidden',
    ...(Platform.OS !== 'web' ? { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 24 } : null as any),
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 56, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  cover: { width: 220, height: 220, borderRadius: 16, marginTop: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' as const, marginTop: 16, textAlign: 'center' },
  subtitle: { color: '#cbd5e1', fontSize: 13, marginTop: 6 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  ctrlBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 10 },
  ctrlPrimary: { backgroundColor: 'rgba(255,255,255,0.18)' },
  closeBtn: { position: 'absolute', right: 16, top: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.35)' },
  closeText: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' as const },
});
