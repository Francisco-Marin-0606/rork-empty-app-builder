import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	StyleSheet,
  Text,
  View,
  ScrollView,
	Dimensions,
	Image,
  LayoutChangeEvent,
  TouchableOpacity,
  Animated,
	Easing,
  PanResponder,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect, router } from "expo-router";
import { hapticImpact, hapticSelection } from "@/utils/haptics";
import { usePlayer } from "@/providers/PlayerProvider";
import { colors } from "@/constants/tokens";
import { useAuraData, useAuraActions, AuraDataAudio, useAuraSelection, convertToAlbumDatasFromTracks, convertToAlbumData, convertToAlbumDatas, useAuraStore } from "@/store/auraStore";
import { useAuthStore } from "@/store/authStore";
import { useNetworkStore } from "@/store/networkStore";
import { MovingText } from "@/components/MovingText";
import { useIndividualVinylRotation } from "../../../../hooks/useVinylRotation";
import { useAutoPauseOnCapture } from "@/hooks/useAutoPauseOnCapture";
import { useBlockCaptureAndroid } from "@/hooks/useBlockCaptureAndroid";
import TrackPlayer from "react-native-track-player";
import { CaptureBlockerModal } from "@/components/CaptureBlockerModal";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = Math.round(screenWidth * 0.72 * 0.8);
const LEFT_PADDING = 40; // Aumentado para coincidir con "Mis hipnosis"
const ITEM_SPACING = 72; // Aumentado de 48 a 72 (50% más)
const END_PADDING = Math.max(0, Math.floor(screenWidth - LEFT_PADDING - CARD_WIDTH));

type AlbumCardProps = { album: AuraDataAudio; imageSize: number; onPress?: (a: AuraDataAudio) => void; skeleton?: boolean };

type WaveTextProps = { text: string; style: any; delayPerWord?: number; duration?: number; testID?: string };

const WaveText: React.FC<WaveTextProps> = React.memo(({ text, style, delayPerWord = 91, duration = 676, testID }) => {
  const words = useMemo(() => (text ?? '').split(/\s+/).filter(Boolean), [text]);
  const anims = useRef(words.map(() => new Animated.Value(0))).current;
  const running = useRef<Animated.CompositeAnimation[] | null>(null);

	useEffect(() => {
    if (running.current) {
      try { running.current.forEach(a => a.stop()); } catch {}
      running.current = null;
    }
    anims.forEach(v => v.setValue(0));
    const animations = anims.map((v, i) =>
      Animated.timing(v, { toValue: 1, duration, delay: i * delayPerWord, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true })
    );
    running.current = animations;
    Animated.stagger(Math.max(10, Math.floor(delayPerWord * 0.6)), animations).start(({ finished }) => {
      if (finished) running.current = null;
    });

    return () => {
      if (running.current) {
        try { running.current.forEach(a => a.stop()); } catch {}
        running.current = null;
      }
    };
  }, [text, words, anims, delayPerWord, duration]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }} testID={testID}>
      {words.map((w, i) => {
        const t = anims[i] ?? new Animated.Value(0);
        const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
        const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
        return (
          <Animated.Text key={`${w}-${i}`} style={[style, { transform: [{ translateY }], opacity, marginRight: 6 }]}>
            {w}
          </Animated.Text>
        );
      })}
    </View>
  );
});

const getBaseId = (id?: string | null) => (id ? String(id).split('-')[0] : '');
const isSameAlbum = (a?: string | null, b?: string | null) => getBaseId(a) === getBaseId(b);

