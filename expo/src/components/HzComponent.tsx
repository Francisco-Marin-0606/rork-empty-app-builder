import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Platform, TouchableHighlight, ScrollView } from 'react-native'
import { colors, FLOATING_PLAYER_HEIGHT, screenPadding } from '@/constants/tokens'
import { Track, AddTrack } from 'react-native-track-player'
import FastImage from 'react-native-fast-image'
import { TrackType } from '@/services/api/auraHertzService'
import { usePlayerStore } from '@/store/playerStore'
import { usePaymentStatus } from '@/store/userPaymentStatus'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
interface HzComponentProps {
	onBack: () => void
	onPlay: (tracks: Track[]) => void
	data: Record<TrackType, AddTrack[]>
	visible?: boolean
}

const HzComponent: React.FC<HzComponentProps> = ({ onPlay, data, visible = true }) => {
	const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
	const setIsFloatingPlayerVisible = usePlayerStore((state) => state.setIsFloatingPlayerVisible)
	const displayedTrack = usePlayerStore((state) => state.displayedTrack)
	const { validateAura } = usePaymentStatus()

	useEffect(() => {
		if (displayedTrack) {
			// Buscar en qué lista de Hz está el track actual
			const currentHzKey = findCurrentHzKey(displayedTrack)
			if (currentHzKey) {
				setSelectedTrack(currentHzKey)
			}
		}
	}, [displayedTrack, data])

	// Función para encontrar a qué lista de Hz pertenece el track actual
	const findCurrentHzKey = (currentTrack: Track): string | null => {
		const hzLists = [
			{ key: 'Hz10', tracks: data[TrackType.Hz11] },
			{ key: 'Hz16', tracks: data[TrackType.Hz44] },
			{ key: 'Hz3', tracks: data[TrackType.Hz222] },
			{ key: 'Hz6', tracks: data[TrackType.Hz654] },
			{ key: 'Hz40', tracks: data[TrackType.Hz963] },
		]

		for (const hzList of hzLists) {
			if (hzList.tracks?.some((track: AddTrack) => track.url === currentTrack.url)) {
				return hzList.key
			}
		}
		return null
	}

	const handleHzSelect = async (hzKey: string, tracks: Track[]) => {
		if (!validateAura() || selectedTrack === hzKey) {
			return
		}
		setSelectedTrack(hzKey)
		setIsFloatingPlayerVisible(true)
		onPlay(tracks)
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
	}

	const HZ_LIST = [
		{
			key: 'Hz10',
			title: '10 Hz | Relajación',
			artwork: require('@/assets/Images/Hz-1.png'),
			tracks: data[TrackType.Hz11],
		},
		{
			key: 'Hz16',
			title: '16 Hz | Concentración',
			artwork: require('@/assets/Images/Hz-2.png'),
			tracks: data[TrackType.Hz44],
		},
		{
			key: 'Hz3',
			title: '3 Hz | Sueño',
			artwork: require('@/assets/Images/Hz-3.png'),
			tracks: data[TrackType.Hz222],
		},
		{
			key: 'Hz6',
			title: '6 Hz | Meditación',
			artwork: require('@/assets/Images/Hz-4.png'),
			tracks: data[TrackType.Hz654],
		},
		{
			key: 'Hz40',
			title: '40 Hz | Activación',
			artwork: require('@/assets/Images/Hz-5.png'),
			tracks: data[TrackType.Hz963],
		},
	]

	return (
		<View style={[styles.container]}>
		<Animated.View
			style={[styles.container]}
			entering={FadeIn.duration(2000)}
			exiting={FadeOut.duration(2000)}
		>
			<ScrollView
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
			>
				{HZ_LIST.map((hz) => (
					<HzItem
						key={hz.key}
						title={hz.title}
						artwork={hz.artwork}
						selected={selectedTrack === hz.key}
						dimmed={selectedTrack !== null && selectedTrack !== hz.key}
						onSelect={() => handleHzSelect(hz.key, hz.tracks as unknown as Track[])}
					/>
				))}
			</ScrollView>
		</Animated.View>
		</View>
	)
}

const HzItem = ({
	title,
	artwork,
	selected,
	dimmed,
	onSelect,
}: {
	title: string
	artwork: any
	selected: boolean
	dimmed: boolean
	onSelect: () => void
}) => {
	return (
		<TouchableHighlight
			style={[styles.trackItem, selected && styles.selectedTrackItem]}
			onPress={onSelect}
			underlayColor={'rgba(255, 255, 255, 0.08)'}
		>
			<>
				<FastImage source={artwork} style={styles.trackImage} />
				<View style={styles.trackImageOverlay}>
					<View style={styles.trackInfo}>
						<Text style={styles.trackTitle}>{title}</Text>
					</View>
				</View>
			</>
		</TouchableHighlight>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: colors.screenBackground,
		paddingBottom: FLOATING_PLAYER_HEIGHT + 20,
		paddingHorizontal:
			Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
		zIndex: 1000,
	},
	contentContainer: {
		justifyContent: 'center',
		flexGrow: 1,
		paddingTop: 100,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 20,
		paddingTop: 60,
		marginBottom: 20,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	backIcon: {
		width: 16,
		height: 16,
		tintColor: '#fff',
	},
	headerTitle: {
		color: '#fff',
		fontSize: 24,
		fontFamily: 'Geist-Bold',
		textAlign: 'center',
	},
	placeholder: {
		width: 40,
	},
	listContainer: {
		flex: 1,
		justifyContent: 'center',
		paddingBottom: FLOATING_PLAYER_HEIGHT + 20,
	},
	trackItem: {
		height: 70,
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		marginBottom: 12,
		borderRadius: 12,
		borderColor: 'transparent',
	},
	selectedTrackItem: {
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		borderColor: 'rgba(255, 255, 255, 0.2)',
	},
	trackImage: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
	},
	trackImageOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	trackInfo: {
		flex: 1,
		justifyContent: 'center',
	},
	trackTitle: {
		color: '#fff',
		textAlign: 'center',
		fontSize: 20,
		letterSpacing: -0.4,
		fontFamily: 'Geist-SemiBold',
	},
})

export default HzComponent
