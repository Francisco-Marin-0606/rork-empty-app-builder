import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auraService, RootEntry } from '../services/api/auraHertzService'
import type { AlbumData } from '../types/music'
import { AudioDownloadService } from '@/services/audioDownloadService'
import { Alert } from 'react-native'
import cacheManager from '@/services/cache/cacheManager'
import { useAuthStore } from './authStore'

export interface AuraDataAudio {
  id: string
  title?: string
  description?:  string
  imageUrl?:  string
  vinillo?:  string
  colorBackground?: string
  colorText?: string
  frecuencia?: string
  trackUrl?: string
  tracks?: TrackAura[]
}

 interface TrackAura {
    title: string
    trackUrl: string
 }

// Helper to normalize ids (strip any suffix after '-')
const getBaseId = (id?: string | null) => (id ? String(id).split('-')[0] : '')

// Función para verificar si una imagen está en cache
const isImageCached = async (url: string, userId?: string): Promise<boolean> => {
  if (!url) return false;
  try {
    const cachedPath = await cacheManager.getCachedImage(url, userId);
    return cachedPath !== null;
  } catch (error) {
    console.warn('[AuraStore] Error verificando cache de imagen:', error);
    return false;
  }
};

// Función para cargar imágenes en segundo plano sin bloquear la UI
const loadImageInBackground = async (url: string, userId?: string): Promise<string | null> => {
  if (!url) return null;
  
  return new Promise((resolve) => {
    // Usar setTimeout para no bloquear el hilo principal
    setTimeout(async () => {
      try {
        const cachedPath = await cacheManager.cacheImage(url, userId);
        resolve(cachedPath);
      } catch (error) {
        console.warn('[AuraStore] Error cargando imagen en segundo plano:', error);
        resolve(null);
      }
    }, 0);
  });
};

// Función para obtener imagen desde cache o URL original
const getImageSource = async (url: string, userId?: string, isConnected: boolean = true): Promise<string> => {
  if (!url) return '';
  
  // Si estamos conectados, intentar obtener desde cache primero
  if (isConnected) {
    const cachedPath = await cacheManager.getCachedImage(url, userId);
    return cachedPath || url;
  }
  
  // Si no hay conexión, solo usar cache
  const cachedPath = await cacheManager.getCachedImage(url, userId);
  return cachedPath || url;
};

  export const convertToAlbumData = (items: AuraDataAudio[]): AlbumData[] => {
    // Prefer local downloaded path if available
    const downloaded = useAuraStore.getState().downloadedAura

    return items.map((t) => {
      const local = downloaded?.[t.id]?.path
      return {
        id: t.id,
        title: t.title || 'Sin título',
        subtitle: t.description || 'Sin descripción',
        color: t.colorBackground,
        vinylUrl: t.vinillo,
        imageUrl: t.imageUrl,
        audioRealUrl: t.trackUrl,
        audioUrl:  local || t.trackUrl,
      }
    }) as AlbumData[];
  };


 export const convertToAlbumDatas = (item: AuraDataAudio): AlbumData[] => {
    // Prefer local downloaded path per track if available
    const downloaded = useAuraStore.getState().downloadedAura
    const userData = useAuthStore.getState().userData

    return item?.tracks?.map((t, index) => {
      const id = (t.trackUrl?.split('/')?.pop()?.replace('.mp3', '')  || `track-${index}`)+':'+item.title+ '-' + index
      const local = downloaded?.[id]?.path
       const title = t.title?.replace('${name}', userData.wantToBeCalled || '')
      return {
      id: id,
      title: title,
      subtitle: item.title || 'Sin descripción',
      color: item.colorBackground,
      imageUrl: item.imageUrl,
      vinylUrl: item.vinillo,
      audioRealUrl: t.trackUrl,
      audioUrl: local || t.trackUrl
    }
  }) as AlbumData[] || [];
  };

export const convertToAlbumDatasFromTracks = (t: AuraDataAudio): AlbumData => {
    // Prefer local downloaded path if available
    const downloaded = useAuraStore.getState().downloadedAura
    const baseId = getBaseId(t.id)
    const local = downloaded?.[baseId]?.path
    return {
      id: t.id,
      title: t.title || 'Sin título',
      subtitle: t.description || 'Sin descripción',
      color: t.colorBackground,
      vinylUrl: t.vinillo,
      imageUrl: t.imageUrl,
      audioRealUrl: t.trackUrl,
      audioUrl: local || t.trackUrl
    }  as AlbumData;
  }


