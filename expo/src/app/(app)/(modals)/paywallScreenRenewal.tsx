import React from 'react';
import { useRouter } from 'expo-router';
import PaywallScreenRenewal from '@/components/PaywallScreenRenewal';

export default function PaywallModal() {
  const router = useRouter();

  const handleComplete = () => {
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <PaywallScreenRenewal
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
} 