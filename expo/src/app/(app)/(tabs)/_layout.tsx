import React from 'react'
import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { Headphones, MessageCircle, Calendar, Sparkles } from 'lucide-react-native'

const TabsNavigation = () => {
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: '#4CAF50',
				tabBarInactiveTintColor: '#666',
				tabBarStyle: {
					backgroundColor: '#000',
					borderTopWidth: 1,
					borderTopColor: '#222',
					height: Platform.OS === 'android' ? 60 : 80,
					paddingBottom: Platform.OS === 'android' ? 8 : 24,
					paddingTop: 8,
				},
				headerShown: false,
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: '500',
				},
			}}
		>
			<Tabs.Screen
				name="(audios)"
				options={{
					title: 'Audios',
					tabBarIcon: ({ color, size }) => (
						<Headphones size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name="chat"
				options={{
					href: null,
					title: 'Chat',
					tabBarIcon: ({ color, size }) => (
						<MessageCircle size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name="events"
				options={{
					href: null,
					title: 'Eventos',
					tabBarIcon: ({ color, size }) => (
						<Calendar size={size} color={color} />
					),
				}}
			/>

			<Tabs.Screen
				name="aura"
				options={{
					href: null,
					title: 'Aura',
					tabBarIcon: ({ color, size }) => (
						<Sparkles size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	)
}

export default TabsNavigation
