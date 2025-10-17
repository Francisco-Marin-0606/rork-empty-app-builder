import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, Image } from "react-native"
import TrackPlayer, { useIsPlaying } from "react-native-track-player"
import { FontAwesome6, FontAwesome, MaterialCommunityIcons, Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons"
import { colors } from "@/constants/tokens"
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipBackFilled, IconPlayerSkipForward, IconPlayerTrackNextFilled, IconPlayerTrackPrevFilled } from "@tabler/icons-react-native"
import * as Haptics from 'expo-haptics';


type PlayerControlsProps = {
    style?: ViewStyle
}

type PlayerButtonProps = {
    style?: ViewStyle
    iconSize?: number
}


export const PlayerControls = ({ style }: PlayerControlsProps) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.row}>
                <SkipToPreviousButton iconSize={40}></SkipToPreviousButton>

                <PlayPauseButton iconSize={75}></PlayPauseButton>

                <SkipToNextButton iconSize={40}></SkipToNextButton>
            </View>
        </View>
    )
}

export const PlayerControlsForward = ({ style }: PlayerControlsProps) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.row}>
                <SkipToBackwardButton iconSize={50}></SkipToBackwardButton>

                <PlayPauseButton iconSize={65}></PlayPauseButton>

                <SkipToForwardButton iconSize={50}></SkipToForwardButton>
            </View>
        </View>
    )
}

export const PlayPauseButton = ({ style, iconSize }: PlayerButtonProps) => {
    const { playing } = useIsPlaying()
    const buttonSize = iconSize || 75

    return (
        <View style={[{ height: buttonSize }, style]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={
                    () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        playing ? TrackPlayer.pause() : TrackPlayer.play()
                    }
                }
                style={[
                    styles.roundContainer,
                    {
                        width: buttonSize,
                        height: buttonSize,
                        backgroundColor: colors.secondary
                    }
                ]}
            >
                {playing
                    ? <Image source={require('@/assets/Images/Pausar-8.png')} style={{ width: buttonSize * 1.8, height: buttonSize * 1.8 }} />
                    : <Image source={require('@/assets/Images/Play-8.png')} style={{ width: buttonSize * 1.3, height: buttonSize * 1.3 }} />
                }
            </TouchableOpacity>
        </View>
    )
}

export const PauseButton = ({ style, iconSize }: PlayerButtonProps) => {
    const buttonSize = iconSize || 75

    return (
        <View style={[{ height: buttonSize }, style]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={
                    () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        TrackPlayer.pause()
                    }
                }
                style={[
                    styles.roundContainer,
                    {
                        width: buttonSize,
                        height: buttonSize,
                        backgroundColor: colors.secondary
                    }
                ]}
            >
                <Image source={require('@/assets/Images/Pausar-8.png')} style={{ width: buttonSize * 1.8, height: buttonSize * 1.8 }} />
            </TouchableOpacity>
        </View>
    )
}

export const PlayButton = ({ style, iconSize }: PlayerButtonProps) => {
    const buttonSize = iconSize || 75

    return (
        <View style={[{ height: buttonSize }, style]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={
                    () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        TrackPlayer.play()
                    }
                }
                style={[
                    styles.roundContainer,
                    {
                        width: buttonSize,
                        height: buttonSize,
                        backgroundColor: colors.secondary
                    }
                ]}
            >
                <Image source={require('@/assets/Images/Play-8.png')} style={{ width: buttonSize * 1.3, height: buttonSize * 1.3 }} />
            </TouchableOpacity>
        </View>
    )
}


export const SkipToNextButton = ({ iconSize = 30 }: PlayerButtonProps) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => TrackPlayer.skipToNext()}

        >
            <Image source={require('@/assets/Images/10segs_Back.png')} style={{ width: iconSize, height: iconSize }} />
            {/* <FontAwesome5 name='step-forward' size={iconSize} color={colors.icon}></FontAwesome5> */}
        </TouchableOpacity>
    )
}

export const SkipToPreviousButton = ({ iconSize = 30 }: PlayerButtonProps) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => TrackPlayer.skipToPrevious()}

        >
            <Image source={require('@/assets/Images/10segs_Back.png')} style={{ width: iconSize, height: iconSize }} />
            {/* <FontAwesome5 name='step-backward' size={iconSize} color={colors.icon}></FontAwesome5> */}
        </TouchableOpacity>
    )
}


export const SkipToForwardButton = ({ iconSize = 50 }: PlayerButtonProps) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                const position = await TrackPlayer.getPosition();
                TrackPlayer.seekTo(position + 10);
            }}
        >
            <View style={{ alignItems: 'center' }}>
            <Image source={require('@/assets/Images/10segs_Foward.png')} style={{ width: iconSize, height: iconSize }} />
            </View>
        </TouchableOpacity>
    )
}

export const SkipToBackwardButton = ({ iconSize = 30 }: PlayerButtonProps) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                const position = await TrackPlayer.getPosition();
                TrackPlayer.seekTo(position - 10);
            }}
        >
            <View style={{ alignItems: 'center' }}>
            <Image source={require('@/assets/Images/10segs_Back.png')} style={{ width: iconSize, height: iconSize }} />

            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    roundContainer: {
        borderRadius: 999,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        aspectRatio: 1,
    }
})

