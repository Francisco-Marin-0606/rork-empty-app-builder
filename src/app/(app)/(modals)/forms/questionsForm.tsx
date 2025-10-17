import { View, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import FormWizard from '@/components/FormWizard'
import { FormStep, WizardFormData, FormField } from '../../../../helpers/types'
import { colors } from '@/constants/tokens'
import { useEffect, useState, useCallback, useRef } from 'react'
import { FormQuestionsService } from '@/services/api/formQuestionsService'
import { useAuthStore, useRequestHipnosisStore } from '@/store/authStore'
import LoadingContainer from '@/components/LoadingWrapperComponent'
import { interpolateText } from '@/helpers/miscellaneous'
import { AudioRequest, AudioRequestService } from '@/services/api/audioRequestService'
import Modal from '@/components/Modal'
import { ResizeMode, Video } from 'expo-av'
import enviarRespuestasVideo from '@/assets/Images/enviar_respuestas.mp4'
import { usePlayerStore } from '@/store/playerStore'
import { useHypnosisProcessStore } from '@/store/hypnosisProcessStore'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useNewLibraryStore } from '@/store/newLibrary'

interface FormQuestions {
	_id: string
	month: string
	year: string
	questions: Question[]
}

interface Question {
	question: string
	description: string
	referenceQuestion: string
	type?: 'input' | 'radio-button'
	options?: {
		id: string
		label: string
		value: string
	}[]
	customizable?: boolean
	templateHandler?: boolean
	optional?: boolean
	header?: string
}

type FormattedQuestion = Omit<FormStep, 'fields'> & {
	fields: FormField[]
}

// Dark mode colors fixed (scoped to this form)
const darkColors = {
	background: '#0A0A0A',
	text: '#FFFFFF',
	textMuted: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para subtítulos y líneas laterales
	border: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para líneas laterales
	inputBackground: '#0A0A0A',
	inputText: '#FFFFFF',
	inputBorder: '#333333',
	buttonBackground: '#F2741B',
	buttonText: '#FFFFFF',
}

