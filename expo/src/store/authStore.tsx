import { create } from 'zustand';
import { setStorageItemAsync, getStorageItemAsync, setObjectAsync, getObjectAsync } from './secureStorage';
import { Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { AuthService, GetCodeCrendentials } from '../services/api/authService';
import { LoginCredentials, RegisterData } from '@/services/api/authService';
import { UserService } from '@/services/api/userService';
import apiManager from '@/services/api/apiManager';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { useQueueStore } from './queue';
import Purchases, { CustomerInfo } from 'react-native-purchases';
 import Constants from 'expo-constants';
 import { analyticsService } from '@/services/analytics/AnalyticsService';

interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  deviceType: string;
  osVersion: string;
  appVersion: string;
}

export interface UpdateUserData {
  names: string;
  lastnames: string;
  wantToBeCalled: string;
  gender: string;
  birthdate: string;
}

export interface UserData {
  names: string;
  lastnames: string;
  wantToBeCalled: string;
  email: string;
  gender: string;
  birthdate: string;
  cellphone: string;
  availableRequest: number;
  lastMembership: {
    membershipId: string;
    membershipDate: string;
    type: string;
  };
  processorData?: {
    appId: string;
    customId: string;
  };
  test?: string;
}

interface RequestHipnosisState {
  requestHipnosis: boolean;
  hasShownRequestHipnosisThisSession: boolean;
  setRequestHipnosis: (requestHipnosis: boolean) => void;
  setHasShownRequestHipnosisThisSession: (hasShown: boolean) => void;
  resetRequestHipnosis: () => void;
}

