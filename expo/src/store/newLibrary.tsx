import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FormQuestionsService } from '../services/api/formQuestionsService';
import { AudioService } from '@/services/api/audioService';
import { AudioRequestService } from '@/services/api/audioRequestService';
import { AudioDownloadService } from '@/services/audioDownloadService';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestSettingsTest } from '@/services/cache/dummyData';
import { audioTest } from '@/services/cache/dummyData';
import { useAuthStore } from './authStore';
import CacheManager from '../services/cache/cacheManager';
import { CacheCategory } from '../services/cache/types';

// Constante para almacenamiento de metadatos de levelAudios
const LEVEL_AUDIO_METADATA_KEY_PREFIX = '@mental_magnet_level_audio_metadata_';

// Interfaces para el estado de red y cache
interface NetworkState {
  isConnected: boolean;
  connectionType: string;
  lastConnectedAt: number;
  offlineQueueSize: number;
}

interface CacheState {
  isInitialized: boolean;
  stats: {
    totalSize: number;
    itemCount: number;
    lastCleanup: number;
  };
}

interface newLibraryStore {
  requestSettings: any;
  isLoading: boolean;
  error: string | null;
  audioRequests: any;
  audios: any;  
  levelAudios: any;
  downloadedLevelAudios: Record<string, { path: string, lastUpdated: number }>;
  isDownloadingLevel: Record<string, boolean>;
  downloadProgressLevel: Record<string, number>;
  
  // Estados mejorados del sistema unificado
  networkState: NetworkState;
  cacheState: CacheState;
  lastRefresh: number;

  // Actions existentes
  fetchUserAudios: (userId: string, forceRefresh?: boolean) => Promise<void>;
  downloadLevelAudio: (levelAudio: any) => Promise<void>;
  deleteLevelAudioDownload: (audioRequestId: string) => Promise<void>;
  loadDownloadedLevelAudios: () => Promise<void>;
  isLevelAudioDownloaded: (audioRequestId: string) => boolean;
  
  // Nuevas acciones del sistema unificado
  updateNetworkState: (newState: Partial<NetworkState>) => void;
  getCacheStats: () => Promise<any>;
  clearCache: (category?: CacheCategory) => Promise<void>;
  preloadImages: (imageUrls: string[]) => Promise<void>;
  initialize: () => Promise<void>;
  reset: () => void;
}

// Estado inicial mejorado
const initialState = {
  requestSettings: null,
  isLoading: false,
  error: null,
  audioRequests: [],
  audios: [],
  levelAudios: [],
  downloadedLevelAudios: {},
  isDownloadingLevel: {},
  downloadProgressLevel: {},
  
  // Estados del sistema unificado
  networkState: {
    isConnected: true,
    connectionType: 'unknown',
    lastConnectedAt: Date.now(),
    offlineQueueSize: 0,
  },
  cacheState: {
    isInitialized: false,
    stats: {
      totalSize: 0,
      itemCount: 0,
      lastCleanup: 0,
    },
  },
  lastRefresh: 0,
};