// Función para convertir datos del servicio al formato AlbumData
const _convertToAlbumData = async (items: any[], startId: number = 1, userName: string = '', isConnected: boolean = true): Promise<AuraDataAudio[]> => {
  const userData = useAuthStore.getState().userData;
  
  return Promise.all(items.map(async (item, index) => {
    const title = item.title?.replace('${name}', userName) || `Track ${startId}`;
    const id = String(item.trackUrl?.split('/')?.pop()?.replace('.mp3', '') || `${title}${index}`);
    const description = item.description?.replace('${name}', userName) || "Descripción no disponible";
        
    // Obtener imágenes desde cache o URL original de forma optimizada
    const [imageUrl, viniloUrl] = await Promise.all([
      getImageSource(item.imageUrl || '', userData?.userId, isConnected),
      getImageSource(item.vinillo || '', userData?.userId, isConnected)
    ]);

    return {
      id,
      title,
      description,
      imageUrl,
      vinillo: viniloUrl,
      colorBackground: item.colorBackground,
      colorText: item.colorText,
      frecuencia: item.frecuencia,
      trackUrl: item.trackUrl,
      tracks: item.tracks
    } as AuraDataAudio;
  }));
};
interface AuraState {
  // Data states
  forYouData: AuraDataAudio[]
  instrumentalData: AuraDataAudio[]
  extraData: AuraDataAudio[]
  rawData: RootEntry | null
  
  // Loading states
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Current selection states
  selectedAlbum: AuraDataAudio | null
  currentGenre: string

  // Download/offline states for Aura
  downloadedAura: Record<string, { path: string; lastUpdated: number }>
  isDownloadingAura: Record<string, boolean>
  downloadProgressAura: Record<string, number>
  
