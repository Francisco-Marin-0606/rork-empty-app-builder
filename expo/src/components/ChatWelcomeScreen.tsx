import React, { useEffect, useRef, useState } from 'react'
import {
	Text,
	View,
	StyleSheet,
	Animated,
	Easing,
	TouchableWithoutFeedback,
	Keyboard,
	TouchableOpacity,
	ScrollView,
} from 'react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import LinearGradient from 'react-native-linear-gradient'
import { colors, fontSize } from '@/constants/tokens'
import GradientText from './GradientText'

// Definir props para el componente 1
interface WelcomeScreenProps {
	isExiting?: boolean
	onSuggestionPress?: (text: string) => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ isExiting = false, onSuggestionPress }) => {
	const animatedValue = useRef(new Animated.Value(0)).current
	const [showSuggestions, setShowSuggestions] = useState(true)
	const suggestionsOpacity = useRef(new Animated.Value(1)).current

	useEffect(() => {
		if (isExiting) {
			// Animación para desvanecer y reducir la escala como alejándose al fondo
			Animated.timing(animatedValue, {
				toValue: 1,
				duration: 700,
				useNativeDriver: true,
				easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Curva suave para efecto de alejamiento
			}).start()
		}
	}, [isExiting, animatedValue])

	// Calculamos la transformación de escala para crear efecto de alejamiento
	const scale = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0.7], // Se reducirá al 70% de su tamaño original
	})

	// Pequeño movimiento hacia abajo para dar sensación de profundidad
	const translateY = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 20], // Se moverá ligeramente hacia abajo
	})

	// Desvanecimiento gradual
	const opacity = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0], // Desaparecerá gradualmente
	})

	// Animación para el tamaño del texto (desde fontSize['4xl'] hasta fontSize.lg)
	const fontSize4xl = fontSize['4xl']
	const fontSizeLg = fontSize.lg

	// Creamos una animación de escala para simular el cambio de tamaño de fuente
	const textScale = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [1, fontSizeLg / fontSize4xl], // Reducción proporcional
	})

	// Función para manejar el clic en una sugerencia
	const handleSuggestionPress = (suggestion: string) => {
		if (onSuggestionPress) {
			onSuggestionPress(suggestion)
		}
	}

	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<View style={styles.welcomeContainer}>
				<Animated.View
					style={[
						styles.logoContainer,
						{
							transform: [{ scale }, { translateY }],
							opacity,
						},
					]}
				>
					<Animated.Text style={[styles.logoText]}>Psilocogo</Animated.Text>
				</Animated.View>
				<Animated.View
					style={{
						opacity,
						transform: [{ scale }, { translateY }],
					}}
				>
					<Text style={styles.subtitleText}>Como tu psicólogo, pero más loco. . .</Text>
				</Animated.View>
			</View>
		</TouchableWithoutFeedback>
	)
}

const styles = StyleSheet.create({
	welcomeContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	logoContainer: {
		marginTop: '0%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoText: {
		fontSize: fontSize['3xl'],
		fontWeight: 'bold',
		color: 'white',
		fontFamily: 'Geist-SemiBold',
		letterSpacing: -0.5,
	},
	gradientText: {
		fontSize: fontSize['3xl'],
		fontWeight: 'bold',
		fontFamily: 'Geist-SemiBold',
	},
	subtitleText: {
		fontSize: fontSize.sm,
		color: '#999',
		textAlign: 'center',
		fontFamily: 'Geist-Medium',
		letterSpacing: -0.5,
		marginTop: 5,
	},
	suggestionsContainer: {
		position: 'absolute',
		bottom: 50,
		width: '100%',
		backgroundColor: 'transparent',
		paddingVertical: 10,
	},
	scrollViewContent: {
		marginTop: 5,
		paddingHorizontal: 16,
		paddingRight: 32,
		flexDirection: 'row',
	},
	suggestionButton: {
		backgroundColor: colors.secondary,
		borderRadius: 10,
		padding: 18,
		marginHorizontal: 6,
		minHeight: 40,
		marginBottom: 10,
		justifyContent: 'center',
		alignItems: 'flex-start',
	},
	suggestionText: {
		color: colors.text,
		fontSize: 14,
		textAlign: 'left',
		fontFamily: 'Geist-Regular',
	},
})

export default WelcomeScreen
