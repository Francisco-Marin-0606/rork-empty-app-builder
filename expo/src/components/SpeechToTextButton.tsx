import React from 'react'
import { TouchableOpacity, StyleSheet, Alert, View, Text, Linking } from 'react-native' // Added Text and Linking
import { colors } from '@/constants/tokens'
import { Ionicons } from '@expo/vector-icons'
import { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import { useEffect } from 'react'

// Componente animado para los puntos suspensivos
const AnimatedDots: React.FC = () => {
	const dot1Y = useSharedValue(0)
	const dot2Y = useSharedValue(0)
	const dot3Y = useSharedValue(0)

	useEffect(() => {
		// Animación en forma de serpiente: cada punto se mueve con un delay diferente
		dot1Y.value = withRepeat(
			withTiming(2, { duration: 800 }),
			-1,
			true
		)
		
		// Iniciar con delays escalonados para crear efecto de serpiente
		setTimeout(() => {
			dot2Y.value = withRepeat(
				withTiming(2, { duration: 800 }),
				-1,
				true
			)
		}, 200)

		setTimeout(() => {
			dot3Y.value = withRepeat(
				withTiming(2, { duration: 800 }),
				-1,
				true
			)
		}, 400)
	}, [])

	const dot1Style = useAnimatedStyle(() => ({
		transform: [{ translateY: dot1Y.value }],
	}))

	const dot2Style = useAnimatedStyle(() => ({
		transform: [{ translateY: dot2Y.value }],
	}))

	const dot3Style = useAnimatedStyle(() => ({
		transform: [{ translateY: dot3Y.value }],
	}))

	return (
		<View style={styles.dotsContainer}>
			<Text style={styles.listeningText}>Escuchando</Text>
			<View style={styles.dotsWrapper}>
				<Animated.View style={[styles.dot, dot1Style]} />
				<Animated.View style={[styles.dot, dot2Style]} />
				<Animated.View style={[styles.dot, dot3Style]} />
			</View>
		</View>
	)
}

interface SpeechToTextButtonProps {
	isListening: boolean
	onStart: () => Promise<void>
	onStop: () => Promise<void>
	onCancel?: () => Promise<void> // Nueva prop para cancelar
	disabled?: boolean
	isSupported: boolean
	size?: number
	color?: string
}

export const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({
	isListening,
	onStart,
	onStop,
	onCancel,
	disabled = false,
	isSupported,
	size = 24,
    color = 'white',
}) => {
	console.log('SpeechToTextButton - isSupported:', isSupported, 'isListening:', isListening)

	const handlePress = async () => {
		console.log(
			'🎤 SpeechToTextButton pressed - isListening:',
			isListening,
			'isSupported:',
			isSupported,
		)
		if (disabled) return

		if (!isSupported) {
			// Mostrar alerta personalizada para permisos denegados
			Alert.alert(
				'Acceso al micrófono denegado',
				'Ve a la app de Configuración para darle acceso a Mental.',
				[
					{ text: 'Ahora no', style: 'cancel' },
					{ 
						text: 'Ir a Configuración', 
						onPress: () => Linking.openSettings() 
					},
				]
			)
			return
		}

		try {
			if (isListening) {
				console.log('🎤 Stopping speech recognition...')
				await onStop()
				console.log('🎤 Stop completed')
			} else {
				console.log('🎤 Starting speech recognition...')
				await onStart()
				console.log('🎤 Start completed')
				// Agregar un pequeño delay para evitar activación/desactivación inmediata
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
		} catch (error) {
			console.error('🎤 Error en SpeechToTextButton:', error)
			Alert.alert('Error', 'No se pudo procesar la solicitud de voz.')
		}
	}



	const handleCancel = async () => {
		if (onCancel) {
			try {
				await onCancel()
			} catch (error) {
				console.error('🎤 Error canceling speech recognition:', error)
			}
		}
	}

	// Si no está soportado, mostrar botón deshabilitado
	if (!isSupported) {
		return (
			<TouchableOpacity
				style={[
					styles.button,
					{
						width: size + 8,
						height: size + 8,
						opacity: 0.3,
					},
				]}
				disabled={true}
			>
				<Ionicons name="mic-off-outline" size={size} color={colors.tertiary} />
			</TouchableOpacity>
		)
	}

	// Si está escuchando, mostrar el layout completo
	if (isListening) {
		return (
			<View style={styles.listeningContainer}>
				{/* Botón X para cancelar (debe cancelar y detener explícitamente) */}
				<TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
					<Ionicons name="close" size={24} color="black" />
				</TouchableOpacity>

				{/* Texto "Escuchando..." con animación de puntos */}
				<AnimatedDots />

				{/* Tick a la derecha */}
				<TouchableOpacity
					style={[
						styles.button,
						{
							width: size + 8,
							height: size + 8,
							backgroundColor: 'white',
							borderRadius: (size + 8) / 2,
							justifyContent: 'center',
							alignItems: 'center',
						},
					]}
					onPress={handlePress}
					disabled={disabled}
					activeOpacity={0.7}
				>
					<Ionicons name="checkmark" size={size - 2} color="black" />
				</TouchableOpacity>
			</View>
		)
	}

	// Estado normal (no escuchando)
	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={[
					styles.button,
					{
						width: size + 8,
						height: size + 8,
						opacity: disabled ? 0.5 : 1,
						backgroundColor: 'transparent',
						borderRadius: 20,
						marginLeft: 8,
						justifyContent: 'center',
						alignItems: 'center',
					},
				]}
				onPress={handlePress}
				disabled={disabled}
				activeOpacity={0.7}
			>
				<Ionicons name="mic" size={size} color={color} />
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
	},
	listeningContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		paddingHorizontal: 0,
	},
	cancelButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: 'black',
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 4,
	},
	button: {
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 20,
		marginLeft: 8,
	},
	activeIndicator: {
		position: 'absolute',
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.error,
	},
	listeningText: {
		fontSize: 18,
		color: '#666666',
		fontWeight: '500',
		textAlign: 'center',
	},
	dotsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
	},
	dotsWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 4,
		marginTop: 6,
	},
	dot: {
		width: 4,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#666666',
		marginHorizontal: 1,
	},
})