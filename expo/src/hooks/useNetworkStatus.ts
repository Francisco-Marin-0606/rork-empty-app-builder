import { useState, useEffect } from 'react';
import NetworkManager from '../services/api/networkManager';

interface NetworkState {
  isConnected: boolean;
  connectionType: string;
  isInternetReachable: boolean;
  lastConnectedAt: number;
  offlineQueueSize: number;
}

interface UseNetworkStatusReturn {
  networkState: NetworkState;
  isConnected: boolean;
  isOffline: boolean;
  connectionType: string;
  offlineQueueSize: number;
  queueRequest: (url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', data?: any, headers?: Record<string, string>, priority?: 'low' | 'normal' | 'high') => Promise<string>;
  clearOfflineQueue: () => Promise<void>;
  forceProcessQueue: () => Promise<void>;
}

/**
 * Hook personalizado para monitorear el estado de la red y manejar peticiones offline
 * 
 * @returns {UseNetworkStatusReturn} Estado de la red y funciones de utilidad
 * 
 * @example
 * ```tsx
 * const { isConnected, isOffline, queueRequest, offlineQueueSize } = useNetworkStatus();
 * 
 * // Verificar conectividad
 * if (isOffline) {
 *   console.log('Sin conexión a internet');
 * }
 * 
 * // Encolar petición para cuando haya conexión
 * if (isOffline) {
 *   await queueRequest('/api/data', 'POST', { data: 'example' }, {}, 'high');
 * }
 * 
 * // Mostrar número de peticiones pendientes
 * if (offlineQueueSize > 0) {
 *   console.log(`${offlineQueueSize} peticiones pendientes`);
 * }
 * ```
 */
export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [networkState, setNetworkState] = useState<NetworkState>(() => 
    NetworkManager.getNetworkState()
  );

  useEffect(() => {
    // Obtener estado inicial
    setNetworkState(NetworkManager.getNetworkState());

    // Suscribirse a cambios de estado de red
    const unsubscribe = NetworkManager.addNetworkListener((newState) => {
      setNetworkState(newState);
    });

    // Cleanup al desmontar
    return unsubscribe;
  }, []);

  // Función para encolar peticiones
  const queueRequest = async (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    headers?: Record<string, string>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> => {
    return await NetworkManager.queueRequest(url, method, data, headers, priority);
  };

  // Función para limpiar cola offline
  const clearOfflineQueue = async (): Promise<void> => {
    await NetworkManager.clearQueue();
  };

  // Función para forzar procesamiento de cola (útil para testing)
  const forceProcessQueue = async (): Promise<void> => {
    await NetworkManager.forceProcessQueue();
  };

  return {
    networkState,
    isConnected: networkState.isConnected && networkState.isInternetReachable,
    isOffline: !networkState.isConnected || !networkState.isInternetReachable,
    connectionType: networkState.connectionType,
    offlineQueueSize: networkState.offlineQueueSize,
    queueRequest,
    clearOfflineQueue,
    forceProcessQueue
  };
};

/**
 * Hook simplificado que solo retorna el estado de conectividad
 * 
 * @returns {boolean} true si hay conexión a internet, false en caso contrario
 * 
 * @example
 * ```tsx
 * const isOnline = useIsOnline();
 * 
 * return (
 *   <View>
 *     {isOnline ? (
 *       <Text>Conectado</Text>
 *     ) : (
 *       <Text>Sin conexión</Text>
 *     )}
 *   </View>
 * );
 * ```
 */
export const useIsOnline = (): boolean => {
  const { isConnected } = useNetworkStatus();
  return isConnected;
};

/**
 * Hook que retorna información detallada sobre el tipo de conexión
 * 
 * @returns {object} Información detallada de la conexión
 * 
 * @example
 * ```tsx
 * const connectionInfo = useConnectionInfo();
 * 
 * return (
 *   <View>
 *     <Text>Tipo: {connectionInfo.type}</Text>
 *     <Text>Velocidad: {connectionInfo.isSlowConnection ? 'Lenta' : 'Rápida'}</Text>
 *     <Text>Última conexión: {new Date(connectionInfo.lastConnectedAt).toLocaleString()}</Text>
 *   </View>
 * );
 * ```
 */
export const useConnectionInfo = () => {
  const { networkState } = useNetworkStatus();
  
  const isSlowConnection = ['2g', '3g'].includes(networkState.connectionType.toLowerCase());
  const isFastConnection = ['4g', '5g', 'wifi'].includes(networkState.connectionType.toLowerCase());
  
  return {
    type: networkState.connectionType,
    isSlowConnection,
    isFastConnection,
    lastConnectedAt: networkState.lastConnectedAt,
    timeSinceLastConnection: networkState.lastConnectedAt > 0 
      ? Date.now() - networkState.lastConnectedAt 
      : null
  };
};

/**
 * Hook para manejar la cola offline con más control
 * 
 * @returns {object} Funciones y estado de la cola offline
 * 
 * @example
 * ```tsx
 * const { 
 *   queueSize, 
 *   addToQueue, 
 *   clearQueue, 
 *   isProcessing 
 * } = useOfflineQueue();
 * 
 * const handleOfflineAction = async () => {
 *   if (isOffline) {
 *     await addToQueue('/api/action', 'POST', { data: 'example' }, 'high');
 *     Alert.alert('Acción guardada', 'Se ejecutará cuando tengas conexión');
 *   }
 * };
 * ```
 */
export const useOfflineQueue = () => {
  const { offlineQueueSize, queueRequest, clearOfflineQueue, isConnected } = useNetworkStatus();
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = async (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    priority: 'low' | 'normal' | 'high' = 'normal',
    headers?: Record<string, string>
  ): Promise<string> => {
    setIsProcessing(true);
    try {
      const requestId = await queueRequest(url, method, data, headers, priority);
      return requestId;
    } finally {
      setIsProcessing(false);
    }
  };

  const clearQueue = async (): Promise<void> => {
    setIsProcessing(true);
    try {
      await clearOfflineQueue();
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    queueSize: offlineQueueSize,
    addToQueue,
    clearQueue,
    isProcessing,
    hasQueuedRequests: offlineQueueSize > 0,
    isOnline: isConnected
  };
};

export default useNetworkStatus;