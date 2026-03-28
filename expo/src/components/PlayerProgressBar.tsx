import { colors, fontSize } from '@/constants/tokens'
import { formatSecondsToMinutes } from '@/helpers/miscellaneous'
import { defaultStyles, utilsStyles } from '@/styles'
import { StyleSheet, Text, View, ViewProps } from 'react-native'
import { Slider } from 'react-native-awesome-slider'
import { useSharedValue } from 'react-native-reanimated'
import TrackPlayer, { useProgress } from 'react-native-track-player'

export const PlayerProgressBar = ({ style }: ViewProps) => {
	const { duration, position } = useProgress(10)

	const isSliding = useSharedValue(false)
	const progress = useSharedValue(0)
	const min = useSharedValue(0)
	const max = useSharedValue(1)

	const trackElapsedTime = formatSecondsToMinutes(position)
	const trackRemainingTime = formatSecondsToMinutes(duration - position)

	if (!isSliding.value) {
		progress.value = duration > 0 ? position / duration : 0
	}

	return (
		<View style={style}>
			<Slider
				progress={progress}
				minimumValue={min}
				maximumValue={max}

				thumbWidth={16}
				
				renderBubble={() => null}
				theme={{
					minimumTrackTintColor: 'white',
					maximumTrackTintColor: colors.maximumTrackTintColor,
				}}
				onSlidingStart={() => (isSliding.value = true)}
				onValueChange={async (value) => {
					await TrackPlayer.seekTo(value * duration)
				}}
				onSlidingComplete={async (value) => {
					// if the user is not sliding, we should not update the position
					if (!isSliding.value) return

					isSliding.value = false

					await TrackPlayer.seekTo(value * duration)
				}}
				sliderHeight={3.5}
			/>

			<View style={styles.timeRow}>
				<Text style={styles.timeText}>{trackElapsedTime}</Text>

				<Text style={styles.timeText}>
					{'-'}{trackRemainingTime}
				</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	timeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		marginTop: 20,
	},
	timeText: {
		...defaultStyles.text,
		fontFamily: 'Geist-Regular',
		color: colors.textMuted,
		opacity: 0.75,
		fontSize: fontSize.xs,
		letterSpacing: -0.7,
		fontWeight: '500',
	},
})