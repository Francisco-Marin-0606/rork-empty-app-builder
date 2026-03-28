import { useCallback, useEffect, useState } from 'react';
import { useAppConfigStore } from '../store/appConfigStore';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook para manejar las configuraciones de la aplicación con soporte de caché
 */
export const useAppConfig = () => {
  const { 
    configs, 
    isLoading, 
    error, 
    fetchAppConfig, 
    refreshAppConfig, 
    clearAppConfigCache,
    isOffline
  } = useAppConfigStore();
  
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);

  // Configurar listener para el estado de red
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsNetworkAvailable(state.isConnected === true);
    });

    // Limpiar listener al desmontar
    return () => unsubscribe();
  }, []);

  // Obtener una config específica por clave con soporte para notación de puntos para propiedades anidadas
  const getConfig = useCallback((key: string, defaultValue: any = null) => {
    if (!configs) return defaultValue;
    
    // Si no es una clave con notación de puntos, acceso directo
    if (!key.includes('.')) {
      return configs[key] !== undefined ? configs[key] : defaultValue;
    }
    
    // Para claves con notación de puntos, navegar por la estructura anidada
    try {
      const parts = key.split('.');
      let current: any = configs;
      
      for (const part of parts) {
        if (current === undefined || current === null) {
          return defaultValue;
        }
        
        // Verificamos explícitamente que current sea un objeto antes de acceder a sus propiedades
        if (typeof current !== 'object') {
          console.warn(`[useAppConfig] Expected object at path "${key}", but got ${typeof current}`);
          return defaultValue;
        }
        
        current = current[part];
      }
      
      return current !== undefined ? current : defaultValue;
    } catch (error) {
      console.error(`[useAppConfig] Error accessing nested config: ${key}`, error);
      return defaultValue;
    }
  }, [configs]);

  // Refrescar configuraciones cuando se recupera la conexión después de estar offline
  useEffect(() => {
    if (isNetworkAvailable && isOffline) {
      console.log('[useAppConfig] Red disponible después de estar sin conexión, refrescando configuraciones');
      refreshAppConfig();
    }
  }, [isNetworkAvailable, isOffline, refreshAppConfig]);

  return {
    configs,
    isLoading,
    error,
    isOffline,
    getConfig,
    refreshConfigs: refreshAppConfig,
    clearCache: clearAppConfigCache
  };
}; 