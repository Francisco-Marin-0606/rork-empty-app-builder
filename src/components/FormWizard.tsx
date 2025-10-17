import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	KeyboardAvoidingView,
	TouchableWithoutFeedback,
	Keyboard,
	Platform,
	Dimensions,
	LayoutChangeEvent,
	Modal,
	Animated,
} from 'react-native'
import FormInput from './FormInput'
import { FormStep, WizardFormData } from '../helpers/types'
import CustomButton from './CustomButton'
import { colors, fontSize, screenPadding } from '@/constants/tokens'
import { FormSuccessScreen } from './SuccessScreen'
import { ErrorScreen } from './ErrorScreen'
import ProgressSteps from './ProgressSteps'
import QuestionNavigator from './QuestionNavigator'
import Markdown from 'react-native-markdown-display'
import { Video, ResizeMode } from 'expo-av'
import { router } from 'expo-router'
import { useFormCache } from '@/hooks/useFormCache'
import HypnosisReadyScreen from './HypnosisReadyScreen'
import PaywallScreen from './PaywallScreen'
import { UserService } from '@/services/api/userService'
import { BASE_URL } from '@/services/api/config'
import axios from 'axios'
import Constants from 'expo-constants'

const height = Dimensions.get('window').height;
const availableHeightForInput = height - (Platform.OS === 'ios' ? 290 : 200);

// USER PROFILE STEP (optional append for onboarding)
const USER_PROFILE_STEP: FormStep = {
	title: 'Estas preguntas\nno son raras.',
	description: '',
	fields: [
		{
			name: 'userName',
			label: '¿Cómo quieres que te llame?',
			type: 'onlytextrestricted',
			description:
				'Escríbelo como se lee, y si tiene algún acento raro, márcalo. (Que no es lo mismo Julián, que Julian o Yulian)',
			placeholder: 'Escríbelo aquí...',
			maxLength: 15,
			minLength: 2,
			inputPaddingHorizontal: 16,
			textAlignVertical: 'top',
			hideBorder: true,
			hideMaxLength: true,
			showMicrophone: false,
		},
		{
			name: 'gender',
			label: 'Eres...',
			type: 'segmentedRadio',
			showMicrophone: false,
			hideMaxLength: true,
			options: [
				{ label: 'Hombre', value: 'Hombre' },
				{ label: 'Mujer', value: 'Mujer' },
			],
		},
		{
			name: 'email',
			label: 'Tu correo electrónico',
			type: 'email',
			inputPaddingHorizontal: 16,
			hideBorder: true,
			hideMaxLength: true,
			placeholder: 'Escribe tu correo aquí...',
			maxLength: 50,
			minLength: 10,
			showMicrophone: false,
		},
		{
			name: 'birthDate',
			label: 'Fecha de nacimiento',
			type: 'date',
			placeholder: 'DD / MM / AA',
			showMicrophone: false,
			hideMaxLength: true,
		},
	],
}

interface FormWizardProps {
	steps: FormStep[]
	onComplete: (formData: WizardFormData) => Promise<boolean>
	onCancel: () => void
	// Theming (optional)
	themeColors?: {
		background: string
		text: string
		textMuted: string
		border: string
		inputBackground: string
		inputBorder: string
		buttonBackground: string
		buttonText: string,
		inputText: string,
	}
	confirmModalTitle?: string
	confirmModalDescription?: string
	confirmButtonTitle?: string
	cancelButtonTitle?: string
	confirmButtonColor?: string
	cancelButtonColor?: string
	// --- Speech recognition props ---
	formData?: WizardFormData
	onFieldChange?: (fieldName: string, value: string) => void
	onSpeechStart?: (fieldName: string) => Promise<void>
	onSpeechStop?: () => Promise<void>
	onSpeechCancel?: () => Promise<void>
	isListening?: boolean
	activeSpeechField?: string | null
	// --- Cache props ---
	formId?: string
	// --- Onboarding specific (optional) ---
	appendUserProfileStep?: boolean
	onboardingMode?: boolean
	validateEmail?: boolean
	showConfirmation?: boolean
}

