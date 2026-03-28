import { unknownTrackImageUri } from "@/constants/images";
import { defaultStyles } from "@/styles";
import { TouchableOpacity, StyleSheet, View, Text, ViewProps } from "react-native";
import FastImage from "react-native-fast-image";
import { Track, useActiveTrack, useProgress } from "react-native-track-player"
import { PlayPauseButton, SkipToNextButton } from "./PlayerControls";
import { useLastActiveTrack } from "@/hooks/useLastActiveTrack";
import { useRouter } from 'expo-router'
import { Slider } from "react-native-awesome-slider";
import { colors, fontSize } from "@/constants/tokens";
import { useSharedValue } from "react-native-reanimated";
import { usePlayerStore } from "@/store/playerStore";
import { useEffect } from "react";
import { MovingText } from "./MovingText";

// Función auxiliar para formatear segundos a mm:ss
const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const FloatingPlayer = ({ style }: ViewProps) => {
    const router = useRouter()
    const activeTrack = useActiveTrack();
    const { duration, position } = useProgress(250)
    const lastActiveTrack = useLastActiveTrack()
    const displayedTrack = usePlayerStore((state) => state.displayedTrack);


    // const setDisplayedTrack = usePlayerStore((state) => state.setDisplayedTrack);

    const progress = useSharedValue(0)
    const min = useSharedValue(0)
    const max = useSharedValue(1)

    useEffect(() => {
        if (displayedTrack) {
            progress.value = duration > 0 ? position / duration : 0
        }
    }, [displayedTrack, duration, position]);

    if (!displayedTrack) return null

    
    const handlePress = () => {
        router.navigate('/player')
    }

    // Formatear la posición actual y la duración total
    const formattedPosition = formatTime(position);
    const formattedDuration = formatTime(duration);

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={style}>
            <View style={styles.container}>
                <FastImage
                    source={{
                        uri: displayedTrack.artwork ?? unknownTrackImageUri
                    }}
                    style={styles.trackArtworkImage}
                />

                <View style={styles.trackTitleContainer}>
                    {/* <Text 
                        numberOfLines={2} 
                        ellipsizeMode="tail"
                        style={styles.trackTitle}>
                        {displayedTrack.customData?.name || displayedTrack.title}
                    </Text> */}
                    <MovingText  style={styles.trackTitle} text={displayedTrack.customData?.name || displayedTrack.title} animationThreshold={25}/>

                    
                    <Text style={styles.trackDuration}>
                        {formattedPosition} / {formattedDuration}
                    </Text>
                </View>

                <View style={styles.trackControlsContainer}>
                    <PlayPauseButton iconSize={40} />
                    {/* <SkipToNextButton iconSize={30} /> */}
                </View>
            </View>

            <View>
                <Slider
                    progress={progress}
                    minimumValue={min}
                    maximumValue={max}
                    renderBubble={() => null}
                    theme={{
                        minimumTrackTintColor: colors.primary,
                        maximumTrackTintColor: colors.tertiary,
                        disableMinTrackTintColor: colors.primary
                    }}
                    thumbWidth={0}
                    sliderHeight={4}
                    disable={true}
                />
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondary,
    },
    trackArtworkImage: {
        width: 90,
        height: 90,
    },
    trackTitleContainer: {
        flex: 1,
        overflow: 'hidden',
        marginLeft: 0,
    },
    trackTitle: {
        ...defaultStyles.text,
        fontSize: fontSize.sm,
        fontWeight: '600',
        paddingLeft: 12,
    },
    trackDuration: {
        marginTop: 2,
        color: colors.tertiary,
        fontWeight: '600',
        paddingLeft: 12,
        fontFamily: 'Inter-Regular',
        fontSize: fontSize.xs,
        letterSpacing: -0.5,
        maxWidth: '90%',
    },
    trackControlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 15,
        marginRight: 16,
        paddingLeft: 8,
        paddingRight: 16
    },
});