export const useNewLibraryStore = create<newLibraryStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

  fetchUserAudios: async (userId: string, forceRefresh = false) => {
    const { networkState, lastRefresh } = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    
    // Verificar si necesitamos actualizar
    const shouldRefresh = forceRefresh || 
        (now - lastRefresh > CACHE_DURATION) || 
        networkState.isConnected;
        
    // Si no hay conexión, intentar cargar del cache primero
    if (!networkState.isConnected) {
        try {
            const cachedData = await CacheManager.get(
                `new_library_${userId}`, 
                CacheCategory.USER_DATA, 
                userId
            ) as any;
            if (cachedData) {
                console.log('📦 [NewLibrary] Usando datos en cache (sin conexión)');
                const { requestSettings, audios, levelAudios, audioRequests } = cachedData;
                
                set({
                    requestSettings,
                    audios,
                    levelAudios,
                    audioRequests,
                    isLoading: false,
                    error: null
                });
                return;
            } else {
                console.log('⚠️ [NewLibrary] No hay datos en cache disponibles');
                set({ 
                    error: 'No hay datos disponibles sin conexión',
                    isLoading: false 
                });
                return;
            }
        } catch (error) {
            console.warn('⚠️ [NewLibrary] Error accediendo al cache:', error);
            set({ 
                error: 'Error accediendo a datos offline',
                isLoading: false 
            });
            return;
        }
    }
    
    // Si no necesita refrescar y hay conexión, usar datos actuales
    if (!shouldRefresh && networkState.isConnected) {
        console.log('📱 [NewLibrary] Usando datos actuales');
        return;
    }

    try {
      const { userData } = useAuthStore.getState();

      if(userData?.test === 'true'){
        console.log('🧪 [NewLibrary] Usando datos de prueba');
        set({
          requestSettings: requestSettingsTest,
          audios: audioTest,
          levelAudios: audioTest,
          lastRefresh: now
        })
        return;
      }

      //console.log('🔄 [NewLibrary] Cargando datos del usuario...', { userId, forceRefresh });
      set({ isLoading: true, error: null });
      
      // Intentar cargar desde cache primero si no hay conexión
      if (!networkState.isConnected) {
          try {
              const cachedData = await CacheManager.get(
                `new_library_${userId}`, 
                CacheCategory.USER_DATA, 
                userId
              ) as any;
              if (cachedData) {
                  console.log('📦 [NewLibrary] Usando datos en cache');
                  const { requestSettings, audios, levelAudios, audioRequests } = cachedData;
                  
                  set({
                      requestSettings,
                      audios,
                      levelAudios,
                      audioRequests,
                      isLoading: false,
                      error: null
                  });
                  return;
              }
          } catch (error) {
              console.warn('⚠️ [NewLibrary] Error accediendo al cache:', error);
          }
      }
      
      const [audiosResponse, audioRequests, requestSettings] = await Promise.all([
        AudioService.getAudios(userId),
        AudioRequestService.getAudioRequests(userId),
        FormQuestionsService.getAllRequestSettings()
    ]);
      
      // console.log('✅ [NewLibrary] Datos cargados exitosamente', {
      //   audios: audiosResponse.audios?.length || 0,
      //   levelAudios: audiosResponse.levelAudios?.length || 0,
      //   requests: audioRequests.audiorequests?.length || 0,
      //   settings: requestSettings ? 'loaded' : 'empty'
      // });
      
      const processedData = {
        requestSettings: requestSettings, 
        audios: audiosResponse.audios?.reverse() || [],
        levelAudios: audiosResponse.levelAudios || [],
        audioRequests: audioRequests.audiorequests || []
      };
      
      // Guardar en cache
      try {
          await CacheManager.set(
            `new_library_${userId}`, 
            processedData, 
            CacheCategory.USER_DATA,
            24 * 60 * 60 * 1000, // 24 horas
            userId
          );
      } catch (error) {
          console.warn('⚠️ [NewLibrary] Error guardando en cache:', error);
      }
      
      // Precargar imágenes
      const imageUrls = [
        ...(processedData.audios || []).map((audio: any) => audio.imageUrl).filter(Boolean),
        ...(processedData.levelAudios || []).map((audio: any) => audio.imageUrl).filter(Boolean)
      ];
      
      if (imageUrls.length > 0) {
        get().preloadImages(imageUrls).catch(console.warn);
      }
      
      var filteredRequestSettings: any[] = []
      Array.from(processedData.audioRequests).forEach((setting: any) => {
          var matchingRequest = Array.from(processedData.requestSettings).find((request) => {
            return request.userLevel && request.userLevel === setting.userLevel
          }
              
          );
          if (matchingRequest) {
              filteredRequestSettings.push(matchingRequest)
          }
      })
      // if (filteredRequestSettings.find(request => request.userLevel === userData.userLevel) === undefined) {
      //    filteredRequestSettings.push(requestSettings.find(request => request.userLevel === userData.userLevel))
      //  }

      set({ 
        requestSettings: filteredRequestSettings,
        audios: processedData.audios,
        levelAudios: processedData.levelAudios,
        audioRequests: processedData.audioRequests,
        isLoading: false,
        lastRefresh: now
      });
      
    } catch (error: any) {
      console.error('❌ [NewLibrary] Error cargando datos:', error);
      
      // Intentar cargar desde cache en caso de error
      if (networkState.isConnected) {
          try {
              const cachedData = await CacheManager.get(
                `new_library_${userId}`, 
                CacheCategory.USER_DATA, 
                userId
              ) as any;
              if (cachedData) {
                  console.log('📦 [NewLibrary] Usando cache como fallback');
                  const { requestSettings, audios, levelAudios, audioRequests } = cachedData;
                  
                  set({
                      requestSettings,
                      audios,
                      levelAudios,
                      audioRequests,
                      isLoading: false,
                      error: 'Datos cargados desde cache debido a error de red'
                  });
                  return;
              }
          } catch (error) {
              console.warn('⚠️ [NewLibrary] Error accediendo al cache como fallback:', error);
          }
      }
      
      set({ 
        error: error.message || 'Error al cargar los ajustes de solicitud',
        isLoading: false
      });
    }
  },

  downloadLevelAudio: async (levelAudio: any) => {
    const audioUrl = levelAudio.audioUrl;
    const audioRequestId = levelAudio.audioRequestId;
    const { networkState } = get();
    
    if (!audioUrl || !audioRequestId) {
      console.error('❌ [NewLibrary] No se puede descargar el levelAudio: URL o ID faltante');
      Alert.alert(
        "Error de descarga",
        "Información del audio incompleta. No se puede proceder con la descarga.",
        [{ text: "Aceptar" }]
      );
      return;
    }
    
    if (!networkState.isConnected) {
      console.warn('📱 [NewLibrary] Sin conexión para descargar audio');
      Alert.alert(
        "Sin conexión",
        "Necesitas conexión a internet para descargar audios.",
        [{ text: "Aceptar" }]
      );
      return;
    }
    
    console.log(`🔽 [NewLibrary] Iniciando descarga para levelAudio: ${levelAudio.title || audioRequestId}`);
    
    // Marcar como descargando
    set(state => ({ 
      isDownloadingLevel: { ...state.isDownloadingLevel, [audioRequestId]: true },
      downloadProgressLevel: { ...state.downloadProgressLevel, [audioRequestId]: 0 }
    }));
    
    try {
      console.log(`📥 [NewLibrary] Descargando desde: ${audioUrl}`);
      const localPath = await AudioDownloadService.downloadAudio(
        audioUrl,
        audioRequestId,
        (progress) => {
          console.log(`📊 [NewLibrary] Progreso levelAudio ${audioRequestId}: ${Math.round(progress * 100)}%`);
          set(state => ({
            downloadProgressLevel: { ...state.downloadProgressLevel, [audioRequestId]: progress }
          }));
        }
      );
      
      if (localPath) {
        console.log(`✅ [NewLibrary] Descarga completada: ${localPath}`);
        
        // Guardar metadatos para uso offline
        const metadataKey = `${LEVEL_AUDIO_METADATA_KEY_PREFIX}${audioRequestId}`;
        const metadataToStore = {
          title: levelAudio.title,
          artwork: levelAudio.imageUrl,
          audioUrl: audioUrl,
          formattedDuration: levelAudio.formattedDuration,
          userLevel: levelAudio.userLevel,
          description: levelAudio.description,
          publicationDate: levelAudio.publicationDate,
          downloadedAt: Date.now(),
          localPath: localPath,
          rawLevelAudioData: levelAudio
        };
        
        await AsyncStorage.setItem(metadataKey, JSON.stringify(metadataToStore));
        console.log(`💾 [NewLibrary] Metadatos guardados para: ${audioRequestId}`);
        
        // Actualizar lista de descargas
        const downloadedAudios = await AudioDownloadService.getDownloadedAudios();
        const levelAudioDownloads: Record<string, { path: string, lastUpdated: number }> = {};
        
        // Filtrar solo los levelAudios descargados
        Object.keys(downloadedAudios).forEach(id => {
          const levelAudio = get().levelAudios.find((la: any) => la.audioRequestId === id);
          if (levelAudio) {
            levelAudioDownloads[id] = downloadedAudios[id];
          }
        });
        
        set({ downloadedLevelAudios: levelAudioDownloads });
        
        console.log('🔄 [NewLibrary] Estado actualizado con nuevas descargas');
        
        Alert.alert(
          "Descarga completada",
          `"${levelAudio.title || 'Audio'}" se ha descargado correctamente y está disponible offline.`,
          [{ text: "Aceptar" }]
        );
      } else {
        console.error('❌ [NewLibrary] Fallo en la descarga: No se recibió localPath');
        Alert.alert(
          "Error de descarga",
          "No se pudo completar la descarga. Verifica tu conexión e inténtalo de nuevo.",
          [{ text: "Aceptar" }]
        );
      }
    } catch (error: any) {
      console.error('❌ [NewLibrary] Error durante la descarga:', error);
      
      let errorMessage = "Ocurrió un error inesperado durante la descarga.";
      
      if (error.message?.includes('network')) {
        errorMessage = "Error de conexión. Verifica tu internet e inténtalo de nuevo.";
      } else if (error.message?.includes('storage')) {
        errorMessage = "No hay suficiente espacio de almacenamiento disponible.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Error de permisos. Verifica los permisos de la aplicación.";
      }
      
      Alert.alert(
        "Error de descarga",
        errorMessage,
        [{ text: "Aceptar" }]
      );
    } finally {
      // Marcar como no descargando
      set(state => ({ 
        isDownloadingLevel: { ...state.isDownloadingLevel, [audioRequestId]: false }
      }));
    }
  },

  deleteLevelAudioDownload: async (audioRequestId: string) => {
    try {
      console.log(`🗑️ [NewLibrary] Eliminando descarga: ${audioRequestId}`);
      
      const success = await AudioDownloadService.deleteDownloadedAudio(audioRequestId);
      
      if (success) {
        // Eliminar también los metadatos guardados
        const metadataKey = `${LEVEL_AUDIO_METADATA_KEY_PREFIX}${audioRequestId}`;
        await AsyncStorage.removeItem(metadataKey);
        console.log(`💾 [NewLibrary] Metadatos eliminados para: ${audioRequestId}`);
        
        const downloadedAudios = await AudioDownloadService.getDownloadedAudios();
        const levelAudioDownloads: Record<string, { path: string, lastUpdated: number }> = {};
        
        // Filtrar solo los levelAudios descargados
        Object.keys(downloadedAudios).forEach(id => {
          const levelAudio = get().levelAudios.find((la: any) => la.audioRequestId === id);
          if (levelAudio) {
            levelAudioDownloads[id] = downloadedAudios[id];
          }
        });
        
        set({ downloadedLevelAudios: levelAudioDownloads });
        console.log('✅ [NewLibrary] Descarga eliminada exitosamente');
        
        Alert.alert(
          "Audio eliminado",
          "El audio descargado ha sido eliminado del dispositivo.",
          [{ text: "Aceptar" }]
        );
      } else {
        console.error('❌ [NewLibrary] Error eliminando descarga');
        Alert.alert(
          "Error",
          "No se pudo eliminar el audio descargado. Inténtalo de nuevo.",
          [{ text: "Aceptar" }]
        );
      }
    } catch (error) {
      console.error('❌ [NewLibrary] Error durante eliminación:', error);
      Alert.alert(
        "Error",
        "Ocurrió un error al eliminar el audio. Inténtalo de nuevo.",
        [{ text: "Aceptar" }]
      );
    }
  },

  loadDownloadedLevelAudios: async () => {
    try {
      console.log('📱 [NewLibrary] Cargando audios descargados...');
      
      const downloadedAudios = await AudioDownloadService.getDownloadedAudios();
      const levelAudioDownloads: Record<string, { path: string, lastUpdated: number }> = {};
      
      // Obtener levelAudios del estado actual
      // Filtrar solo los levelAudios descargados
      const { levelAudios } = get();
      let downloadedCount = 0;
      
      // Si levelAudios está vacío (sin conexión), reconstruir desde metadatos
      if (levelAudios.length === 0) {
        console.log('📱 [NewLibrary] levelAudios vacío, reconstruyendo desde metadatos...');
        const reconstructedLevelAudios = [];
        
        // Obtener todos los metadatos guardados
        const keys = await AsyncStorage.getAllKeys();
        const metadataKeys = keys.filter(key => key.startsWith(LEVEL_AUDIO_METADATA_KEY_PREFIX));
        
        for (const key of metadataKeys) {
          try {
            const metadataString = await AsyncStorage.getItem(key);
            if (metadataString) {
              const metadata = JSON.parse(metadataString);
              const audioRequestId = key.replace(LEVEL_AUDIO_METADATA_KEY_PREFIX, '');
              
              // Verificar que el audio aún esté descargado
              if (downloadedAudios[audioRequestId]) {
                reconstructedLevelAudios.push(metadata.rawLevelAudioData || {
                  audioRequestId,
                  title: metadata.title,
                  imageUrl: metadata.artwork,
                  audioUrl: metadata.audioUrl,
                  formattedDuration: metadata.formattedDuration,
                  userLevel: metadata.userLevel,
                  description: metadata.description,
                  publicationDate: metadata.publicationDate
                });
                
                levelAudioDownloads[audioRequestId] = downloadedAudios[audioRequestId];
                downloadedCount++;
              }
            }
          } catch (error) {
            console.warn(`⚠️ [NewLibrary] Error procesando metadata ${key}:`, error);
          }
        }
        
        // Actualizar el estado con los levelAudios reconstruidos
        set({ 
          levelAudios: reconstructedLevelAudios,
          downloadedLevelAudios: levelAudioDownloads 
        });
      } else {
        // Flujo normal cuando levelAudios ya está poblado
        Object.keys(downloadedAudios).forEach(id => {
          console.log("id", id);
          console.log("levelAudios", JSON.stringify(levelAudios, null, 2));
          const levelAudio = levelAudios.find((la: any) => la.audioRequestId === id);
          if (levelAudio) {
            levelAudioDownloads[id] = downloadedAudios[id];
            downloadedCount++;
          }
        });
        
        set({ downloadedLevelAudios: levelAudioDownloads });
      }
      
      console.log(`✅ [NewLibrary] Encontrados ${downloadedCount} audios descargados`);
      
    } catch (error) {
      console.error('❌ [NewLibrary] Error cargando audios descargados:', error);
    }
  },

  isLevelAudioDownloaded: (audioRequestId: string) => {
    const { downloadedLevelAudios } = get();
    return !!downloadedLevelAudios[audioRequestId];
  },

  // Nuevas funciones del sistema unificado
  updateNetworkState: (newState: Partial<NetworkState>) => {
    const currentState = get().networkState;
    const updatedState = { ...currentState, ...newState };
    
    console.log('🌐 [NewLibrary] Estado de red actualizado:', updatedState);
    set({ networkState: updatedState });
  },

  getCacheStats: async () => {
    try {
      const stats = {
        totalSize: 0,
        itemCount: 0,
        lastCleanup: Date.now()
      };
      set({
        cacheState: {
          ...get().cacheState,
          stats
        }
      });
      return stats;
    } catch (error) {
      console.error('❌ [NewLibrary] Error obteniendo estadísticas de cache:', error);
      return get().cacheState.stats;
    }
  },

  clearCache: async (category?: CacheCategory) => {
    try {
      // Simular limpieza de cache
      console.log('🧹 [NewLibrary] Cache limpiado');
      console.log('🗑️ [NewLibrary] Cache limpiado');
      
      // Actualizar estadísticas
      await get().getCacheStats();
    } catch (error) {
      console.error('❌ [NewLibrary] Error limpiando cache:', error);
    }
  },

  preloadImages: async (imageUrls: string[]) => {
    try {
      const validUrls = imageUrls.filter(url => url && typeof url === 'string');
      if (validUrls.length === 0) return;

      await Promise.allSettled(validUrls);
    } catch (error) {
      console.error('❌ [NewLibrary] Error en precarga de imágenes:', error);
    }
  },

  initialize: async () => {
    try {
      console.log('🚀 [NewLibrary] Inicializando store...');
      
      // Inicializar cache
      await CacheManager.initialize();
      
      // Actualizar estado de red
      const networkState = {
        isConnected: true,
        connectionType: 'unknown',
        lastConnectedAt: Date.now(),
        offlineQueueSize: 0
      };
      get().updateNetworkState(networkState);
      
      // Cargar audios descargados
      await get().loadDownloadedLevelAudios();
      
      // Obtener estadísticas de cache
      await get().getCacheStats();
      
      set({
        cacheState: {
          ...get().cacheState,
          isInitialized: true
        }
      });
      
      console.log('✅ [NewLibrary] Store inicializado correctamente');
    } catch (error) {
      console.error('❌ [NewLibrary] Error inicializando store:', error);
    }
  },

  reset: () => {
    console.log('🔄 [NewLibrary] Reseteando store...');
    set({
      ...initialState,
      networkState: get().networkState, // Mantener estado de red
      cacheState: get().cacheState, // Mantener estado de cache
    });
  },

}),
      {
        name: 'new-library-store',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (state) => ({
          downloadedLevelAudios: state.downloadedLevelAudios,
          lastRefresh: state.lastRefresh,
          cacheState: state.cacheState,
        }),
      }
    )
  )
);
