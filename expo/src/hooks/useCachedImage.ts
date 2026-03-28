import { useState, useEffect } from 'react';
import CacheManager from '../services/cache/cacheManager';
import { useNetworkStatus } from './useNetworkStatus';

interface UseCachedImageOptions {
  fallbackUrl?: string;
  enableOfflineMode?: boolean;
  cacheExpiry?: number; // en milisegundos
  onError?: (error: Error) => void;
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
}

interface UseCachedImageReturn {
  imageUri: string | null;
  isLoading: boolean;
  error: Error | null;
  isCached: boolean;
  isFromCache: boolean;
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * Hook personalizado para manejar imágenes con cache automático
 * 
 * @param imageUrl - URL de la imagen a cachear
 * @param options - Opciones de configuración
 * @returns {UseCachedImageReturn} Estado y funciones para manejar la imagen cacheada
 * 
 * @example
 * ```tsx
 * const {
 *   imageUri,
 *   isLoading,
 *   error,
 *   isCached,
 *   isFromCache,
 *   refresh
 * } = useCachedImage('https://example.com/image.jpg', {
 *   fallbackUrl: 'https://example.com/placeholder.jpg',
 *   enableOfflineMode: true,
 *   onError: (error) => console.error('Error cargando imagen:', error)
 * });
 * 
 * return (
 *   <View>
 *     {isLoading && <ActivityIndicator />}
 *     {imageUri && (
 *       <Image 
 *         source={{ uri: imageUri }} 
 *         style={{ width: 100, height: 100 }}
 *       />
 *     )}
 *     {error && <Text>Error: {error.message}</Text>}
 *     <Text>Desde cache: {isFromCache ? 'Sí' : 'No'}</Text>
 *     <Button title="Refrescar" onPress={refresh} />
 *   </View>
 * );
 * ```
 */
export const useCachedImage = (
  imageUrl: string | null | undefined,
  options: UseCachedImageOptions = {}
): UseCachedImageReturn => {
  const {
    fallbackUrl,
    enableOfflineMode = true,
    cacheExpiry = 24 * 60 * 60 * 1000, // 24 horas por defecto
    onError,
    onCacheHit,
    onCacheMiss
  } = options;

  const { isConnected } = useNetworkStatus();
  const isOnline = isConnected;
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Función para cargar imagen desde cache o red
  const loadImage = async (url: string, useCache: boolean = true): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsFromCache(false);

      // Intentar cargar desde cache primero
      if (useCache) {
        try {
          const cachedUri = await CacheManager.getCachedImage(url);
          if (cachedUri) {
            setImageUri(cachedUri);
            setIsCached(true);
            setIsFromCache(true);
            onCacheHit?.();
            return;
          }
        } catch (cacheError) {
          console.warn('Error accediendo al cache de imagen:', cacheError);
        }
      }

      // Si no está en cache o no se pudo cargar, descargar
      onCacheMiss?.();
      
      if (!isOnline && enableOfflineMode) {
        // En modo offline, usar fallback si está disponible
        if (fallbackUrl) {
          const fallbackCachedUri = await CacheManager.getCachedImage(fallbackUrl);
          if (fallbackCachedUri) {
            setImageUri(fallbackCachedUri);
            setIsFromCache(true);
            return;
          }
        }
        
        throw new Error('Sin conexión y no hay imagen en cache');
      }

      // Descargar y cachear la imagen
      const downloadedUri = await CacheManager.cacheImage(url);
      setImageUri(downloadedUri);
      setIsCached(true);
      setIsFromCache(false);
      
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      
      // Intentar con fallback si está disponible
      if (fallbackUrl && url !== fallbackUrl) {
        try {
          await loadImage(fallbackUrl, true);
          return;
        } catch (fallbackError) {
          console.warn('Error cargando imagen de fallback:', fallbackError);
        }
      }
      
      // Como último recurso, usar la URL original
      setImageUri(url);
      setIsFromCache(false);
      setIsCached(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para refrescar la imagen
  const refresh = async (): Promise<void> => {
    if (imageUrl) {
      await loadImage(imageUrl, false); // Forzar descarga sin usar cache
    }
  };

  // Función para limpiar cache de esta imagen
  const clearCache = async (): Promise<void> => {
    if (imageUrl) {
      try {
        // Usar el método delete del CacheManager con la categoría de imágenes
        const filename = btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '_');
        await CacheManager.delete(`image_${filename}`, 'IMAGES' as any);
        setIsCached(false);
        setIsFromCache(false);
        // Recargar la imagen
        await loadImage(imageUrl, false);
      } catch (err) {
        console.error('Error limpiando cache de imagen:', err);
      }
    }
  };

  // Verificar si la imagen está en cache
  const checkIfCached = async (url: string): Promise<void> => {
    try {
      const cachedUri = await CacheManager.getCachedImage(url);
      setIsCached(!!cachedUri);
    } catch (err) {
      setIsCached(false);
    }
  };

  // Efecto para cargar la imagen cuando cambia la URL
  useEffect(() => {
    if (imageUrl) {
      loadImage(imageUrl);
      checkIfCached(imageUrl);
    } else {
      setImageUri(null);
      setIsCached(false);
      setIsFromCache(false);
      setError(null);
    }
  }, [imageUrl, isOnline]);

  return {
    imageUri,
    isLoading,
    error,
    isCached,
    isFromCache,
    refresh,
    clearCache
  };
};

/**
 * Hook simplificado para obtener solo la URI de una imagen cacheada
 * 
 * @param imageUrl - URL de la imagen
 * @param fallbackUrl - URL de fallback opcional
 * @returns {string | null} URI de la imagen (cacheada o original)
 * 
 * @example
 * ```tsx
 * const imageUri = useCachedImageUri(
 *   'https://example.com/image.jpg',
 *   'https://example.com/placeholder.jpg'
 * );
 * 
 * return (
 *   <Image 
 *     source={{ uri: imageUri || 'https://example.com/default.jpg' }} 
 *     style={{ width: 100, height: 100 }}
 *   />
 * );
 * ```
 */
export const useCachedImageUri = (
  imageUrl: string | null | undefined,
  fallbackUrl?: string
): string | null => {
  const { imageUri } = useCachedImage(imageUrl, { fallbackUrl });
  return imageUri;
};

/**
 * Hook para pre-cachear múltiples imágenes en segundo plano
 * 
 * @param imageUrls - Array de URLs de imágenes para pre-cachear
 * @param options - Opciones de configuración
 * @returns {object} Estado del pre-cache
 * 
 * @example
 * ```tsx
 * const imageUrls = [
 *   'https://example.com/image1.jpg',
 *   'https://example.com/image2.jpg',
 *   'https://example.com/image3.jpg'
 * ];
 * 
 * const {
 *   progress,
 *   isComplete,
 *   errors,
 *   startPreCache
 * } = useImagePreCache(imageUrls, {
 *   cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 días
 *   onProgress: (current, total) => {
 *     console.log(`Pre-cache: ${current}/${total}`);
 *   }
 * });
 * 
 * useEffect(() => {
 *   startPreCache();
 * }, []);
 * ```
 */
export const useImagePreCache = (
  imageUrls: string[],
  options: {
    cacheExpiry?: number;
    onProgress?: (current: number, total: number) => void;
    onComplete?: () => void;
    onError?: (url: string, error: Error) => void;
  } = {}
) => {
  const {
    cacheExpiry = 24 * 60 * 60 * 1000,
    onProgress,
    onComplete,
    onError
  } = options;

  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Array<{ url: string; error: Error }>>([]);
  const [isRunning, setIsRunning] = useState(false);

  const startPreCache = async (): Promise<void> => {
    if (isRunning || imageUrls.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setIsComplete(false);
    setErrors([]);

    const total = imageUrls.length;
    let completed = 0;

    for (const url of imageUrls) {
      try {
        // Verificar si ya está en cache
        const cachedUri = await CacheManager.getCachedImage(url);
        if (!cachedUri) {
          // Solo descargar si no está en cache
          await CacheManager.cacheImage(url);
        }
      } catch (error) {
        const err = error as Error;
        setErrors(prev => [...prev, { url, error: err }]);
        onError?.(url, err);
      }

      completed++;
      setProgress(completed);
      onProgress?.(completed, total);
    }

    setIsComplete(true);
    setIsRunning(false);
    onComplete?.();
  };

  return {
    progress,
    total: imageUrls.length,
    isComplete,
    isRunning,
    errors,
    startPreCache,
    progressPercentage: imageUrls.length > 0 ? (progress / imageUrls.length) * 100 : 0
  };
};

export default useCachedImage;