export default function QuestionsFormModal() {
	const { steps } = useLocalSearchParams<{ steps: string }>()
	const formSteps: FormStep[] = JSON.parse(steps || '[]')
	const router = useRouter()
	const { userId, userData } = useAuthStore()
	const { setRequestHipnosis } = useRequestHipnosisStore()

	const [formattedQuestions, setFormattedQuestions] = useState<FormStep[]>([])
	const [originalQuestions, setOriginalQuestions] = useState<Question[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showSendingVideo, setShowSendingVideo] = useState(false)
	const [videoStatus, setVideoStatus] = useState({})

	// --- State for the Form and Speech Recognition ---
	const [formData, setFormData] = useState<WizardFormData>({})
	const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null)
	const { text, partialText, isListening, startListening, stopListening, resetText } = useSpeechRecognition()
	const setIsFloatingPlayerVisible = usePlayerStore((state) => state.setIsFloatingPlayerVisible)
	const speechBaseRef = useRef<string>('')
	const appliedFinalOnceRef = useRef<boolean>(false)
	const lastAppliedValueRef = useRef<string>('')

	const dedupeConsecutiveWords = (s: string): string => {
		if (!s) return s
		return s
			.replace(/\s+/g, ' ')
			.replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1')
			.trim()
	}

	// Cerrar el modal de "Pedir hipnosis" cuando se abre el formulario
	useEffect(() => {
		setRequestHipnosis(false)
	}, [setRequestHipnosis])

	// Debug log para el estado de isListening
	console.log('🎤 QuestionsForm - isListening:', isListening, 'text:', text)

	// Monitorear cambios en isListening
	useEffect(() => {
		console.log('🎤 QuestionsForm - isListening changed to:', isListening)
	}, [isListening])

	// --- EFFECT TO CONNECT SPEECH TO FORM ---
	useEffect(() => {
		console.log(
			'🎤 QuestionsForm - useEffect triggered - isListening:',
			isListening,
			'text:',
			text,
			'activeSpeechField:',
			activeSpeechField,
		)
		
		// Durante la escucha: render en tiempo real con parcial (sin concatenar)
		if (isListening && partialText && activeSpeechField) {
			setFormData((prevData) => ({
				...prevData,
				[activeSpeechField]: dedupeConsecutiveWords(partialText.trim()),
			}))
			lastAppliedValueRef.current = dedupeConsecutiveWords(partialText.trim())
		}

		// Al finalizar: usar SOLO el resultado FINAL `text` y aplicarlo una sola vez
		if (!isListening && text && activeSpeechField && !appliedFinalOnceRef.current) {
			const merged = dedupeConsecutiveWords(text.trim())
			if (merged === lastAppliedValueRef.current) {
				// Ya aplicado por el parcial idéntico; evita duplicar
				appliedFinalOnceRef.current = true
				setActiveSpeechField(null)
				speechBaseRef.current = ''
				resetText()
				return
			}
			console.log(
				'🎤 QuestionsForm - Processing speech merged text:',
				merged,
				'for field:',
				activeSpeechField,
			)
			setFormData((prevData) => ({
				...prevData,
				[activeSpeechField]: merged,
			}))
			appliedFinalOnceRef.current = true
			lastAppliedValueRef.current = merged
			console.log('🎤 Form data updated successfully for field:', activeSpeechField)
			setActiveSpeechField(null) // Reset the active field
			speechBaseRef.current = ''
			resetText() // Clear the text from the hook
		} else if (!isListening && text && !activeSpeechField) {
			console.log('🎤 ⚠️ WARNING: Text detected but no active field - speech may not work properly')
		}
	}, [isListening, text, partialText, activeSpeechField, resetText])

	// Hook para el proceso de hipnosis Uber
	const { startProcess } = useHypnosisProcessStore()

	const formatQuestions = (questions: FormQuestions): FormStep[] => {
		return questions.questions.map((el, index) => {
			const baseQuestion = {
				title: interpolateText(el.question, { name: userData.wantToBeCalled }),
				description: el.description,
				header: el.header || '',
			}

			if (el.type === 'radio-button' && el.options) {
				return {
					...baseQuestion,
					fields: [
						{
							name: `${index}`,
							label: 'Respuesta',
							type: 'radio',
							options: el.options,
						},
					],
				}
			} else {
				// Default to textAndNumber for 'input' type or when type is not specified
				return {
					...baseQuestion,
					fields: [
						{
							name: `${index}`,
							label: 'Respuesta',
							type: 'textAndNumber',
							placeholder: 'Escríbelo aquí',
							minLength: 10,
							optional: el.optional || false,
						},
					],
				}
			}
		})
	}

	//formData {"0": "Pregunta 1", "1": "Pregunta 2", "2": "Pregunta 3", "3": "Pregunta 4", "4": "Pregunta 5"}

	const fetchQuestions = async () => {
		try {
			const data = await FormQuestionsService.getFormQuestionsFromSettings(userId)

			setFormattedQuestions(formatQuestions(data))
			setOriginalQuestions(data.questions)
			console.log('originalQuestions asdasd', originalQuestions)
		} catch (error) {
			console.error('Error fetching questions:', error)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchQuestions()
		setIsFloatingPlayerVisible(false)
	}, [])

	const handleFieldChange = (fieldName: string, value: string) => {
		setFormData((prevData) => ({
			...prevData,
			[fieldName]: value,
		}))
	}

	const handleSpeechStart = async (fieldName: string) => {
		console.log(
			'🎤 handleSpeechStart called with fieldName:',
			fieldName,
			'isListening:',
			isListening,
		)
		speechBaseRef.current = (formData[fieldName] ? String(formData[fieldName]) : '').trim()
		appliedFinalOnceRef.current = false
		setActiveSpeechField(fieldName)
		await startListening()
	}

	const handleSpeechStop = async () => {
		if (isListening) {
			await stopListening()
		}
	}

	const handleSpeechCancel = async () => {
		if (isListening) {
			await stopListening()
		}
		setActiveSpeechField(null)
		speechBaseRef.current = ''
		resetText()
	}

	const handleComplete = async (formData: WizardFormData) => {
		// Guardar los datos del formulario para usarlos después
		try {
			if (userId) {
				const audioRequest: AudioRequest = {
					userId,
					email: userData.email,
					requestDate: new Date().toISOString(),
					audioMotive: {
						questions: originalQuestions.map((el, index) => ({
							...el,
							question: el.referenceQuestion,
							answer: formData[index] ? formData[index].toString() : '', // Validación agregada
						})),
					},
				}

				const response = await AudioRequestService.sendAudioRequest(audioRequest)

				if (response) {
					console.log('[QuestionsForm] Audio request enviado exitosamente:', response)

					// 🖼️ OBTENER IMAGEN DEL NIVEL DEL USUARIO
					let levelImageUrl = undefined
					try {
						const { requestSettings } = useNewLibraryStore.getState()

						if (requestSettings && userData?.userLevel) {
							const userLevelSettings = requestSettings.find(
								(setting: any) => setting.userLevel === userData.userLevel,
							)
							levelImageUrl = userLevelSettings?.exportSettings?.audioImg
							console.log(
								`[QuestionsForm] Imagen del nivel ${userData.userLevel}: ${levelImageUrl}`,
							)
						}
					} catch (error) {
						console.log('[QuestionsForm] No se pudo obtener imagen del nivel:', error)
					}

					// Iniciar el proceso de notificación Uber con progreso REAL
					const processData = {
						id: response.audioRequestId || response._id || `process_${Date.now()}`,
						audioRequestId: response.audioRequestId || response._id || `unknown_${Date.now()}`,
						title: 'Tu hipnosis está siendo creada',
						subtitle: 'En menos de 24hs podrás escuchar tu hipnosis.',
						progress: 0, // Empezar desde 0% - se calculará el progreso real
						startTime: new Date(),
						// Si el backend devuelve tiempo estimado, usarlo; si no, 24 horas por defecto
						estimatedCompletionTime: response.estimatedCompletionTime
							? new Date(response.estimatedCompletionTime)
							: response.publicationDate
								? new Date(response.publicationDate)
								: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
						timeRemaining: response.timeRemaining || undefined,
						// 🖼️ USAR IMAGEN ESPECÍFICA DEL NIVEL
						imageUrl: levelImageUrl,
						// Campos adicionales para progreso real
						backendProgress: response.progress || 0,
						publicationDate: response.publicationDate,
						audioRequestData: response, // Guardar toda la respuesta del backend
					}

					console.log(
						'[QuestionsForm] Iniciando proceso de hipnosis con PROGRESO REAL:',
						processData,
					)
					startProcess(processData)

					return true
				} else {
					console.error('[QuestionsForm] Error: respuesta vacía del backend')
					Alert.alert('Error', 'No se pudo procesar tu solicitud. Por favor intenta más tarde.', [
						{ text: 'OK' },
					])
					return false
				}
			}
			return false
		} catch (error: any) {
			console.error('[QuestionsForm] Error enviando solicitud de audio:', error)

			// Manejar error específico de solicitud duplicada
			if (error.status === 429) {
				Alert.alert(
					'Solicitud ya enviada',
					'Ya has enviado una solicitud de hipnosis. Por favor espera a que se complete antes de enviar otra.',
					[
						{
							text: 'Entendido',
							onPress: () => router.back(),
						},
					],
				)
			} else {
				// Otros errores
				Alert.alert(
					'Error',
					'Hubo un problema al enviar tu solicitud. Por favor verifica tu conexión e intenta nuevamente.',
					[{ text: 'OK' }],
				)
			}

			return false
		}
	}

	const handleCancel = () => {
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
				onPress: () => {
					router.back()
				},
			},
		])
	}

	if (isLoading) {
		return (
			<LoadingContainer isLoading={isLoading}>
				<View style={styles.container} />
			</LoadingContainer>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: darkColors.background, flex: 1 }]}>
			<FormWizard
				steps={formattedQuestions}
				onComplete={handleComplete}
				onCancel={handleCancel}
				formData={formData}
				onFieldChange={handleFieldChange}
				onSpeechStart={handleSpeechStart}
				onSpeechStop={handleSpeechStop}
				onSpeechCancel={handleSpeechCancel}
				isListening={isListening}
				formId='questionsForm'
				activeSpeechField={activeSpeechField}
				themeColors={darkColors as any}
			/>

			{showSendingVideo && (
				<Modal title="Enviando respuestas">
					<View style={styles.videoContainer}>
					<Video
						source={enviarRespuestasVideo}
							style={styles.video}
							useNativeControls={false}
							resizeMode={ResizeMode.CONTAIN}
							shouldPlay={true}
							isLooping={false}
							onPlaybackStatusUpdate={(status) => setVideoStatus(status)}
						/>
					</View>
				</Modal>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
	},
	videoContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
	},
	video: {
		width: '100%',
		height: '100%',
	},
})