interface AuthState {
  session: string | null;
  userId: string | null;
  userData: any | null;
  deviceInfo: DeviceInfo | null;
  isLoading: boolean;
  error: string | null;
  isInVerificationFlow: boolean;
  isMembershipActive: boolean;
  membershipExpirationDate: Date | null;
  isProfileComplete: boolean;
  revenueCatCustomerInfo: CustomerInfo | null;
  isRevenueCatSubscriptionActive: boolean;
  isRevenueCatTrialCancelled: boolean;
  revenueCatSubscriptionType: string | null;
  initialize: () => Promise<void>;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  getCode: (credentials: GetCodeCrendentials) => Promise<boolean>;
  signUp: (data: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  fetchUserData: () => Promise<void>;
  initializeDeviceInfo: () => Promise<void>;
  getDeviceInfo: () => DeviceInfo;
  checkMembershipStatus: () => boolean;
  getRemainingDays: () => number | null;
  checkProfileCompletion: () => boolean;
  clearUserStorage: () => Promise<void>;
  automaticSignIn: (token: string, userId: string) => Promise<void>;
  configureRevenueCat: () => Promise<void>;
  checkRevenueCatSubscription: () => Promise<void>;
}

export const APIKeys = {
  apple: "appl_JIgqffPngTJdriVoNIdXjDxZisc",
  google: "goog_NxdUftDeAYMdsAdqhvDiiNOZnKi",
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userId: null,
  userData: null,
  isLoading: true,
  error: null,
  isInVerificationFlow: false,
  deviceInfo: null,
  isMembershipActive: false,
  membershipExpirationDate: null,
  isProfileComplete: false,
  revenueCatCustomerInfo: null,
  isRevenueCatSubscriptionActive: false,
  isRevenueCatTrialCancelled: false,
  revenueCatSubscriptionType: null,
  initializeDeviceInfo: async () => {
    try {
      const ipAddress = await Network.getIpAddressAsync();
      const deviceInfo = {
        deviceId: Device.deviceName || 'unknown',
        ipAddress: ipAddress || 'unknown',
        deviceType: Device.deviceType === Device.DeviceType.PHONE ? 'phone' :
        Device.deviceType === Device.DeviceType.TABLET ? 'tablet' : 'unknown',
        osVersion: Platform.OS + ' ' + Platform.Version,
        appVersion: Constants.expoConfig?.version || '1.0.0'
      };

      set({ deviceInfo });

      // Also set device info on apiManager and analyticsService to avoid circular dependency
      apiManager.setDeviceInfo(deviceInfo);
      analyticsService.setDeviceInfo(deviceInfo);

      // Guardar usando nuestra función mejorada para objetos JSON
      await setObjectAsync('deviceInfo', deviceInfo);
    } catch (error) {
      console.error('Error initializing device info:', error);
    }
  },
  checkMembershipStatus: () => {
    const { userData, revenueCatCustomerInfo } = get();
    
    // Si el usuario tiene processorData, usar RevenueCat
    if (userData?.processorData?.customId) {
      const isActive = get().isRevenueCatSubscriptionActive;
      set({
        isMembershipActive: isActive,
        membershipExpirationDate: null // RevenueCat maneja sus propias fechas
      });
      return isActive;
    }
    
    // Lógica existente para usuarios sin RevenueCat
    // //console.log('[AuthStore] Verificando estado de membresía:', 
    //   userData?.lastMembership ? 'Hay datos de membresía' : 'No hay datos de membresía');
    
    // Si no hay datos de membresía, intentar obtenerlos del almacenamiento
    if (!userData?.lastMembership) {
      getObjectAsync('lastMembership')
        .then(savedMembership => {
          if (savedMembership) {
            //console.log('[AuthStore] Recuperando membresía del almacenamiento local');
            const currentUserData = get().userData || {};
            set({ 
              userData: { 
                ...currentUserData, 
                lastMembership: savedMembership 
              } 
            });
            // Llamar recursivamente para verificar con los datos recuperados
            get().checkMembershipStatus();
          }
        })
        .catch(err => {
          console.error('[AuthStore] Error al recuperar membresía del almacenamiento:', err);
        });
      
      // Por ahora devolvemos false, pero la llamada recursiva actualizará el estado
      set({
        isMembershipActive: false,
        membershipExpirationDate: null
      });
      return false;
    }

    // Creamos las fechas asegurándonos que se interpreten en UTC
    const membershipDate = new Date(userData.lastMembership.membershipDate);
    //console.log('[AuthStore] Fecha de membresía:', membershipDate.toISOString());
    
    const expirationDate = new Date(membershipDate);
    expirationDate.setUTCMonth(expirationDate.getUTCMonth() + 1);
    //console.log('[AuthStore] Fecha de expiración:', expirationDate.toISOString());

    // Comparamos con la fecha actual en UTC
    const now = new Date();
    //console.log('[AuthStore] Fecha actual:', now.toISOString());
    
    const isActive = now.getTime() <= expirationDate.getTime();
    //console.log('[AuthStore] ¿Membresía activa?:', isActive);

    set({
      isMembershipActive: isActive,
      membershipExpirationDate: expirationDate
    });

    // Guardar datos de la membresía localmente para uso sin conexión
    if (userData.lastMembership) {
      setObjectAsync('lastMembership', userData.lastMembership)
        .then(() => console.log('[AuthStore] Datos de membresía guardados localmente'))
        .catch(err => console.error('[AuthStore] Error al guardar datos de membresía:', err));
    }

    return isActive;
  },

  getRemainingDays: () => {
    const { membershipExpirationDate } = get();
    if (!membershipExpirationDate) return null;

    const today = new Date();
    const diffTime = membershipExpirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  },
  getDeviceInfo: () => {
    const state = get();
    return state.deviceInfo || {
      deviceId: 'unknown',
      ipAddress: 'unknown',
      deviceType: 'unknown',
      osVersion: 'unknown',
      appVersion: 'unknown'
    };
  },
  initialize: async () => {
    try {
      const savedSession = await getStorageItemAsync('session');
      const savedUserId = await getStorageItemAsync('userId');
      const savedDeviceInfo = await getObjectAsync<DeviceInfo>('deviceInfo');
      const savedMembership = await getObjectAsync('lastMembership');
      
      //console.log('[AuthStore] Inicializando con membresía guardada:', savedMembership ? 'Sí' : 'No');

      // Establecer datos básicos
      set({
        session: savedSession,
        userId: savedUserId,
        deviceInfo: savedDeviceInfo
      });

      // Set device info on apiManager and analyticsService if available
      if (savedDeviceInfo) {
        apiManager.setDeviceInfo(savedDeviceInfo);
        analyticsService.setDeviceInfo(savedDeviceInfo);
      }

      // Configurar usuario actual en AudioDownloadService si hay un userId guardado
      if (savedUserId) {
        const { AudioDownloadService } = require('@/services/audioDownloadService');
        await AudioDownloadService.setCurrentUser(savedUserId);
      }

      // Inicializar info del dispositivo si no existe
      if (!savedDeviceInfo) {
        await get().initializeDeviceInfo();
      }

      // Cargar datos locales de membresía primero en cualquier caso
      if (savedMembership) {
        //console.log('[AuthStore] Cargando datos de membresía guardados localmente');
        const userData = get().userData || {};
        set({ 
          userData: { 
            ...userData, 
            lastMembership: savedMembership 
          } 
        });
      }

      // Si hay sesión activa, intentar cargar datos completos
      if (savedSession && savedUserId) {
        await get().fetchUserData();
        
        // Configurar RevenueCat si el usuario tiene processorData
        const userData = get().userData;
        if (userData?.processorData?.customId) {
          await get().configureRevenueCat();
          await get().checkRevenueCatSubscription();
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error initializing auth store:', error);
      set({ isLoading: false });
      
      // Incluso en caso de error, intentar verificar membresía con datos locales
      get().checkMembershipStatus();
    }
  },
  checkProfileCompletion: () => {
    const { userData } = get();
    if (!userData) return false;

    const isComplete = Boolean(
      userData.wantToBeCalled?.trim() &&
      userData.gender?.trim() &&
      userData.birthdate?.trim()
    );

    ////console.log("isComplete",isComplete)

    set({ isProfileComplete: isComplete });
    return isComplete;
  },
  fetchUserData: async () => {
    try {
      const { userId, session } = get();
      
      // Cargar membresía guardada localmente primero
      const savedMembership = await getObjectAsync('lastMembership');
      const currentUserData = get().userData || {};
      
      // Si hay membresía guardada localmente, usarla temporalmente
      if (savedMembership) {
        set({ 
          userData: { 
            ...currentUserData, 
            lastMembership: savedMembership 
          } 
        });
      }

      // Si no hay sesión o ID, mantener lo que tenemos
      if (!userId || !session) return;

      // Intentar obtener datos del servidor
      const response = await UserService.getUserData(userId);
      
      // Combinar con datos existentes en caso que la respuesta no tenga todos los campos
      set({ 
        userData: {
          ...currentUserData,
          ...response,
          // Asegurar que no perdemos lastMembership si la respuesta no lo incluye
          lastMembership: response.lastMembership || currentUserData.lastMembership || savedMembership
        } 
      });

      // Guardar datos de membresía si están disponibles
      if (response?.lastMembership) {
        await setObjectAsync('lastMembership', response.lastMembership);
        //console.log('[AuthStore] Datos de membresía actualizados localmente');
      }

      // Si el usuario tiene processorData, configurar y verificar RevenueCat
      if (response?.processorData?.customId) {
        await get().configureRevenueCat();
        await get().checkRevenueCatSubscription();
      }

      get().checkProfileCompletion();
      get().checkMembershipStatus();

    } catch (error: any) {
      console.error('Error fetching user data:', error);
      set({
        error: error.message || 'Error al obtener datos del usuario'
      });
      
      // Si hay error (probablemente sin conexión), asegurar que verificamos membresía con datos locales
      get().checkMembershipStatus();
    }
  },
  getCode: async (credentials) => {
    try {
      ////console.log('Iniciando getCode en store...');
      set({ isLoading: false, error: null });
      const response = await AuthService.getCode(credentials);
      ////console.log('Respuesta del servicio getCode:', response);

      // Asegurarnos que la sesión está en null; el control del flujo de verificación lo maneja la UI
      set({
        session: null,
        isLoading: false
      });

      return response;
    } catch (error: any) {
      ////console.log('Error en getCode:', error);
      set({
        error: error.message || 'Error al iniciar sesión',
        isLoading: false
      });
      throw error;
    }
  },
  signIn: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await AuthService.login(credentials);
      
      set({
        session: response.token,
        isInVerificationFlow: false,
        userId: response.userId
      });
      
      await setStorageItemAsync('session', response.token);
      await setStorageItemAsync('userId', response.userId);
      analyticsService.setUserId(response.userId);
      // Configurar usuario actual en AudioDownloadService
      const { AudioDownloadService } = require('@/services/audioDownloadService');
      await AudioDownloadService.setCurrentUser(response.userId);

      // Obtener datos del usuario después de iniciar sesión
      await get().fetchUserData();
      await get().getDeviceInfo();

      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Error al iniciar sesión',
        isLoading: false
      });
      throw error;
    }
  },
  signUp: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await AuthService.register(data);
      set({
        session: response.token,
        userId: response.userId,
        isLoading: false
      });
      await setStorageItemAsync('session', response.token);
    } catch (error: any) {
      set({
        error: error.message || 'Error al registrarse',
        isLoading: false
      });
      throw error;
    }
  },
  signOut: async () => {
    set({ isLoading: true });
    try {
      // Logout de RevenueCat si está configurado
      const userData = get().userData;
      if (userData?.processorData?.customId) {
        try {
          // await Purchases.logOut();
        } catch (error) {
          console.error('Error logging out from RevenueCat:', error);
        }
      }
      
      // Limpiar estado de autenticación
      set({
        session: null,
        userId: null,
        userData: null,
        isInVerificationFlow: false,
        isMembershipActive: false,
        membershipExpirationDate: null,
        isProfileComplete: false,
        revenueCatCustomerInfo: null,
        isRevenueCatSubscriptionActive: false,
        isRevenueCatTrialCancelled: false
      });
      
      // Limpiar usuario actual en AudioDownloadService
      const { AudioDownloadService } = require('@/services/audioDownloadService');
      await AudioDownloadService.setCurrentUser(null);
      
      // Limpieza completa del almacenamiento
      await get().clearUserStorage();
      
      // Resetear el reproductor y la biblioteca
      await TrackPlayer.reset();
      // Importación dinámica para evitar ciclo de dependencias
      const { useLibraryStore } = require('./library');
      useLibraryStore.getState().reset();
      useQueueStore.getState().resetQueue();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  clearError: () => set({ error: null }),
  clearUserStorage: async () => {
    try {
      //console.log('[AuthStore] Limpiando todos los datos de usuario del almacenamiento');
      
      // Lista de claves a eliminar
      const keysToRemove = [
        'session',
        'userId',
        'lastMembership'
      ];
      
      // Eliminar cada clave
      for (const key of keysToRemove) {
        if (key === 'lastMembership') {
          await setObjectAsync(key, null);
        } else {
          await setStorageItemAsync(key, null);
        }
      }
      
      //console.log('[AuthStore] Datos de usuario eliminados correctamente');
    } catch (error) {
      console.error('[AuthStore] Error al limpiar datos de usuario:', error);
    }
  },
  
  automaticSignIn: async (token: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // Establecer datos de sesión
      set({
        session: token,
        userId: userId,
        isInVerificationFlow: false
      });
      
      // Guardar en el almacenamiento seguro
      await setStorageItemAsync('session', token);
      await setStorageItemAsync('userId', userId);
      
      // Configurar usuario actual en AudioDownloadService
      const { AudioDownloadService } = require('@/services/audioDownloadService');
      await AudioDownloadService.setCurrentUser(userId);
      
      // Inicializar información del dispositivo si no existe
      const deviceInfo = get().deviceInfo;
      if (!deviceInfo) {
        await get().initializeDeviceInfo();
      }
      
      // Obtener datos completos del usuario
      await get().fetchUserData();
      
      // Verificar estado de membresía y completitud del perfil
      get().checkMembershipStatus();
      get().checkProfileCompletion();
      
      set({ isLoading: false });
      //console.log('[AuthStore] Login automático completado con éxito');
    } catch (error: any) {
      console.error('[AuthStore] Error en login automático:', error);
      set({
        error: error.message || 'Error en el inicio de sesión automático',
        isLoading: false
      });
      throw error;
    }
  },
  configureRevenueCat: async () => {
    try {
      const { userData } = get();
      
      if (!userData?.processorData?.customId || !userData?.email) {
        //console.log('[AuthStore] No se puede configurar RevenueCat sin customId o email');
        return;
      }

      // Configurar RevenueCat
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey: APIKeys.apple });
        await Purchases.setAttributes({
          "onBoardingPaywall": 'false'
        });
        Purchases.syncAttributesAndOfferingsIfNeeded()
      } else if (Platform.OS === 'android') {
        await Purchases.configure({ apiKey: APIKeys.google });
        await Purchases.setAttributes({
          "onBoardingPaywall": 'false'
        });
        Purchases.syncAttributesAndOfferingsIfNeeded()
      }

      // Hacer login con el customId
      await Purchases.logIn(userData.processorData.customId);

      // Establecer atributos
      await Purchases.setAttributes({
        "email": String(userData.email),
        "customUuid": userData.processorData.customId
      });
      await Purchases.setEmail(String(userData.email));

      //console.log('[AuthStore] RevenueCat configurado exitosamente');
    } catch (error) {
      console.error('[AuthStore] Error configurando RevenueCat:', error);
    }
  },
  checkRevenueCatSubscription: async () => {
    try {
      const { userData } = get();
      
      if (!userData?.processorData?.customId) {
        //console.log('[AuthStore] No se puede verificar suscripción sin customId');
        return;
      }

      // Obtener información del cliente
      const customerInfo = await Purchases.getCustomerInfo();
      //console.log('customerInfo', JSON.stringify(customerInfo,null,2))
      
      // Guardar la información del cliente
      set({ revenueCatCustomerInfo: customerInfo });

      // Verificar si hay suscripción activa
      const hasActiveSubscription = customerInfo.entitlements.active?.Mental?.isActive || false;
      const subscriptionType = customerInfo.entitlements.active?.Mental?.productIdentifier == 'mental_20_1m' ? 'Mensual' : 'Anual';
      
      // Verificar si es trial cancelado
      let isTrialCancelled = false;
      if (hasActiveSubscription && customerInfo.entitlements.active?.Mental) {
        const mental = customerInfo.entitlements.active.Mental; 
        isTrialCancelled = mental.periodType === 'TRIAL' && mental.willRenew === false;
      }

      set({
        isRevenueCatSubscriptionActive: hasActiveSubscription,
        isRevenueCatTrialCancelled: isTrialCancelled,
        revenueCatSubscriptionType: subscriptionType
      });

      // //console.log('[AuthStore] Estado de suscripción RevenueCat:', {
      //   active: hasActiveSubscription,
      //   trialCancelled: isTrialCancelled
      // });

    } catch (error) {
      console.error('[AuthStore] Error verificando suscripción RevenueCat:', error);
      set({
        isRevenueCatSubscriptionActive: false,
        isRevenueCatTrialCancelled: false,
        revenueCatSubscriptionType: null
      });
    }
  }
}));


export const useRequestHipnosisStore = create<RequestHipnosisState>((set) => ({
  requestHipnosis: false,
  hasShownRequestHipnosisThisSession: false,
  setRequestHipnosis: (requestHipnosis: boolean) => set({ requestHipnosis }),
  setHasShownRequestHipnosisThisSession: (hasShown: boolean) => set({ hasShownRequestHipnosisThisSession: hasShown }),
  resetRequestHipnosis: () => set({ requestHipnosis: false, hasShownRequestHipnosisThisSession: false })
}));
