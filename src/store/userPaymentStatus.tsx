import React from 'react';
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { colors } from '@/constants/tokens';
import { AppConfigCacheService } from '@/services/cache/appConfigCacheService';

export interface SubscriptionState {
  isActive: boolean;
  isCancelled: boolean;
  expirationDate: Date | null;
  type: 'trial' | 'monthly' | 'yearly' | null;
}

interface UserPaymentStatus {
  subscription: SubscriptionState;
  
  // Actions
  updateSubscriptionState: (subscription: SubscriptionState) => void;
  checkSubscriptionStatus: () => boolean;
  
  // Validation methods for blocked flows
  validateHypnosisPlay: () => boolean;
  validateDownload: () => boolean;
  validatePsychologistMessage: () => boolean;
  validateAura: () => boolean;
  
  // Navigation to paywall
  redirectToPaywall: () => void;
  
  // Initialize subscription from auth store
  initializeFromAuth: () => void;
}

export const usePaymentStatus = create<UserPaymentStatus>((set, get) => ({
  subscription: {
    isActive: false,
    isCancelled: false,
    expirationDate: null,
    type: null,
  },

  updateSubscriptionState: (subscription: SubscriptionState) => {
    set({ subscription });
  },

  checkSubscriptionStatus: () => {
    // const { subscription } = get();
    
    // // Si la suscripción está cancelada, siempre es inactiva
    // if (subscription.isCancelled) {
    //   return false;
    // }
    
    // // Si no hay fecha de expiración, considerar inactiva
    // if (!subscription.expirationDate) {
    //   return false;
    // }
    
    // // Verificar si la suscripción ha expirado
    // const now = new Date();
    // const isActive = now.getTime() <= subscription.expirationDate.getTime();
    
    // // Actualizar el estado si es necesario
    // if (subscription.isActive !== isActive) {
    //   set({
    //     subscription: {
    //       ...subscription,
    //       isActive
    //     }
    //   });
    // }
    
    return true;
  },

  validateHypnosisPlay: () => {
    const isActive = get().checkSubscriptionStatus();
    if (!isActive) {
      get().redirectToPaywall();
      return false;
    }
    return true;
  },

  validateDownload: () => {
    const isActive = get().checkSubscriptionStatus();
    if (!isActive) {
      get().redirectToPaywall();
      return false;
    }
    return true;
  },

  validatePsychologistMessage: () => {
    const isActive = get().checkSubscriptionStatus();
    if (!isActive) {
      get().redirectToPaywall();
      return false;
    }
    return true;
  },

  validateAura: () => {
    const isActive = get().checkSubscriptionStatus();
    if (!isActive) {
      get().redirectToPaywall();
      return false;
    }
    return true;
  },

  redirectToPaywall: async () => {
    try {
      // Obtener el valor de enabledStripe desde la configuración
      const configData = await AppConfigCacheService.getInstance().getConfigs();
      const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
      const linkStripe = configData?.redirectStripe?.linkStripe || '';

      console.log('[redirectToPaywall] Configuración completa:', JSON.stringify(configData, null, 2));
      console.log('[redirectToPaywall] enabledStripe:', enabledStripe);
      console.log('[redirectToPaywall] linkStripe:', linkStripe);

      if (enabledStripe && linkStripe) {
        // Si enabledStripe es true, abrir el enlace
        console.log('[redirectToPaywall] Abriendo enlace externo:', linkStripe);
        await WebBrowser.openBrowserAsync(linkStripe, {
          controlsColor: colors.primary || '#FF9F40',
          toolbarColor: 'black',
          enableBarCollapsing: true,
          showTitle: true
        });
      } else {
        // Si enabledStripe es false, ir a RevenueCat
        console.log('[redirectToPaywall] Redirigiendo a RevenueCat');
        router.push('/(app)/(modals)/paywallScreenRenewal');
      }
    } catch (error) {
      console.error('[redirectToPaywall] Error al manejar suscripción:', error);
      // En caso de error, por defecto ir a RevenueCat
      router.push('/(app)/(modals)/paywallScreenRenewal');
    }
  },

  initializeFromAuth: () => {
    const authStore = useAuthStore.getState();
    const { userData, isMembershipActive, membershipExpirationDate } = authStore;
    
    if (userData?.lastMembership) {
      const membership = userData.lastMembership;
      
      set({
        subscription: {
          isActive: isMembershipActive,
          isCancelled: !isMembershipActive && membershipExpirationDate !== null,
          expirationDate: membershipExpirationDate,
          type: membership.type as 'trial' | 'monthly' | 'yearly' || null,
        }
      });
    }
  },
}));

// Hook para sincronizar con el authStore
export const useSyncUserStore = () => {
  const { initializeFromAuth } = usePaymentStatus();
  const { userData, isMembershipActive, membershipExpirationDate } = useAuthStore();
  
  // Sincronizar cuando cambien los datos de auth
  React.useEffect(() => {
    initializeFromAuth();
  }, [userData, isMembershipActive, membershipExpirationDate, initializeFromAuth]);
}; 