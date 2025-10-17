import { colors, fontSize, screenPadding } from "@/constants/tokens"
import { defaultStyles, utilsStyles } from "@/styles"
import { View, StyleSheet, ActivityIndicator, Text, Dimensions, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import TrackPlayer, { useActiveTrack, useIsPlaying } from "react-native-track-player"
import { PlayerControlsForward } from "@/components/PlayerControls"
import { PlayerProgressBar } from "@/components/PlayerProgressBar"
import { router, useFocusEffect } from 'expo-router'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
} from 'react-native-reanimated'
import React, { useEffect, useState, useCallback } from "react"
import { usePlayerStore } from "@/store/playerStore"
import { ResizeMode, Video } from "expo-av"
import useAudioTrackEnd from "@/hooks/useAudioTrackEnd"
import { CaptureBlockerModal } from "@/components/CaptureBlockerModal"
import { useAutoPauseOnCapture } from "@/hooks/useAutoPauseOnCapture"
import { useBlockCaptureAndroid } from "@/hooks/useBlockCaptureAndroid"

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const SNAP_THRESHOLD = SCREEN_HEIGHT * 0.2

const AnimatedView = Animated.createAnimatedComponent(View)

const NewPlayerScreen = () => {
    // TODOS LOS HOOKS DEBEN IR AL PRINCIPIO
    const activeTrack = useActiveTrack()
    const translateY = useSharedValue(0)
    const context = useSharedValue({ y: 0 })
    const { showPostHypnosisModal } = useAudioTrackEnd()
    const [showControls, setShowControls] = useState(true);
    const controlsOpacity = useSharedValue(1);
    const setDisplayedTrack = usePlayerStore((state) => state.setDisplayedTrack);
    const setIsFloatingPlayerVisible = usePlayerStore((state) => state.setIsFloatingPlayerVisible);
    const { displayedTrack, fullTrackData } = usePlayerStore();
    const isPlaying = useIsPlaying();

    // Función de pausa para TrackPlayer
    const pauseFn = useCallback(async () => {
        await TrackPlayer.pause();
    }, []);

    // Hooks de protección contra capturas
    const { isVisible } = useAutoPauseOnCapture(pauseFn);
    useBlockCaptureAndroid();


    // Todos los useEffect también al principio
    useEffect(() => {
        if (!isPlaying.playing || !showControls) {
            setIsFloatingPlayerVisible(false);
            return;
        }

        const timer = setTimeout(() => {
            controlsOpacity.value = withTiming(0, { duration: 1000 });
            setTimeout(() => setShowControls(false), 1000);
        }, 5000);
        
        return () => clearTimeout(timer);

    }, [showControls, isPlaying.playing, controlsOpacity,isVisible]);

    // Efecto para navegar a postHypnosis cuando sea necesario
    useEffect(() => {
        if (showPostHypnosisModal) {
            router.back();
        }
    }, [showPostHypnosisModal]);

    useEffect(() => {
        if (activeTrack) {
            setDisplayedTrack(activeTrack);
            console.log('[NewPlayerScreen] Active track:', activeTrack);
        }

        // Función de limpieza para pausar el audio cuando el componente se desmonta
        return () => {
            // TrackPlayer.pause();
        };
    }, [activeTrack, setDisplayedTrack]);

    // Limpiar la cola cuando se pierde el foco de la pantalla
    useFocusEffect(
        useCallback(() => {
            // Cuando se enfoca la pantalla, no hacer nada especial
            return () => {
                // Cuando se pierde el foco (usuario sale del player), limpiar la cola
                console.log('[NewPlayerScreen] Usuario salió del player, limpiando cola');
                TrackPlayer.reset();
                setDisplayedTrack(null);
                setIsFloatingPlayerVisible(false);
            };
        }, [setDisplayedTrack, setIsFloatingPlayerVisible])
    );

    const handleCloseModal = () => {
        // Limpiar completamente la cola del reproductor
        TrackPlayer.reset()
        router.back()
        setDisplayedTrack(null);
        setIsFloatingPlayerVisible(false);
    }

    const handleScreenPress = () => {
        // Solo mostrar controles si están ocultos y no está reproduciendo
        // (para evitar conflicto con el toque del video)
        if (!showControls && !isPlaying.playing) {
            setShowControls(true);
            controlsOpacity.value = withTiming(1, { duration: 1000 });
        }
    };

    const gesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value }
        })
        .onUpdate((event) => {
            translateY.value = event.translationY + context.value.y
            translateY.value = Math.max(translateY.value, 0)
        })
        .onEnd((event) => {
            if (event.translationY > SNAP_THRESHOLD) {
                translateY.value = withSpring(SCREEN_HEIGHT, { damping: 50 })
                runOnJS(handleCloseModal)()
            } else {
                translateY.value = withSpring(0, { damping: 50 })
                    }
    })

    const controlsAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: controlsOpacity.value,
        }
    })

    const containerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            opacity: interpolate(
                translateY.value,
                [0, SCREEN_HEIGHT * 0.5],
                [1, 0],
                "clamp"
            ),
        }
    })

    const imageAnimatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            translateY.value,
            [0, SCREEN_HEIGHT * 0.5],
            [1, 0.8],
            "clamp"
        )
        return {
            transform: [{ scale }]
        }
    })

    // Usar displayedTrack como fallback si activeTrack es null temporalmente
    const currentTrackToDisplay = activeTrack || displayedTrack;

    // Manejo de estados de loading después de todos los hooks
    if (!activeTrack && !displayedTrack) { 
        return (
            <View style={[defaultStyles.container, { justifyContent: 'center', backgroundColor: 'black' }]}>
                <ActivityIndicator color={colors.icon}></ActivityIndicator>
            </View>
        )
    }

    if (!currentTrackToDisplay) {
        return (
            <View style={[defaultStyles.container, { justifyContent: 'center', backgroundColor: 'black' }]}>
                <ActivityIndicator color={colors.icon}></ActivityIndicator>
            </View>
        )
    }
    return (
        <View style={{flex: 1, backgroundColor: 'black'}}>
            <View style={defaultStyles.container}>
                <GestureDetector gesture={gesture}>
                    <AnimatedView style={[styles.overlayContainer, containerAnimatedStyle]}>
                        <DismissPlayerSymbol />
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={handleScreenPress}
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            <View style={{ flex: 1, marginTop: 20 }}>
                                <View style={{ flex: 1, justifyContent: 'center'  }}>
                                    {showControls && (
                                        <Animated.View style={[styles.trackTitleContainer, controlsAnimatedStyle]}>
                                            <Text style={styles.trackTitleText}>{currentTrackToDisplay?.title}</Text>
                                            <Text style={{ textAlign: 'center', fontSize: fontSize["sm-18"], color: '#808080', fontFamily: 'Geist-Regular', marginTop: 14 }}>Cierra los ojos...</Text>
                                        </Animated.View>
                                    )}
                                </View>

                                <Animated.View style={[styles.artworkImageContainer, imageAnimatedStyle]}>
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        onPress={() => {
                                            if (isPlaying.playing && showControls) {
                                                // Si está reproduciendo y los controles están visibles, ocultarlos
                                                controlsOpacity.value = withTiming(0, { duration: 500 });
                                                setTimeout(() => setShowControls(false), 500);
                                            } else if (isPlaying.playing && !showControls) {
                                                // Si está reproduciendo y los controles están ocultos, mostrarlos
                                                setShowControls(true);
                                                controlsOpacity.value = withTiming(1, { duration: 500 });
                                            }
                                        }}
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        <Video
                                            source={require('@/assets/Images/Portal_1_Player_Loopeado.mp4')}
                                            style={styles.artworkImage}
                                            resizeMode={ResizeMode.COVER}
                                            shouldPlay={isPlaying.playing}
                                            isLooping={true}
                                            isMuted={true}
                                        />
                                    </TouchableOpacity>
                                </Animated.View>

                                <View style={{ flex: 1, justifyContent: 'flex-end', marginBottom: 70 }}>
                                    {showControls && (
                                        <Animated.View style={controlsAnimatedStyle}>
                                            <View style={{ marginTop: 40 }}>
                                                <View style={{ height: 40 }}>
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'center',
                                                        alignItems: "center",
                                                    }}>
                                                    </View>
                                                </View>
                                                <PlayerProgressBar style={{ marginTop: 0 }} />
                                                <PlayerControlsForward style={{ marginTop: 0 }} />
                                            </View>
                                            <View style={utilsStyles.centeredRow} />
                                        </Animated.View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>

                    </AnimatedView>
                </GestureDetector>
            </View>
            <CaptureBlockerModal visible={isVisible} onClose={() =>{
                 router.back();
            }} />
        </View>
    )
}

