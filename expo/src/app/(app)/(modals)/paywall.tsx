import React from 'react';
import { useRouter } from 'expo-router';
import PaywallScreen from '@/components/PaywallScreen';

export default function PaywallModal() {
  const router = useRouter();

  const handleComplete = () => {
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <PaywallScreen
      onComplete={handleComplete}
      onBack={handleBack}
      formData={{}}
    />
  );
} 