const CoverWithVinyl: React.FC<{ imageSize: number; spinActive?: boolean; vinylUrl?: string; coverUrl?: string; albumId?: string }> = React.memo(({ imageSize, spinActive, vinylUrl, coverUrl, albumId }) => {
  const vinylSize = useMemo(() => {
    const size = Math.floor(imageSize * 0.7);
    return size;
  }, [imageSize]);
  const vinylLeft = useMemo(() => {
    const left = Math.floor(imageSize - vinylSize / 2);
    return left;
  }, [imageSize, vinylSize]);
  const vinylTop = useMemo(() => {
    const t = Math.floor((imageSize - vinylSize) / 2);
    return t;
  }, [imageSize, vinylSize]);

  const rotate = useIndividualVinylRotation(spinActive || false, albumId || '');

  return (
    <View style={{ position: "relative" as const, width: imageSize, height: imageSize }}>
      {/* Vinilo principal */}
      <Animated.Image
        source={{
          uri: vinylUrl,
        }}
        style={{ position: "absolute" as const, width: vinylSize, height: vinylSize, left: vinylLeft, top: vinylTop, transform: [{ rotate }] }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        testID={`vinyl-bg`}
      />
      
      {/* Sombreado sutil del vinilo */}
      <View
        style={{
          position: "absolute" as const,
          width: vinylSize,
          height: vinylSize,
          left: vinylLeft,
          top: vinylTop,
          borderRadius: vinylSize / 2,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <View
          style={{
            width: "99%",
            height: "100%",
            borderRadius: vinylSize / 2,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={[
              "transparent",        // Inicio: sin sombra
              "rgba(0, 0, 0, 0.6)", // Sombra más intensa
              "rgba(0, 0, 0, 0.3)", // Transición suave
              "rgba(0, 0, 0, 0.1)", // Transición más ligera
              "transparent"         // Fin: sin sombra
            ]}
            start={{ x: 0.45, y: 0 }}         // Comienza desde el centro-izquierda
            end={{ x: 0.7, y: 0 }}             // Termina más allá para transición suave
            style={{
              width: "100%",
              height: "100%",
              borderRadius: vinylSize / 2,
            }}
          />
        </View>
      </View>
      
      {/* Tapa del álbum */}
      <View style={{ width: imageSize, height: imageSize, zIndex: 2 }}>
        <Image
          source={{
            uri: coverUrl,
          }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          accessible
          accessibilityLabel={`Imagen del álbum`}
        />
      </View>
    </View>
  );
});

const AlbumCard: React.FC<AlbumCardProps> = React.memo(({ album, imageSize, onPress, skeleton }) => {
  const { isPlaying, current } = usePlayer();
  
  // Determinar si es un track individual (Para ti) o un album con tracks (Instrumentales)
  const isIndividualTrack = !album.tracks || album.tracks.length === 0;
  
  const spinActive = isPlaying && (
    isIndividualTrack 
      ? album.id === current?.id // Para tracks individuales de "Para ti"
      : album.tracks?.some((t, index) => { // Para albums de "Instrumentales"
          const trackId = (t.trackUrl?.split('/')?.pop()?.replace('.mp3', '') || `track-${index}`) + ':' + album.title + '-' + index;
          return trackId === current?.id;
        })
  );
  const nId = Number(album.id);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={async () => { 
        await hapticSelection(); 
        onPress?.(album); 
      }}
      style={[styles.cardContainer]}
      testID={`album-card-${album.id}`}
    >
      <CoverWithVinyl imageSize={imageSize} spinActive={spinActive} vinylUrl={album.vinillo} coverUrl={album.imageUrl} albumId={album.id} />
      <View style={[styles.textBlockColumn, { width: imageSize }]}>
       <View style={{
           flex: 1,
        overflow: 'hidden',
        marginLeft: 0,
        marginRight: -10,
       }}>
          <MovingText style={styles.cardTitle} text={ album.title|| ''} animationThreshold={20}/>
        </View>
        <Text style={styles.cardSubtitle} numberOfLines={2} ellipsizeMode="tail" testID={`album-subtitle-${album.id}`}>
          {album.description}
        </Text>
      </View>
        {skeleton && (
          <View key={`sk-${nId}`} style={{ backgroundColor: "#000000" ,  position: "absolute", width: CARD_WIDTH, height: CARD_WIDTH+(CARD_WIDTH / 0.1), marginRight: 0 ? 0 : ITEM_SPACING }} testID={`carousel-skeleton-${album.title}-${nId}`}>
            <SkeletonCard imageSize={imageSize} />
          </View>
        ) }
    </TouchableOpacity>
  );
});

const CarouselSection: React.FC<{ title: string; data: AuraDataAudio[]; imageSize: number; onSelect: (a: AuraDataAudio) => void; topSpacing?: number; bottomSpacing?: number; loading?: boolean , skeleton?: boolean }> = ({ title, data, imageSize, onSelect, topSpacing, bottomSpacing, loading = false, skeleton = false }) => {
  const snapOffsets = useMemo(() => {
    const offsets = data.map((_, i) => i * (CARD_WIDTH + ITEM_SPACING));
    return offsets;
  }, [data]);
    const placeholderCount = Math.max(3, Math.min(6, data.length || 5));
  return (
    <View style={[styles.section, topSpacing ? { marginTop: topSpacing } : null, bottomSpacing != null ? { marginBottom: bottomSpacing } : null]}>
      {title && title.trim().length > 0 ? (
        <Text style={styles.sectionTitle} testID={`section-title-${title}`}>{title}</Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: END_PADDING }]}
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={Platform.OS === 'ios'}
        alwaysBounceHorizontal={Platform.OS === 'ios'}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'never'}
        testID={`carousel-${title}`}
      >
        {!loading ? data.map((album, i) => {
          const isLast = i === data.length - 1;
          return (
            <View key={album.id} style={{ width: CARD_WIDTH, marginRight: isLast ? 0 : ITEM_SPACING }} testID={`carousel-item-${title}-${album.id}`}>
              <AlbumCard album={album} imageSize={imageSize} onPress={onSelect} skeleton={skeleton} />
            </View>
          );
        }) : (Array.from({ length: placeholderCount }).map((_, i) => {
          const isLast = i === placeholderCount - 1;
          return (
            <View key={`sk-${i}`} style={{ width: CARD_WIDTH, marginRight: isLast ? 0 : ITEM_SPACING }} testID={`carousel-skeleton-${title}-${i}`}>
              <SkeletonCard imageSize={imageSize} />
            </View>
          );
        }))}
      </ScrollView>
    </View>
  );
};

const ArrowIcon: React.FC<{ direction: 'next' | 'prev'; size?: number; testID?: string }> = ({ direction, size = 34, testID }) => {
  return (
    <Image
      source={require('@/assets/Images/FlechasPlayer.png')}
      style={{ width: size, height: size, tintColor: "#fff", transform: [{ scaleX: direction === 'prev' ? -1 : 1 }] }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      testID={testID}
    />
  );
};

function PlayerSheet({ visible, onClose, album, imageSize, contentOpacity }: { visible: boolean; onClose: () => void; album: AuraDataAudio | null; imageSize: number; contentOpacity: Animated.Value; }) {
  const sheetHeight = Math.floor(screenHeight * 0.8);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const offsetUp = Math.floor(sheetHeight * 0.25);
  const offsetLeft = Math.floor(screenWidth * 0.03);

  const { isPlaying, pause, play, current, previous, changeDirection, userPaused, next, prev } = usePlayer();

  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
  const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armOptimistic = useCallback((ms: number = 700) => {
    setOptimisticPlaying(true);
    if (optTimer.current) clearTimeout(optTimer.current);
    optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
  }, []);
  useEffect(() => () => { if (optTimer.current) clearTimeout(optTimer.current); }, []);

  const nextRef = useRef(next);
  const prevRef = useRef(prev);
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => { prevRef.current = prev; }, [prev]);

  const slideProg = useRef(new Animated.Value(1)).current;
  const initialFade = useRef(new Animated.Value(0)).current;
  const [textKey, setTextKey] = useState<number>(0);

  useEffect(() => {
    if (!album) return;
    setTextKey((k) => k + 1);
    if (!previous || changeDirection === 'none') {
      initialFade.setValue(0);
      Animated.timing(initialFade, { toValue: 1, duration: Math.floor(1092 * 0.7), easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
      return;
    }
    slideProg.setValue(0);
    Animated.timing(slideProg, { toValue: 1, duration: Math.floor(1310 * 0.7), easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start();
  }, [album, previous, changeDirection, slideProg, initialFade]);

  useEffect(() => {
    if (previous && changeDirection !== 'none' && !userPaused) {
      armOptimistic(750);
    }
  }, [previous, changeDirection, userPaused, armOptimistic]);

  const open = useCallback(() => {
    const smooth = Easing.bezier(0.22, 1, 0.36, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: Math.floor(1229 * 0.7), easing: smooth, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 1, duration: Math.floor(1065 * 0.7), easing: smooth, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: Math.floor(1106 * 0.7), easing: smooth, useNativeDriver: false }),
    ]).start();
  }, [translateY, backdrop, contentOpacity]);

  const close = useCallback(() => {
    const smoothIn = Easing.bezier(0.4, 0, 0.2, 1);
    Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight, duration: Math.floor(1065 * 0.7), easing: smoothIn, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: Math.floor(983 * 0.7), easing: smoothIn, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: Math.floor(983 * 0.7), easing: smoothIn, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [translateY, backdrop, onClose, sheetHeight, contentOpacity]);

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
        const next = Math.max(0, g.dy);
        translateY.setValue(next);
        const prog = Math.min(1, next / sheetHeight);
        backdrop.setValue(1 - prog);
        // contentOpacity.setValue(prog); // Comentado para evitar conflicto de useNativeDriver
      },
      onPanResponderRelease: (_e, g) => {
        if (isSwipingHoriz.current) return;
        const shouldClose = g.dy > 120 || g.vy > 0.9;
        if (shouldClose) {
          hapticSelection();
          close();
        } else {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 0, duration: 737, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
            Animated.timing(backdrop, { toValue: 1, duration: 697, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 0, duration: 655, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false })
          ]).start();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  const SWIPE_THRESHOLD = 12 as const;
  const SWIPE_VELOCITY = 0.2 as const;
  const swipeLockRef = useRef<boolean>(false);
  const swipeX = useRef(new Animated.Value(0)).current;
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
              nextRef.current?.().catch((e) => console.warn('[ui] swipe next failed', e));
					} else {
              prevRef.current?.().catch((e) => console.warn('[ui] swipe prev failed', e));
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
      },
      onPanResponderTerminationRequest: () => false,
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
              nextRef.current?.().catch((e) => console.warn('[ui] swipe next failed', e));
            } else {
              prevRef.current?.().catch((e) => console.warn('[ui] swipe prev failed', e));
            }
            setTimeout(() => { swipeLockRef.current = false; }, 500);
          }
        }
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: (_e, g) => {
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderEnd: (_e, g) => {
        isSwipingHoriz.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      open();
    } else {
      close();
    }
  }, [visible, open, close]);

  useEffect(() => {
    if (album) {
      Animated.timing(contentOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }
  }, [album, contentOpacity]);

  const opacity = backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const displayPlaying = (isPlaying || optimisticPlaying);
  const spinActive = displayPlaying && isSameAlbum(current?.id, album?.id ?? null);
  const prevBaseColor = previous?.color ?? '#063536';
  const currBaseColor = album?.colorBackground ?? '#EA580C';

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

  const upShift = (previous && changeDirection !== 'none') ? -offsetUp : 0;
  const leftShift = offsetLeft;

  return visible ? (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="player-overlay-root">
      <Animated.View
        testID="player-backdrop"
        style={[styles.backdrop, { opacity }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={async () => { await hapticSelection(); close(); }} testID="player-backdrop-touch" />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.sheetContainer, { height: sheetHeight, transform: [{ translateY }] }]}
        testID="player-sheet"
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && changeDirection !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 0 }]}>
            <LinearGradient
              colors={[prevColor, prevColor, '#000000']}
              locations={[0, 0.02, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: previous && changeDirection !== 'none' ? slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) : initialFade }]}>
            <LinearGradient
              colors={[currColor, currColor, '#000000']}
              locations={[0, 0.02, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={styles.sheetGrabberRow}>
          <View style={styles.grabber} />
        </View>
        <View style={styles.sheetContent} testID="player-swipe-zone" accessible accessibilityLabel="Swipe zone">
          <View style={[styles.centerZone, (changeDirection === 'none') ? { paddingTop: Math.floor(sheetHeight * 0.06) } : null]}>
            <View
              {...coverSwipeResponder.panHandlers}
              style={[styles.centerBlock, { transform: [{ translateY: upShift }, { translateX: leftShift }] }]} 
              testID="player-cover-swipe-surface"
              accessible
              accessibilityLabel="Swipe horizontal para cambiar de canción"
            >
              {(() => {
                const imageOffsetDown = Math.floor((imageSize ?? 160) * 0.03);
                const dir = changeDirection;
                const outTo = dir === 'next' ? -screenWidth : screenWidth;
                const inFrom = dir === 'next' ? screenWidth : -screenWidth;
                const prevTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, outTo] });
                const currTranslate = slideProg.interpolate({ inputRange: [0, 1], outputRange: [inFrom, 0] });
                const shouldAnimate = !!previous && dir !== 'none';


                if (shouldAnimate) {
                  return (
                    <View>
                      <Animated.View style={[styles.coverRow, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: prevTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} testID="player-cover-previous">
                        <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={false} vinylUrl={previous?.vinylUrl} coverUrl={previous?.imageUrl} albumId={previous?.id} />
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <Text style={styles.centerTitle} numberOfLines={2} ellipsizeMode="tail">{previous?.title ?? ''}</Text>
                          <Text style={styles.centerSubtitle} numberOfLines={2}>{previous?.subtitle ?? ''}</Text>
                        </View>
                      </Animated.View>
                      <Animated.View style={[styles.coverRow, StyleSheet.absoluteFillObject as any, { width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignSelf: 'center', alignItems: 'flex-start', transform: [{ translateY: imageOffsetDown }, { translateX: currTranslate }], opacity: slideProg.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} testID="player-cover-current">
                        <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={spinActive} vinylUrl={album?.vinillo} coverUrl={album?.imageUrl} albumId={album?.id} />
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <WaveText key={`title-${textKey}`} text={album?.title ?? ''} style={styles.centerTitle} testID="wave-title" />
                          <WaveText key={`subtitle-${textKey}`} text={album?.description ?? ''} style={styles.centerSubtitle} testID="wave-subtitle" />
                        </View>
                      </Animated.View>
                    </View>
                  );
                }

                const pagerRef = React.createRef<ScrollView>();
                const pageWidth = screenWidth;

                const renderPage = (kind: 'prev' | 'current' | 'next') => {
                  const title = kind === 'prev' ? (previous?.title ?? '') : (album?.title ?? '');
                  const subtitle = kind === 'prev' ? (previous?.subtitle ?? '') : (album?.description ?? '');

	return (
                    <View key={kind} style={{ width: pageWidth, alignItems: 'center' }} testID={`pager-page-${kind}`}>
                      <View style={{ width: (imageSize + Math.floor((imageSize * 0.7) / 2)), alignItems: 'flex-start' }}>
                        <View style={{ transform: [{ translateY: imageOffsetDown }] }}>
                          <CoverWithVinyl imageSize={imageSize ?? 160} spinActive={kind === 'current' ? spinActive : false} vinylUrl={previous?.vinylUrl} coverUrl={previous?.imageUrl} albumId={previous?.id} />
									</View>
                        <View style={[styles.centerTextBlock, { width: '100%' }]}> 
                          <WaveText key={`title-${textKey}-${kind}`} text={title} style={styles.centerTitle} testID={`pager-title-${kind}`} />
                          <WaveText key={`subtitle-${textKey}-${kind}`} text={subtitle} style={styles.centerSubtitle} testID={`pager-subtitle-${kind}`} />
									</View>
						</View>
                    </View>
                  );
                };

                const initialDownShift = (dir === 'none') ? Math.floor(offsetUp * 1.2) : Math.floor(offsetUp * 0.6);
                return (
                  <View style={{ transform: [{ translateY: initialDownShift }] }}>
                    <ScrollView
                      ref={pagerRef}
                      horizontal
                      pagingEnabled
                      scrollEnabled={false}
                      showsHorizontalScrollIndicator={false}
                      contentOffset={{ x: pageWidth, y: 0 }}
                      onLayout={() => {
                        setTimeout(() => pagerRef.current?.scrollTo?.({ x: pageWidth, y: 0, animated: false }), 0);
                      }}
                      onContentSizeChange={() => {
                        setTimeout(() => pagerRef.current?.scrollTo?.({ x: pageWidth, y: 0, animated: false }), 0);
                      }}
                      testID="player-cover-pager"
                    >
                      {renderPage('prev')}
                      {renderPage('current')}
                      {renderPage('next')}
                    </ScrollView>
									</View>
                );
              })()}
						</View>
            <View style={styles.controlsRow}>
              <View style={styles.controlsInner} testID="player-controls">
                <TouchableOpacity testID="btn-back" accessibilityRole="button" onPress={async () => { await hapticImpact('medium'); armOptimistic(800); prev(); }}>
                  <ArrowIcon direction="prev" size={38} testID="icon-prev" />
                </TouchableOpacity>
                <TouchableOpacity
                  testID="btn-toggle"
                  accessibilityRole="button"
                  style={styles.playButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={async () => {
                    await hapticImpact('medium');
                    if (displayPlaying) {
                      setOptimisticPlaying(false);
                      await pause();
                    } else {
                      await play();
                    }
                  }}
                  accessibilityLabel={displayPlaying ? "Pausar" : "Reproducir"}
                >
                  {displayPlaying ? (
                    <Image
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }}
                      style={{ width: 40, height: 40 }}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      testID="icon-pause"
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }}
                      style={{ width: 40, height: 40 }}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      testID="icon-play"
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity testID="btn-forward" accessibilityRole="button" onPress={async () => { await hapticImpact('light'); armOptimistic(800); next(); }}>
                  <ArrowIcon direction="next" size={38} testID="icon-next" />
                </TouchableOpacity>
									</View>
						</View>
									</View>
								</View>
							</Animated.View>
    </View>
  ) : null;
}

