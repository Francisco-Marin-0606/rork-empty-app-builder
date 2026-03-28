import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import RequestHipnosisScreen from '@/components/RequestHipnosisScreen';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore, useRequestHipnosisStore } from '@/store/authStore';

export default function RequestHipnosisModal() {
  const router = useRouter();
  const setIsFloatingPlayerVisible = usePlayerStore((state) => state.setIsFloatingPlayerVisible);
  const { setRequestHipnosis } = useRequestHipnosisStore();
  const { isProfileComplete } = useAuthStore();
  
  const handleRequestHipnosis = () => {
    // Resetear el flag para evitar que vuelva a aparecer
    setRequestHipnosis(false);


    if (!isProfileComplete) {
      router.replace({
        pathname: '/(app)/(modals)/forms/userPersonalDataFormInitial'
      })
    } else {
      router.replace({
        pathname: '/(app)/(modals)/forms/questionsForm'
      })
    }

  };

  const handleBack = () => {
    // Resetear el flag para evitar que vuelva a aparecer
    setRequestHipnosis(false);
    router.back();
  };

  useEffect(() => {
    setIsFloatingPlayerVisible(false);
  }, []);

  return (
    <RequestHipnosisScreen
      onRequestHipnosis={handleRequestHipnosis}
      onBack={handleBack}
    />
  );
} 