  // Actions
  setForYouData: (data: AuraDataAudio[]) => void
  setInstrumentalData: (data: AuraDataAudio[]) => void
  setExtraData: (data: AuraDataAudio[]) => void
  setSelectedAlbum: (album: AuraDataAudio | null) => void
  setCurrentGenre: (genre: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Service actions
  loadAuraData: (genre?: string, userName?: string, isConnected?: boolean) => Promise<void>
  refreshData: (genre?: string, userName?: string, isConnected?: boolean) => Promise<void>
  reset: () => void

  // Download actions
  loadDownloadedAura: () => Promise<void>
  isAuraDownloaded: (trackId: string) => boolean
  downloadAuraById: (audioUrl: string, trackId: string, metadata?: { title?: string; artwork?: string; description?: string }) => Promise<void>
  deleteAuraDownload: (trackId: string) => Promise<void>
  downloadForYou: (albums: AuraDataAudio[]) => void
  
  // Cache utility actions
  isImageCached: (url: string) => Promise<boolean>
  preloadImagesInBackground: (items: AuraDataAudio[]) => void
}

const AURA_METADATA_KEY_PREFIX = '@mental_magnet_aura_track_metadata_'

export const useAuraStore = create<AuraState>()(
  persist(
    (set, get) => ({
      // Initial state
      forYouData: [],
      instrumentalData: [],
      extraData: [],
      rawData: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      selectedAlbum: null,
      currentGenre: 'woman',

      // Download initial state
      downloadedAura: {},
      isDownloadingAura: {},
      downloadProgressAura: {},
      
      // Setters
      setForYouData: (data: AuraDataAudio[]) => set({ forYouData: data }),
      setInstrumentalData: (data: AuraDataAudio[]) => set({ instrumentalData: data }),
      setExtraData: (data: AuraDataAudio[]) => set({ extraData: data }),
      setSelectedAlbum: (album: AuraDataAudio | null) => set({ selectedAlbum: album }),
      setCurrentGenre: (genre: string) => set({ currentGenre: genre }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      
      // Load data from service
      loadAuraData: async (genre = 'woman', userName = '', isConnected = true) => {
        const state = get()
        
        // Don't reload if already loaded for this genre
        if (state.isInitialized && state.currentGenre === genre && state.forYouData.length > 0) {
          return
        }
        
        set({ isLoading: true, error: null, currentGenre: genre })
        
        try {
          const response = await auraService.getAuraHertzConfig(genre)
          const data = Array.isArray(response) ? response[0] : response
          console.log('🔍 [AuraStore] loadAuraData fetched data', { genre, data })
          if (data) {
            set({ rawData: data })
            // Convert forYou data
            if (data.forYou && data.forYou.length > 0) {
              const forYouConverted = await _convertToAlbumData(data.forYou, 1, userName, isConnected)
              set({ forYouData: forYouConverted })
              setTimeout(async () => {
                // Precargar imágenes en segundo plano después de cargar los datos
                get().preloadImagesInBackground(forYouConverted)
                // Dispara descargas en segundo plano de los audios que falten
                get().downloadForYou?.(forYouConverted)
              }, 6000)
            }
            
            // Convert instrumentals data
            if (data.instrumentals && data.instrumentals.length > 0) {
              const flatInstrumentals = data.instrumentals.flat()
              const instrumentalsConverted = await _convertToAlbumData(flatInstrumentals, 100, userName, isConnected)
              set({ instrumentalData: instrumentalsConverted })
              setTimeout(async () => {
                // Precargar imágenes en segundo plano para instrumentales
                get().preloadImagesInBackground(instrumentalsConverted)
              },  6000)
            }
                        // Set extraData as empty for now
            set({ extraData: [] })
            
            set({ isInitialized: true, error: null })
          }
        } catch (error) {
          console.error('Error loading Aura data:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Error loading Aura data',
            forYouData: [],
            instrumentalData: [],
            extraData: []
          })
        } finally {
          set({ isLoading: false })
        }
      },
      
      // Refresh data (force reload)
      refreshData: async (genre = 'woman', userName = '', isConnected = true) => {
        set({ isInitialized: false })
        await get().loadAuraData(genre, userName, isConnected)
      },
      
      // Reset store
      reset: () => {
        set({
          forYouData: [],
          instrumentalData: [],
          extraData: [],
          rawData: null,
          isLoading: false,
          isInitialized: false,
          error: null,
          selectedAlbum: null,
          currentGenre: 'woman',
          downloadedAura: {},
          isDownloadingAura: {},
          downloadProgressAura: {},
        })
      },

      // Download actions
      loadDownloadedAura: async () => {
        try {
          const downloaded = await AudioDownloadService.getDownloadedAudios()
          set({ downloadedAura: downloaded })
        } catch (e) {
          console.warn('[AuraStore] loadDownloadedAura failed', e)
        }
      },
      isAuraDownloaded: (trackId: string) => {
        const id = String(trackId)
        return !!get().downloadedAura[id]
      },
      downloadAuraById: async (audioUrl: string, trackId: string, metadata) => {
        if (!audioUrl || !trackId) return
        // mark downloading
        set((state) => ({
          isDownloadingAura: { ...state.isDownloadingAura, [trackId]: true },
          downloadProgressAura: { ...state.downloadProgressAura, [trackId]: 0 },
        }))
        try {
          const localPath = await AudioDownloadService.downloadAudio(
            audioUrl,
            trackId,
            (progress) => {
              set((state) => ({
                downloadProgressAura: { ...state.downloadProgressAura, [trackId]: progress },
              }))
            }
          )
          if (localPath) {
            try {
              const metadataKey = `${AURA_METADATA_KEY_PREFIX}${trackId}`
              const dataToStore = {
                title: metadata?.title,
                artwork: metadata?.artwork,
                description: metadata?.description,
                onlineUrl: audioUrl,
                downloadedAt: Date.now(),
                localPath,
              }
              await AsyncStorage.setItem(metadataKey, JSON.stringify(dataToStore))
            } catch (e) {
              console.warn('[AuraStore] save metadata failed', e)
            }
            const downloaded = await AudioDownloadService.getDownloadedAudios()
            set({ downloadedAura: downloaded })
          } else {
            Alert.alert?.('Error de descarga', 'No se pudo completar la descarga. Inténtalo de nuevo.')
          }
        } catch (e) {
          console.error('[AuraStore] downloadAuraById error', e)
          Alert.alert?.('Error de descarga', 'Ocurrió un error al descargar el audio.')
        } finally {
          set((state) => ({
            isDownloadingAura: { ...state.isDownloadingAura, [trackId]: false },
          }))
        }
      },
      deleteAuraDownload: async (trackId: string) => {
        try {
          const success = await AudioDownloadService.deleteDownloadedAudio(trackId)
          if (success) {
            try { await AsyncStorage.removeItem(`${AURA_METADATA_KEY_PREFIX}${trackId}`) } catch {}
            const downloaded = await AudioDownloadService.getDownloadedAudios()
            set({ downloadedAura: downloaded })
          } else {
            Alert.alert?.('Error', 'No se pudo eliminar el audio.')
          }
        } catch (e) {
          console.error('[AuraStore] deleteAuraDownload error', e)
          Alert.alert?.('Error', 'Ocurrió un error al eliminar el audio.')
        }
      },
      downloadForYou: (albums: AuraDataAudio[]) => {
        albums.forEach(a => {
          console.log('🔍 [AuraStore] downloadForYou',JSON.stringify(a))
          if (!a.trackUrl || get().isAuraDownloaded(a.id)) return
   
          console.log('🔍 [AuraStore] downloadForYou calling downloadAuraById', a.id)
          get().downloadAuraById(a.trackUrl??'', a.id, {
            title: a.title,
            artwork: a.imageUrl,
            description: a.description,
          })
        })
      },

      // Cache utility functions
      isImageCached: async (url: string) => {
        const { userData } = useAuthStore.getState()
        return await isImageCached(url, userData?.id)
      },

      preloadImagesInBackground: (items: AuraDataAudio[]) => {
        const { userData } = useAuthStore.getState()
        items.forEach(async (item) => {
          if (item.imageUrl && !(await isImageCached(item.imageUrl, userData?.id))) {
            loadImageInBackground(item.imageUrl, userData?.id)
          }
          if (item.vinillo && !(await isImageCached(item.vinillo, userData?.id))) {
            loadImageInBackground(item.vinillo, userData?.id)
          }
        })
      },
    }),
    {
      name: 'aura-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: AuraState) => ({
        forYouData: state.forYouData,
        instrumentalData: state.instrumentalData,
        extraData: state.extraData,
        currentGenre: state.currentGenre,
        isInitialized: state.isInitialized,
        downloadedAura: state.downloadedAura,
        selectedAlbum: state.selectedAlbum
      }),
    }
  )
)

