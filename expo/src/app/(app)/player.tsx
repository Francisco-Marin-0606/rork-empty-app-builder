import { unknownTrackImageUri } from "@/constants/images"
import { colors, fontSize, screenPadding } from "@/constants/tokens"
import { defaultStyles, utilsStyles } from "@/styles"
import { View, StyleSheet, ActivityIndicator, Text, Dimensions } from "react-native"
import FastImage from "react-native-fast-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useActiveTrack } from "react-native-track-player"
import { FontAwesome6 } from "@expo/vector-icons"
import { PlayerControls } from "@/components/PlayerControls"
import { PlayerProgressBar } from "@/components/PlayerProgressBar"
import { StatusBar } from "expo-status-bar"
import { router } from 'expo-router'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated'
import { PlayerRepeatToggle } from "@/components/PlayerRepeatToggle"
import { useEffect } from "react"
import { usePlayerStore } from "@/store/playerStore"
import { MovingText } from "@/components/MovingText"
import useAudioTrackEnd from "@/hooks/useAudioTrackEnd"

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const SNAP_THRESHOLD = SCREEN_HEIGHT * 0.2

const AnimatedView = Animated.createAnimatedComponent(View)
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage)

const PlayerScreen = () => {
    const { top, bottom } = useSafeAreaInsets()
    const isFavorite = false
    const activeTrack = useActiveTrack()
    const translateY = useSharedValue(0)
    const context = useSharedValue({ y: 0 })
    const { PostHypnosisModalComponent } = useAudioTrackEnd()

    const setDisplayedTrack = usePlayerStore((state) => state.setDisplayedTrack);
    const {displayedTrack} = usePlayerStore();
    const closeModal = () => {
        router.back()
    }

    const characterLimit = 20;

       useEffect(() => {
            setDisplayedTrack(activeTrack!);
        }, [activeTrack]);
    

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
                runOnJS(closeModal)()
            } else {
                translateY.value = withSpring(0, { damping: 50 })
            }
        })

    const containerAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            opacity: interpolate(
                translateY.value,
                [0, SCREEN_HEIGHT * 0.5],
                [1, 0],
                Extrapolate.CLAMP
            ),
        }
    })

    const imageAnimatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            translateY.value,
            [0, SCREEN_HEIGHT * 0.5],
            [1, 0.8],
            Extrapolate.CLAMP
        )
        return {
            transform: [{ scale }]
        }
    })

    if (!activeTrack) {
        return (
            <View style={[defaultStyles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator color={colors.icon}></ActivityIndicator>
            </View>
        )
    }

    return (
        <>
            <GestureDetector gesture={gesture}>
                <AnimatedView style={[styles.overlayContainer, containerAnimatedStyle]}>
                    <DismissPlayerSymbol />

                    <View style={{ flex: 1, marginTop: 20 }}>
                        <Animated.View style={[styles.artworkImageContainer, imageAnimatedStyle]}>
                            <FastImage 
                                source={{
                                    uri: activeTrack.artwork ?? unknownTrackImageUri,
                                    priority: FastImage.priority.high
                                }} 
                                resizeMode="cover" 
                                style={styles.artworkImage} 
                            />
                        </Animated.View>

                        <View style={{ flex: 1 }}>
                            <View style={{ marginTop: 40 }}>
                                <View style={{ height: 40 }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        alignItems: "center",
                                    }}>
                                        <View style={styles.trackTitleContainer}>

                                            { ((activeTrack?.title || "").length > characterLimit) && (displayedTrack?.title) ? 
                                            <MovingText style={[styles.trackTitleText, {textAlign: 'left'}]} text={displayedTrack?.title || displayedTrack?.title} animationThreshold={characterLimit}/>
                                            : <Text maxFontSizeMultiplier={1.1}  style={styles.trackTitleText}>{displayedTrack?.title || displayedTrack?.title}</Text>
                                        }

                                            {/* <Text maxFontSizeMultiplier={1.1}  style={styles.trackTitleText}>
                                                {activeTrack.title || activeTrack.title }
                                            </Text> */}
                                        </View>
                                    </View>
                                </View>

                                <PlayerProgressBar style={{ marginTop: 32 }} />
                                <PlayerControls style={{ marginTop: 20 }} />
                                <View style={{flexDirection: 'row',
                                        justifyContent: 'center',
                                        alignItems: "center",
                                        marginTop: 25}}>
                                <PlayerRepeatToggle></PlayerRepeatToggle>

                                </View>
                            </View>

                            <View style={utilsStyles.centeredRow} />
                        </View>
                    </View>
                </AnimatedView>
            </GestureDetector>
            {/* Post Hypnosis Modal that shows when a track finishes */}
            {PostHypnosisModalComponent}
        </>
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
        paddingTop: 60
    },
    artworkImageContainer: {
        // shadowOffset: {
        //     width: 0,
        //     height: 8,
        // },
        // shadowOpacity: 0.44,
        // shadowRadius: 11.0,
        flexDirection: 'row',
        justifyContent: 'center',
        height: '50%',
    },
    artworkImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 12,
    },
    trackTitleContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    trackTitleText: {
        color: colors.text,
        fontFamily: 'Geist-SemiBold',
        letterSpacing: -0.5,
        fontSize: 25,
        fontWeight: '700',
        textAlign: 'center'
    },
    trackArtistText: {
        ...defaultStyles.text,
        fontSize: fontSize.base,
        opacity: 0.8,
        maxWidth: '90%',
    },
})

export default PlayerScreen