const DismissPlayerSymbol = () => {
    const { top } = useSafeAreaInsets()

    return (
        <View style={{
            paddingTop: 20,
            flexDirection: "row",
            justifyContent: 'center',
        }}>
            <View accessible={false} style={{
                width: 50,
                height: 8,
                borderRadius: 8,
                backgroundColor: colors.tertiary || '#FF9F40',
                opacity: 0.7
            }} />
        </View>
    )
}

const styles = StyleSheet.create({
    overlayContainer: {
        ...defaultStyles.container,
        paddingHorizontal: screenPadding.horizontal,
        paddingTop: 60,
        backgroundColor: 'black',
    },
    artworkImageContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flex: 2,
        height: '100%',
    },
    artworkImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 12,
    },
    trackTitleContainer: {
        overflow: 'hidden',
        marginTop: 20,
        marginBottom: 40
    },
    trackTitleText: {
        color: colors.text,
        fontFamily: 'Geist-SemiBold',
        letterSpacing: -0.5,
        fontSize: fontSize.xl,
        fontWeight: '700',
        textAlign: 'center'
    },
    trackArtistText: {
        ...defaultStyles.text,
        fontSize: fontSize.base,
        opacity: 0.8,
        maxWidth: '90%',
    },
    playerControlsContainer: {
        marginTop: 20,
    }
})

export default NewPlayerScreen