const SkeletonCard: React.FC<{ imageSize: number }> = ({ imageSize }) => {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.7, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => { try { loop.stop(); } catch {} };
  }, [opacity]);
  return (
    <View style={{ width: '100%' }}>
      <Animated.View style={{ width: imageSize, height: imageSize, backgroundColor: '#404040', opacity }} testID="skeleton-image" />
      <Animated.View style={{ width: Math.floor(imageSize * 0.8), height: 18, backgroundColor: '#404040', opacity, marginTop: 10, borderRadius: 4 }} testID="skeleton-title" />
      <Animated.View style={{ width: Math.floor(imageSize * 0.6), height: 14, backgroundColor: '#404040', opacity, marginTop: 6, borderRadius: 4 }} testID="skeleton-subtitle" />
    </View>
  );
};

export default function MusicPlayerScreen() {
  const router = useRouter();
  const [contentHeight, setContentHeight] = useState<number>(Math.max(screenHeight - 160, 400));
  const [selected, setSelected] = useState<AuraDataAudio | null>(null);
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const { forYouData, instrumentalData, isLoading } = useAuraData();
  const { setSelectedAlbum } = useAuraSelection();
  const { loadAuraData } = useAuraActions();
  const { userData } = useAuthStore();
  const { isConnected } = useNetworkStore()
  const [skeleton, setSkeleton] = useState<boolean>(true);
  const downloadedAuras = useAuraStore((state) => state.downloadedAura);
  // Load data from store
  useEffect(() => {
    const initializeData = async () => {
      const userGender = (userData?.gender === 'Hombre' || userData?.gender === 'man') ? 'man' : 'woman'
      const userName = userData?.wantToBeCalled || ''
      await loadAuraData(userGender, userName , isConnected)
    }

    if (userData) {
      initializeData()
      initialSkeleton()
    }
  }, [loadAuraData, userData, isConnected]);

  const { setUIOpen, setQueue, select, uiOpen, current, pause } = usePlayer();
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isNavigatingRef = useRef<boolean>(false);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height ?? 0;
    if (h > 0) setContentHeight(h);
  }, []);
   // Función de pausa para TrackPlayer
  const pauseFn = useCallback(async () => {
    await pause();
  }, []);
  // Hooks de protección contra capturas
  const { isVisible, hide, showIfCaptured } = useAutoPauseOnCapture(pauseFn);
   
  useBlockCaptureAndroid();

