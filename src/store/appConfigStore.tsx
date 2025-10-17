import { create } from 'zustand';
import { AppConfigCacheService } from '../services/cache/appConfigCacheService';

interface AppConfigState {
    setIsNavigationReady: (ready: boolean) => void;
    isNavigationReady: boolean;
    eventsAvailable: boolean;
    isLoading: boolean;
    error: string | null;
    configs: any; // Puedes definir una interfaz específica para tus configuraciones
    initializeAppConfig: () => Promise<void>;
    fetchAppConfig: () => Promise<void>;
    refreshAppConfig: () => Promise<void>;
    clearAppConfigCache: () => Promise<void>;
    isOffline: boolean;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
    eventsAvailable: false,
    isLoading: false,
    error: null,
    configs: null,
    isNavigationReady: false,
    isOffline: false,
    setIsNavigationReady: (ready) => set({ isNavigationReady: ready }),
    
    initializeAppConfig: async () => {
        try {
            console.log('[AppConfigStore] InitializeAppConfig called');
            set({ isLoading: true });
            await get().fetchAppConfig();
            console.log('[AppConfigStore] InitializeAppConfig completed');
        } catch (error) {
            console.error('[AppConfigStore] InitializeAppConfig error:', error);
            set({ 
                error: error instanceof Error ? error.message : 'Error al inicializar las configuraciones',
                isLoading: false,
                isOffline: error instanceof Error && error.message.includes('conexión') 
            });
        }
    },

    fetchAppConfig: async () => {
        try {
            console.log('[AppConfigStore] FetchAppConfig started');
            set({ isLoading: true, error: null });
            
            const configData = await AppConfigCacheService.getInstance().getConfigs();
            //console.log('[AppConfigStore] Config data received:', configData);
            
            set({ 
                configs: configData,
                isLoading: false,
                error: null,
                isOffline: false
            });
            
            console.log('[AppConfigStore] Store updated with new config data');
        } catch (error: any) {
            console.error('[AppConfigStore] FetchAppConfig error:', error);
            set({ 
                error: error.message || 'Error al obtener las configuraciones',
                isLoading: false,
                isOffline: error.message?.includes('conexión') || false
            });
        }
    },

    refreshAppConfig: async () => {
        try {
            console.log('[AppConfigStore] RefreshAppConfig started');
            set({ isLoading: true, error: null });
            
            const configData = await AppConfigCacheService.getInstance().refreshConfigs();
            
            set({ 
                configs: configData,
                isLoading: false,
                error: null,
                isOffline: false
            });
            
            console.log('[AppConfigStore] Store updated with refreshed config data');
        } catch (error: any) {
            console.error('[AppConfigStore] RefreshAppConfig error:', error);
            set({ 
                error: error.message || 'Error al actualizar las configuraciones',
                isLoading: false,
                isOffline: error.message?.includes('conexión') || false
            });
        }
    },
    
    clearAppConfigCache: async () => {
        try {
            console.log('[AppConfigStore] ClearAppConfigCache started');
            await AppConfigCacheService.getInstance().clearCache();
            console.log('[AppConfigStore] ClearAppConfigCache completed');
        } catch (error: any) {
            console.error('[AppConfigStore] ClearAppConfigCache error:', error);
        }
    }
}));