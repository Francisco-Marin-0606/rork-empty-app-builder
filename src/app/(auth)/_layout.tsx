// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function AuthLayout() {
  const { session, isLoading } = useAuthStore();

  // Solo redirigimos cuando hay una sesión válida
  if (session && !isLoading) {
    return <Redirect href="/login" />;
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
      <Stack.Screen 
        name="verification" 
        options={{
          title: 'Verificación',
          headerBackVisible: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="(onboarding)/OnBoardingHypnosisScreen" 
        options={{
          title: 'Onboarding',
          headerBackVisible: false,
          animation: 'slide_from_right',
        }}
      />
        <Stack.Screen 
          name="(onboarding)/form-wizard" 
          options={{
            title: 'Onboarding',
            headerBackVisible: false,
            animation: 'slide_from_right',
          }}
        />
      <Stack.Screen 
        name="loginView" 
        options={{
          title: 'Login',
          headerBackVisible: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="unavailableRegistration" 
        options={{
          title: 'Unavailable Registration',
          headerBackVisible: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="confirmedWaitlist" 
        options={{
          title: 'Confirmed Waitlist',
          headerBackVisible: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}