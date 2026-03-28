import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	interpolate,
	useAnimatedScrollHandler,
	Extrapolate,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const ITEM_SPACING = 5
const ITEM_HEIGHT = 150
const VISIBLE_ITEMS = 4
const CARD_WIDTH = SCREEN_WIDTH * 1

interface SkeletonCardProps {
	index: number
	scrollY: Animated.SharedValue<number>
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ index, scrollY }) => {
	// Wave animation using translateX instead of opacity
	const wavePosition = useSharedValue(-1)

	React.useEffect(() => {
		wavePosition.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false)
	}, [wavePosition])

	const waveAnimatedStyle = useAnimatedStyle(() => {
		const translateX = interpolate(wavePosition.value, [-1, 1], [-SCREEN_WIDTH, SCREEN_WIDTH])

		return {
			transform: [{ translateX }],
		}
	})

	// Reanimated styles - replicando exactamente el comportamiento del CircularCarousel
	const animatedStyle = useAnimatedStyle(() => {
		const inputRange = [
			(index - 3) * ITEM_HEIGHT,
			(index - 2) * ITEM_HEIGHT,
			(index - 1) * ITEM_HEIGHT,
			index * ITEM_HEIGHT,
			(index + 1) * ITEM_HEIGHT,
			(index + 2) * ITEM_HEIGHT,
			(index + 3) * ITEM_HEIGHT,
		]

		const scale = interpolate(
			scrollY.value,
			inputRange,
			[0.5, 0.5, 0.75, 1.0, 0.75, 0.5, 0.5],
			Extrapolate.EXTEND,
		)

		const translateY = interpolate(
			scrollY.value,
			inputRange,
			[-100, -160, -20, 0, 20, 160, 100],
			Extrapolate.EXTEND,
		)

		const height = interpolate(
			scrollY.value,
			inputRange,
			[105, 115, 120, 150, 120, 115, 105],
			Extrapolate.CLAMP,
		)

		const width = interpolate(
			scrollY.value,
			inputRange,
			[
				CARD_WIDTH + 150,
				CARD_WIDTH + 140,
				CARD_WIDTH + 30,
				CARD_WIDTH - 35,
				CARD_WIDTH + 30,
				CARD_WIDTH + 140,
				CARD_WIDTH + 150,
			],
			Extrapolate.CLAMP,
		)

		return {
			transform: [{ scale }, { translateY }],
			height,
			width,
		}
	})

	return (
		<View style={styles.cardWrapperVertical}>
			<Animated.View style={[styles.cardContainerVertical, animatedStyle]}>
				<View style={[styles.card, styles.skeletonBase]}>
					<View style={styles.cardImage}>
						<Animated.View style={[styles.waveOverlay, waveAnimatedStyle]}>
							<LinearGradient
								colors={[
									'transparent',
									'rgba(60,60,60,0.4)',
									'rgba(80,80,80,0.6)',
									'rgba(60,60,60,0.4)',
									'transparent',
								]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.waveGradient}
							/>
						</Animated.View>
					</View>
					<View style={styles.cardContent}>
						<View style={styles.titleContainer}>
							{/* Removidas las barras oscuras del skeleton */}
						</View>
					</View>
				</View>
			</Animated.View>
		</View>
	)
}

interface CircularCarouselSkeletonProps {
	totalItems?: number
}

export const CircularCarouselSkeleton: React.FC<CircularCarouselSkeletonProps> = ({ 
	totalItems = 8 // Por defecto 8 elementos como en el carrusel real
}) => {
	const scrollY = useSharedValue(0)
	const skeletonData = Array.from({ length: totalItems }, (_, i) => ({ id: `skeleton-${i}`, index: i }))

	const scrollHandler = useAnimatedScrollHandler({
		onScroll: (event) => {
			scrollY.value = event.contentOffset.y
		},
	})

	const renderSkeletonCard = ({ item }: { item: { id: string; index: number } }) => (
		<SkeletonCard index={item.index} scrollY={scrollY} />
	)

	return (
		<View style={styles.container}>
			<LinearGradient
				colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
				style={styles.overlayTop}
				pointerEvents="none"
			/>
			<LinearGradient
				colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)']}
				style={styles.overlayBottom}
				pointerEvents="none"
			/>
			<Animated.FlatList
				data={skeletonData}
				renderItem={renderSkeletonCard}
				keyExtractor={(item) => item.id}
				showsVerticalScrollIndicator={false}
				onScroll={scrollHandler}
				scrollEventThrottle={16}
				snapToInterval={ITEM_HEIGHT}
				decelerationRate={0.92}
				testID="carousel-skeleton"
				contentContainerStyle={styles.scrollContent}
				style={styles.flatListContainer}
				removeClippedSubviews={true}
				maxToRenderPerBatch={VISIBLE_ITEMS}
				windowSize={2}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	overlayTop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: SCREEN_HEIGHT * 0.25,
		zIndex: 1,
	},
	overlayBottom: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: SCREEN_HEIGHT * 0.25,
		zIndex: 1,
	},
	flatListContainer: {
		height: ITEM_HEIGHT * 5, // Altura suficiente para mostrar elementos con transformaciones
		width: '100%',
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingVertical: SCREEN_HEIGHT * 0.2,
		paddingBottom: 300,
		alignItems: 'center',
	},
	// Estilos idénticos al CircularCarousel
	cardWrapperVertical: {
		height: ITEM_HEIGHT,
		width: CARD_WIDTH,
		alignItems: 'center',
		justifyContent: 'center',
		marginVertical: ITEM_SPACING / 2,
	},
	cardContainerVertical: {
		width: CARD_WIDTH - 40,
		height: 100,
		borderRadius: 8,
		overflow: 'hidden',
		elevation: 10,
		justifyContent: 'flex-end',
	},
	card: {
		justifyContent: 'center',
		alignItems: 'center',
		flex: 1,
	},
	cardImage: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100%',
		height: '100%',
		borderRadius: 8,
	},
	cardContent: {
		flex: 1,
		justifyContent: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		paddingRight: 10,
		zIndex: 999,
	},
	titleContainer: {
		marginLeft: 10,
		alignContent: 'center',
		justifyContent: 'center',
		width: 200,
		height: '100%',
		flexShrink: 1,
	},
	// Skeleton styles
	skeletonBase: {
		backgroundColor: '#181818', // gris más oscuro
		overflow: 'hidden',
	},
	waveOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: SCREEN_WIDTH * 2, // Make it wider to ensure complete coverage
	},
	waveGradient: {
		flex: 1,
		width: '100%',
		height: '100%',
	},
})
