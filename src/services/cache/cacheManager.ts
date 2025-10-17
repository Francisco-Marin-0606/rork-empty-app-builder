import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { 
  CacheEntry, 
  CacheMetadata, 
  CacheCategory, 
  CacheConfig, 
  CacheStats, 
  ImageCacheEntry 
} from './types';

class CacheManager {
  private static instance: CacheManager;
  private config: CacheConfig;
  private cacheDir: string;
  private imagesCacheDir: string;
  private metadataKey = '@cache_metadata';
  private statsKey = '@cache_stats';

  private constructor() {
    this.config = {
      defaultTTL: 24 * 60 * 60 * 1000, // 24 horas
      maxSize: 500 * 1024 * 1024, // 500MB
      maxFiles: 1000,
      cleanupInterval: 60 * 60 * 1000 // 1 hora
    };
    
    this.cacheDir = `${FileSystem.documentDirectory}cache/`;
    this.imagesCacheDir = `${this.cacheDir}images/`;
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Inicialización del sistema de caché
  public async initialize(): Promise<void> {
    try {
      await this.ensureDirectoriesExist();
      await this.loadStats();
      await this.scheduleCleanup();
    } catch (error) {
      console.error('Error initializing cache manager:', error);
    }
  }

  // Asegurar que los directorios de caché existan
  private async ensureDirectoriesExist(): Promise<void> {
    const directories = [this.cacheDir, this.imagesCacheDir];
    
    for (const dir of directories) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  }

  // Guardar datos en caché
  public async set<T>(
    key: string, 
    data: T, 
    category: CacheCategory,
    ttl?: number,
    userId?: string
  ): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt,
        version: '1.0',
        userId
      };

      const cacheKey = this.buildCacheKey(key, category, userId);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      
      // Actualizar metadatos
      await this.updateMetadata(cacheKey, category, JSON.stringify(cacheEntry).length);
      
      // Verificar límites de caché
      await this.enforceStorageLimits();
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Obtener datos del caché
  public async get<T>(
    key: string, 
    category: CacheCategory,
    userId?: string
  ): Promise<T | null> {
    try {
      const cacheKey = this.buildCacheKey(key, category, userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheEntry: CacheEntry<T> = JSON.parse(cached);
      
      // Verificar expiración
      if (Date.now() > cacheEntry.expiresAt) {
        await this.delete(key, category, userId);
        return null;
      }

      // Actualizar último acceso
      await this.updateLastAccess(cacheKey);
      
      return cacheEntry.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  // Verificar si existe en caché y no ha expirado
  public async has(
    key: string, 
    category: CacheCategory,
    userId?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.buildCacheKey(key, category, userId);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return false;
      }

      const cacheEntry: CacheEntry = JSON.parse(cached);
      return Date.now() <= cacheEntry.expiresAt;
    } catch (error) {
      console.error('Error checking cache:', error);
      return false;
    }
  }

  // Eliminar entrada del caché
  public async delete(
    key: string, 
    category: CacheCategory,
    userId?: string
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(key, category, userId);
      await AsyncStorage.removeItem(cacheKey);
      await this.removeMetadata(cacheKey);
    } catch (error) {
      console.error('Error deleting cache:', error);
    }
  }

