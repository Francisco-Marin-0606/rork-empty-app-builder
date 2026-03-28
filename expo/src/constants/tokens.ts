import { Platform } from "react-native";

export const colors = {
	primary: '#FE892E', // naranjo
	primary80: '#FE892E80',

	secondary: '#191919', 
	tertiary: '#a1a1aa',
	fourth: '#26262a',

	gray: '#1a1a1a',

	background: '#fff',
	text: '#ffffff',
	textMuted: 'rgba(255, 255, 255, 0.3)', // Para subtítulos y líneas laterales (fondo oscuro)
	textMutedVisible: '#A1A1AA', // Para texto que debe ser visible sobre fondo blanco
	icon: '#ffffff',
	screenBackground: 'black',
	maximumTrackTintColor: 'rgba(255,255,255,0.4)',
	minimumTrackTintColor: 'rgba(255, 255, 255, 0.3)',
	disabled: '#A1A1A1',
	error: '#FF3B30',

	inProgressAudio : '#2e1705',
	inProgressAudioText : '#FF892F',

	formBackground: '#FFFFFF',
	formTitle: '#000000',
	formDescription: '#000000',
	formNextButton: '#000000',
	formBackButton: 'transparent',
	formNextButtonText: 'white',
	formBackButtonText: '#000000',

	stepCompleted: '#ffffff', // Blanco 100% para pasos completados
	stepActive: '#ffffff',    // Blanco 100% para paso activo
	stepInactive: 'rgba(255, 255, 255, 0.3)', // Blanco 30% para pasos inactivos
}

export const cutOffDate = Date.parse('2025-09-13')

export const fontSize = {
	// Títulos grandes
	'4xl': 40,
	'3.5xl': 36,
	'3xl': 32,
	'2.5xl': 30,
	'2xl': 28,
	'xl': 26,
	'lg': 24,
	
	// Texto base y medio
	'base': 20,
	'sm-18': 18,
	'sm': 16,
	
	// Texto pequeño
	'xs': 12,
	'2xs': 10,
	
	// Específicos para encabezados
	'h1': 30,
	'h2': 26,
	'h3': 22,
	'h4': 18,
	
	// Variantes específicas
	'caption': 14,
	'button': 18,
	'input': 16,
	'label': 14,
	'helper': 12,

	'eventSubtitleSize': 14
  }
export const screenPadding = {
	horizontal: 32,
	horizontalIos: 46,
	horizontalAndroid: 42,
}

export const FLOATING_PLAYER_HEIGHT = 70
export const CHAT_INPUT_HEIGHT = 57

export const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 70 : 100;