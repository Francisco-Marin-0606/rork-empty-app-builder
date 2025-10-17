import { CacheConfig, NetworkConfig } from '../services/cache/types';
import CacheManager from '../services/cache/cacheManager';

/**
 * Configuración centralizada para todos los servicios de la aplicación
 * Este archivo define las configuraciones por defecto y permite personalizarlas
 */

// Configuración del sistema de cache
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 días
  maxSize: 500 * 1024 * 1024, // 500MB
  maxFiles: 10000,
  cleanupInterval: 24 * 60 * 60 * 1000 // 24 horas
};

// Configuración de red
export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo
  offlineQueueEnabled: true,
  maxOfflineQueueSize: 100
};

// URLs de la API
export const API_CONFIG = {
  // URLs de PRODUCCIÓN (activas)
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://mental-bff-m2iw9.ondigitalocean.app/',
  SECONDARY_URL: process.env.EXPO_PUBLIC_API_SECONDARY_URL ||'https://mental-bff-m2iw9.ondigitalocean.app/',
  CDN_URL: process.env.EXPO_PUBLIC_CDN_URL || 'https://cdn.mentalmagnet.com',
  WEBSOCKET_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://ws.mentalmagnet.com',
  
  // URLs de STAGING (comentadas)
  // BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://mental-bff-staging.ondigitalocean.app/',
  // SECONDARY_URL: process.env.EXPO_PUBLIC_API_SECONDARY_URL || 'https://mental-bff-staging.ondigitalocean.app/',
  // CDN_URL: process.env.EXPO_PUBLIC_CDN_URL || 'https://cdn-staging.mentalmagnet.com',
  // WEBSOCKET_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://ws-staging.mentalmagnet.com'
};

// Configuración de descargas
export const DOWNLOAD_CONFIG = {
  maxConcurrentDownloads: 3,
  maxRetries: 3,
  retryDelay: 2000, // 2 segundos
  chunkSize: 1024 * 1024, // 1MB chunks
  enableProgressTracking: true,
  enablePauseResume: true,
  downloadDirectory: 'downloads/audio',
  tempDirectory: 'downloads/temp',
  metadataDirectory: 'downloads/metadata'
};

// Configuración de imágenes
export const IMAGE_CONFIG = {
  maxCacheSize: 100 * 1024 * 1024, // 100MB para imágenes
  maxImageSize: 5 * 1024 * 1024, // 5MB por imagen
  supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  enableThumbnails: true,
  thumbnailSize: { width: 200, height: 200 },
  compressionQuality: 0.8,
  enableLazyLoading: true
};

// Configuración de audio
export const AUDIO_CONFIG = {
  supportedFormats: ['mp3', 'aac', 'm4a', 'wav', 'ogg'],
  maxFileSize: 50 * 1024 * 1024, // 50MB por archivo
  enableMetadataExtraction: true,
  enableWaveformGeneration: false, // Costoso computacionalmente
  defaultQuality: 'high', // 'low', 'medium', 'high'
  enableBackgroundDownload: true
};

// Configuración de logging
export const LOGGING_CONFIG = {
  enableConsoleLogging: __DEV__,
  enableFileLogging: true,
  logLevel: __DEV__ ? 'debug' : 'error', // 'debug', 'info', 'warn', 'error'
  maxLogFileSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5,
  enableCrashReporting: !__DEV__,
  enablePerformanceMonitoring: true
};

// Configuración de seguridad
export const SECURITY_CONFIG = {
  enableTokenRefresh: true,
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutos antes de expirar
  enableRequestSigning: false, // Para APIs que requieren firma
  enableCertificatePinning: false, // Para mayor seguridad en producción
  enableBiometricAuth: true,
  sessionTimeout: 30 * 60 * 1000, // 30 minutos
  maxFailedAttempts: 5
};

/**
 * Clase para gestionar la configuración de servicios
 */
export class ServicesConfig {
  private static instance: ServicesConfig;
  private cacheManager: typeof CacheManager | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ServicesConfig {
    if (!ServicesConfig.instance) {
      ServicesConfig.instance = new ServicesConfig();
    }
    return ServicesConfig.instance;
  }

  /**
   * Inicializa el servicio de cache con las configuraciones por defecto
   */
  async initialize(customConfig?: Partial<{
    cache: Partial<CacheConfig>;
    network: Partial<NetworkConfig>;
    api: Partial<typeof API_CONFIG>;
    download: Partial<typeof DOWNLOAD_CONFIG>;
  }>): Promise<void> {
    if (this.isInitialized) {
      console.warn('ServicesConfig ya está inicializado');
      return;
    }

    try {
      // Combinar configuraciones personalizadas con las por defecto
      const cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...customConfig?.cache };

      // Inicializar CacheManager
      this.cacheManager = CacheManager;
      await this.cacheManager.initialize();

      this.isInitialized = true;
      console.log('✅ Servicios inicializados correctamente');
    } catch (error) {
      console.error('❌ Error inicializando servicios:', error);
      throw error;
    }
  }

  /**
   * Obtiene una instancia del CacheManager
   */
  getCacheManager(): typeof CacheManager {
    if (!this.cacheManager) {
      throw new Error('CacheManager no está inicializado. Llama a initialize() primero.');
    }
    return this.cacheManager;
  }

  /**
   * Verifica si los servicios están inicializados
   */
  isServicesInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Reinicia todos los servicios
   */
  async reset(): Promise<void> {
    try {
      if (this.cacheManager) {
        await this.cacheManager.clearAllCache();
      }

      this.cacheManager = null;
      this.isInitialized = false;

      console.log('🔄 Servicios reiniciados correctamente');
    } catch (error) {
      console.error('❌ Error reiniciando servicios:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  async getCacheStats(): Promise<any> {
    if (!this.isInitialized || !this.cacheManager) {
      throw new Error('Servicios no inicializados');
    }

    return await this.cacheManager.getStats();
  }
}

// Exportar instancia singleton
export const servicesConfig = ServicesConfig.getInstance();

// Función de utilidad para inicializar servicios en la aplicación
export const initializeServices = async (customConfig?: Parameters<typeof ServicesConfig.prototype.initialize>[0]) => {
  try {
    await servicesConfig.initialize(customConfig);
    return true;
  } catch (error) {
    console.error('Error inicializando servicios:', error);
    return false;
  }
};

// Función de utilidad para obtener el cache manager
export const getCacheManager = () => {
  const config = ServicesConfig.getInstance();
  return config.getCacheManager();
};

// Configuraciones específicas por entorno
export const getEnvironmentConfig = () => {
  const isDev = __DEV__;
  const isProduction = !isDev;

  return {
    development: {
      cache: {
        ...DEFAULT_CACHE_CONFIG,
        maxSize: 100 * 1024 * 1024, // 100MB en desarrollo
        cleanupInterval: 60 * 60 * 1000 // 1 hora
      },
      network: {
        ...DEFAULT_NETWORK_CONFIG,
        timeout: 10000, // 10 segundos
        retryAttempts: 1
      },
      logging: {
        ...LOGGING_CONFIG,
        logLevel: 'debug',
        enableConsoleLogging: true,
        enableFileLogging: false
      }
    },
    production: {
      cache: {
        ...DEFAULT_CACHE_CONFIG
      },
      network: {
        ...DEFAULT_NETWORK_CONFIG,
        timeout: 30000,
        retryAttempts: 3
      },
      logging: {
        ...LOGGING_CONFIG,
        logLevel: 'error',
        enableConsoleLogging: false,
        enableFileLogging: true,
        enableCrashReporting: true
      }
    }
  }[isDev ? 'development' : 'production'];
};