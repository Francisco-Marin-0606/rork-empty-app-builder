// Tipos para el sistema de caché persistente

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  userId?: string;
}

export interface CacheMetadata {
  key: string;
  size: number;
  lastAccessed: number;
  accessCount: number;
  category: CacheCategory;
}

export enum CacheCategory {
  AUDIOS = 'audios',
  AUDIO_REQUESTS = 'audioRequests',
  REQUEST_SETTINGS = 'requestSettings',
  IMAGES = 'images',
  USER_DATA = 'userData'
}

export interface CacheConfig {
  defaultTTL: number; // Time to live en milisegundos
  maxSize: number; // Tamaño máximo en bytes
  maxFiles: number; // Número máximo de archivos
  cleanupInterval: number; // Intervalo de limpieza en milisegundos
}

export interface CacheStats {
  totalSize: number;
  totalFiles: number;
  hitRate: number;
  lastCleanup: number;
  categorySizes: Record<CacheCategory, number>;
}

export interface ImageCacheEntry {
  localPath: string;
  originalUrl: string;
  timestamp: number;
  expiresAt: number;
  size: number;
  mimeType?: string;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  total: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  error?: string;
}

export interface QueuedDownload {
  id: string;
  url: string;
  localPath: string;
  metadata: any;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
}

// Tipos para configuración de red
export interface NetworkConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  offlineQueueEnabled: boolean;
  maxOfflineQueueSize: number;
}

// Tipos para el ApiManager
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  fromCache?: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export interface RequestConfig {
  useCache?: boolean;
  cacheTTL?: number;
  retryOnFailure?: boolean;
  priority?: 'low' | 'normal' | 'high';
  offlineSupport?: boolean;
}