const FormWizard: React.FC<FormWizardProps> = ({
	steps,
	onComplete,
	onCancel,
	themeColors,
	confirmModalTitle = 'Estas son las respuestas que quieres enviar, ¿cierto?',
	confirmModalDescription = 'Una vez enviadas, no podrás cambiarlas.',
	confirmButtonTitle = 'Enviar sin miedo',
	cancelButtonTitle = 'Revisar respuestas',
	confirmButtonColor,
	cancelButtonColor,
	// --- Speech recognition props ---
	formData: externalFormData,
	onFieldChange,
	onSpeechStart,
	onSpeechStop,
	onSpeechCancel,
	isListening = false,
	activeSpeechField = null,
	// --- Cache props ---
	formId = 'form_wizard',
	// --- Onboarding specific (optional) ---
	appendUserProfileStep = false,
	onboardingMode = false,
	validateEmail = true,
	showConfirmation = true,
}) => {
	// Reemplaza estados locales con cache
	const {
		formData: cachedFormData,
		currentStep,
		isLoadingCache,
		updateFormData,
		updateCurrentStep,
		clearCache
	} = useFormCache({ formId })
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [showSuccess, setShowSuccess] = useState(false)
	const [showError, setShowError] = useState(false)
	const [keyboardVisible, setKeyboardVisible] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showQuestionNavigator, setShowQuestionNavigator] = useState(false)
	const [showConfirmModal, setShowConfirmModal] = useState(false)
	const [keyHeight, setKeyboardHeight] = useState(0)
	const [showVideo, setShowVideo] = useState(false)
	const [showLoadingScreen, setShowLoadingScreen] = useState(false)
	// Onboarding flow state
	const [showHypnosisReady, setShowHypnosisReady] = useState(false)
	const [showPaywall, setShowPaywall] = useState(false)

	const videoRef = useRef<Video>(null)

	useEffect(() => {
		if (Platform.OS === 'android' && showVideo) {
			videoRef.current?.playAsync();
		}
	}, [showVideo]);

	// Animación para el desplazamiento vertical
	const contentShiftAnimation = useRef(new Animated.Value(0)).current

	// Refs/estado para lógica de teclado similar a OnBoarding
	const inputRefs = useRef<Record<string, { y: number }>>({})
	const [contentHeight, setContentHeight] = useState(0)

	// Use external formData if provided, otherwise use cached state
	const currentFormData = useMemo(() => ({
		...(cachedFormData || {}),
		...(externalFormData || {}),
	}), [cachedFormData, externalFormData])

	// Build steps possibly appending user profile step
	const allSteps = useMemo(() => {
		return appendUserProfileStep ? [...steps, USER_PROFILE_STEP] : steps
	}, [steps, appendUserProfileStep])

	// Sincronizar cambios provenientes del contenedor externo al caché
	useEffect(() => {
		if (!externalFormData) return
		const entries = Object.entries(externalFormData)
		if (entries.length === 0) return
		entries.forEach(([key, value]) => {
			// Evitar sobrescribir con undefined
			if (value === undefined) return
			if (cachedFormData?.[key] !== value) {
				updateFormData(key, value)
			}
		})
	}, [externalFormData, cachedFormData, updateFormData])

	// SIMPLIFIED: Remove complex animations that cause keyboard issues
	const scrollViewRef = useRef<ScrollView>(null)
	const [inputHeight, setInputHeight] = useState(0)

	// Manejo de layout para calcular altura mínima y facilitar scroll (paridad con OnBoarding)
	const handleLayout = (fieldName: string) => (event: LayoutChangeEvent) => {
		const { y } = event.nativeEvent.layout
		inputRefs.current[fieldName] = { y }
	}
	const handleContentLayout = (event: LayoutChangeEvent) => {
		setContentHeight(event.nativeEvent.layout.height)
		// Si es el último paso, asegurar posición inicial arriba
		
		if (isLastStep && onboardingMode) {
			scrollViewRef.current?.scrollTo({ y: 0, animated: true })
		}
	}

	useEffect(() => {
		scrollViewRef.current?.scrollTo({ y: 0, animated: true })
	}, [currentStep])

	// Auto-scroll when input content changes
	useEffect(() => {
		if (keyboardVisible && inputHeight > 0) {
			// Scroll to bottom when input expands with a slight delay for smooth animation
			const timeoutId = setTimeout(() => {
				scrollViewRef.current?.scrollToEnd({ animated: true })
			}, 150)

			return () => clearTimeout(timeoutId)
		}
	}, [inputHeight, keyboardVisible])

	// Add keyboard listeners with animations
	useEffect(() => {
		const keyboardWillShowListener = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			(event) => {
				setKeyboardVisible(true)
				setKeyboardHeight(event.endCoordinates.height)
				// Animar sutilmente (paridad con OnBoarding)
				const duration = 1
				Animated.timing(contentShiftAnimation, {
					toValue: 0,
					duration: duration,
					useNativeDriver: true,
				}).start(() => {
					setTimeout(() => {
                        if(onboardingMode){
								if (!isLastStep && onboardingMode) {
							scrollViewRef.current?.scrollToEnd({ animated: true })
						}else{
							scrollViewRef.current?.scrollTo({ animated: true });	
					    }
						}else{
						scrollViewRef.current?.scrollToEnd({ animated: true })
						}
					}, 1)
				})
			},
		)
		const keyboardWillHideListener = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			(event) => {
				setKeyboardVisible(false)
				setKeyboardHeight(0)
				const duration = 1
				Animated.timing(contentShiftAnimation, {
					toValue: 0,
					duration: duration,
					useNativeDriver: true,
				}).start()
			},
		)

		return () => {
			keyboardWillShowListener.remove()
			keyboardWillHideListener.remove()
		}
	}, [])

	const handleInputChange = useCallback(
		(fieldName: string, value: any) => {
			// Actualiza cache siempre
			updateFormData(fieldName, value)
			// Notifica al controlador externo si existe
			if (onFieldChange) {
				onFieldChange(fieldName, value)
			}
			// Limpiar el error cuando el usuario empiece a escribir
			if (errors[fieldName]) {
				setErrors((prev) => {
					const newErrors = { ...prev }
					delete newErrors[fieldName]
					return newErrors
				})
			}
		},
		[errors, onFieldChange, updateFormData],
	)

	// Improved handleInputFocus function with animation
	const handleInputFocus = (fieldName: string) => {
		setTimeout(() => {
			// Animar el contenido hacia arriba
			Animated.timing(contentShiftAnimation, {
				toValue:  0,
				duration: 1,
				useNativeDriver: true,
			}).start(() => {
				// Después de la animación, hacer scroll según último paso
				setTimeout(() => {
					if (onboardingMode) {
						if (!isLastStep) {
							scrollViewRef.current?.scrollToEnd({ animated: true })
						} else {
							scrollViewRef.current?.scrollTo({ y: fieldName === 'email' ? 350 : 100, animated: true })
						}
					} else {
						scrollViewRef.current?.scrollToEnd({ animated: true })
					}
				}, 50)
			})
		}, 1)
	}


	const validateCurrentStep = (): boolean => {
		const currentStepFields = allSteps[currentStep]?.fields || []
		const newErrors: Record<string, string> = {}
		let isValid = true

		currentStepFields.forEach((field) => {
			// Skip validation for optional fields
			if (field.optional) {
				return
			}

			const value = currentFormData[field.name]
			const stringValue = String(value || '')

			if (!stringValue.trim()) {
				newErrors[field.name] = 'Este campo es obligatorio'
				isValid = false
			} else if (field.minLength && stringValue.length < field.minLength) {
				newErrors[field.name] = `Mínimo ${field.minLength} caracteres`
				isValid = false
			} else if (field.maxLength && stringValue.length > field.maxLength) {
				newErrors[field.name] = `Máximo ${field.maxLength} caracteres`
				isValid = false
			}
		})

		setErrors(newErrors)
		return isValid
	}

	const heightInput = (): number => {
		// Reducir más espacio para dar lugar a los botones cuando el teclado está activo
		const extraSpaceForButtons = 30 // Espacio adicional para botones, micrófono y contador
		return availableHeightForInput - keyHeight - extraSpaceForButtons;
	}

	const handleSubmitForm = async () => {
		if (isSubmitting) return // Prevenir múltiples envíos

		// Ensure all optional empty fields have an empty string
		const submissionFormData = { ...(cachedFormData || {}), ...(externalFormData || {}) }
		allSteps.forEach((step) => {
			step.fields.forEach((field) => {
				if (
					field.optional &&
					(submissionFormData[field.name] === undefined || submissionFormData[field.name] === null)
				) {
					submissionFormData[field.name] = ''
				}
			})
		})

		setIsSubmitting(true)
		setShowLoadingScreen(true)

		try {
			const response = await onComplete(submissionFormData)
			if (response) {
				// Limpiar cache al completar con éxito
				await clearCache()
				// Mostrar pantalla de éxito cuando la respuesta es true
				setShowSuccess(true)
			} else {
				// Mostrar pantalla de error cuando la respuesta es false
				setShowError(true)
			}
		} catch (error) {
			console.error('Error al enviar el formulario:', error)
			// Mostrar pantalla de error en caso de excepción
			setShowError(true)
		} finally {
			setIsSubmitting(false)
			setShowLoadingScreen(false)
		}
	}

	const handleVideoEnd = () => {
		setShowVideo(false)
		handleSubmitForm()
	}

	const handleNext = async () => {
		if (!validateCurrentStep()) {
			return
		}

		const isLast = currentStep === allSteps.length - 1

		if (isLast) {
			// Onboarding: validate email before confirmation
			if (onboardingMode && validateEmail) {
				setIsSubmitting(true)
				try {
					const email = currentFormData.email
					if (email) {
						const emailExists = await UserService.emailExist(String(email).toLowerCase())
						await axios.post(`${BASE_URL}user/onboardingMailRegister`, { 
							email,
							language: 'es'
						})
						if (emailExists) {
							setErrors((prev) => ({ ...prev, email: 'Este correo ya está registrado, inicia sesión.' }))
							setIsSubmitting(false)
							return
						}
					}
				} catch (error) {
					console.error('Error verificando email:', error)
				} finally {
					setIsSubmitting(false)
				}
			}

			// Show confirmation modal instead of submitting directly
			if (showConfirmation) {
				setShowConfirmModal(true)
			} else {
				// Skip confirmation
				if (onboardingMode) {
					setShowHypnosisReady(true)
				} else {
					setShowVideo(true)
				}
			}
		} else {
			await updateCurrentStep(currentStep + 1)
		}
	}

	const handleBack = async () => {
		if (currentStep === 0) {
			onCancel()
		} else {
			await updateCurrentStep(currentStep - 1)
		}
	}

	const handleCloseSuccess = () => {
		setShowSuccess(false)
		onCancel()
	}

	const handleCloseError = () => {
		setShowError(false)
	}

	// Validación de seguridad para el paso actual
	const currentStepIndex = Math.min(Math.max(0, currentStep), allSteps.length - 1)
	const currentStepData = allSteps[currentStepIndex]
	const currentStepFields = currentStepData?.fields || []
	const isLastStep = currentStepIndex === allSteps.length - 1

	const getCharacterCount = (value: any): number => {
		if (value == null) return 0
		return String(value).length
	}

	// Verificar si el paso actual está completo
	const isCurrentStepValid = useMemo(() => {
		return currentStepFields.every((field) => {
			// Skip validation for optional fields
			if (field.optional) return true
			const value = String(currentFormData[field.name] || '').trim()

			// Validar que haya texto
			if (value.length === 0) return false

			// Validar límite máximo de caracteres (por defecto 500)
			const maxLength = field.maxLength || 500
			if (value.length > maxLength) return false

			return true
		})
	}, [currentStepFields, currentFormData])

	const handleSelectQuestion = async (index: number) => {
		await updateCurrentStep(index)
	}

	// Onboarding rendering branches
	const handleHypnosisReadyContinue = () => {
		setShowHypnosisReady(false)
		setShowPaywall(true)
	}
	const handlePaywallBack = () => {
		setShowPaywall(false)
	}
	const handlePaywallComplete = () => {
		setShowPaywall(false)
	}

	if (showSuccess) {
		return <FormSuccessScreen onClose={() => router.back()} />
	}

	if (showError) {
		return (
			<ErrorScreen
				onClose={handleCloseError}
				errorTitle="Es broma, algo falló en el sistema. Intenta de nuevo."
				errorMessage="Sí, ya sé… tienes que escribir todo otra vez. Pero si pasó, es por algo. Confía."
				buttonTitle="Volver"
			/>
		)
	}

	// Esperar a que cargue el cache antes de renderizar el formulario
	if (isLoadingCache) {
		return <View style={styles.loadingContainer}></View>
	}

	if (showLoadingScreen) {
		return <View style={styles.loadingContainer}></View>
	}

	if (onboardingMode && showPaywall) {
		return (
			<PaywallScreen
				onComplete={handlePaywallComplete}
				onBack={handlePaywallBack}
				formData={currentFormData}
			/>
		)
	}

	if (onboardingMode && showHypnosisReady) {
		return (
			<HypnosisReadyScreen
				onContinue={handleHypnosisReadyContinue}
				onComplete={onComplete}
				formData={currentFormData}
			/>
		)
	}

	if (showVideo) {
		return (
			<View style={styles.videoContainer}>
				<Video
					ref={videoRef}
					style={styles.video}
					source={require('@/assets/Images/enviar_respuestas.mp4')}
					useNativeControls={false}
					resizeMode={ResizeMode.COVER}
					shouldPlay
					isLooping={false}
					onPlaybackStatusUpdate={(status) => {
						if (status.isLoaded && status.didJustFinish) {
							handleVideoEnd()
						}
					}}
				/>
			</View>
		)
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={[
				styles.keyboardAvoidingView,
				{ backgroundColor: themeColors?.background || colors.formBackground },
			]}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : (keyboardVisible ? 50 : 0)}
			enabled={true}
		>
			<View
				style={{ flex: 1, backgroundColor: themeColors?.background || colors.formBackground, paddingTop: Constants.statusBarHeight }}
			>
				<View style={styles.mainContainer}>
					{/* FIXED: Remove animated transform that interferes with keyboard */}
					{!onboardingMode && (
						<Animated.View
							style={[
								styles.progressContainer,
								{ transform: [{ translateY: contentShiftAnimation }] },
								{ backgroundColor: themeColors?.background || colors.formBackground },
							]}
						>
							<ProgressSteps
								totalSteps={allSteps.length}
								currentStep={currentStep}
								onViewAllPress={() => setShowQuestionNavigator(true)}
							/>
						</Animated.View>
					)}

					<ScrollView
						ref={scrollViewRef}
						style={[
							styles.scrollView,
							{ backgroundColor: themeColors?.background || colors.formBackground },
						]}
						contentContainerStyle={[
							styles.scrollViewContent, 
							{ minHeight: contentHeight },
							onboardingMode && { paddingTop: 40 }
						]}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={true}
						alwaysBounceVertical={true}
						overScrollMode="always"
						scrollEnabled={true}
						bounces={Platform.OS === 'ios'}
						scrollEventThrottle={16}
					>
						<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
							<Animated.View
								style={[
									styles.contentContainer,
									{ transform: [{ translateY: contentShiftAnimation }] },
								]}
								onLayout={handleContentLayout}
							>
								{/* Hide title and description when keyboard is visible for cleaner UI */}

								<View style={{ flex: 0 }}>
									{currentStepData?.title && (
										<View style={styles.titleContainer}>
											{currentStepData.header && (
												<Text
													style={[
														styles.optionalLabel,
														{ color: themeColors?.textMuted || colors.textMuted },
													]}
												>
													{currentStepData.header}
												</Text>
											)}
											{currentStepData.title.split('\n').map((textPart, index) =>
												textPart.trim() ? (
													<View key={`title-part-${index}`}>
														<Text
															maxFontSizeMultiplier={1}
															style={[
																styles.stepTitle,
																{ color: themeColors?.text || colors.formTitle },
															]}
														>
															{textPart}
														</Text>
													</View>
												) : null,
											)}
										</View>
									)}

									{currentStepData?.description && (
										<View
											style={[
												styles.descriptionContainer,
												{ borderColor: themeColors?.border || 'rgba(255, 255, 255, 0.3)' },
											]}
										>
											<Markdown style={markdownStyles(themeColors)}>{currentStepData.description}</Markdown>
										</View>
									)}
								</View>
								<View style={[styles.fieldsContainer, { flex: 1}]}>

									{currentStepFields.map((field) => (
										<View
											key={field.name}
											style={styles.fieldWrapper}
											onLayout={handleLayout(field.name)}
										>
											<FormInput
												{...field}
												value={currentFormData[field.name] ?? ''}
												onChange={(value) => handleInputChange(field.name, value)}
												error={errors[field.name]}
                                                onFocus={ ()=>handleInputFocus(field.type)}
                                                inputBackgroundColor={onboardingMode ? (themeColors ? (isLastStep ? '#1A1A1A' : themeColors.inputBackground || '#0A0A0A') : (isLastStep ? '#dbdbdb' : 'white')) : (themeColors && themeColors.inputBackground)}
												inputTextColor={themeColors ? themeColors.inputText || '#FFFFFF' : 'black'}
												labelColor={themeColors ? themeColors.text || '#FFFFFF' : 'black'}
												hideBorder={field.hideBorder || false}
												inputPaddingHorizontal={field.inputPaddingHorizontal || 0}
												inputBorderColor={themeColors ? themeColors.inputBorder || '#333333' : 'black'}
												inputHeight={onboardingMode? (isLastStep ? 'auto' : '100%') :'100%'}
												inputHeightMin={(onboardingMode && isLastStep) ?null: ( keyboardVisible ? heightInput() : null)}
												showLabel={onboardingMode ? (isLastStep ? true : false) : false}
												themeColors={themeColors}
												isListening={isListening}
												activeSpeechField={activeSpeechField}
												onSpeechStart={
													onSpeechStart ? async () => await onSpeechStart(field.name) : undefined
												}
												onSpeechStop={onSpeechStop}
												onSpeechCancel={onSpeechCancel}
												showMicrophone={onboardingMode && isLastStep ? false : true}
											/>
											{field.hideMaxLength !== true &&
												field.type !== 'date' &&
												field.type !== 'segmentedRadio' && (
													<Text
														maxFontSizeMultiplier={1.1}
														style={[
															styles.characterCount,
															getCharacterCount(currentFormData[field.name]) >
															(field.maxLength || 500) && { color: '#FF3B30' },
														]}
													>
														{getCharacterCount(currentFormData[field.name])}/
														{field.maxLength || 500}
													</Text>
												)}
										</View>
									))}

									{/* Resto del contenido */}
								</View>
							</Animated.View>
						</TouchableWithoutFeedback>
					</ScrollView>

					{/* FIXED: Better button positioning */}
					<View
						style={[
							styles.buttonContainer,
							{
								backgroundColor: themeColors?.background || colors.formBackground,
								paddingBottom: keyboardVisible ? 5 : 30, // Reducir significativamente cuando el teclado está visible
							},
						]}
					>
						<CustomButton
							title={isLastStep ? 'Enviar' : 'Siguiente'}
							handlePress={handleNext}
							containerStyles={[
								styles.button,
								styles.nextButton,
								!isCurrentStepValid && styles.disabledButton,
								isCurrentStepValid && themeColors?.buttonBackground
									? { backgroundColor: themeColors.buttonBackground }
									: null,
							]}
							textStyles={{ color: themeColors?.buttonText || colors.formNextButtonText }}
							disabled={!isCurrentStepValid || isSubmitting}
							isLoading={isLastStep && isSubmitting}
							indicatorColor={colors.primary}
						/>
						<CustomButton
							title="Atrás"
							handlePress={handleBack}
							containerStyles={[styles.button, styles.backButton]}
							textStyles={styles.backButtonText}
							indicatorColor={colors.primary}
						/>
					</View>
				</View>
			</View>

			{/* Confirmation Modal */}
			<Modal
				animationType="fade"
				transparent={true}
				visible={showConfirmModal}
				onRequestClose={() => setShowConfirmModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<View style={styles.titleContainer}>
							<Text maxFontSizeMultiplier={1.1} style={styles.modalTitle}>
								¿Todo listo?
							</Text>
						</View>
						<View style={styles.modalButtonContainer}>
							<CustomButton
								title={confirmButtonTitle || (onboardingMode ? 'Continuar' : 'Enviar mis respuestas')}
								handlePress={() => {
									setShowConfirmModal(false)
									if (onboardingMode) {
										setShowHypnosisReady(true)
									} else {
										setShowVideo(true)
									}
								}}
								containerStyles={styles.modalConfirmButton}
								textStyles={styles.modalConfirmButtonText}
								isLoading={isSubmitting}
								disabled={isSubmitting}
							/>
							<CustomButton
								handlePress={() => setShowConfirmModal(false)}
								containerStyles={styles.modalCancelButton}
								title={cancelButtonTitle || 'Revisar respuestas'}
								textStyles={{ color: colors.tertiary }}
							></CustomButton>
						</View>
					</View>
				</View>
			</Modal>

			<QuestionNavigator
				isVisible={showQuestionNavigator}
				onClose={() => setShowQuestionNavigator(false)}
				steps={allSteps}
				currentStepIndex={currentStep}
				onSelectQuestion={handleSelectQuestion}
			/>
		</KeyboardAvoidingView>
	)
}

