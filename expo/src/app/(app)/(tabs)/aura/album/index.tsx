import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayer } from '@/providers/PlayerProvider';
import type { AlbumData } from '@/types/music';
import { hapticImpact, hapticSelection } from '@/utils/haptics';
import PlayerSheet from '@/components/PlayerSheet';
import { Play, Shuffle, Download } from 'lucide-react-native';
import Constants from 'expo-constants';
import { AuraDataAudio, convertToAlbumDatas,  useAuraDownloads,  useAuraSelection, useAuraStore } from '@/store/auraStore';
import FastImage from 'react-native-fast-image';
import { useIndividualVinylRotation } from '@/hooks/useVinylRotation';
import { useAutoPauseOnCapture } from '@/hooks/useAutoPauseOnCapture';
import { useBlockCaptureAndroid } from '@/hooks/useBlockCaptureAndroid';
import { CaptureBlockerModal } from '@/components/CaptureBlockerModal';

const { width: screenWidth } = Dimensions.get('window');

const PLAY_ICON_URL: string | null = null;

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const animateEntryParam = (Array.isArray(params.animateEntry) ? params.animateEntry[0] : (params.animateEntry as string)) ?? '0';
  const {  select, current, isPlaying, setQueue , pause } = usePlayer();
  const [isSkeleton, setIsSkeleton] = useState<boolean>(true);  
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const { selectedAlbum } = useAuraSelection();
  const [enableDownload, setEnableDownload] = useState<boolean>(true);
  const { isAuraDownloaded, downloadProgressAura, downloadAuraById, deleteAuraDownload } = useAuraDownloads();
    const pauseFn = useCallback(async () => {
      await pause();
  }, []);
  // Hooks de protección contra capturas
  const { isVisible} = useAutoPauseOnCapture(pauseFn);
   
  useBlockCaptureAndroid();
  
  useEffect(() => {
    const t = setTimeout(() => {
      setIsSkeleton(false);
    }, 2000);
    return () => clearTimeout(t);
  }, []);


  const album: AuraDataAudio | null = selectedAlbum;

  const tracks = useMemo<AlbumData[]>(() =>{
      return album ? convertToAlbumDatas(album) : [];
  }, [album]);
  
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
  
  const baseColor =  `#${album?.colorBackground || '111827'}`;
  const colorText = `#${album?.colorText || '111827'}`;
  const softColor = useMemo(() => darkenColor(baseColor, 0.5), [baseColor, darkenColor]);

  const [albumDownloaded, setAlbumDownloaded] = useState<boolean>(false);

  // Cargar estado guardado al montar
  useEffect(() => {
    const loadState = async () => {
      try {
         const downloadedTracks: Record<string, boolean> = {};
         for (const track of tracks) {
           downloadedTracks[track.id] = isAuraDownloaded(track.id);
         }
         setAlbumDownloaded(Object.values(downloadedTracks).every(Boolean));

      } catch (error) {
        console.log('❌ [AURA] Error loading state:', error);
      }
    };
    
    if (album?.id) {
      loadState();
    }
  }, [album]);

  const imageBase = Math.min(320, Math.floor(screenWidth * 0.68));
  const imageSize = Math.floor(imageBase * 0.72);
  const coverOffset = Math.max(6, Math.floor(screenWidth * 0.09));
  const TEXT_SHIFT = Math.floor(screenWidth * 0.05);
  const downloading = useAuraStore((state) => state.isDownloadingAura);
  const spinActive = isPlaying && tracks.some(t => t.id === current?.id);
  const rotate = useIndividualVinylRotation(spinActive, album?.id || '');

  const entryTranslateX = useRef(new Animated.Value(screenWidth)).current;
  const isExitingRef = useRef<boolean>(false);

  const handleBack = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    await hapticSelection();
    Animated.timing(entryTranslateX, { toValue: screenWidth, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      router.back();
      setTimeout(() => { isExitingRef.current = false; }, 300);
    });
  }, [entryTranslateX, router]);

  useEffect(() => {
    const shouldAnimate = String(animateEntryParam) === '1';
    if (!shouldAnimate) return;
    entryTranslateX.setValue(screenWidth);
    Animated.timing(entryTranslateX, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entryTranslateX, album, animateEntryParam]);


  if (!album) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff' }}>Álbum no encontrado</Text>
      </SafeAreaView>
    );
  }

  const SIDE_MARGIN = 0;

  return (
    <View style={styles.root} testID="album-screen-root">
      <LinearGradient
        colors={[softColor, softColor, '#000000']}
        locations={[0, 0.02, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingLeft: SIDE_MARGIN, paddingRight: SIDE_MARGIN, minHeight: Dimensions.get('window').height + 100}}>
            <View style={[styles.headerRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
              <TouchableOpacity accessibilityRole="button" testID="btn-back" style={{ padding: 8 }} onPress={handleBack}>
                <FastImage
                  source={require('@/assets/Images/FlechaRetrocederV2.png')}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingBottom: Dimensions.get('window').height * 0.4,
                flexGrow: 1
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: imageSize, height: imageSize, marginLeft: -coverOffset }} testID="album-cover-container">
                  <Animated.Image source={{ uri: album.vinillo }} style={{ position: 'absolute', width: Math.floor(imageSize * 0.7), height: Math.floor(imageSize * 0.7), left: Math.floor(imageSize - (imageSize*0.7)/2), top: Math.floor((imageSize - (imageSize*0.7))/2), transform: [{ rotate }] }} resizeMode="contain" />
                      <Image source={{ uri: album.imageUrl }} style={{ width: imageSize, height: imageSize }} resizeMode="cover" />
                      {/* Sombreado sutil del vinilo (igual a GlobalPlayerOverlay) */}
                      <View
                        style={{
                          position: 'absolute',
                          width: Math.floor(imageSize * 0.7),
                          height: Math.floor(imageSize * 0.7),
                          left: Math.floor(imageSize - (imageSize * 0.7) / 2),
                          top: Math.floor((imageSize - (imageSize * 0.7)) / 2),
                          borderRadius: Math.floor((imageSize * 0.7) / 2),
                          overflow: 'hidden',
                          zIndex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: Math.floor((imageSize * 0.7) / 2),
                            overflow: 'hidden',
                          }}
                        >
                          <LinearGradient
                            colors={[
                              'transparent',
                              'rgba(0, 0, 0, 0.6)',
                              'rgba(0, 0, 0, 0.3)',
                              'rgba(0, 0, 0, 0.1)',
                              'transparent',
                            ]}
                            start={{ x: 0.45, y: 0 }}
                            end={{ x: 0.7, y: 0 }}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: Math.floor((imageSize * 0.7) / 2) + 2,
                            }}
                          />
                        </View>
                      </View>
                </View>
                <Text style={styles.title} numberOfLines={2} testID="album-title">{album.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{album.frecuencia}</Text>
                <View style={[styles.ctaRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                  <TouchableOpacity
                    testID="btn-play"
                    accessibilityRole="button"
                    accessibilityLabel="Reproducir"
                    style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                    onPress={async () => {
                      await hapticImpact('medium');
                      if (tracks.length > 0) {
                        setQueue(tracks);
                        await select(tracks[0], { forceAutoplay: true });
                      }
                    }}
                  >
                    {PLAY_ICON_URL ? (
                      <Image source={{ uri: PLAY_ICON_URL }} style={{ width: 20, height: 20, tintColor: '#e5e7eb' as const }} />
                    ) : (
                      <Play color="#e5e7eb" size={20} />
                    )}
                    <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Reproducir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="btn-shuffle"
                    accessibilityRole="button"
                    accessibilityLabel="Aleatorio"
                    style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                    onPress={async () => {
                      try { console.log('[album] Shuffle button pressed'); } catch {/* ignore */ }
                      await hapticImpact('light');
                      if (tracks.length > 0) {
                        const anyTrack = tracks[Math.floor(Math.random() * tracks.length)];
                        setQueue(tracks);
                        await select(anyTrack, { forceAutoplay: true });
                      }
                    }}
                  >
                    <Shuffle color="#e5e7eb" size={20} />
                    <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Aleatorio</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.downloadRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                  <TouchableOpacity
                    testID="btn-download-album"
                    accessibilityRole="button"
                    accessibilityLabel={
                      showDeleteConfirmation 
                        ? 'Confirmar eliminación' 
                        : albumDownloaded 
                          ? 'Álbum descargado' 
                          : 'Descargar álbum'
                    }
                    style={[
                      styles.ctaBtn, 
                      { 
                        backgroundColor: showDeleteConfirmation 
                          ? 'rgba(239, 68, 68, 0.2)' 
                          : 'rgba(255,255,255,0.12)', 
                        width: '100%' 
                      }
                    ]}
                    onPress={enableDownload ? async () => {
                      try { console.log('[download] album button pressed'); } catch { /* ignore */ }
                      await hapticSelection();

                      if (!albumDownloaded) {
                              setEnableDownload(false);
                        for (const track of tracks) {
                          if (!isAuraDownloaded(track.id)) {
                            if (!track.audioUrl) continue;
                            
                            await downloadAuraById(track.audioRealUrl || '', track.id, {
                              title: track.title,
                              artwork: album.imageUrl,
                              description: album.title,
                            });
                          }
                        }
                        setAlbumDownloaded(true);
                        setEnableDownload(true);
                      } else if (!showDeleteConfirmation) {
                        // Show delete confirmation
                        setShowDeleteConfirmation(true);
                      } else {
                        // Delete all downloaded tracks
                        for (const track of tracks) {
                          if (isAuraDownloaded(track.id)) {
                            await deleteAuraDownload(track.id);
                          }
                        }
                        setShowDeleteConfirmation(false);
                        setAlbumDownloaded(false);
                      }
                    } : undefined}
                  >
                    {showDeleteConfirmation ? (
                      <>
                        <Text style={[styles.ctaText, styles.ctaTextWithIcon, { color: '#ef4444' }]}>
                          ¿Eliminar de descargas?
                        </Text>
                      </>
                    ) : albumDownloaded ? (
                      <>
                        <FastImage
                          source={ require('@/assets/Images/Descargado.png')}
                          style={{ width: 20, height: 20 }}
                          resizeMode="contain"
                        />
                        <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Álbum descargado</Text>
                      </>
                    ) : (
                      <>
                        <Download color="#e5e7eb" size={20} />
                        <Text style={[styles.ctaText, styles.ctaTextWithIcon]}>Descargar Álbum</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.listDivider} />
              {tracks.map((t, idx) => {
                const isCurrent = current?.id === t.id;
                const isActive = Boolean(isCurrent);
                const downloaded = isAuraDownloaded(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.row,
                      { marginLeft: -SIDE_MARGIN, marginRight: -SIDE_MARGIN, paddingLeft: 16 + SIDE_MARGIN, paddingRight: 16 + SIDE_MARGIN },
                    ]}
                    activeOpacity={0.8}
                    onPress={async () => {
                      await hapticSelection();
                      setQueue(tracks);
                      await select(t, { forceAutoplay: true, queue: tracks });
                      // La UI se actualizará automáticamente cuando el PlayerProvider cambie el track
                    }}
                    testID={`track-row-${idx+1}`}
                  >
                    {isActive ? (
                      <View pointerEvents="none" style={{ position: 'absolute', left: -SIDE_MARGIN, right: -SIDE_MARGIN, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    ) : null}
                    <View style={{ flex: 1, paddingLeft: TEXT_SHIFT }}>
                      <Text style={[styles.rowTitle, isActive ?{ color: colorText }: {color: '#fff'} ]} numberOfLines={1}>{t.title}</Text>
                      <Text style={[styles.rowSubtitle, isActive ? { color: '#cbd5e1' } : null]} numberOfLines={1}>{t.subtitle}</Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={downloaded ? 'Descargado' : 'Descargar pista'}
                      style={{ padding: 8, marginLeft: 12 }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      testID={`btn-download-track-${idx+1}`}
                      onPress={async () => {
                        await hapticSelection();
                        if( !downloaded){
                          if(!t.audioUrl) return 

                         await downloadAuraById(t.audioRealUrl || '', t.id, {
                            title: t.title,
                            artwork: album.imageUrl,
                            description: album.title,
                          });
                        }else{
                         await deleteAuraDownload(t.id);
                        }
                      }}
                    >
                      {downloaded ? (
                        <FastImage
                          source={ require('@/assets/Images/Descargado.png')}
                          style={{ width: 20, height: 20 }}
                          resizeMode="contain"
                        />
                      ) : downloading[t.id] ? (
                        <Text style={{ color: '#fff', fontSize: 12 }}>
                          {`${Math.round(downloadProgressAura[t.id] * 100)}%`}
                        </Text>
                      ) : (
                        <Download color="#e5e7eb" size={20} />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        {isSkeleton && (
          <View style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: softColor }} testID="album-skeleton">
            <LinearGradient
              colors={[softColor, softColor, '#000000']}
              locations={[0, 0.02, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.headerRow, { paddingHorizontal: Math.floor(screenWidth * 0.08), paddingTop: Constants.statusBarHeight + 30 }]}>
              <View style={styles.skelCircle} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: imageSize, height: imageSize, marginLeft: -coverOffset, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
                <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.6), marginTop: 16 }]} />
                <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.4), height: 14, marginTop: 8 }]} />
                <View style={[styles.ctaRow, { paddingHorizontal: Math.floor(screenWidth * 0.08) }]}>
                  <View style={[styles.skelBtn]} />
                  <View style={[styles.skelBtn]} />
                </View>
              </View>
              <View style={styles.listDivider} />
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={`skel-${i}`} style={[styles.row, { marginLeft: -SIDE_MARGIN, marginRight: -SIDE_MARGIN, paddingLeft: 16 + SIDE_MARGIN, paddingRight: 16 + SIDE_MARGIN }]}>
                  <View style={{ flex: 1, paddingLeft: TEXT_SHIFT }}>
                    <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.5) }]} />
                    <View style={[styles.skelLine, { width: Math.floor(screenWidth * 0.35), height: 12, marginTop: 8, opacity: 0.6 }]} />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>)}
      </SafeAreaView>

      {/* Player Sheet */}
      {sheetVisible && album && (
        <PlayerSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          album={album}
          imageSize={imageSize}
          contentOpacity={new Animated.Value(1)}
        />
      )}
      {isVisible && (
            <CaptureBlockerModal visible={isVisible} onClose={() => {
         router.back();
       }} />
         )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, alignItems: 'flex-start' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' as const, marginTop: 16 },
  subtitle: { color: '#cbd5e1', fontSize: 14, marginTop: 6 },
  ctaRow: { flexDirection: 'row', gap: 10 as unknown as number, marginTop: 28, width: '100%', paddingHorizontal: 16 },
  ctaBtn: { paddingHorizontal: 19, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#e5e7eb', fontSize: 17, fontWeight: '600' as const },
  ctaFlex: { flex: 1 },
  ctaTextWithIcon: { marginLeft: 8 },
  listDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 18, marginBottom: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontSize: 16, fontWeight: '500' as const },
  rowSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  skelCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)' },
  skelLine: { height: 18, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  skelBtn: { height: 42, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', flex: 1 },
  downloadRow: { width: '100%', marginTop: 12 },
});