  // Caché de imágenes
  public async cacheImage(url: string, userId?: string): Promise<string | null> {
    try {
      // Asegurar que los directorios existan antes de descargar
      await this.ensureDirectoriesExist();
      
      const filename = this.generateImageFilename(url);
      const localPath = `${this.imagesCacheDir}${filename}`;
      const metadataKey = this.buildCacheKey(`image_${filename}`, CacheCategory.IMAGES, userId);
      
      if (await this.validateCachedFile(localPath, metadataKey)) {
        // Imagen ya cacheada y válida
        console.log('Image already cached and valid:', localPath);
        return localPath;
      }

      // Descargar imagen
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status === 200) {
        // Obtener información del archivo descargado
        const downloadedFileInfo = await FileSystem.getInfoAsync(localPath);
        
        // Guardar metadatos de la imagen
        const imageEntry: ImageCacheEntry = {
          localPath,
          originalUrl: url,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.config.defaultTTL,
          size: downloadedFileInfo.exists && !downloadedFileInfo.isDirectory ? downloadedFileInfo.size : 0,
          mimeType: downloadResult.headers?.['content-type']
        };
        
        const metadataKey = this.buildCacheKey(`image_${filename}`, CacheCategory.IMAGES, userId);
        await AsyncStorage.setItem(metadataKey, JSON.stringify(imageEntry));
        
        return localPath;
      }
      
      return null;
    } catch (error) {
      console.error('Error caching image:', error);
      // Proporcionar información más específica del error
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          url,
          imagesCacheDir: this.imagesCacheDir
        });
      }
      return null;
    }
  }

  // Obtener imagen cacheada
  public async getCachedImage(url: string, userId?: string): Promise<string | null> {
    try {
      // Asegurar que los directorios existan
      await this.ensureDirectoriesExist();
      
      const filename = this.generateImageFilename(url);
      const localPath = `${this.imagesCacheDir}${filename}`;
      const metadataKey = this.buildCacheKey(`image_${filename}`, CacheCategory.IMAGES, userId);
      
      // Verificar si el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists) {
        // Limpiar metadatos huérfanos si existen
        await AsyncStorage.removeItem(metadataKey);
        return null;
      }

      // Verificar metadatos y validar integridad
      try {
        const metadataStr = await AsyncStorage.getItem(metadataKey);
        if (metadataStr) {
          const imageEntry: ImageCacheEntry = JSON.parse(metadataStr);
          const now = Date.now();
          
          // Verificar si ha expirado
          if (imageEntry.expiresAt && now > imageEntry.expiresAt) {
            // Imagen expirada, eliminar archivo y metadatos
            await FileSystem.deleteAsync(localPath, { idempotent: true });
            await AsyncStorage.removeItem(metadataKey);
            return null;
          }
          
          // Verificar integridad del archivo (tamaño)
          if (imageEntry.size && fileInfo.size !== imageEntry.size) {
            // Tamaño no coincide, archivo posiblemente corrupto
            await FileSystem.deleteAsync(localPath, { idempotent: true });
            await AsyncStorage.removeItem(metadataKey);
            return null;
          }
          
          // Verificar que el archivo no esté vacío o corrupto
          if (fileInfo.size === 0) {
            await FileSystem.deleteAsync(localPath, { idempotent: true });
            await AsyncStorage.removeItem(metadataKey);
            return null;
          }
          
          // Archivo válido, actualizar último acceso
          await this.updateLastAccess(metadataKey);
          return localPath;
        } else {
          // No hay metadatos pero el archivo existe, archivo huérfano
          // Intentar validar básicamente por tamaño
          if (fileInfo.size > 0) {
            // Archivo parece válido, crear metadatos básicos
            const imageEntry: ImageCacheEntry = {
              localPath,
              originalUrl: url,
              timestamp: Date.now(),
              expiresAt: Date.now() + this.config.defaultTTL,
              size: fileInfo.size,
              mimeType: undefined
            };
            await AsyncStorage.setItem(metadataKey, JSON.stringify(imageEntry));
            return localPath;
          } else {
            // Archivo vacío, eliminar
            await FileSystem.deleteAsync(localPath, { idempotent: true });
            return null;
          }
        }
      } catch (metadataError) {
        // Error al procesar metadatos, eliminar archivo por seguridad
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        await AsyncStorage.removeItem(metadataKey);
        return null;
      }
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  // Limpiar caché expirado
  public async cleanExpiredCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('@cache_'));
      
      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          try {
            const cacheEntry: CacheEntry = JSON.parse(cached);
            if (Date.now() > cacheEntry.expiresAt) {
              await AsyncStorage.removeItem(key);
              await this.removeMetadata(key);
            }
          } catch (parseError) {
            // Entrada corrupta, eliminar
            await AsyncStorage.removeItem(key);
          }
        }
      }
      
      // Limpiar imágenes expiradas
      await this.cleanExpiredImages();
      
      // Actualizar estadísticas
      await this.updateStats();
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  }

  // Limpiar todo el caché
  public async clearAllCache(userId?: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let keysToRemove: string[];
      
      if (userId) {
        // Limpiar solo caché del usuario específico
        keysToRemove = allKeys.filter(key => 
          key.startsWith('@cache_') && key.includes(`_user_${userId}`)
        );
      } else {
        // Limpiar todo el caché
        keysToRemove = allKeys.filter(key => key.startsWith('@cache_'));
      }
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Limpiar directorio de imágenes si es limpieza completa
      if (!userId) {
        await FileSystem.deleteAsync(this.imagesCacheDir, { idempotent: true });
        await this.ensureDirectoriesExist();
      }
      
      await this.updateStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Obtener estadísticas del caché
  public async getStats(): Promise<CacheStats> {
    try {
      const statsData = await AsyncStorage.getItem(this.statsKey);
      if (statsData) {
        return JSON.parse(statsData);
      }
      
      // Calcular estadísticas si no existen
      return await this.calculateStats();
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return this.getDefaultStats();
    }
  }

  // Métodos privados
  private buildCacheKey(key: string, category: CacheCategory, userId?: string): string {
    const userPart = userId ? `_user_${userId}` : '';
    return `@cache_${category}_${key}${userPart}`;
  }

  private generateImageFilename(url: string): string {
    // Crear hash simple del URL para el nombre del archivo
    const hash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
    return `${Math.abs(hash)}.${extension}`;
  }

  private async updateMetadata(key: string, category: CacheCategory, size: number): Promise<void> {
    try {
      const metadata: CacheMetadata = {
        key,
        size,
        lastAccessed: Date.now(),
        accessCount: 1,
        category
      };
      
      const metadataKey = `${this.metadataKey}_${key}`;
      await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }

  private async updateLastAccess(key: string): Promise<void> {
    try {
      const metadataKey = `${this.metadataKey}_${key}`;
      const metadataData = await AsyncStorage.getItem(metadataKey);
      
      if (metadataData) {
        const metadata: CacheMetadata = JSON.parse(metadataData);
        metadata.lastAccessed = Date.now();
        metadata.accessCount += 1;
        
        await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error('Error updating last access:', error);
    }
  }

  private async removeMetadata(key: string): Promise<void> {
    try {
      const metadataKey = `${this.metadataKey}_${key}`;
      await AsyncStorage.removeItem(metadataKey);
    } catch (error) {
      console.error('Error removing metadata:', error);
    }
  }

  private async enforceStorageLimits(): Promise<void> {
    try {
      const stats = await this.calculateStats();
      
      if (stats.totalSize > this.config.maxSize || stats.totalFiles > this.config.maxFiles) {
        await this.cleanLeastRecentlyUsed();
      }
    } catch (error) {
      console.error('Error enforcing storage limits:', error);
    }
  }

  private async cleanLeastRecentlyUsed(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const metadataKeys = allKeys.filter(key => key.startsWith(this.metadataKey));
      
      const metadataEntries: Array<{ key: string; metadata: CacheMetadata }> = [];
      
      for (const key of metadataKeys) {
        const metadataData = await AsyncStorage.getItem(key);
        if (metadataData) {
          const metadata: CacheMetadata = JSON.parse(metadataData);
          metadataEntries.push({ key: key.replace(`${this.metadataKey}_`, ''), metadata });
        }
      }
      
      // Ordenar por último acceso (más antiguo primero)
      metadataEntries.sort((a, b) => a.metadata.lastAccessed - b.metadata.lastAccessed);
      
      // Eliminar el 20% más antiguo
      const toRemove = Math.ceil(metadataEntries.length * 0.2);
      
      for (let i = 0; i < toRemove; i++) {
        const entry = metadataEntries[i];
        await AsyncStorage.removeItem(entry.key);
        await this.removeMetadata(entry.key);
      }
    } catch (error) {
      console.error('Error cleaning least recently used:', error);
    }
  }

  private async cleanExpiredImages(): Promise<void> {
    try {
      const imageFiles = await FileSystem.readDirectoryAsync(this.imagesCacheDir);
      
      for (const filename of imageFiles) {
        const metadataKey = this.buildCacheKey(`image_${filename}`, CacheCategory.IMAGES);
        const metadata = await AsyncStorage.getItem(metadataKey);
        
        if (metadata) {
          const imageEntry: ImageCacheEntry = JSON.parse(metadata);
          if (Date.now() > imageEntry.expiresAt) {
            await FileSystem.deleteAsync(`${this.imagesCacheDir}${filename}`);
            await AsyncStorage.removeItem(metadataKey);
          }
        } else {
          // Sin metadatos, eliminar archivo huérfano
          await FileSystem.deleteAsync(`${this.imagesCacheDir}${filename}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning expired images:', error);
    }
  }

  private async calculateStats(): Promise<CacheStats> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('@cache_'));
      
      let totalSize = 0;
      let totalFiles = 0;
      const categorySizes: Record<CacheCategory, number> = {
        [CacheCategory.AUDIOS]: 0,
        [CacheCategory.AUDIO_REQUESTS]: 0,
        [CacheCategory.REQUEST_SETTINGS]: 0,
        [CacheCategory.IMAGES]: 0,
        [CacheCategory.USER_DATA]: 0
      };
      
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const size = data.length;
          totalSize += size;
          totalFiles += 1;
          
          // Determinar categoría del key
          for (const category of Object.values(CacheCategory)) {
            if (key.includes(`_${category}_`)) {
              categorySizes[category] += size;
              break;
            }
          }
        }
      }
      
      const stats: CacheStats = {
        totalSize,
        totalFiles,
        hitRate: 0, // Se calculará con métricas de uso
        lastCleanup: Date.now(),
        categorySizes
      };
      
      await AsyncStorage.setItem(this.statsKey, JSON.stringify(stats));
      return stats;
    } catch (error) {
      console.error('Error calculating stats:', error);
      return this.getDefaultStats();
    }
  }

  private async updateStats(): Promise<void> {
    await this.calculateStats();
  }

  private async loadStats(): Promise<void> {
    try {
      const stats = await this.getStats();
      // Programar limpieza si es necesario
      if (Date.now() - stats.lastCleanup > this.config.cleanupInterval) {
        await this.cleanExpiredCache();
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  private async scheduleCleanup(): Promise<void> {
    // Programar limpieza periódica
    setInterval(async () => {
      await this.cleanExpiredCache();
    }, this.config.cleanupInterval);
  }

  private getDefaultStats(): CacheStats {
    return {
      totalSize: 0,
      totalFiles: 0,
      hitRate: 0,
      lastCleanup: Date.now(),
      categorySizes: {
        [CacheCategory.AUDIOS]: 0,
        [CacheCategory.AUDIO_REQUESTS]: 0,
        [CacheCategory.REQUEST_SETTINGS]: 0,
        [CacheCategory.IMAGES]: 0,
        [CacheCategory.USER_DATA]: 0
      }
    };
  }

  /**
   * Valida un archivo cacheado verificando su existencia, tamaño y metadatos
   * @param filePath Ruta del archivo a validar
   * @param metadataKey Clave de metadatos en AsyncStorage
   * @returns true si el archivo es válido, false si está corrupto o no existe
   */
  async validateCachedFile(filePath: string, metadataKey: string): Promise<boolean> {
    try {
      // Verificar existencia del archivo
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists || fileInfo.isDirectory) {
        return false;
      }

      // Verificar que el archivo no esté vacío
      if (fileInfo.size === 0) {
        return false;
      }

      // Verificar metadatos si existen
      try {
        const metadataStr = await AsyncStorage.getItem(metadataKey);
        if (metadataStr) {
          const metadata: ImageCacheEntry = JSON.parse(metadataStr);
          
          // Verificar expiración
          if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
            return false;
          }
          
          // Verificar integridad del tamaño
          if (metadata.size && fileInfo.size !== metadata.size) {
            return false;
          }
        }
      } catch (metadataError) {
        // Error al leer metadatos, considerar archivo inválido
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating cached file:', error);
      return false;
    }
  }

  /**
   * Limpia archivos huérfanos que no tienen metadatos correspondientes
   * @param userId ID del usuario (opcional)
   */
  public async cleanOrphanedFiles(userId?: string): Promise<void> {
    try {
      await this.ensureDirectoriesExist();
      
      // Obtener todos los archivos en el directorio de imágenes
      const imageFiles = await FileSystem.readDirectoryAsync(this.imagesCacheDir);
      
      // Obtener todas las claves de metadatos
      const allKeys = await AsyncStorage.getAllKeys();
      const imageMetadataKeys = allKeys.filter(key => 
        key.includes('_images_') && (!userId || key.includes(userId))
      );
      
      // Extraer nombres de archivos de las claves de metadatos
      const metadataFilenames = new Set(
        imageMetadataKeys.map(key => {
          const parts = key.split('_');
          return parts[parts.length - 1]; // Último segmento es el nombre del archivo
        })
      );
      
      // Eliminar archivos huérfanos
      for (const filename of imageFiles) {
        if (!metadataFilenames.has(filename)) {
          const filePath = `${this.imagesCacheDir}${filename}`;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log(`Removed orphaned file: ${filename}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning orphaned files:', error);
    }
  }
}

export default CacheManager.getInstance();