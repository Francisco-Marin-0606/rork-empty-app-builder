import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	Dimensions,
	Platform,
	TouchableOpacity,
	Animated,
	Alert,
} from 'react-native'
import { fontSize, screenPadding } from '@/constants/tokens'
import CustomButton from '../../../components/CustomButton'
import FastImage from 'react-native-fast-image'
import { IconChevronLeft } from '@tabler/icons-react-native'
import { router, useRouter } from 'expo-router'
import { useOnboardingStore } from '@/store/onBoardingStore'

interface OnboardingHypnosisScreenProps {
	onStartHypnosis: () => void
	onBack?: () => void
}

const { height } = Dimensions.get('window')

const OnboardingHypnosisScreen: React.FC<OnboardingHypnosisScreenProps> = ({}) => {
	const router = useRouter()
	const { firstLevel, loading, error, getFirstLevel } = useOnboardingStore()
	const fadeAnim = useState(new Animated.Value(0))[0]

	useEffect(() => {
		// Fetch the first level data when the component mounts
		getFirstLevel()
	}, [])

	const handleFormCancel = () => {
		Alert.alert('¿Deseas responder estas preguntas luego?', '', [
			{
				text: 'No',
				style: 'cancel',
				onPress: () => {
					// No hacer nada, solo cerrar la alerta
				},
			},
			{
				text: 'Sí',
				style: 'destructive',
				onPress: () => {
					router.back()
				},
			},
		])
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<View style={styles.backButtonContainer}>
						<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
							<IconChevronLeft size={36} color="white" />
						</TouchableOpacity>
					</View>                     
					<View style={{ paddingTop: 70 }}>
						<Text style={styles.title}>
						Ahora{'\n'}
						vendrán{'\n'}
						tres{'\n'}
						preguntas{'\n'}
						medio raras
					</Text>
					</View>

				<View style={styles.containerBottom}>
					<View style={styles.messageContainer}>
						<Text style={styles.message}>
							<Text style={{ fontFamily: 'Geist-SemiBold' }}>Ojo:</Text> lo que respondas es lo
							{'\n'}
							que vas a vivir.
						</Text>
					</View>

					<View style={styles.startButtonContainer}>
						<CustomButton
							title="Comenzar"
							handlePress={() => router.push('/form-wizard')}
							containerStyles={[styles.startButton, { backgroundColor: '#F2741B' }]}
							textStyles={[styles.startButtonText, { color: 'white' }]}
						/>
					</View>
				</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		backgroundColor: 'black',
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		paddingHorizontal:
			Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
	},
	backButtonContainer: {
		position: 'absolute',
		top: 0,
		left: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
		zIndex: 999,
	},
	backButton: {
		position: 'absolute',
		top: 20,
		left: 0,
		width: 45,
		height: 45,
		zIndex: 10,
		padding: 0,
	},
	containerBottom: {
		position: 'absolute',
		flexDirection: 'column',
		bottom: 30,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'flex-end',
	},
	titleContainer: {
		width: '100%',
		position: 'absolute',
		top: 0,
		alignItems: 'flex-start',
		justifyContent: 'flex-end',
		height: 330,
	},
	title: {
		color: 'white',

		fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
		textAlign: 'left',
		letterSpacing: -3.5,

		fontSize: 60,
		lineHeight: 60 * 0.9,
		paddingTop: 60 - 60 * 0.75,
	},

	messageContainer: {
		width: '100%',
	},
	message: {
		color: 'white',
		letterSpacing: -1.7,
		fontSize: fontSize.xl,
		fontFamily: 'Geist-Regular',
		textAlign: 'left',
		marginBottom: 20,
		lineHeight: fontSize.xl * 1.5,
	},
	startButton: {
		width: '100%',
		backgroundColor: 'white',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	startButtonText: {
		color: 'black',
		fontFamily: 'Geist-SemiBold',
	},
	startButtonContainer: {
		width: '100%',
	},
})

export default OnboardingHypnosisScreen
