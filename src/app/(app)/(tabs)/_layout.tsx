import React from 'react'
import { colors, fontSize } from '@/constants/tokens'
import { Tabs, useSegments } from 'expo-router'
import { Platform, Image, View } from 'react-native'
import {
	IconBrandLine,
	IconChartBubbleFilled,
	IconHeadphonesFilled,
} from '@tabler/icons-react-native'
import { useAppConfigStore } from '@/store/appConfigStore'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import iconoAura from '@/assets/Images/icono_aura.png'

const DEFAULT_TABS_CONFIG = {
	events: {
		available: false,
	},
	audios: {
		available: true,
	},
	chat: {
		available: false, // Deshabilitado por defecto hasta que se cargue la configuración
	},
	profile: {
		available: true,
	},
	aura: {
		available: true,
	},
}

const TabsNavigation = () => {
	const { configs } = useAppConfigStore()
	const { userData } = useAuthStore()
	const [tabsConfig, setTabsConfig] = useState(DEFAULT_TABS_CONFIG)
	const segments = useSegments();
	const [album, setAlbum] = useState<boolean>(false);
	
	// Detectar si estamos en la sección de Aura
	const isAuraSection = segments.includes('aura');


	useEffect(() => {
		try {
			// Validamos la existencia del objeto configs y sus propiedades
			if (configs?.tabs) {
				setTabsConfig({
					events: {
						available: configs.tabs?.events?.available ?? DEFAULT_TABS_CONFIG.events.available,
					},
					audios: {
						available: configs.tabs?.audios?.available ?? DEFAULT_TABS_CONFIG.audios.available,
					},
					chat: {
						available: configs.tabs?.chat?.available ?? DEFAULT_TABS_CONFIG.chat.available,
					},
					profile: {
						available: configs.tabs?.profile?.available ?? DEFAULT_TABS_CONFIG.profile.available,
					},
					aura: {
						available: (configs.tabs?.aura?.available ?? DEFAULT_TABS_CONFIG.aura.available) && (userData.auraEnabled ?? false),
					},
				})
			}
		} catch (error) {
			console.error('Error processing tabs config:', error)
			// En caso de error, mantenemos los valores por defecto
			setTabsConfig(DEFAULT_TABS_CONFIG)
		}
	}, [configs, userData])

	useEffect(() => {
		setAlbum(String(segments).includes('album'))
	}, [segments])

	return (
		<>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: colors.text || '',
					tabBarLabelStyle: {
						fontSize: fontSize.xs,
						fontWeight: '500',
					},
					headerShown: false,
					tabBarStyle: {
						justifyContent: 'center',
						paddingBottom: Platform.OS === 'android' ? 25 : 34,
						alignItems: 'center',
						flexDirection: 'row',
						height: Platform.OS === 'android' ? 70 : 100,
						borderTopWidth: 0,
						backgroundColor: isAuraSection ? '#000000' : colors.screenBackground,
						paddingHorizontal: 40,
					},
					tabBarLabel: () => {
						return null
					},
				}}
			>
				<Tabs.Screen
					name="(audios)"
					options={{
						href: !tabsConfig.audios.available ? null : '/(app)/(tabs)/(audios)',
						title: 'Audios',
						tabBarIcon: ({ color }: any) => (
							<View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
								<IconHeadphonesFilled
									fill={color}
									size={30}
									color={color}
									strokeWidth={0}
								></IconHeadphonesFilled>
							</View>
						),
					}}
				></Tabs.Screen>

				<Tabs.Screen
					name="chat"
					options={{
						href: !tabsConfig.chat.available ? null : '/chat',
						title: 'Chat',
						tabBarIcon: ({ color }: any) => (
							<View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
								<IconBrandLine fill={color} size={30} color={color} strokeWidth={0} />
							</View>
						),

						// <IconBubbleFilled fill={color} size={30} color={color} strokeWidth={0}/>
					}}
				></Tabs.Screen>

				<Tabs.Screen
					name="events"
					options={{
						href: null,
						title: 'Eventos',
						tabBarIcon: ({ color }: any) => (
							<View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
								<IconChartBubbleFilled
									fill={color}
									size={30}
									color={color}
									strokeWidth={0}
								></IconChartBubbleFilled>
							</View>
						),
					}}
				></Tabs.Screen>

				<Tabs.Screen
					name="aura"
					options={{
						href: !tabsConfig.aura.available ? null : (album ? '/aura/album' : '/aura'),
						title: 'Aura',
						tabBarIcon: ({ color }: any) => (
							<View style={{ width: 90, alignItems: 'center', justifyContent: 'center' }}>
								<Image
									source={iconoAura}
									style={{ width: 30, height: 30, tintColor: color }}
									resizeMode="contain"
								/>
							</View>
						),
					}}
				></Tabs.Screen>
			</Tabs>
		</>
	)
}

export default TabsNavigation