// Selectors for easy access
export const useAuraData = () => {
  const forYouData = useAuraStore((state) => state.forYouData)
  const instrumentalData = useAuraStore((state) => state.instrumentalData)
  const isLoading = useAuraStore((state) => state.isLoading)
  const extraData = useAuraStore((state) => state.extraData)
  const error = useAuraStore((state) => state.error)
  
  return {
    forYouData,
    instrumentalData,
    isLoading,
    extraData,
    error
  }
}

export const useAuraSelection = () => {
  const selectedAlbum = useAuraStore((state) => state.selectedAlbum)
  const setSelectedAlbum = useAuraStore((state) => state.setSelectedAlbum)
  
  return {
    selectedAlbum,
    setSelectedAlbum
  }
}

export const useAuraActions = () => {
  const loadAuraData = useAuraStore((state) => state.loadAuraData)
  const refreshData = useAuraStore((state) => state.refreshData)
  const setCurrentGenre = useAuraStore((state) => state.setCurrentGenre)
  const reset = useAuraStore((state) => state.reset)
  
  return {
    loadAuraData,
    refreshData,
    setCurrentGenre,
    reset
  }
}

export const useAuraDownloads = () => {
  const downloadedAura = useAuraStore((s) => s.downloadedAura)
  const isDownloadingAura = useAuraStore((s) => s.isDownloadingAura)
  const downloadProgressAura = useAuraStore((s) => s.downloadProgressAura)
  const loadDownloadedAura = useAuraStore((s) => s.loadDownloadedAura)
  const isAuraDownloaded = useAuraStore((s) => s.isAuraDownloaded)
  const downloadAuraById = useAuraStore((s) => s.downloadAuraById)
  const deleteAuraDownload = useAuraStore((s) => s.deleteAuraDownload)
  const downloadForYou = useAuraStore((s) => s.downloadForYou)

  return {
    downloadedAura,
    isDownloadingAura,
    downloadProgressAura,
    loadDownloadedAura,
    isAuraDownloaded,
    downloadAuraById,
    deleteAuraDownload,
    downloadForYou,
  }
}