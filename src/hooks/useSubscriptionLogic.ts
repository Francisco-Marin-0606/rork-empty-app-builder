import { useCallback } from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAppConfig } from './useAppConfig';
import { colors } from '@/constants/tokens';

/**
 * Hook para manejar la lógica de suscripción basada en enabledStripe
 * Si enabledStripe es false -> va a RevenueCat
 * Si enabledStripe es true -> abre un link
 */
export const useSubscriptionLogic = () => {
  const { getConfig } = useAppConfig();

  const handleSubscription = useCallback(async () => {
    try {
      // Obtener el valor de enabledStripe desde la configuración
      const enabledStripe = getConfig('redirectStripe.enabledStripe', false);
      const linkStripe = getConfig('redirectStripe.linkStripe', '');

      // console.log('[useSubscriptionLogic] enabledStripe:', enabledStripe);
      // console.log('[useSubscriptionLogic] linkStripe:', linkStripe);
      // console.log('[useSubscriptionLogic] Configuración completa:', getConfig('', null));

      if (enabledStripe && linkStripe) {
        // Si enabledStripe es true, abrir el enlace
        // console.log('[useSubscriptionLogic] Abriendo enlace externo:', linkStripe);
        await WebBrowser.openBrowserAsync(linkStripe, {
          controlsColor: colors.primary || '#FF9F40',
          toolbarColor: 'black',
          enableBarCollapsing: true,
          showTitle: true
        });
      } else {
        // Si enabledStripe es false, ir a RevenueCat
        // console.log('[useSubscriptionLogic] Redirigiendo a RevenueCat');
        router.push('/(app)/(modals)/paywallScreenRenewal');
      }
    } catch (error) {
      console.error('[useSubscriptionLogic] Error al manejar suscripción:', error);
      // En caso de error, por defecto ir a RevenueCat
      router.push('/(app)/(modals)/paywallScreenRenewal');
    }
  }, [getConfig]);

  return {
    handleSubscription
  };
};