const separateInstrumentals = (data: AuraDataAudio[]): AuraDataAudio[][] => {
  const result: AuraDataAudio[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    result.push(data.slice(i, i + 4));
  }
  return result;
};

  const initialSkeleton = () => {
    setSkeleton(true);
    setTimeout(() => {
      setSkeleton(false);
    }, 2000);
  }

  useFocusEffect(
    useCallback(() => {
      // Solo animar si el contenido no está ya visible
      if (contentOpacity._value === 0) {
        Animated.timing(contentOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      }
      return () => {};
    }, [contentOpacity])
  );

  const imageSize = useMemo(() => {
    const headerApprox = 60;
    const sectionsForSizing = 2;
    const perSectionAvailable = (contentHeight - sectionsForSizing * headerApprox) / sectionsForSizing;
    const textApprox = 56;
    const baseSize = Math.min(CARD_WIDTH, Math.max(120, Math.floor(perSectionAvailable - textApprox)));
    const adjusted = Math.max(90, Math.floor(baseSize * 0.8));
    return adjusted;
  }, [contentHeight]);

  useEffect(() => {
    if (uiOpen) {
      if (current) setSelected(current);
    }
  }, [uiOpen, current]);

  // Función para generar tracks inventados (fuera del hook para evitar violación de reglas)
  // Los tracks de "Para ti" son álbumes individuales, no tracks generados artificialmente

  const handleSelect = useCallback(async (a: AuraDataAudio) => {
    // Verificar que forYouData esté disponible
    if (!forYouData || forYouData.length === 0) {
      console.warn('[handleSelect] forYouData not available yet');
      return;
    }
    const captured = await showIfCaptured();
      if (captured) {
        pause(); 
        return;
      }
    const queues = convertToAlbumData(forYouData);
    setQueue(queues);
    setSelected(convertToAlbumDatasFromTracks(a));
    // Pasar la queue correcta directamente y continuar reproduciendo
    await select(convertToAlbumDatasFromTracks(a), { forceAutoplay: true, queue:queues });
    setUIOpen(true);
    
  }, [select, setUIOpen, setQueue, forYouData]);

  const navigateToAlbumWithFade = useCallback(async (a: AuraDataAudio, animateEntry?: boolean) => {
    const captured = await showIfCaptured();
    if (captured) {
      pause();
      return;
    }

    if (isNavigatingRef.current || !router) return;
    isNavigatingRef.current = true;
    try {
      setQueue(convertToAlbumDatas(a));
    } catch (error) {
      console.log('[debug] ⚠️ Error configurando queue:', error);
    }
    setSelectedAlbum(a);
    contentOpacity.stopAnimation(() => {});
    Animated.timing(contentOpacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        // Usar setTimeout para asegurar que la navegación ocurra después del montaje completo
        setTimeout(() => {
          try {
            if (router && router.push) {
              router.push({ pathname: '/aura/album', params: { animateEntry: animateEntry ? '1' : '0' } });
            } 
          }finally {
            setTimeout(() => { isNavigatingRef.current = false; }, 400);
          }
        }, 50); // Pequeño delay para asegurar que el Root Layout esté completamente montado
      } else {
        isNavigatingRef.current = false;
      }
    });
  }, [router, contentOpacity, pause, setQueue, select]);

  const filteredInstrumentalData = useMemo(() => {
    const downloadedAuraKeys = Object.keys(downloadedAuras);

    return instrumentalData.filter(item => {
      // Only filter if we're in downloaded mode
      if (!isConnected) {
        return downloadedAuraKeys.some(key => {
          return key.toLowerCase().search(item.title?.toLowerCase() ?? '') !== -1;
        });
      }
      return true;
    })

  }, [instrumentalData, isConnected, downloadedAuras]);



   return (
    <View style={styles.container}>
      {/* Contenedor de tabs vacío para igualar la altura del header con "Mis hipnosis" */}
      <View style={{
        height: 50,
        backgroundColor: '#000000',
        borderBottomWidth: 0,
      }} />

      <Animated.View style={[styles.animatedContentWrapper, { opacity: contentOpacity }]} testID="content-fade-wrapper">
							<ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 40, justifyContent: 'flex-start' }}
            onLayout={onLayout}
								showsVerticalScrollIndicator={false}
            testID="vertical-scroll"
          >
            <CarouselSection title="Para ti" data={forYouData} imageSize={imageSize} topSpacing={16} loading={isLoading} onSelect={async (a) => { await hapticSelection(); handleSelect(a); } } skeleton={skeleton} />
            {
              separateInstrumentals(filteredInstrumentalData).map((group, index) => (
                <CarouselSection key={index} title={index == 0 ? 'Instrumentales' : ''} data={group} imageSize={imageSize} bottomSpacing={24} loading={isLoading} onSelect={async (a) => { await hapticSelection(); navigateToAlbumWithFade(a, true); }}  skeleton={skeleton} />
              ))
            }
						</ScrollView>
      </Animated.View>

      {/* Player Sheet - Reactivado para pruebas */}
      {sheetVisible && selected && (
        <PlayerSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          album={selected}
          imageSize={imageSize}
          contentOpacity={contentOpacity}
        />
      )}
       <CaptureBlockerModal visible={isVisible} onClose={() => {
         hide();
       }} />
				</View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000", zIndex: 1},
  safeArea: { flex: 1 },
  header: { paddingHorizontal: LEFT_PADDING, paddingTop: 15, paddingBottom: 12 }, 
  headerTitle: { fontSize: 30, fontFamily: "Geist-SemiBold", fontWeight: "bold", color: "#ffffff", marginTop: 8 }, // Aumentado 2px más (11 → 13)
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  settingsButton: { height: 40, marginTop: 5, marginRight: 1 }, 
  content: { flex: 1 },
  section: { marginBottom: 48, paddingBottom: 0 },
  sectionTitle: { fontSize: 22, fontFamily: "Geist-SemiBold", color: "#ffffff", marginBottom: 12, paddingHorizontal: LEFT_PADDING },
  scrollContent: { paddingHorizontal: LEFT_PADDING },
  cardContainer: { width: "100%" },
  textBlockColumn: { marginTop: 10, alignSelf: "flex-start" },
  cardTitle: { fontSize: 18, fontFamily: "Geist-Medium", color: "#ffffff" },
  cardSubtitle: { marginTop: 4, fontSize: 13, fontFamily: "Geist-Regular", color: "#6B7280" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  sheetContainer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: "hidden" as const },
  sheetGrabberRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)", marginBottom: 8 },
  sheetContent: { flex: 1, paddingHorizontal: 0, paddingTop: 32 },
  centerZone: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerBlock: { alignItems: "center", justifyContent: "center" },
  centerTextBlock: { marginTop: 12, alignItems: "flex-start", paddingHorizontal: 0 },
  centerTitle: { color: "#ffffff", fontSize: 28, fontFamily: "Geist-Medium", textAlign: "left" },
  centerSubtitle: { color: "#94a3b8", fontSize: 16, fontFamily: "Geist-Regular", lineHeight: 18, marginTop: 6, textAlign: "left" },
  controlsRow: { position: "absolute", left: 0, right: 0, bottom: 140, alignItems: "center", justifyContent: "center" },
  playButton: { alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  coverRow: { paddingHorizontal: 0 },
  moreFab: { position: "absolute", right: 24, bottom: 28, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  moreDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#64748B" },
  controlsInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "64%", alignSelf: "center" },
  animatedContentWrapper: { flex: 1 }
});
