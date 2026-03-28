import { Stack } from 'expo-router';
import { useSimpleAuthStore } from '@/store/simpleAuthStore';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function AuthLayout() {
  const { isAuthenticated, isLoading, initialize } = useSimpleAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/(audios)" />;
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{
          title: 'Iniciar sesión',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}