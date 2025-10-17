import { useSetupTrackPlayer } from '@/hooks/useSetupTrackPlayer'
import { Redirect, Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform, Text, Dimensions, View, AppState, TouchableOpacity } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useState } from 'react'
import { useLogTrackPlayerState } from '@/hooks/useLogTrackPlayerState'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StackScreenTopBar } from '@/constants/layout'
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons'
import { colors } from '@/constants/tokens'
import { useAuthStore } from '@/store/authStore'
import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import * as Font from 'expo-font'
import { LogLevel, OneSignal } from 'react-native-onesignal'
import Constants from 'expo-constants'
import NetInfo from '@react-native-community/netinfo'
import { useNetworkStore } from '@/store/networkStore'
import { useAppConfigStore } from '@/store/appConfigStore'
import { useUpdateStore } from '@/store/updateStore'
import { UpdateModal } from '@/components/UpdateModal'
import { useLibraryStore } from '@/store/library'
import { AudioDownloadService } from '@/services/audioDownloadService'
import { usePlayerStore } from '@/store/playerStore'
import { PlayerProvider } from '../../providers/PlayerProvider'
import StickyPlayer from '@/components/StickyPlayer'
import GlobalPlayerOverlay from '@/components/GlobalPlayerOverlay'

// El registro del servicio ahora se maneja en trackPlayerService.ts
// TrackPlayer.registerPlaybackService(() => require("../../services/playerNotificationService"))

