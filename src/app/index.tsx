import { Redirect } from 'expo-router'
import { useSimpleAuthStore } from '@/store/simpleAuthStore'
import { View, ActivityIndicator } from 'react-native'
import { useEffect } from 'react'

export default function Index() {
  const { isAuthenticated, isLoading, initialize } = useSimpleAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/(audios)" />
  }

  return <Redirect href="/(auth)/login" />
}
