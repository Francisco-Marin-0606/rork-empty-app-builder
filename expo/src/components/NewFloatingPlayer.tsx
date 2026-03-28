import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Image, PanResponder, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, ViewProps } from 'react-native'
import * as Haptics from 'expo-haptics'
import { unknownTrackImageUri } from '@/constants/images'
import FastImage from 'react-native-fast-image'
import { useProgress, usePlaybackState, State } from 'react-native-track-player'
import { PauseButton, PlayButton, PlayPauseButton } from './PlayerControls'
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated'
import ReanimatedView from 'react-native-reanimated'
import { usePlayerStore } from '@/store/playerStore'
import { FLOATING_PLAYER_HEIGHT, screenPadding } from '@/constants/tokens'
import { Video, ResizeMode } from 'expo-av'
import { useRouter, useSegments } from 'expo-router'
import TrackPlayer, { useActiveTrack } from 'react-native-track-player'
import { usePlayer } from '../providers/PlayerProvider'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const NewFloatingPlayer = ({ style }: ViewProps) => {
	const activeTrack = useActiveTrack();
	const [uiOpen, setUIOpen] = useState(false);
	const { duration, position } = useProgress(250)
	const displayedTrack = usePlayerStore((state) => state.displayedTrack)
	const playbackState = usePlaybackState()
	const progress = useSharedValue(0)
	const router = useRouter()
	const segments = useSegments()
	
	// PlayerProvider para tracks de Aura
	const { current: auraCurrent, isPlaying: auraIsPlaying, play: auraPlay, pause: auraPause } = usePlayer()

	// Estados del store para Aura
	const isAuraExpanded = usePlayerStore((state) => state.isAuraExpanded)
	const setIsAuraExpanded = usePlayerStore((state) => state.setIsAuraExpanded)

	// Valores para animación de escala de la imagen Y opacidad de otros elementos
	const floatingImageScale = useSharedValue(1)
	const contentOpacity = useSharedValue(1)
	const controlsOpacity = useSharedValue(1)

	// Detectar si estamos en la sección aura
	const isInAura = segments.some((segment) => segment === 'aura')
	
	// Determinar qué track mostrar y si debe mostrarse el reproductor
	const isAuraTrack = auraCurrent && auraIsPlaying
	const isTrackPlayerTrack = activeTrack && playbackState.state === State.Playing
	
	// Track actual (prioridad: Aura > TrackPlayer)
	const currentTrack = isAuraTrack ? {
		id: auraCurrent.id,
		title: auraCurrent.title,
		artist: 'Mental',
		artwork: getCoverUrlById(auraCurrent.id),
		url: auraCurrent.audioUrl
	} : activeTrack
	
	// Estado de reproducción actual
	const isCurrentlyPlaying = isAuraTrack ? auraIsPlaying : (playbackState.state === State.Playing)
	
	// Función para obtener la URL de la portada basada en el ID
	const getCoverUrlById = (id?: string | null) => {
		const raw = id ?? '';
		const base = raw ? String(raw).split('-')[0] : '';
		const n = Number(base);
		if (Number.isFinite(n)) {
			const idx = ((n - 1) % 3 + 3) % 3;
			const COVER_URL_1 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png';
			const COVER_URL_2 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers2.png';
			const COVER_URL_3 = 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers1.png';
			return [COVER_URL_1, COVER_URL_2, COVER_URL_3][idx];
		}
		return 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png';
	}

	// Anti-flicker: reproducción optimista en cambios de track
	const [optimisticPlaying, setOptimisticPlaying] = useState<boolean>(false);
	const optTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const armOptimistic = useCallback((ms: number = 700) => {
		setOptimisticPlaying(true);
		if (optTimer?.current) clearTimeout(optTimer.current);
		optTimer.current = setTimeout(() => setOptimisticPlaying(false), ms);
	}, []);

	// Animaciones del StickyPlayer
	const TAB_BAR_HEIGHT = 84 as const;
	const slideY = useRef(new Animated.Value(24)).current;
	const opacity = useRef(new Animated.Value(1)).current;
	const [containerHeight, setContainerHeight] = useState<number | null>(null);
	const [dismissed, setDismissed] = useState<boolean>(false);
	const dragDY = useRef(new Animated.Value(0)).current;
	const draggingRef = useRef<boolean>(false);

	// Estilos animados
	const floatingImageAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: floatingImageScale.value }],
	}))

	const contentAnimatedStyle = useAnimatedStyle(() => ({
		opacity: contentOpacity.value,
	}))

	const controlsAnimatedStyle = useAnimatedStyle(() => ({
		opacity: controlsOpacity.value,
	}))

	// Cleanup del timer optimista
	useEffect(() => {
		return () => { if (optTimer?.current) clearTimeout(optTimer.current); };
	}, []);

	// Animaciones de slide y visibilidad del StickyPlayer
	useEffect(() => {
		const shouldShow = !!(activeTrack || displayedTrack || auraCurrent) && !uiOpen && !dismissed;

		// Prevent stale animations from finishing and overriding final values
		try { slideY?.stopAnimation(); } catch {}
					try { opacity?.stopAnimation?.(); } catch {}

		if (shouldShow) {
				dragDY?.setValue(0);
				opacity?.setValue(1);
				Animated.timing(slideY, { toValue: 0, duration: 350, easing: (t)=>t, useNativeDriver: true }).start();
		} else {
			Animated.parallel([
				Animated.timing(slideY, { toValue: TAB_BAR_HEIGHT + 24, duration: 225, easing: (t)=>t, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 0, duration: 150, easing: (t)=>t, useNativeDriver: true }),
			]).start();
		}
	}, [activeTrack, displayedTrack, auraCurrent, uiOpen, dismissed, slideY, opacity, dragDY]);

	// Reset optimistic playing cuando se pausa
	useEffect(() => {
		if (playbackState.state !== State.Playing) {
			setOptimisticPlaying(false);
		}
	}, [playbackState.state]);

	useEffect(() => {
		if (displayedTrack) {
			progress.value = duration > 0 ? position / duration : 0
		}
	}, [displayedTrack, duration, position])

	// Reset de todas las animaciones
	useEffect(() => {
		if (!isAuraExpanded) {
			floatingImageScale.value = 1
			contentOpacity.value = 1
			controlsOpacity.value = 1
		}
	}, [isAuraExpanded])

	// PanResponder del StickyPlayer para gestos de swipe
	const panResponder = useMemo(() => PanResponder.create({
		onStartShouldSetPanResponder: () => false,
		onMoveShouldSetPanResponder: (_evt, gestureState) => {
			const shouldSet = Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
			return shouldSet;
		},
		onPanResponderGrant: () => {
				try { console.log('[ui] sticky pan start'); } catch {}
				draggingRef.current = true;
				slideY?.stopAnimation();
				opacity?.stopAnimation?.();
				dragDY?.setValue(0);
			},
		onPanResponderMove: Animated.event([null, { dy: dragDY }], { useNativeDriver: true }),
		onPanResponderRelease: (_evt, gestureState) => {
			draggingRef.current = false;
			const dy = Math.max(0, gestureState.dy);
			const vy = gestureState.vy ?? 0;
			const dismiss = dy > 40 || vy > 1.2;
			if (dismiss) {
				try { console.log('[ui] sticky dismissed via swipe', { dy, vy }); } catch {}
				Animated.parallel([
						Animated.timing(slideY, { toValue: TAB_BAR_HEIGHT + 24, duration: 140, easing: (t)=>t, useNativeDriver: true }),
						Animated.timing(opacity, { toValue: 0, duration: 110, easing: (t)=>t, useNativeDriver: true }),
					]).start(async () => {
						setDismissed(true);
						await TrackPlayer.pause();
					});
			} else {
				Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
				opacity?.setValue(1);
			}
			dragDY?.setValue(0);
		},
		onPanResponderTerminationRequest: () => true,
		onPanResponderTerminate: () => {
				draggingRef.current = false;
				Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
				opacity?.setValue(1);
				dragDY?.setValue(0);
			},
	}), [dragDY, opacity, slideY]);

	// TranslateY combinado del StickyPlayer
	const translateY = useMemo(() => {
		return Animated.add(slideY, dragDY.interpolate({ inputRange: [-200, 0, 300], outputRange: [0, 0, 300], extrapolate: 'clamp' }));
	}, [slideY, dragDY]);

	// Estado de reproducción combinado
	const isPlaying = playbackState.state === State.Playing;
	const displayPlaying = isPlaying || optimisticPlaying;
	const isPaused = playbackState.state === State.Paused;

	// Mostrar si hay un track activo (TrackPlayer o Aura)
	if (!(activeTrack || displayedTrack || auraCurrent)) return null

	// Función para manejar el click del floating player (MÁS RÁPIDA)
	const handleFloatingPlayerClick = () => {
		if (isInAura && !displayedTrack?.title?.includes('Hz')) {
			console.log('🎵 Secuencia timeada iniciada!')

			// PASO 1: PRIMERO - Solo la imagen del reproductor empieza a desaparecer
			floatingImageScale.value = withTiming(0, { duration: 200 })

			// PASO 2: Después de 50ms - El resto del reproductor desaparece Y se activa la expansión
			setTimeout(() => {
				contentOpacity.value = withTiming(0, { duration: 150 })
				controlsOpacity.value = withTiming(0, { duration: 150 })

				// Al mismo tiempo activar la expansión para que empiecen a desaparecer las cards
				setIsAuraExpanded(true)
			}, 50) // La imagen lleva 50ms de ventaja
		} 
	}

	return (
		<View pointerEvents="box-none" style={[StyleSheet.absoluteFill, style]}>
			<AnimatedPressable
				{...panResponder.panHandlers}
				onPress={async () => {
					if (draggingRef.current) return;
					
					// Lógica original de Aura si aplica
				if (isInAura && !(displayedTrack?.title?.includes('Hz') || activeTrack?.title?.includes('Hz'))) {
						console.log('🎵 Secuencia timeada iniciada!')
						floatingImageScale.value = withTiming(0, { duration: 200 })
						setTimeout(() => {
							contentOpacity.value = withTiming(0, { duration: 150 })
							controlsOpacity.value = withTiming(0, { duration: 150 })
							setIsAuraExpanded(true)
						}, 50)
					} else {
						// Lógica del StickyPlayer para abrir el player
						try { console.log('[ui] sticky open player'); } catch {}
						await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
						//setUIOpen(true);
					}
				}}
				onLayout={(e) => {
					setContainerHeight(e.nativeEvent.layout.height ?? null);
				}}
				style={[
					styles.container,
					{
						transform: [{ translateY }],
						opacity,
						paddingVertical: 11,
						borderRadius: containerHeight ? Math.max(0, 0.15 * containerHeight) : 24,
						zIndex: 10,
					},
				]}
				testID="sticky-player"
			>
				<View style={styles.leftRow}>
					{/* Imagen con animación de escala para Aura */}
					<ReanimatedView.View style={floatingImageAnimatedStyle}>
						<Image
							source={{ uri: currentTrack?.artwork ?? 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Covers.png' }}
							style={styles.cover}
							resizeMode="cover"
							accessibilityIgnoresInvertColors
						/>
					</ReanimatedView.View>
					
					{/* Contenido con animación de opacidad para Aura */}
					<ReanimatedView.View style={[styles.titleContainer, contentAnimatedStyle]}>
						<Text style={styles.title} numberOfLines={1} testID="sticky-title">
							{currentTrack?.title ?? ''}
						</Text>						
					</ReanimatedView.View>
				</View>
				
				{/* Controles del StickyPlayer con animación de opacidad para Aura */}
				<ReanimatedView.View style={[styles.actions, controlsAnimatedStyle]}>
					<TouchableOpacity
						accessibilityRole="button"
						onPress={async () => {
							try { console.log('[ui] sticky prev track'); } catch {}
							if (displayPlaying) armOptimistic(800);
						await TrackPlayer.skipToPrevious();
						}}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						style={{ marginRight: 28 }}
						testID="sticky-prev"
					>
						<Image
							source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
							style={{ width: 21, height: 21, tintColor: '#fff', transform: [{ scaleX: -1 as const }] }}
							resizeMode="contain"
							accessibilityIgnoresInvertColors
						/>
					</TouchableOpacity>
					
					<TouchableOpacity
						accessibilityRole="button"
						onPress={async () => {
							try { console.log('[ui] sticky toggle'); } catch {}
							if (isAuraTrack) {
								// Control para tracks de Aura
								if (isCurrentlyPlaying) {
									await auraPause();
								} else {
									await auraPlay();
								}
							} else {
								// Control para tracks de TrackPlayer
								if (displayPlaying) {
									setOptimisticPlaying(false);
									await TrackPlayer.pause();
								} else {
									armOptimistic(800);
									await TrackPlayer.play();
								}
							}
						}}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						testID="sticky-toggle"
					>
						{isCurrentlyPlaying ? (
							<Image
								source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png' }}
								style={{ width: 21, height: 21 }}
								resizeMode="contain"
								accessibilityIgnoresInvertColors
								testID="sticky-icon-pause"
							/>
						) : (
							<Image
								source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png?v=20250816' }}
								style={{ width: 21, height: 21 }}
								resizeMode="contain"
								accessibilityIgnoresInvertColors
								testID="sticky-icon-play"
							/>
						)}
					</TouchableOpacity>
					
					<TouchableOpacity
						accessibilityRole="button"
						onPress={async () => {
							try { console.log('[ui] sticky next track'); } catch {}
							if (displayPlaying) armOptimistic(800);
						await TrackPlayer.skipToNext();
						}}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
						style={{ marginLeft: 28, marginRight: 12 }}
						testID="sticky-next"
					>
						<Image
							source={{ uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/FlechasPlayer.png' }}
							style={{ width: 21, height: 21, tintColor: '#fff' }}
							resizeMode="contain"
							accessibilityIgnoresInvertColors
						/>
					</TouchableOpacity>
				</ReanimatedView.View>
			</AnimatedPressable>
		</View>
	)
}

const styles = StyleSheet.create({
	// Estilos del StickyPlayer migrados
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		bottom: 16,
		backgroundColor: '#161616',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		...(Platform.OS !== 'web' ? { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 } : null as any),
	},
	leftRow: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		flex: 1, 
		paddingRight: 10 
	},
	cover: { 
		width: 41, 
		height: 41, 
		borderRadius: 10 
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginLeft: 10,
	},
	title: { 
		color: '#fff', 
		fontSize: 17, 
		fontWeight: '500', 
		flexShrink: 1 
	},
	actions: { 
		flexDirection: 'row', 
		alignItems: 'center' 
	},
	// Estilos del visualizer del NewFloatingPlayer
	visualizerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		height: 25,
		width: 35,
		marginLeft: 5,
		marginBottom: 6,
	},
	visualizerVideo: {
		width: 30,
		height: 20,
	},
	// Estilos adicionales mantenidos
	touchableContainer: {
		flex: 1,
	},
	space: {
		width: '100%',
		height: 0.5,
		backgroundColor: 'rgba(255, 255, 255, 0.02)',
	},
	waveImage: {
		width: 60,
		height: 60,
		borderRadius: 5,
		backgroundColor: 'rgba(30, 30, 70, 0.5)',
	},
	contentContainer: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	trackTitleContainer: {
		justifyContent: 'center',
	},
	trackTitle: {
		color: 'white',
		fontSize: 18,
		fontFamily: 'Geist-Regular',
	},
	trackSubtitle: {
		color: 'rgba(255, 255, 255, 0.5)',
		fontSize: 12,
	},
	visualizerBar: {
		width: 1,
		backgroundColor: '#ff6b81',
		marginHorizontal: 1,
		borderRadius: 2,
	},
	trackControlsContainer: {
		zIndex: 1000,
	},
	pauseButtonContainer: {
		width: 40,
		height: 40,
		borderRadius: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
})
