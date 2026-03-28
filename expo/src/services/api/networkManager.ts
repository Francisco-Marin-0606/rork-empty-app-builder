import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkConfig } from '../cache/types';

interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  priority: 'low' | 'normal' | 'high';
}

interface NetworkState {
  isConnected: boolean;
  connectionType: string;
  isInternetReachable: boolean;
  lastConnectedAt: number;
  offlineQueueSize: number;
}

class NetworkManager {
  private static instance: NetworkManager;
  private config: NetworkConfig;
  private networkState: NetworkState;
  private offlineQueue: QueuedRequest[] = [];
  private listeners: Array<(state: NetworkState) => void> = [];
  private queueKey = '@offline_queue';
  private isProcessingQueue = false;

  private constructor() {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      offlineQueueEnabled: true,
      maxOfflineQueueSize: 100
    };

    this.networkState = {
      isConnected: false,
      connectionType: 'unknown',
      isInternetReachable: false,
      lastConnectedAt: 0,
      offlineQueueSize: 0
    };

    this.initialize();
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  // Inicialización del gestor de red
  private async initialize(): Promise<void> {
    try {
      // Cargar cola offline persistente
      await this.loadOfflineQueue();
      
      // Configurar listener de estado de red
      NetInfo.addEventListener(this.handleNetworkStateChange.bind(this));
      
      // Obtener estado inicial
      const initialState = await NetInfo.fetch();
      this.handleNetworkStateChange(initialState);
    } catch (error) {
      console.error('Error initializing network manager:', error);
    }
  }

  // Manejar cambios en el estado de la red
  private async handleNetworkStateChange(state: NetInfoState): Promise<void> {
    const wasConnected = this.networkState.isConnected;
    
    this.networkState = {
      isConnected: state.isConnected ?? false,
      connectionType: state.type,
      isInternetReachable: state.isInternetReachable ?? false,
      lastConnectedAt: state.isConnected ? Date.now() : this.networkState.lastConnectedAt,
      offlineQueueSize: this.offlineQueue.length
    };

    // Notificar a los listeners
    this.notifyListeners();

    // Si se recuperó la conexión, procesar cola offline
    if (!wasConnected && this.networkState.isConnected && this.config.offlineQueueEnabled) {
      await this.processOfflineQueue();
    }
  }

  // Obtener estado actual de la red
  public getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  // Verificar si hay conexión
  public isConnected(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  // Agregar listener para cambios de estado
  public addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar función para remover el listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Agregar petición a la cola offline
  public async queueRequest(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    headers?: Record<string, string>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    if (!this.config.offlineQueueEnabled) {
      throw new Error('Offline queue is disabled');
    }

    if (this.offlineQueue.length >= this.config.maxOfflineQueueSize) {
      // Remover peticiones más antiguas de baja prioridad
      await this.cleanupQueue();
    }

    const request: QueuedRequest = {
      id: this.generateRequestId(),
      url,
      method,
      data,
      headers,
      timestamp: Date.now(),
      retryCount: 0,
      priority
    };

    this.offlineQueue.push(request);
    
    // Ordenar por prioridad
    this.sortQueueByPriority();
    
    // Persistir cola
    await this.saveOfflineQueue();
    
    // Actualizar estado
    this.networkState.offlineQueueSize = this.offlineQueue.length;
    this.notifyListeners();

    return request.id;
  }

  // Remover petición de la cola
  public async removeFromQueue(requestId: string): Promise<boolean> {
    const index = this.offlineQueue.findIndex(req => req.id === requestId);
    
    if (index > -1) {
      this.offlineQueue.splice(index, 1);
      await this.saveOfflineQueue();
      
      this.networkState.offlineQueueSize = this.offlineQueue.length;
      this.notifyListeners();
      
      return true;
    }
    
    return false;
  }

  // Obtener tamaño de la cola
  public getQueueSize(): number {
    return this.offlineQueue.length;
  }

  // Limpiar toda la cola
  public async clearQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
    
    this.networkState.offlineQueueSize = 0;
    this.notifyListeners();
  }

  // Procesar cola offline cuando se recupera la conexión
  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || this.offlineQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    try {
      console.log(`Processing ${this.offlineQueue.length} queued requests`);
      
      // Procesar peticiones en orden de prioridad
      const requestsToProcess = [...this.offlineQueue];
      
      for (const request of requestsToProcess) {
        try {
          await this.executeQueuedRequest(request);
          
          // Remover petición exitosa de la cola
          await this.removeFromQueue(request.id);
          
        } catch (error) {
          console.error(`Failed to process queued request ${request.id}:`, error);
          
          // Incrementar contador de reintentos
          request.retryCount++;
          
          // Si excede el máximo de reintentos, remover de la cola
          if (request.retryCount >= this.config.retryAttempts) {
            console.warn(`Removing failed request ${request.id} after ${request.retryCount} attempts`);
            await this.removeFromQueue(request.id);
          }
        }
        
        // Pequeña pausa entre peticiones para no sobrecargar
        await this.delay(100);
      }
      
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Ejecutar petición de la cola
  private async executeQueuedRequest(request: QueuedRequest): Promise<any> {
    // Esta función será implementada por el ApiManager
    // Por ahora, solo simular la ejecución
    console.log(`Executing queued request: ${request.method} ${request.url}`);
    
    // El ApiManager se encargará de la ejecución real
    // Aquí solo validamos que la petición sea válida
    if (!request.url || !request.method) {
      throw new Error('Invalid request in queue');
    }
    
    return Promise.resolve();
  }

  // Configurar el ejecutor de peticiones (será llamado por ApiManager)
  public setRequestExecutor(executor: (request: QueuedRequest) => Promise<any>): void {
    this.executeQueuedRequest = executor;
  }

  // Métodos privados
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkState);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sortQueueByPriority(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    this.offlineQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // Si tienen la misma prioridad, ordenar por timestamp (más antiguo primero)
      return a.timestamp - b.timestamp;
    });
  }

  private async cleanupQueue(): Promise<void> {
    // Remover peticiones más antiguas de baja prioridad
    const lowPriorityRequests = this.offlineQueue
      .filter(req => req.priority === 'low')
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (lowPriorityRequests.length > 0) {
      const toRemove = Math.ceil(lowPriorityRequests.length * 0.3);
      
      for (let i = 0; i < toRemove; i++) {
        await this.removeFromQueue(lowPriorityRequests[i].id);
      }
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(this.queueKey);
      
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
        
        // Limpiar peticiones muy antiguas (más de 24 horas)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.offlineQueue = this.offlineQueue.filter(req => req.timestamp > oneDayAgo);
        
        // Ordenar por prioridad
        this.sortQueueByPriority();
        
        // Guardar cola limpia
        await this.saveOfflineQueue();
        
        this.networkState.offlineQueueSize = this.offlineQueue.length;
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.offlineQueue = [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos de configuración
  public updateConfig(newConfig: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): NetworkConfig {
    return { ...this.config };
  }

  // Método para testing
  public async forceProcessQueue(): Promise<void> {
    if (this.isConnected()) {
      await this.processOfflineQueue();
    }
  }
}

export default NetworkManager.getInstance();