const markdownStyles = (themeColors?: any) => ({
	body: {
		lineHeight: 25,
		fontSize: fontSize.sm,
		color: themeColors?.border || 'rgba(255, 255, 255, 0.3)', // Usar themeColors.border para consistencia
		letterSpacing: -0.5,
	},
	italic: {
		fontFamily: 'Inter-Italic',
	},
	normal: {
		fontFamily: 'Inter',
	},
	bold: {
		fontFamily: 'Inter-Bold',
	},
})

const styles = StyleSheet.create({
	keyboardAvoidingView: {
		flex: 1,
		backgroundColor: 'transparent', // Se sobrescribe con themeColors
	},
	mainContainer: {
		flexDirection: 'column',
		flex: 1,
	},
	scrollView: {
		flex: 1,
		width: '100%',
		backgroundColor: 'transparent', // Se sobrescribe con themeColors
	},
	scrollViewContent: {
		flexGrow: 1,
		width: '100%',
		justifyContent: 'flex-start',
		paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
		paddingBottom: 20,  // ← Fijo, no cambia
		paddingTop: 0,      // ← Fijo, no cambia
	},
	contentContainer: {
		paddingBottom: 16,
		flex: 1,
		flexDirection: 'column',
	},
	stepTitle: {
		fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
		letterSpacing: -2.5,
		color: colors.formTitle,
		textAlign: 'left',
		fontSize: fontSize['3xl'],
		lineHeight: Platform.OS === 'android' ? fontSize['3xl'] * 1.2 : fontSize['3xl'] * 1.1,
		paddingTop: fontSize['3xl'] - fontSize['3xl'] * 0.75,
	},
	descriptionContainer: {
		borderLeftWidth: 1.5,
		borderColor: 'rgba(255, 255, 255, 0.3)', // Color por defecto, se sobrescribe con themeColors
		paddingLeft: 16,
		marginTop: 4, // Pequeño margen superior para separación mínima
		marginBottom: 2, // Margen inferior reducido de 16px a 8px
	},
	stepDescription: {
		fontSize: fontSize.sm,
		fontFamily: 'Geist-Regular',
		color: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para subtítulos
	},
	fieldsContainer: {
		flex: 1,
		paddingTop: 1, // Reducido de 16px a 8px para acercar más la descripción al input
	},
	fieldWrapper: {
		marginBottom: 16,
		flex: 1,
	},
	characterCountContainer: {
		position: 'absolute',
		bottom: 12,
		right: 0,
	},
	characterCount: {
		fontSize: fontSize.xs || 12,
		color: colors.textMutedVisible,
		textAlign: 'right',
		paddingRight: 4,
	},
	errorText: {
		fontSize: fontSize.xs || 12,
		color: colors.error || '#FF3B30',
		marginTop: 4,
		marginLeft: 4,
	},
	buttonContainer: {
		flexDirection: 'column',
		backgroundColor: 'transparent', // Se sobrescribe con themeColors
		paddingHorizontal:
			Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
		paddingTop: 5, // Cambiado de 20 a 10 para acercar más los botones al input
		marginBottom: 100, // flag - Ajustado el 29/09/2025 de 108 a 92 para mejorar posicionamiento de botones
		width: '100%',
	},
	button: {
		flex: 1,
		minHeight: 55,
		borderRadius: 12,
		padding: 0,
	},
	backButton: {
		backgroundColor: colors.formBackButton || 'transparent',
	},
	nextButton: {
		backgroundColor: colors.formNextButton || 'black',
	},
	disabledButton: {
		backgroundColor: '#808080',
	},
	progressContainer: {
		marginTop: 10, // Reducido de 10 a 5 para acercar más el contador al input
		marginBottom: 0,
		backgroundColor: colors.formBackground,
		zIndex: 1,
		width: '50%',
		alignSelf: 'center',
	},
	titleContainer: {
		flexDirection: 'column',
		marginBottom: 24, // Reducido de 48px a 24px (50% menos)
	},
	seeAllText: {
		color: colors.primary,
		fontSize: fontSize.sm,
		fontFamily: 'Geist-SemiBold',
		fontWeight: '600',
	},
	optionalLabel: {
		color: colors.textMutedVisible,
		fontSize: fontSize.sm,
		marginBottom: 4,
		fontFamily: 'Geist-Regular',
	},
	// Modal styles
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgb(0, 0, 0)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContainer: {
		backgroundColor: 'black',
		borderRadius: 16,
		padding: 20,
		width: '100%',
		maxWidth: 400,
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
	},
	modalTitle: {
		fontFamily: 'Geist-SemiBold',
		fontSize: 48,
		color: 'white',
		textAlign: 'center',
		letterSpacing: -1.5,
	},
	modalButtonContainer: {
		position: 'absolute',
		bottom: 0,
		width: '100%',
		gap: 8,
		marginBottom: Platform.OS === 'ios' ? 12 : 0, // flag - Ajustado el 29/09/2025 de 20 a 4 para mejorar posicionamiento del modal de confirmación
	},
	modalConfirmButton: {
		borderRadius: 12,
		minHeight: 55,
		backgroundColor: '#F2741B',
		width: '96%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 0,
		paddingHorizontal: 0,
		paddingVertical: 0,
		alignSelf: 'center',
	},
	modalConfirmButtonText: {
		color: 'white',
		fontWeight: '600',
	},
	modalCancelButton: {
		width: '96%',
		backgroundColor: 'transparent',
		borderRadius: 12,
		minHeight: 55,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 0,
		paddingHorizontal: 0,
		paddingVertical: 0,
		alignSelf: 'center',
		marginTop: -10,
	},
	modalCancelButtonText: {
		color: 'white',
		fontSize: fontSize.sm,
		fontFamily: 'Geist-Regular',
	},
	backButtonText: {
		color: 'white',
	},
	videoContainer: {
		flex: 1,
		backgroundColor: 'black',
		justifyContent: 'center',
		alignItems: 'center',
	},
	video: {
		width: '100%',
		height: '100%',
	},
	skipButton: {
		position: 'absolute',
		bottom: 40,
		right: 20,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
	},
	skipButtonText: {
		color: 'white',
		fontFamily: 'Geist-Regular',
		fontSize: fontSize.sm,
	},
	loadingContainer: {
		flex: 1,
		backgroundColor: 'black',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		color: 'white',
		fontSize: fontSize.lg,
		fontFamily: 'Geist-Regular',
		marginTop: 20,
		textAlign: 'center',
	},
})

export default FormWizard