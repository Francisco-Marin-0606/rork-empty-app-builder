import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheOptions {
  expirationTime?: number; // en milisegundos
  version?: string;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  version: string;
}

const KEY_PREFIX = 'mm_cache_';

export class CacheService {
  private static instance: CacheService;
  private defaultExpirationTime = 24 * 60 * 60 * 1000; // 24 horas por defecto

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        version: options.version || '1.0.0'
      };

      const prefixedKey = KEY_PREFIX + key;
      await AsyncStorage.setItem(prefixedKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`[CacheService] Error al guardar en caché (${key}):`, error);
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const prefixedKey = KEY_PREFIX + key;
      const cachedData = await AsyncStorage.getItem(prefixedKey);
      if (!cachedData) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cachedData);
      
      // Verificar versión
      if (options.version && cacheItem.version !== options.version) {
        console.log(`[CacheService] Versión de caché no coincide para ${key}. Esperado: ${options.version}, Actual: ${cacheItem.version}`);
        return null;
      }

      // Verificar expiración
      const expirationTime = options.expirationTime || this.defaultExpirationTime;
      if (Date.now() - cacheItem.timestamp > expirationTime) {
        console.log(`[CacheService] Caché expirado para ${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error(`[CacheService] Error al leer de caché (${key}):`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const prefixedKey = KEY_PREFIX + key;
      await AsyncStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`[CacheService] Error al eliminar de caché (${key}):`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('[CacheService] Error al limpiar caché:', error);
    }
  }
} 