export default function AppLayout() {
	const { session, isLoading, isInVerificationFlow, isProfileComplete, userId } = useAuthStore()
	const { initializeAppConfig } = useAppConfigStore()
	const { isConnected, setIsConnected } = useNetworkStore()
	const { checkForUpdates, hasOtaUpdate } = useUpdateStore()
	const { loadDownloadedAudios } = useLibraryStore()

	useLogTrackPlayerState()

	useSetupTrackPlayer({
		onNotificationTapped: () => {
			router.replace('/(app)/player')
		},
	})

	const [fontsLoaded, setFontsLoaded] = useState(false)
	const [forceRerender, setForceRerender] = useState(0)
	const [appIsReady, setAppIsReady] = useState(false)
    const insets = useSafeAreaInsets();

	// Configurar el usuario actual en AudioDownloadService y cargar audios
	useEffect(() => {
		const setupUserAndLoadAudios = async () => {
			if (session) {
				if (userId) {
					await AudioDownloadService.setCurrentUser(userId)
					loadDownloadedAudios()
				} else {
					// Si hay sesión pero no userId, limpiar el usuario actual
					await AudioDownloadService.setCurrentUser(null)
				}
			} else {
				// Si no hay sesión, limpiar el usuario actual
				await AudioDownloadService.setCurrentUser(null)
			}
		}

		setupUserAndLoadAudios()
	}, [session, userId, loadDownloadedAudios])

	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener((state: any) => {
			setIsConnected(state.isConnected)
			if (state.isConnected) {
				console.log('connected to internet.')
			} else {
				console.log('disconnected to internet.')
			}
		})

		// Check network status immediately rather than waiting for the event
		NetInfo.fetch().then((state) => {
			console.log('Initial network status:', state.isConnected)
			setIsConnected(!!state.isConnected)
		})

		return () => unsubscribe()
	}, [])

	useEffect(() => {
		async function loadFonts() {
			try {
				// Prevenir que se oculte la splash screen hasta que las fuentes estén listas
				await SplashScreen.preventAutoHideAsync()
				
				await Font.loadAsync({
					// Fuentes Geist (todas con 'B' mayúscula en SemiBold)
					'Geist-SemiBold': require('../../../assets/Fonts/Geist-SemiBold.ttf'),
					'Geist-Semibold': require('../../../assets/Fonts/Geist-SemiBold.ttf'), // Alias para compatibilidad
					'Geist-Medium': require('../../../assets/Fonts/Geist-Medium.ttf'),
					'Geist-Regular': require('../../../assets/Fonts/Geist-Regular.ttf'),
					'Geist-Bold': require('../../../assets/Fonts/Geist-Bold.ttf'),
					'Geist-Light': require('../../../assets/Fonts/Geist-Light.ttf'),
					// Fuentes Inter
					'Inter': require('../../../assets/Fonts/Inter.ttf'),
					'Inter-Italic': require('../../../assets/Fonts/Inter_18pt-Italic.ttf'),
					'Inter-Semibold': require('../../../assets/Fonts/Inter-Semibold.ttf'),
					'Inter-Regular': require('../../../assets/Fonts/Inter.ttf'),
					// Otras fuentes
					'RobotoMono-Medium': require('../../../assets/Fonts/RobotoMono-Medium.ttf'),
					'LeoHatesSchool': require('../../../assets/Fonts/Leo-hates-school.ttf'),
					'tan-kindred': require('../../../assets/Fonts/tan-kindred.otf'),
				})
				setFontsLoaded(true)
				// Esperar un poco más para asegurarse de que las fuentes estén completamente cargadas
				setTimeout(async () => {
					setAppIsReady(true)
					// Ocultar splash screen cuando todo esté listo
					await SplashScreen.hideAsync()
				}, 100)
			} catch (error) {
				console.error('Error cargando fuentes:', error)
				// Si hay error, intentamos cargar solo las fuentes críticas
				try {
					await Font.loadAsync({
						'Geist-SemiBold': require('../../../assets/Fonts/Geist-SemiBold.ttf'),
						'Geist-Semibold': require('../../../assets/Fonts/Geist-SemiBold.ttf'), // Alias para compatibilidad
						'Geist-Regular': require('../../../assets/Fonts/Geist-Regular.ttf'),
						'Inter-Regular': require('../../../assets/Fonts/Inter.ttf'),
					})
					setFontsLoaded(true)
					setTimeout(async () => {
						setAppIsReady(true)
						await SplashScreen.hideAsync()
					}, 100)
				} catch (criticalError) {
					console.error('Error crítico cargando fuentes:', criticalError)
					setFontsLoaded(true) // Continuamos de todas formas
					setTimeout(async () => {
						setAppIsReady(true)
						await SplashScreen.hideAsync()
					}, 100)
				}
			}
		}

		OneSignal.Debug.setLogLevel(LogLevel.Verbose)
		OneSignal.initialize(Constants.expoConfig?.extra?.oneSignalAppId)

		// Also need enable notifications to complete OneSignal setup
		OneSignal.Notifications.requestPermission(true)

		if (userId) {
			OneSignal.login(userId)
		}

		loadFonts()
	}, [])

	// Forzar recarga de vista cuando las fuentes se carguen
	useEffect(() => {
		if (fontsLoaded) {
			// Forzar un re-render para que las fuentes se apliquen correctamente
			setForceRerender(prev => prev + 1)
			console.log('Fuentes cargadas, recargando vista...')
		}
	}, [fontsLoaded])

	// Manejar deep links
	useEffect(() => {
		const subscription = Linking.addEventListener('url', ({ url }) => {
			const parsed = Linking.parse(url)
			if (parsed.hostname === 'notification.click') {
				router.replace('/(app)/new-player')
			}
		})

		Linking.getInitialURL().then((url) => {
			if (url) {
				const parsed = Linking.parse(url)
				if (parsed.hostname === 'notification.click') {
					router.replace('/(app)/new-player')
				}
			}
		})

		return () => {
			subscription.remove()
		}
	}, [])

	useEffect(() => {
		// Configurar el manejador de notificaciones
		const notificationClickHandler = (event: any) => {
			// Verificar si hay un deep link en la notificación
			if (event.notification.additionalData) {
				const additionalData = event.notification.additionalData

				if (additionalData.eventType === 'streaming') {
					router.replace('/(app)/(tabs)/events')
				}
				if (additionalData.eventType === 'chat') {
					router.replace('/(app)/(tabs)/chat')
				}
			}
		}

		OneSignal.Notifications.addEventListener('click', notificationClickHandler)

		return () => {
			// Limpiar el listener cuando el componente se desmonte
			OneSignal.Notifications.removeEventListener('click', notificationClickHandler)
		}
	}, [])

	/* Use effect for app global settings. */
	useEffect(() => {
		const prepare = async () => {
			try {
				await initializeAppConfig()
			} catch (e) {
				console.error('Error during initialization:', e)
			}
		}
		prepare()
	}, [initializeAppConfig])

	/* Use efect for required updates and OTA */
	useEffect(() => {
		// Solo verificamos actualizaciones
		checkForUpdates()

		const subscription = AppState.addEventListener('change', (nextAppState) => {
			if (nextAppState === 'active') {
				checkForUpdates()
			}
		})

		return () => subscription.remove()
	}, [])

	if (isLoading || !appIsReady) {
		return null
	}

	if (!session) {
		return <Redirect href="/(auth)/login" />
	}
	
	const bottomBarHeight = () => {
		if (Platform.OS === 'android') {
			return insets.bottom
		}
		return 0
	}
	
	return (
		<PlayerProvider key={forceRerender}>
			<SafeAreaProvider>
				<GestureHandlerRootView style={{ flex: 1,paddingBottom: bottomBarHeight() }}>
					<Stack
						screenOptions={{
							headerShown: false,
							animation: 'fade',
						}}
					>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen
							name="new-player"
							options={{
								headerShown: false,
								presentation: 'transparentModal',
								gestureEnabled: Platform.OS === 'ios',
								gestureDirection: 'vertical',
								animationDuration: 400,
								animation: Platform.select({
									ios: 'slide_from_bottom',
									android: 'slide_from_bottom',
								}),
								...StackScreenTopBar,
								headerTitle: '',
								contentStyle: {
									backgroundColor: 'transparent',
								},
								headerLeft: () => (
									<FontAwesome6
										name="chevron-down"
										size={20}
										color={colors.screenBackground}
										style={{ marginHorizontal: 14 }}
										onPress={() => router.back()}
									/>
								),
							}}
						/>
						<Stack.Screen
							name="(modals)/forms/questionsForm"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								// headerShown: true,
								// ...StackScreenTopBar,
							}}
						/>
						<Stack.Screen
							name="(modals)/forms/userPersonalDataForm"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								headerShown: true,
								...StackScreenTopBar,
								headerTitle: 'Editar mi perfil',
								headerLeft: () => (
									<TouchableOpacity onPress={() => router.back()}>
										<View
											style={{
												width: 50,
												height: 50,
												justifyContent: 'center',
												alignItems: 'center',
												marginRight: 10,
												borderRadius: 10,
											}}
										>
											<FontAwesome5
												name="chevron-left"
												size={20}
												color={colors.text}
												style={{ marginHorizontal: 14 }}
											/>
										</View>
									</TouchableOpacity>
								),
								headerRight: () => null,
							}}
						/>
						<Stack.Screen
							name="(modals)/forms/userPersonalDataFormInitial"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								headerShown: false,
								// ...StackScreenTopBar,
							}}
						/>
						<Stack.Screen
							name="(modals)/RequestInfoPage"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								// headerShown: true,
								// ...StackScreenTopBar,
							}}
						/>
						<Stack.Screen
							name="(modals)/hypnosisDataForm"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								// headerShown: true,
								// ...StackScreenTopBar,
							}}
						/>
						<Stack.Screen
							name="(modals)/hypnosisBottomSheetScreen"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								// headerShown: true,
								// ...StackScreenTopBar,
							}}
						/>
						<Stack.Screen
							name="(modals)/postHypnosis"
							options={{
								presentation: 'fullScreenModal',
								animation: 'slide_from_bottom',
								headerShown: false,
							}}
						/>
					</Stack>
					{/* Solo usar StickyPlayer - comentar NewFloatingPlayer para evitar duplicación */}
					{/* {(isFloatingPlayerVisible && isConnected) && (
						<NewFloatingPlayer
							style={{
								position: 'absolute',
								bottom: Platform.OS === 'android' ? 70 : 80,
								left: 0,
								right: 0,
							}}
						/>
					)} */}
					 <StickyPlayer />
					<GlobalPlayerOverlay />
					<StatusBar style="light" backgroundColor="transparent" translucent={true} />
				</GestureHandlerRootView>
				<UpdateModal />
			</SafeAreaProvider>
		</PlayerProvider>
	)
}
