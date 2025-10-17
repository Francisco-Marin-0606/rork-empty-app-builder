import React, { useEffect } from 'react'
import {
	TextInput,
	StyleSheet,
	View,
	Text,
	ViewStyle,
	Platform,
	Pressable,
	TouchableOpacity,
	Dimensions,
	Modal,
	Alert,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import dayjs from 'dayjs'
import { FormField, FieldOption } from '../helpers/types'
import { colors, fontSize } from '@/constants/tokens'
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	interpolateColor,
	withSpring,
	Easing,
	withSequence,
	withDelay,
} from 'react-native-reanimated'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { SpeechToTextButton } from './SpeechToTextButton'

interface FormInputProps extends Omit<FormField, 'name' | 'label'> {
	value: any
	onChange: (value: string | number | Date | null) => void
	onFocus?: any
	error?: string
	name: string
	label: string
	showLabel?: boolean
	dateFormat?: string
	description?: string
	inputBackgroundColor?: string
	inputTextColor?: string
	inputBorderColor?: string
	labelColor?: string
	disabled?: boolean
	inputHeight?: string | number | null
	textAlignVertical?: 'top' | 'center'
	inputPaddingHorizontal?: number
	inputHeightMin?:  number | null | 'auto'
	isCapitilize?: boolean
	hideBorder?: boolean
	margin?: {
		top?: number
		bottom?: number
		left?: number
		right?: number
	}
	// --- Speech recognition props ---
	isListening?: boolean
	activeSpeechField?: string | null
	onSpeechStart?: () => Promise<void>
	onSpeechStop?: () => Promise<void>
	onSpeechCancel?: () => Promise<void>
	// --- Character count props ---
	showCharacterCount?: boolean
	maxLength?: number
	currentLength?: number
	// --- Microphone control ---
	showMicrophone?: boolean
	// --- Additional props from second file ---
	maxFontSizeMultiplier?: number
	themeColors?: {
		background: string
		text: string
		textMuted: string
		border: string
		inputBackground: string
		inputBorder: string
		buttonBackground: string
		buttonText: string
	}
	customErrorStyles?: {
		errorText?: any;
		errorContainer?: any;
	}
	// --- Content size change callback ---
	onContentSizeChange?: (event: any) => void
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const WIDTH_PERCENTAGE = 0.5
const CHARACTER_LIMIT = 500 // Define character limit as a constant

const FormInput: React.FC<FormInputProps> = ({
	type,
	value,
	onChange,
	options,
	placeholder,
	error,
	label,
	showLabel = true,
	dateFormat = 'DD/MM/YYYY',
	description,
	onFocus,
	inputBackgroundColor,
	inputTextColor,
	inputBorderColor,
	labelColor,
	disabled = false,
	inputHeight,
	inputHeightMin,
	margin,
	hideMaxLength,
	textAlignVertical = 'top',
	inputPaddingHorizontal = 16,
	numberOfLines = 4,
	isCapitilize = true,
	hideBorder = false,
	// --- Speech recognition props ---
	isListening: externalIsListening,
	activeSpeechField,
	onSpeechStart,
	onSpeechStop,
	onSpeechCancel,
	// --- Character count props ---
	showCharacterCount,
	maxLength,
	currentLength,
	// --- Microphone control ---
	showMicrophone,
	// --- Additional props ---
	maxFontSizeMultiplier = 1.1,
	themeColors,
	...props
}) => {
	const [showDatePicker, setShowDatePicker] = React.useState(false)
	const [isConfirmButtonEnabled, setIsConfirmButtonEnabled] = React.useState(false)
	const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

	// Speech recognition hook - SOLO para funciones, NO para estado
	const {
		text: speechText,
		isSupported,
		error: speechError,
		startListening,
		stopListening,
		resetText,
	} = useSpeechRecognition({ registerListeners: false })

	// Usar SOLO el estado externo que viene del componente padre
	const isListening = externalIsListening ?? false
	const finalSpeechText = externalIsListening !== undefined ? '' : speechText
	const finalStartListening = externalIsListening !== undefined 
		? onSpeechStart || (() => Promise.resolve())
		: startListening
	const finalStopListening = externalIsListening !== undefined
		? onSpeechStop || (() => Promise.resolve())
		: stopListening

	// Cancel: usar función externa si está disponible, sino función interna
	const finalCancelListening = onSpeechCancel || (async () => {
		try {
			await stopListening()
		} finally {
			resetText()
		}
	})


	useEffect(() => {
		if (finalSpeechText && finalSpeechText.trim().length > 0) {
			const base = (value ? String(value) : '').trim()
			const addition = finalSpeechText.trim()
			const merged = base.length > 0 ? `${base} ${addition}` : addition
			onChange(merged)
			resetText()
		}
	}, [finalSpeechText, value, onChange, resetText])

	// Manejar la apertura del date picker
	useEffect(() => {
		if (showDatePicker) {
			// Inicialmente deshabilitar el botón de confirmar
			setIsConfirmButtonEnabled(false)
		}
	}, [showDatePicker])

	// Limpiar timeout al desmontar
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	// Visibilidad del micrófono según límite de caracteres y estado de STT
	const effectiveMaxLength = typeof maxLength === 'number' ? maxLength : CHARACTER_LIMIT
	const effectiveCurrentLength =
		typeof currentLength === 'number' ? currentLength : (value ? String(value).length : 0)
	const hideMicrophoneDueToLimit = !isListening && effectiveCurrentLength >= effectiveMaxLength

	const getDateValue = (): Date => {
		if (!value) return new Date()
		if (value instanceof Date) return value
		if (dayjs.isDayjs(value)) return value.toDate()
		if (typeof value === 'string') {
			const date = dayjs(value)
			return date.isValid() ? date.toDate() : new Date()
		}
		return new Date()
	}

	const formatDate = (dateValue: string | Date | dayjs.Dayjs | null): string => {
		if (!dateValue) return ''
		const date = dayjs.isDayjs(dateValue) ? dateValue : dayjs(dateValue)
		if (!date.isValid()) return ''
		const day = String(date.date()).padStart(2, '0')
		const month = String(date.month() + 1).padStart(2, '0')
		const year = String(date.year())
		return dateFormat.replace('DD', day).replace('MM', month).replace('YYYY', year)
	}

	const getInputWrapperStyle = (): ViewStyle => {
		const baseStyle: ViewStyle = {
			...styles.inputWrapper,
			...(error ? styles.inputError : {}),
			...(hideBorder && error ? { borderWidth: 1 } : { borderWidth: 0 }),
			...(inputBackgroundColor ? { backgroundColor: inputBackgroundColor } : {}),
			...(inputBorderColor ? { borderColor: inputBorderColor } : {}),
			...(disabled ? styles.disabledInput : {}),
		}

		if (type === 'segmentedRadio') {
			return {
				...baseStyle,
				backgroundColor: 'transparent',
				paddingHorizontal: 0,
				paddingVertical: 0,
				width: SCREEN_WIDTH * WIDTH_PERCENTAGE,
				alignSelf: 'flex-start',
			}
		}

		if (type === 'date') {
			return {
				...baseStyle,
				height: 35,
				justifyContent: 'center',
				alignItems: 'flex-start',
				borderRadius: 8,
				backgroundColor: 'transparent',
			}
		}

		// Handle both number and string heights
		if (inputHeight) {
			if (typeof inputHeight === 'number') {
				return {
					...baseStyle,
					height: inputHeight,
					minHeight: inputHeightMin,
				}
			} else if (typeof inputHeight === 'string') {
				return {
					...baseStyle,
					height: inputHeight as any,
					minHeight: inputHeightMin, 
				}
			}
		}

		return baseStyle
	}

	const renderLabel = () => {
		if (!showLabel || !label) return null
		return (
			<Text
				maxFontSizeMultiplier={maxFontSizeMultiplier}
				allowFontScaling={true}
				style={[
					styles.label,
					labelColor ? { color: labelColor } : {},
					themeColors?.text ? { color: themeColors.text } : {},
				]}
			>
				{label}
			</Text>
		)
	}

	const handleTextChange = (text: string) => {
		text = text.trimStart()
		switch (type) {
			case 'number': {
				const numericValue = text.replace(/[^0-9.]/g, '')
				onChange(numericValue)
				break
			}
			case 'text': {
				// Solo letras y espacios
				if (isCapitilize) {
					text = text.charAt(0).toUpperCase() + text.slice(1)
				}
				const textOnlyValue = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
				onChange(textOnlyValue)
				break
			}
			case 'textAndNumber': {
				// Permite letras, números, espacios, comas, puntos, punto y coma, dos puntos, interrogación y exclamación
				const alphanumericValue = text.replace(/[^a-zA-Z0-9áéíóúüÁÉÍÓÚÜñÑ\s,.;:?!¿¡]/g, '')
				onChange(alphanumericValue)
				break
			}
			case 'onlytextrestricted': {
				// Solo letras (sin saltos de línea)
				let restrictedText = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')
				// Reemplazar saltos de línea y espacios múltiples por un solo espacio
				restrictedText = restrictedText.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')
				// Eliminar espacios al final
				restrictedText = restrictedText.trimEnd()
				// Contar palabras (dividir por espacios y filtrar elementos vacíos)
				const words = restrictedText
					.trim()
					.split(' ')
					.filter((word) => word.length > 0)
				if (words.length <= 3) {
					onChange(restrictedText)
				}
				break
			}
			case 'email': {
				const sanitizedEmail = sanitizeAndValidateEmail(text)
				onChange(sanitizedEmail)
				break
			}
			default:
				onChange(text)
		}
	}

	const handleDateChange = (event: any, selectedDate?: Date) => {
		const { type: eventType } = event
		if (Platform.OS === 'android') {
			setShowDatePicker(false)
		}

		console.log('eventType', eventType)
		console.log('selectedDate', selectedDate)
		console.log('isConfirmButtonEnabled antes:', isConfirmButtonEnabled)

		// Habilitar botón cuando el scroll se detiene
		if (eventType === 'change') {
			console.log('Evento change detectado, selectedDate:', selectedDate)
			// Deshabilitar botón mientras se hace scroll
			setIsConfirmButtonEnabled(false)
			
			// Limpiar timeout anterior
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			
			// Habilitar botón después de 500ms sin scroll (cuando se detiene)
			timeoutRef.current = setTimeout(() => {
				console.log('Scroll detenido, habilitando botón confirmar')
				setIsConfirmButtonEnabled(true)
			}, 500)
		}

		// También habilitar botón cuando hay evento 'set'
		if (eventType === 'set' && selectedDate) {
			console.log('Evento set detectado, habilitando botón')
			setIsConfirmButtonEnabled(true)
			
			if (Platform.OS === 'android') {
				handleDatePickerConfirmAndroid(selectedDate)
			} else {
				onChange(selectedDate.toISOString())
			}
		}
	}

	const renderRadioButtons = () => {
		if (!options) return null

		return (
			<View style={styles.radioContainer}>
				{options.map((option) => (
					<TouchableOpacity
						key={option.value}
						style={[
							styles.radioOption,
							inputBackgroundColor ? { backgroundColor: inputBackgroundColor } : {},
						]}
						onPress={() => !disabled && onChange(option.value)}
						disabled={disabled}
					>
						<View
							style={[
								styles.radio,
								inputBackgroundColor ? { backgroundColor: inputBackgroundColor } : {},
								inputBorderColor ? { borderColor: inputBorderColor } : {},
								disabled && styles.disabledRadio,
							]}
						>
							{value === option.value && (
								<View
									style={[
										styles.radioSelected,
										labelColor ? { backgroundColor: labelColor } : {},
										disabled && styles.disabledRadioSelected,
									]}
								/>
							)}
						</View>
						<Text
							maxFontSizeMultiplier={maxFontSizeMultiplier}
							style={[
								styles.radioLabel,
								inputTextColor ? { color: inputTextColor } : {},
								disabled && styles.disabledText,
							]}
						>
							{option.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		)
	}

	const renderSegmentedRadio = () => {
		if (!options) return null

		// Animation shared values
		const translateX = useSharedValue(0)
		const sliderScale = useSharedValue(1)
		const containerWidth = SCREEN_WIDTH * WIDTH_PERCENTAGE

		// Create animated values for text colors
		const textColorValues = options.map((_, index) =>
			useSharedValue(value === options[index].value ? 1 : 0),
		)
		const textScaleValues = options.map((_, index) =>
			useSharedValue(value === options[index].value ? 1.05 : 1),
		)

		// Set initial position based on value
		useEffect(() => {
			if (options) {
				let selectedIndex = -1

				if (value) {
					selectedIndex = options.findIndex((option) => option.value === value)
				}

				// Si no hay valor seleccionado o no se encuentra, seleccionar la primera opción
				if (selectedIndex === -1 && options.length > 0) {
					selectedIndex = 0
					// Seleccionar automáticamente la primera opción si no hay valor
					if (!value) {
						onChange(options[0].value)
					}
				}

				if (selectedIndex !== -1) {
					// Calculate segment width based on options count
					const segmentWidth = containerWidth / options.length

					// Animate to the selected option position with spring physics
					translateX.value = withTiming(selectedIndex * segmentWidth, {
						duration: 100,
						easing: Easing.bezier(0.25, 0.1, 0.25, 1),
					})

					// Subtle scale animation for the slider
					sliderScale.value = withSequence(
						withTiming(1, { duration: 150 }),
						withTiming(1, { duration: 250 }),
					)

					// Animate text colors and scale
					textColorValues.forEach((colorValue, index) => {
						colorValue.value = withTiming(index === selectedIndex ? 1 : 0, {
							duration: 1,
							easing: Easing.linear,
						})
					})
				}
			}
		}, [value, options])

		// Handle option selection with animation
		const handleOptionPress = (optionValue: string | number, index: number) => {
			if (!disabled) {
				// Calculate segment width based on options count
				const segmentWidth = containerWidth / options.length

				// Subtle scale animation for the slider
				sliderScale.value = withSequence(
					withTiming(0.95, { duration: 100 }),
					withTiming(1, { duration: 100 }),
					withTiming(1, { duration: 150 }),
				)

				// Animate to the new position with spring physics
				translateX.value = withTiming(index * segmentWidth, {
					duration: 100,
					easing: Easing.bezier(0.25, 0.1, 0.25, 1),
				})

				// Animate text colors with easing
				textColorValues.forEach((colorValue, i) => {
					colorValue.value = withTiming(i === index ? 1 : 0, {
						duration: 1,
						easing: Easing.linear,
					})
				})

				onChange(optionValue)
			}
		}

		// Animated style for the slider
		const animatedSliderStyle = useAnimatedStyle(() => {
			return {
				transform: [
					{ translateX: translateX.value },
					// { scale: sliderScale.value }
				],
			}
		})

		return (
			<View style={styles.segmentedContainer}>
				{/* Background slider that moves */}
				<Animated.View
					style={[
						styles.segmentedSlider,
						{ width: `${100 / options.length}%` },
						animatedSliderStyle,
					]}
				/>

				{/* Options */}
				{options.map((option, index) => {
					// Create animated style for each text label
					const animatedTextStyle = useAnimatedStyle(() => {
						const color = interpolateColor(
							textColorValues[index].value,
							[0, 1],
							[colors.textMuted || '#A1A1AA', '#FFFFFF'],
						)

						return {
							color,
							transform: [{ scale: textScaleValues[index].value }],
						}
					})

					return (
						<TouchableOpacity
							key={option.value}
							style={[styles.segmentedOption, disabled && styles.disabledInput]}
							onPress={() => handleOptionPress(option.value, index)}
							disabled={disabled}
							activeOpacity={1}
						>
							<Animated.Text
								maxFontSizeMultiplier={1.5}
								style={[styles.segmentedLabel, animatedTextStyle, disabled && styles.disabledText]}
							>
								{option.label}
							</Animated.Text>
						</TouchableOpacity>
					)
				})}
			</View>
		)
	}

	const renderDescription = () => {
		if (!description) return null
		return (
			<Text 
				maxFontSizeMultiplier={maxFontSizeMultiplier} 
				style={[
					styles.description, 
					themeColors?.textMuted ? { color: themeColors.textMuted } : {}
				]}
			>
				{description}
			</Text>
		)
	}

	// Custom input text style based on props
	const getInputTextStyle = () => {
		const baseStyles: any[] = [
			styles.input,
			inputTextColor ? { color: inputTextColor } : {},
			themeColors?.text ? { color: themeColors.text } : {},
			disabled && styles.disabledText,
		]

		if (inputPaddingHorizontal) {
			baseStyles.push({ paddingHorizontal: inputPaddingHorizontal })
		}

		// Apply custom height to the input if provided (handle both number and string)
		if (inputHeight) {
			if (typeof inputHeight === 'number') {
				baseStyles.push({ height: inputHeight })
			} else if (typeof inputHeight === 'string') {
				baseStyles.push({ height: inputHeight as any })
			}
			// Remove any maxHeight restrictions when custom height is provided
			if (Platform.OS === 'android') {
				baseStyles.push({ maxHeight: undefined })
			}
		}

		return baseStyles
	}

	// Custom date input style based on props
	const getDateInputStyle = () => {
		const baseStyles: any[] = [
			styles.dateInput,
			inputBackgroundColor
				? { backgroundColor: inputBackgroundColor }
				: { backgroundColor: themeColors?.inputBackground || colors.secondary },
		]

		// Apply custom height to the date input if provided (handle both number and string)
		if (inputHeight) {
			if (typeof inputHeight === 'number') {
				baseStyles.push({ height: inputHeight })
			} else if (typeof inputHeight === 'string') {
				baseStyles.push({ height: inputHeight as any })
			}
		}

		return baseStyles
	}

	const stripAnyPlusAlias = (email: string) => {
		// Separar parte local y dominio
		const [localPart, domain] = email.split('@')
		if (!domain) return email // formato inválido; devolver tal cual

		const plusPos = localPart.indexOf('+')
		if (plusPos === -1) return email // sin alias

		const alias = localPart.slice(plusPos + 1)

		// Solo eliminar si el alias es únicamente números
		const isOnlyNumbers = /^\d+$/.test(alias)
		return isOnlyNumbers
			? `${localPart.slice(0, plusPos)}@${domain}` // alias solo números → eliminarlo
			: email // alias con letras → mantenerlo
	}

	const sanitizeAndValidateEmail = (input: string): string => {
		let email = input.toLowerCase()

		// Eliminar caracteres no imprimibles
		email = email.normalize('NFKC').replace(/[^\x21-\x7E]/g, '')

		// Reemplazar comas por puntos
		email = email.replace(/,/g, '.')

		// Quitar punto al inicio
		email = email.replace(/^\./, '')

		// Quitar espacios en blanco
		email = email.replace(/\s+/g, '')

		// Prevenir múltiples puntos al final
		email = email.replace(/\.{2,}$/, '.')

		// No permitir emails con + seguido de números (ejemplo: user+20@gmail.com)
		email = stripAnyPlusAlias(email)

		// Corregir dominios mal escritos comunes
		const commonMisspelledDomains = {
			gmial: 'gmail.',
			gamil: 'gmail.',
			gnail: 'gmail.',
			gmaill: 'gmail.',
			hotnail: 'hotmail.',
			hotmil: 'hotmail.',
			hotmaill: 'hotmail.',
			hotmaik: 'hotmail.',
			hotmial: 'hotmail.',
			iclod: 'icloud.',
			iclou: 'icloud.',
			iclud: 'icloud.',
			icloud: 'icloud.',
			icloudd: 'icloud.',
			icoud: 'icloud.',
		}

		// Aplicar correcciones de dominios mal escritos

		// No permitir múltiples @
		const parts = email.split('@')
		if (parts.length > 2) {
			email = parts.slice(0, 2).join('@')
		}

		Object.keys(commonMisspelledDomains).forEach((misspelled) => {
			const correct = commonMisspelledDomains[misspelled as keyof typeof commonMisspelledDomains]
			email = email.replace(
				new RegExp('@' + misspelled.replace(/\./g, '\\.') + '$', 'i'),
				'@' + correct,
			)
		})

		// Remover puntos duplicados al final del dominio (ej: gmail.com. -> gmail.com)
		if (parts.length > 1) {
			email = email.replace(
				/\.(com|org|net|edu|gov|mil|int|co|es|ar|mx|cl|pe|uy|py|bo|ec|ve|gt|hn|ni|cr|pa|do|cu|pr|bz)\.+$/gi,
				'.$1',
			)
		}

		return email
	}

	// Custom picker style based on props
	const getPickerStyle = () => {
		const baseStyles: any[] = [
			styles.picker,
			disabled && styles.disabledText,
			themeColors?.text ? { color: themeColors.text } : {},
		]

		// Apply custom height to the picker if provided (handle both number and string)
		if (inputHeight) {
			if (typeof inputHeight === 'number') {
				baseStyles.push({ height: inputHeight })
			} else if (typeof inputHeight === 'string') {
				baseStyles.push({ height: inputHeight as any })
			}
		}

		return baseStyles
	}

	// Custom date text style based on props
	const getDateTextStyle = () => {
		const baseStyle = {
			color: inputTextColor || themeColors?.text || colors.text,
			fontSize: fontSize.sm || 16,
			borderRadius: 8,
			width: '100%' as const,
			textAlign: 'center' as const,
			textAlignVertical: 'center' as const,
			alignSelf: 'center' as const,
			fontFamily: 'Geist-SemiBold',
		}

		// Apply custom height to the text if provided, otherwise use default
		if (inputHeight) {
			if (typeof inputHeight === 'number') {
				return {
					...baseStyle,
					height: inputHeight - 16, // Subtract padding to fit properly within the TouchableOpacity
				}
			} else if (typeof inputHeight === 'string' && inputHeight !== '100%') {
				// For string values other than '100%', use the default height
				return {
					...baseStyle,
					height: 20,
				}
			} else if (inputHeight === '100%') {
				// For '100%', let it fill the container
				return {
					...baseStyle,
					flex: 1,
				}
			}
		}

		return {
			...baseStyle,
			height: 20,
		}
	}

	const handleDatePickerConfirm = () => {
		// Solo permitir si el botón está habilitado
		if (!isConfirmButtonEnabled) return
		
		// Limpiar timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		
		setShowDatePicker(false)
		setIsConfirmButtonEnabled(false)

		const date = getDateValue()
		// Solo actualizar si el usuario confirmó la selección
		if (date) {
			// Validar que la fecha no sea mayor a hace 2 años
			const today = new Date()
			const twoYearsAgo = new Date()
			twoYearsAgo.setFullYear(today.getFullYear() - 2)

			if (date > twoYearsAgo) {
				// Mostrar alerta si la fecha es muy reciente
				Alert.alert('¿Seguro que eres tan joven?', 'No me cuadra…\nDale otra vez.', [
					{ text: 'OK', style: 'default' },
				])
				onChange(null)
				return
			}
		}
	}

	const handleDatePickerConfirmAndroid = (date: Date) => {
		setShowDatePicker(false)
		// Solo actualizar si el usuario confirmó la selección
		if (date) {
			// Validar que la fecha no sea mayor a hace 2 años
			const today = new Date()
			const twoYearsAgo = new Date()
			twoYearsAgo.setFullYear(today.getFullYear() - 2)

			if (date > twoYearsAgo) {
				// Mostrar alerta si la fecha es muy reciente
				Alert.alert('¿Seguro que eres tan joven?', 'No me cuadra…\nDale otra vez.', [
					{ text: 'OK', style: 'default' },
				])
				onChange(null)
				return
			}
			onChange(date.toISOString())
		}
	}

	return (
		<View style={styles.container}>
			<View
				style={{
					marginTop: margin?.top || 0,
					marginBottom: margin?.bottom || 0,
					marginLeft: margin?.left || 0,
					marginRight: margin?.right || 0,
				}}
			>
				{renderLabel()}
				{renderDescription()}
				<View style={getInputWrapperStyle()}>
					{(() => {
						switch (type) {
							case 'text':
							case 'email':
							case 'number':
							case 'textAndNumber':
							case 'onlytextrestricted':
								return (
									<TextInput
										maxFontSizeMultiplier={1}
										allowFontScaling={false}
										style={getInputTextStyle()}
										value={value ? String(value) : ''}
										onFocus={onFocus}
										onChangeText={handleTextChange}
										placeholder={placeholder}
										placeholderTextColor={themeColors?.textMuted || colors.tertiary || '#999'}
										multiline={type === 'text' || type === 'textAndNumber'}
										autoCapitalize={type === 'email' ? 'none' : 'sentences'}
										numberOfLines={type === 'text' || type === 'textAndNumber' ? numberOfLines : 1}
										textAlignVertical={
											type === 'text' || type === 'textAndNumber' ? textAlignVertical : 'center'
										}
										keyboardType={
											type === 'number' ? 'numeric' : type === 'email' ? 'email-address' : 'default'
										}
										maxLength={maxLength}
										editable={!disabled}
										{...props}
									/>
								)
							case 'select':
								return (
									<Picker
										selectedValue={value}
										onValueChange={disabled ? () => {} : onChange}
										style={[styles.picker, disabled && styles.disabledText]}
										enabled={!disabled}
									>
										{options?.map((option: FieldOption) => (
											<Picker.Item
												key={option.value}
												label={option.label}
												value={option.value}
												color={inputTextColor || colors.text}
												enabled={!disabled}
											/>
										))}
									</Picker>
								)
							case 'radio':
								return renderRadioButtons()
							case 'segmentedRadio':
								return renderSegmentedRadio()
							case 'date':
								return (
									<>
										<TouchableOpacity
											onPress={() => !disabled && setShowDatePicker(true)}
											style={getDateInputStyle()}
											disabled={disabled}
										>
											<Text
												maxFontSizeMultiplier={maxFontSizeMultiplier}
												style={getDateTextStyle()}
											>
												{formatDate(getDateValue())}
											</Text>
										</TouchableOpacity>

										{/* DateTimePicker con estilo idéntico a DatePickerIOS */}
										{showDatePicker && Platform.OS === 'ios' && (
											<Modal visible={showDatePicker} transparent animationType="slide">
												<View style={styles.iosModalBackground}>
													<View style={styles.iosModalContent}>
														<View style={styles.iosModalHeader}>
															<TouchableOpacity
																onPress={() => handleDatePickerConfirm()}
																style={[
																	styles.iosModalHeaderButton,
																	!isConfirmButtonEnabled && styles.iosModalHeaderButtonDisabled
																]}
																disabled={!isConfirmButtonEnabled}
															>
																<Text
																	style={[
																		styles.iosModalHeaderButtonText,
																		styles.iosModalConfirmText,
																		!isConfirmButtonEnabled && styles.iosModalHeaderButtonTextDisabled
																	]}
																>
																	Confirmar
																</Text>
															</TouchableOpacity>
														</View>
														<DateTimePicker
															testID="dateTimePicker"
															value={getDateValue()}
															mode="date"
															display="spinner"
															onChange={handleDateChange}
															locale="es-ES"
															style={styles.iosDatePicker}
															textColor="#000000"
															themeVariant="light"
														/>
													</View>
												</View>
											</Modal>
										)}

										{/* Modal nativo para Android */}
										{showDatePicker && Platform.OS === 'android' && (
											<DateTimePicker
												testID="dateTimePicker2"
												value={getDateValue()}
												mode="date"
												display="spinner"
												positiveButton={{
													label: 'Confirmar',
													textColor: colors.primary,
												}}
												negativeButton={{
													label: 'Cancelar',
													textColor:  colors.primary,
												}}
												onChange={handleDateChange}
												locale="es-ES"
											/>
										)}
									</>
								)
							default:
								return null
						}
					})()}
				</View>
			</View>
			{error && (
				<Text maxFontSizeMultiplier={1.1} style={styles.errorText}>
					{error}
				</Text>
			)}
			{/* Microphone Button and Character Count */}
            <View style={styles.microphoneContainer}>
                {showCharacterCount && (
                    <Text
                        maxFontSizeMultiplier={maxFontSizeMultiplier}
                        style={[
                            styles.characterCount,
                            (currentLength || 0) > (maxLength || 500) && { color: '#FF3B30' },
                        ]}
                    >
                        {currentLength || 0}/{maxLength || 500}
                    </Text>
                )}
                {showMicrophone && !hideMicrophoneDueToLimit && (
                        <SpeechToTextButton
                        isListening={isListening}
                        onStart={finalStartListening}
                            onStop={finalStopListening}
                            onCancel={finalCancelListening}
                        disabled={disabled}
                        isSupported={isSupported}
                        size={24}
                        color="#FFFFFF"
                    />
                )}
            </View>

		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		marginBottom: 16, // Add consistent spacing between form fields
	},
	label: {
		fontFamily: 'Geist-Bold',
		letterSpacing: 0,
		fontSize: fontSize.base || 14,
		color: colors.text || '#000000',
		// marginBottom: 8,
	},
	inputWrapper: {
		marginTop: 8,
		backgroundColor: colors.secondary,
		borderRadius: 12,
		paddingVertical: Platform.OS === 'android' ? 8 : 12,
	},
	inputError: {
		borderColor: colors.error || '#FF3B30',
	},
	description: {
		fontFamily: 'Inter-Regular',
		letterSpacing: 0,
		fontSize: fontSize.sm || 16,
		color: colors.tertiary || '#666666',
		marginTop: 4,
		marginLeft: 4,
		lineHeight: 20,
	},
	errorText: {
		position: 'absolute',
		bottom: -7,
		color: colors.error || '#FF3B30',
		fontSize: fontSize.xs || 12,
		marginTop: 4,
		marginLeft: 4,
	},
	input: {
		fontFamily: 'Geist-Medium',
		letterSpacing: 0,
		fontSize: fontSize.sm || 16,
		color: '#ffffff',
		padding: 0,
		...(Platform.OS === 'android'
			? {
					paddingVertical: 0,
					maxHeight: 30,
				}
			: {}),
	},
	dateInput: {
		borderRadius: 8,
		fontFamily: 'Geist-Regular',
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	placeholder: {
		color: '#999',
	},
	picker: {
		marginLeft: -12,
		marginRight: -12,
		color: colors.text || '#000000',
		...(Platform.OS === 'android'
			? {
					height: 40,
				}
			: {}),
	},
	radioContainer: {
		width: '100%',
	},
	radioOption: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 6,
		paddingVertical: 2,
	},
	radio: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		borderColor: colors.primary || '#007AFF',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		backgroundColor: colors.secondary, // Add white background
	},
	radioSelected: {
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: colors.primary || '#007AFF',
	},
	radioLabel: {
		fontFamily: 'Inter-Regular',
		letterSpacing: 0,
		fontSize: fontSize.sm || 16, // Increased font size
		color: colors.text || '#000000',
		flex: 1, // Allow text to wrap
	},
	disabledInput: {
		opacity: 0.6,
	},
	disabledText: {
		opacity: 0.6,
	},
	disabledRadio: {
		borderColor: colors.tertiary || '#666666',
	},
	disabledRadioSelected: {
		backgroundColor: colors.tertiary || '#666666',
	},
	segmentedContainer: {
		flexDirection: 'row',
		borderRadius: 0,
		overflow: 'hidden',
		height: 40,
		backgroundColor: 'transparent',
		width: SCREEN_WIDTH * WIDTH_PERCENTAGE,
	},
	segmentedSlider: {
		position: 'absolute',
		height: '100%',
		backgroundColor: '#F2741B', // Color naranja por defecto
		borderRadius: 12,
		zIndex: 1,
	},
	segmentedOption: {
		flex: 1,
		paddingVertical: 0,
		paddingHorizontal: 0,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 2,
		height: 40,
	},
	segmentedOptionSelected: {
		backgroundColor: 'transparent',
	},
	segmentedOptionUnselected: {
		backgroundColor: 'transparent',
	},
	segmentedLabel: {
		fontFamily: 'Geist-SemiBold',
		fontSize: fontSize['sm'] || 16,
		letterSpacing: 0,
		zIndex: 2,
		fontWeight: '600',
	},
	segmentedLabelSelected: {
		// Color now handled by animation
	},
	segmentedLabelUnselected: {
		// Color now handled by animation
	},
	iosModalBackground: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	iosModalContent: {
		backgroundColor: '#ffffff',
		padding: 0,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		width: '100%',
		alignItems: 'center',
	},
	iosModalHeader: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'flex-end',
		width: '100%',
		borderBottomWidth: 1,
		borderBottomColor: '#e5e5e5',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#ffffff',
	},
	iosModalHeaderButton: {
		padding: 4,
	},
	iosModalHeaderButtonText: {
		fontFamily: 'Geist-Medium',
		fontSize: fontSize.base || 17,
		color: 'black',
	},
	iosModalConfirmText: {
		fontFamily: 'Geist-SemiBold',
		fontSize: fontSize.base || 17,
		color: 'black',
		fontWeight: '600',
	},
	iosModalHeaderButtonDisabled: {
		opacity: 0.5,
	},
	iosModalHeaderButtonTextDisabled: {
		color: '#999999',
	},
	iosDatePicker: {
		width: '100%',
		height: 216,
		backgroundColor: '#ffffff',
	},
	characterCount: {
		fontFamily: 'Inter-Regular',
		fontSize: fontSize.xs || 12,
		color: colors.tertiary || '#666666',
		marginRight: 8,
	},
	// FIXED: Additional styles that were missing
	overlayContainer: {
		position: 'relative',
		width: '100%',
	},
	normalTextInput: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'transparent',
		zIndex: 1,
	},
	exceededTextInput: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'transparent',
		zIndex: 2,
	},
	microphoneContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingBottom: 4,
		position: 'absolute',
		bottom: -10,
		right: 2,
		zIndex: 10,
	},
})

export default FormInput