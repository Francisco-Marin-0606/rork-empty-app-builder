import React, { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, Animated, Platform } from 'react-native'
import { ResizeMode, Video, Audio } from 'expo-av'
import { useAuthStore, APIKeys } from '../../store/authStore'
import { router, useLocalSearchParams } from 'expo-router'
import { colors, fontSize, screenPadding } from '@/constants/tokens'
import FastImage from 'react-native-fast-image'
// import { LOGIN_SCREEN_VIEW } from '@/services/analytics/screenTracking'
import CustomButton from '@/components/CustomButton'
import LinearGradient from 'react-native-linear-gradient'
import Purchases from 'react-native-purchases'
import PaywallScreen from '@/components/PaywallScreen'
import { useAppConfigStore } from '@/store/appConfigStore'
import { useUpdateStore } from '@/store/updateStore'
import { UpdateModal } from '@/components/UpdateModal'
import loginBg from '@/assets/Mental_Login_Background2.mp4'
import logoBlanco from '@/assets/Images/logo_blanco.png'
import introLoginMusic from '@/assets/music/intro_login_music.mp3'

export default function LoginScreen() {
	const { isLoading } = useAuthStore()
    const params = useLocalSearchParams<{ email: string }>()
	const [fadeAnim] = useState(new Animated.Value(1))
    const [isSubmitting] = useState(false)
    const [isAnimating] = useState(false)
	const soundRef = useRef<Audio.Sound | null>(null)
	const [hasRevenueCatAccount, setHasRevenueCatAccount] = useState(false)
	const [isCheckingRevenueCat, setIsCheckingRevenueCat] = useState(true)
	const [showPaywall, setShowPaywall] = useState(false)
	const { checkRevenueCatSubscription } = useAuthStore()
	const { configs } = useAppConfigStore()

	const { checkForUpdates } = useUpdateStore()

    // Eliminado: navegación automática a verificación

	// Load and play background music
	useEffect(() => {
		const loadSound = async () => {
			try {
				await Audio.setAudioModeAsync({
					playsInSilentModeIOS: false,
					staysActiveInBackground: false,
					shouldDuckAndroid: false,
				})

                const { sound } = await Audio.Sound.createAsync(
                    introLoginMusic,
                    { isLooping: true, shouldPlay: true },
                )

				soundRef.current = sound
			} catch (error) {
				console.error('Error loading sound', error)
			}
		}

		loadSound()
		// Track login screen view
		//LOGIN_SCREEN_VIEW();

		return () => {
			// Cleanup function to unload sound when component unmounts
			if (soundRef.current) {
				soundRef.current.unloadAsync()
				soundRef.current = null
			}
		}
	}, [])

	// Check if the current device already has a RevenueCat account
	useEffect(() => {
		const checkRevenueCatAccount = async () => {
			setIsCheckingRevenueCat(true)
			try {
				// Configure RevenueCat with the appropriate API key
				if (Platform.OS === 'ios') {
					await Purchases.configure({ apiKey: APIKeys.apple })
				} else if (Platform.OS === 'android') {
					await Purchases.configure({ apiKey: APIKeys.google })
				}

				// Get the current anonymous app user ID
				const appUserId = await Purchases.getAppUserID()

				// Try to get customer info without logging in
				const customerInfo = await Purchases.getCustomerInfo()

				// Check if this device has any previous purchases or subscriptions
				const hasActiveSubscription = customerInfo.entitlements.active?.Mental?.isActive || false
				const hasAnySubscriptions =
					customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0

				// If there are any active subscriptions, this user already has an account
				setHasRevenueCatAccount(hasActiveSubscription || hasAnySubscriptions)

				console.log('[LoginScreen] RevenueCat check - AppUserId:', appUserId)
				console.log(
					'[LoginScreen] RevenueCat check - Has account:',
					hasActiveSubscription || hasAnySubscriptions,
				)
			} catch (error) {
				console.error('[LoginScreen] Error checking RevenueCat account:', error)
			} finally {
				setIsCheckingRevenueCat(false)
			}
		}

		checkRevenueCatAccount()
		checkForUpdates()
	}, [])

	// Eliminado: navegación automática basada en isInVerificationFlow

	const handleStartFirstHypnosis = () => {
		if (configs?.test === true) {
			setShowPaywall(true)
			return
		}

		if (configs?.availableRegistration === false) {
			router.push('/(auth)/unavailableRegistration')
			return
		}

		// If user already has a RevenueCat account, redirect to login instead of first hypnosis
		if (hasRevenueCatAccount) {
			handleStartLogin()
		} else {
			router.push('/(auth)/(onboarding)/OnBoardingHypnosisScreen')
		}
	}

	const handleStartLogin = () => {
		router.push('/(auth)/loginView')
	}

	const handlePaywallComplete = async () => {
		setShowPaywall(false)
		// Actualizar el estado de suscripción
		await checkRevenueCatSubscription()
	}

	return (
		<View style={styles.container}>
            <Video
                source={loginBg}
				style={styles.backgroundVideo}
				resizeMode={ResizeMode.COVER}
				shouldPlay={true}
				isLooping={true}
				isMuted={true}
			/>

			<LinearGradient
				colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
				style={styles.overlay}
				start={{ x: 0.5, y: 0 }}
				end={{ x: 0.5, y: 2.5 }}
			>
				<Animated.View style={[styles.content, { opacity: fadeAnim }]}>
					<View style={styles.welcomeContainer}>
						<View style={styles.cornerLogo}>
                            <FastImage
                                source={logoBlanco}
								style={{ width: 50, height: 50 }}
								resizeMode="contain"
							/>
						</View>
						<View style={styles.buttonContainer}>
							{configs?.firstHypnosisEnabled === true && (
								<CustomButton
									containerStyles={[styles.button, { backgroundColor: 'white' }]}
									handlePress={handleStartFirstHypnosis}
									disabled={isLoading || isAnimating || isCheckingRevenueCat}
									title="Crear cuenta"
									textStyles={[styles.buttonText, { color: 'black', fontWeight: 'semibold' }]}
								/>
							)}
							<CustomButton
								containerStyles={[styles.button, { backgroundColor: 'white' }]}
								handlePress={handleStartLogin}
								disabled={isLoading || isAnimating}
								title="Iniciar sesión"
								textStyles={[styles.buttonText, { color: 'black', fontWeight: 'semibold' }]}
							/>
						</View>
					</View>
				</Animated.View>
			</LinearGradient>
			{showPaywall && (
				<PaywallScreen onComplete={handlePaywallComplete} onBack={() => setShowPaywall(false)} />
			)}
			<UpdateModal />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.screenBackground,
	},
	backgroundVideo: {
		width: '100%',
		height: '100%',
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	overlay: {
		flex: 1,
	},
	logoText: {
		fontSize: 48,
		color: 'white',
		marginBottom: 100,
		fontWeight: 'bold',
	},
	formContainer: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	formLogo: {
		height: '44%',
		width: '80%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	formTitle: {
		width: '100%',
		alignItems: 'center',
		marginBottom: 40,
	},
	formTitleText: {
		fontSize: 50,
		fontWeight: '600',
		color: 'white',
		letterSpacing: -2.5,
	},
	buttonText: {
		color: 'black',
		fontSize: fontSize['sm-18'],
		fontWeight: 'semibold',
	},
	content: {
		flex: 1,
		justifyContent: 'space-between',
		paddingHorizontal:
			Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
	},
	welcomeContainer: {
		flex: 1,
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	logoContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
		width: '100%',
		height: '55%',
	},
	logo: {
		width: 200,
		height: 100,
	},
	buttonContainer: {
		width: '100%',
		paddingBottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	button: {
		width: '96%',
		backgroundColor: 'white',
		justifyContent: 'center',
		alignItems: 'center',
		minHeight: 55,
		borderRadius: 12,
		padding: 0,
		alignSelf: 'center',
	},
	backButton: {
		position: 'absolute',
		top: 50,
		left: 0,
		zIndex: 10,
		padding: 0,
	},
	cornerLogo: {
		position: 'absolute',
		top: 100,
		left: 0,
		zIndex: 10,
		padding: 0,
	},
	keyboardAvoidingContainer: {
		flex: 1,
		width: '100%',
	},
})
