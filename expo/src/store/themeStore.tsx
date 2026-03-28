// store/useThemeStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Platform, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect } from 'react'

type ThemeColors = {
	primary: string
	background: string
	text: string
	textMuted: string
	icon: string
	screenBackground: string
	maximumTrackTintColor: string
	minimumTrackTintColor: string
	disabled: string
	error: string
	formBackground: string
	formTitle: string
	formDescription: string
	inputBackground: string
	inputText: string
	inputBorder: string
        border?: string
        buttonBackground?: string
        buttonText?: string
}

const baseColors = {
	primary: '#FF9F40',
	error: '#FF3B30',
}

const lightColors: ThemeColors = {
	...baseColors,
	background: '#FFFFFF',
	text: '#000000',
	textMuted: '#A1A1AA',
	icon: '#000000',
	screenBackground: '#FFFFFF',
	maximumTrackTintColor: 'rgba(0,0,0,0.4)',
	minimumTrackTintColor: 'rgba(0,0,0,0.6)',
	disabled: '#A1A1A1',
	formBackground: '#FFFFFF',
	formTitle: '#000000',
	formDescription: '#000000',
	inputBackground: '#FFFFFF',
	inputText: '#000000',
        inputBorder: '#000000',
        border: '#000000',
        buttonBackground: '#000000',
        buttonText: '#FFFFFF',
}

const darkColors: ThemeColors = {
	...baseColors,
	background: '#0A0A0A',
	text: '#FFFFFF',
        textMuted: '#9CA3AF',
	icon: '#FFFFFF',
	screenBackground: '#000000',
	maximumTrackTintColor: 'rgba(255,255,255,0.4)',
	minimumTrackTintColor: 'rgba(255,255,255,0.6)',
	disabled: '#4B5563',
        formBackground: '#0A0A0A',
	formTitle: '#FFFFFF',
	formDescription: '#FFFFFF',
        inputBackground: '#0A0A0A',
	inputText: '#FFFFFF',
        inputBorder: '#333333',
        border: '#374151',
        buttonBackground: '#FFFFFF',
        buttonText: '#000000',
}

export const fontSize = {
	'3xl': 32,
	'2xl': 28,
	xl: 26,
	lg: 24,
	base: 20,
	sm: 16,
	xs: 12,
	'2xs': 10,
	h1: 30,
	h2: 26,
	h3: 22,
	h4: 18,
	caption: 14,
	button: 18,
	input: 16,
	label: 14,
	helper: 12,
} as const

export const spacing = {
	screenPadding: {
		horizontal: 24,
	},
	FLOATING_PLAYER_HEIGHT: 94,
	CHAT_INPUT_HEIGHT: 57,
	TAB_BAR_HEIGHT: Platform.OS === 'android' ? 70 : 100,
} as const

type ThemeStore = {
	isDark: boolean
	isSystemTheme: boolean
	colors: ThemeColors
	toggleTheme: () => void
	setTheme: (isDark: boolean) => void
	setUseSystemTheme: (useSystem: boolean) => void
    syncWithSystem: (systemColorScheme?: 'light' | 'dark' | null) => void
}

export const useThemeStore = create<ThemeStore>()(
	persist(
		(set, get) => ({
			isDark: false,
			isSystemTheme: true,
			colors: lightColors,
			toggleTheme: () => {
				const newIsDark = !get().isDark
				set({
					isDark: newIsDark,
					isSystemTheme: false,
					colors: newIsDark ? darkColors : lightColors,
				})
			},
			setTheme: (isDark: boolean) => {
				set({
					isDark,
					isSystemTheme: false,
					colors: isDark ? darkColors : lightColors,
				})
			},
            setUseSystemTheme: (useSystem: boolean) => {
                set({ isSystemTheme: !!useSystem })
            },
            syncWithSystem: (systemColorScheme?: 'light' | 'dark' | null) => {
                const { isSystemTheme } = get()
                if (isSystemTheme && systemColorScheme) {
                    set({
                        isDark: systemColorScheme === 'dark',
                        colors: systemColorScheme === 'dark' ? darkColors : lightColors,
                    })
                }
            },
		}),
		{
			name: 'theme-storage',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
)

// Hook de utilidad para sincronizar con el tema del sistema
export const useSystemThemeSync = () => {
	const systemTheme = useColorScheme()
	const syncWithSystem = useThemeStore((state) => state.syncWithSystem)

	useEffect(() => {
        syncWithSystem(systemTheme)
    }, [systemTheme, syncWithSystem])
}