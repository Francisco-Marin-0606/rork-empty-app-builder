import React from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { useAuthStore, useRequestHipnosisStore } from '../store/authStore';
import { setupInterceptors, setupSecondaryApiInterceptors } from '@/services/api/setupInterceptors';
import SessionExpiredModal from '@/components/SessionExpiredModal';
import { useSessionManager } from '@/store/sessionManager';
import { useChatSuggestionsStore } from '@/store/chatSuggestionsStore';

import * as Sentry from '@sentry/react-native';
import { mobileReplayIntegration } from '@sentry/react-native';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';


// Importar los servicios de analytics y deeplinks
import { analyticsService } from '@/services/analytics/AnalyticsService';
import { appFlyerService } from '@/services/analytics/AppFlyerService';
import { deeplinkService } from '@/helpers/DeeplinkService';

//TODO: Remove this and check why reanimated is sending so many warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});


if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://2becdadd7a53a7102418564886262a95@o4508667613151232.ingest.us.sentry.io/4509075420872704',
    environment: 'production',
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    integrations: [mobileReplayIntegration({
      maskAllText: true,
      maskAllImages: true,
      maskAllVectors: true,
      // Adjust the default options
    })],
    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: __DEV__,
  });
}

function Root() {
  const { initialize, isLoading, isInVerificationFlow, initializeDeviceInfo } = useAuthStore();
  const { resetRequestHipnosis } = useRequestHipnosisStore();
  const { isSessionExpiredModalVisible, hideSessionExpiredModal, userEmail } = useSessionManager();
  const { initialize: initializeChatSuggestions } = useChatSuggestionsStore();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();

    const prepare = async () => { 
      try {
        // Resetear el flag del modal de requestHipnosis al iniciar la app
        resetRequestHipnosis();
        
        // Inicializar la información del dispositivo primero
        await initializeDeviceInfo();
        // Configurar interceptores después de tener la info del dispositivo
        setupInterceptors();
        setupSecondaryApiInterceptors();

        // Inicializar servicios de analytics y deeplinks
        analyticsService.initialize();
        await appFlyerService.initialize();

        // Luego inicializar la autenticación
        await initialize();
        
        // Inicializar el store de sugerencias de chat
        await initializeChatSuggestions();

        // Actualizar el ID de usuario en los servicios de analytics si está disponible
        const userId = useAuthStore.getState().userId;
        if (userId) {
          analyticsService.setUserId(userId);
        }
        appFlyerService.setupDeepLinkHandling((result) => {
            deeplinkService.handleDeepLink(result);
          }
        );

        // Marcar que la app está lista
        setAppIsReady(true);
      } catch (e) {
        console.error('Error during initialization:', e);
        // Incluso en caso de error, marcar la app como lista
        setAppIsReady(true);
      }
    };

    prepare();
  }, [initialize, initializeDeviceInfo, initializeChatSuggestions]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Ocultar el splash screen una vez que la UI está lista para renderizarse
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // Si la app no está lista, no renderizar nada (el splash screen nativo seguirá visible)
  if (!appIsReady) {
    return Platform.OS === 'android' ? <View style={{ flex: 1, backgroundColor: 'black' }}></View> : null;
  }

  // Mantener la lógica existente para el splash screen personalizado
  if ((isLoading && !isInVerificationFlow)) {
    return Platform.OS === 'android' ? <View style={{ flex: 1, backgroundColor: 'black' }}></View> : null;
  }

  return (
    <View style={{ flex: 1 , backgroundColor: 'black'}} onLayout={onLayoutRootView}>
      <Slot />
      
      {/* Modal para sesión expirada */}
      <SessionExpiredModal 
        isVisible={isSessionExpiredModalVisible}
        onClose={hideSessionExpiredModal}
        email={userEmail}
      />
    </View>
  );
}

export default Sentry.wrap(Root);


