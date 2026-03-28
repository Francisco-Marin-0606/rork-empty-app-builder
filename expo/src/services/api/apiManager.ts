import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CacheManager from '../cache/cacheManager';
import NetworkManager from './networkManager';
import { ApiResponse, ApiError as IApiError, RequestConfig, CacheCategory } from '../cache/types';
import { getStorageItemAsync } from '../../store/secureStorage';
import { useSessionManager } from '../../store/sessionManager';

interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  deviceType: string;
  osVersion: string;
  appVersion: string;
}

interface ApiConfig {
  primaryBaseURL: string;
  secondaryBaseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  defaultHeaders: Record<string, string>;
}

interface RequestMetrics {
  totalRequests: number;
  cacheHits: number;
  networkRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

class ApiManager {
  private static instance: ApiManager;
  private primaryClient: AxiosInstance;
  private secondaryClient: AxiosInstance;
  private config: ApiConfig;
  private metrics: RequestMetrics;
  private authToken: string | null = null;
  private deviceInfo: DeviceInfo | null = null;

  private constructor() {
    this.config = {
      // URLs de PRODUCCIÓN (activas)
      primaryBaseURL: 'https://mental-bff-m2iw9.ondigitalocean.app/',
      secondaryBaseURL: 'https://mental-bff-m2iw9.ondigitalocean.app/',
      
      // URLs de STAGING (comentadas)
      // primaryBaseURL: 'https://staging-bff-mental-mabyu.ondigitalocean.app/',
      // secondaryBaseURL: 'https://staging-bff-mental-mabyu.ondigitalocean.app/',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      networkRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };

    this.primaryClient = this.createAxiosInstance(this.config.primaryBaseURL);
    this.secondaryClient = this.createAxiosInstance(this.config.secondaryBaseURL);
    
    this.setupInterceptors();
    this.setupNetworkManager();
    this.loadAuthToken();
  }

  public static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }

  // Crear instancia de Axios
  private createAxiosInstance(baseURL: string): AxiosInstance {
    return axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: this.config.defaultHeaders
    });
  }

  // Configurar interceptores
  private setupInterceptors(): void {
    // Interceptor de request para cliente primario
    const primaryRequestInterceptor = async (config: any) => {
      const startTime = Date.now();
      config.metadata = { startTime };
      
      const session = await getStorageItemAsync('session');
      
      if (config.headers) {
        // Use device info from instance instead of authStore
        if (this.deviceInfo) {
          config.headers['deviceId'] = this.deviceInfo.deviceId;
          config.headers['ipAddress'] = this.deviceInfo.ipAddress;
          config.headers['deviceType'] = this.deviceInfo.deviceType;
          config.headers['osVersion'] = this.deviceInfo.osVersion;
          config.headers['appVersion'] = this.deviceInfo.appVersion;
        }
        
        if (session) {
          config.headers['Authorization'] = `Bearer ${session}`;
        }
      }
      
      return config;
    };

    // Interceptor de request para cliente secundario
    const secondaryRequestInterceptor = async (config: any) => {
      const startTime = Date.now();
      config.metadata = { startTime };
      
      const session = await getStorageItemAsync('session');
      
      if (config.headers) {
        if (session) {
          config.headers['Authorization'] = `Bearer ${session}`;
        }
      }
      
      return config;
    };

    // Interceptor de response
    const responseInterceptor = (response: AxiosResponse) => {
      const endTime = Date.now();
      const duration = endTime - (response.config as any).metadata?.startTime;
      
      this.updateMetrics('success', duration);
      
      return response;
    };

    // Interceptor de error
    const errorInterceptor = async (error: any) => {
      this.updateMetrics('error');
      
      // Manejar error 401 (no autorizado)
      if (error.response && error.response.status === 401) {
        await useSessionManager.getState().handleUnauthorizedError();
      }
      
      // Intentar reintento automático
      if (this.shouldRetry(error)) {
        return this.retryRequest(error);
      }
      
      return Promise.reject(this.formatError(error));
    };

    // Aplicar interceptores específicos a cada cliente
    this.primaryClient.interceptors.request.use(primaryRequestInterceptor, (error) => Promise.reject(error));
    this.primaryClient.interceptors.response.use(responseInterceptor, errorInterceptor);
    
    this.secondaryClient.interceptors.request.use(secondaryRequestInterceptor, (error) => Promise.reject(error));
    this.secondaryClient.interceptors.response.use(responseInterceptor, errorInterceptor);
  }

  // Configurar NetworkManager
  private setupNetworkManager(): void {
    // Configurar ejecutor de peticiones para la cola offline
    NetworkManager.setRequestExecutor(async (request) => {
      const { url, method, data, headers } = request;
      
      const config: AxiosRequestConfig = {
        method,
        url,
        data,
        headers
      };
      
      return await this.primaryClient.request(config);
    });
  }

  // Método principal para hacer peticiones
  public async request<T = any>(
    endpoint: string,
    options: RequestConfig & AxiosRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      useCache = true,
      cacheTTL,
      retryOnFailure = true,
      priority = 'normal',
      offlineSupport = true,
      ...axiosConfig
    } = options;

    this.metrics.totalRequests++;
    
    const cacheKey = this.generateCacheKey(endpoint, axiosConfig);
    const category = this.determineCacheCategory(endpoint);
    
    // Intentar obtener de caché primero
    if (useCache && axiosConfig.method !== 'POST' && axiosConfig.method !== 'PUT' && axiosConfig.method !== 'DELETE') {
      if (!NetworkManager.isConnected()) {
      
      const cachedData = await CacheManager.get<T>(cacheKey, category);
      if (cachedData) {
        this.metrics.cacheHits++;
        return {
          data: cachedData,
          status: 200,
          fromCache: true
        };
      }
    }
    }

    // Verificar conectividad
    if (!NetworkManager.isConnected()) {
      if (offlineSupport && axiosConfig.method !== 'GET') {
        // Encolar petición para cuando haya conexión
        const requestId = await NetworkManager.queueRequest(
          endpoint,
          axiosConfig.method as any || 'GET',
          axiosConfig.data,
          axiosConfig.headers as Record<string, string>,
          priority
        );
        
        throw new ApiError(0, 'Sin conexión. Petición encolada.', 'OFFLINE_QUEUED', { requestId });
      } else {
        // Intentar usar datos cacheados aunque estén expirados
        const expiredCache = await this.getExpiredCache<T>(cacheKey, category);
        if (expiredCache) {
          return {
            data: expiredCache,
            status: 200,
            message: 'Datos desde caché expirado (sin conexión)',
            fromCache: true
          };
        }
        
        throw new ApiError(0, 'Sin conexión a internet', 'NO_CONNECTION');
      }
    }

    try {
      // Hacer petición de red
      this.metrics.networkRequests++;
      
      const response = await this.executeRequest<T>(endpoint, axiosConfig);
      
      // Cachear respuesta si es exitosa
      if (useCache && response.status >= 200 && response.status < 300) {
        await CacheManager.set(
          cacheKey,
          response.data,
          category,
          cacheTTL
        );
      }
      
      return {
        data: response.data,
        status: response.status,
        fromCache: false
      };
      
    } catch (error) {
      this.metrics.failedRequests++;
      
      // En caso de error, intentar usar caché expirado como fallback
      if (useCache) {
        const expiredCache = await this.getExpiredCache<T>(cacheKey, category);
        if (expiredCache) {
          return {
            data: expiredCache,
            status: 200,
            message: 'Datos desde caché expirado (error de red)',
            fromCache: true
          };
        }
      }
      
      throw error;
    }
  }

  // Métodos de conveniencia
  public async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  public async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', data });
  }

  public async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', data });
  }

  public async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  public async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', data });
  }

  // Configuración de autenticación
  public async setAuthToken(token: string): Promise<void> {
    this.authToken = token;
    await AsyncStorage.setItem('@auth_token', token);
  }

  public async clearAuthToken(): Promise<void> {
    this.authToken = null;
    await AsyncStorage.removeItem('@auth_token');
  }

  private async loadAuthToken(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  // Configuración de información del dispositivo
  public setDeviceInfo(info: DeviceInfo): void {
    this.deviceInfo = { ...info };
  }

  // Métodos privados
  private async executeRequest<T>(endpoint: string, config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      // Intentar con cliente primario
      return await this.primaryClient.request<T>({
        url: endpoint,
        ...config
      });
    } catch (error) {
      // Si falla, intentar con cliente secundario
      console.warn('Primary API failed, trying secondary:', error);
      return await this.secondaryClient.request<T>({
        url: endpoint,
        ...config
      });
    }
  }

  private generateCacheKey(endpoint: string, config: AxiosRequestConfig): string {
    const method = config.method || 'GET';
    const params = config.params ? JSON.stringify(config.params) : '';
    const data = config.data ? JSON.stringify(config.data) : '';
    
    return `${method}_${endpoint}_${params}_${data}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private determineCacheCategory(endpoint: string): CacheCategory {
    if (endpoint.includes('audio')) {
      if (endpoint.includes('request')) {
        return CacheCategory.AUDIO_REQUESTS;
      }
      return CacheCategory.AUDIOS;
    }
    
    if (endpoint.includes('settings') || endpoint.includes('config')) {
      return CacheCategory.REQUEST_SETTINGS;
    }
    
    if (endpoint.includes('user')) {
      return CacheCategory.USER_DATA;
    }
    
    return CacheCategory.USER_DATA;
  }

  private async getExpiredCache<T>(cacheKey: string, category: CacheCategory): Promise<T | null> {
    try {
      // Obtener directamente de AsyncStorage sin verificar expiración
      const cached = await AsyncStorage.getItem(`@cache_${category}_${cacheKey}`);
      if (cached) {
        const cacheEntry = JSON.parse(cached);
        return cacheEntry.data;
      }
    } catch (error) {
      console.error('Error getting expired cache:', error);
    }
    return null;
  }

  private shouldRetry(error: any): boolean {
    // No reintentar errores 4xx (excepto 408, 429)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response.status === 408 || error.response.status === 429;
    }
    
    // Reintentar errores 5xx y errores de red
    return error.response?.status >= 500 || !error.response;
  }

  private async retryRequest(error: any): Promise<any> {
    const config = error.config;
    config.retryCount = config.retryCount || 0;
    
    if (config.retryCount >= this.config.retryAttempts) {
      return Promise.reject(error);
    }
    
    config.retryCount++;
    
    // Esperar antes del reintento
    await this.delay(this.config.retryDelay * config.retryCount);
    
    return this.primaryClient.request(config);
  }

  private async handleUnauthorized(): Promise<void> {
    // Usar el session manager para manejar errores de autorización
    await useSessionManager.getState().handleUnauthorizedError();
    console.warn('Unauthorized access - handled by session manager');
  }

  private formatError(error: any): ApiError {
    if (error.response) {
      return new ApiError(
        error.response.status,
        error.response.data?.message || error.message,
        error.response.data?.code,
        error.response.data
      );
    }
    
    return new ApiError(
      0,
      error.message || 'Error de conexión',
      'NETWORK_ERROR'
    );
  }

  private updateMetrics(type: 'success' | 'error', duration?: number): void {
    if (type === 'success' && duration) {
      // Calcular promedio móvil del tiempo de respuesta
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.networkRequests - 1) + duration) / 
        this.metrics.networkRequests;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos públicos de utilidad
  public getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  public updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recrear clientes con nueva configuración
    this.primaryClient = this.createAxiosInstance(this.config.primaryBaseURL);
    this.secondaryClient = this.createAxiosInstance(this.config.secondaryBaseURL);
    this.setupInterceptors();
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  // Método para limpiar caché relacionado con APIs
  public async clearApiCache(): Promise<void> {
    await CacheManager.clearAllCache();
  }

  // Método para obtener estadísticas de caché
  public async getCacheStats() {
    return await CacheManager.getStats();
  }
}

// Clase de error personalizada
class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export { ApiError };
export default ApiManager.getInstance();