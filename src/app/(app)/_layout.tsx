import { Stack, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSimpleAuthStore } from '@/store/simpleAuthStore'
import { useEffect } from 'react'

export default function AppLayout() {
	const { isAuthenticated, isLoading, initialize } = useSimpleAuthStore()

	useEffect(() => {
		initialize()
	}, [])

	if (isLoading) {
		return null
	}

	if (!isAuthenticated) {
		return <Redirect href="/(auth)/login" />
	}

	return (
		<SafeAreaProvider>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<View style={{ flex: 1, backgroundColor: '#000' }}>
					<Stack
						screenOptions={{
							headerShown: false,
							animation: 'fade',
						}}
					>
						<Stack.Screen name="(tabs)" />
					</Stack>
					<StatusBar style="light" backgroundColor="transparent" translucent={true} />
				</View>
			</GestureHandlerRootView>
		</SafeAreaProvider>
	)
}
