import { Stack } from 'expo-router'

export default function AuraLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="album" />
    </Stack>
  )
}
