import { UnifiedTrack, TrackStatus } from "@/helpers/types";
import TrackPlayer, { Track} from "react-native-track-player";
import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AudioService } from "@/services/api/audioService";
import { unknownTrackImageUri } from "@/constants/images";
import { AudioRequestService } from "@/services/api/audioRequestService";
import { useQueueStore } from "./queue";
import _ from 'lodash';
import { AudioDownloadService } from "@/services/audioDownloadService";
import { Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetworkManager from '../services/api/networkManager';
import { CacheCategory } from '../services/cache/types';

// Constante para almacenamiento de metadatos
const TRACK_METADATA_KEY_PREFIX = '@mental_magnet_track_metadata_';

// Función para calcular el progreso de tiempo restante hasta la fecha de publicación
// Devuelve un valor entre 0 y 1 indicando el progreso 
const calculateRemainingTimeProgress = (now: Date, pubDate: Date): number => {
  // Asumimos que un audio en proceso típicamente toma 24 horas para estar listo
  const PROCESSING_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
  
  const timeUntilPublication = pubDate.getTime() - now.getTime();
  // Si faltan más de 24 horas, el progreso es bajo
  if (timeUntilPublication > PROCESSING_PERIOD_MS) {
    return 0.1; // 10% de progreso para mostrar que está iniciando
  }
  
  // Calculamos el progreso como: 1 - (tiempo restante / período total)
  const progress = 1 - (timeUntilPublication / PROCESSING_PERIOD_MS);
  
  // Limitamos el progreso entre 0.1 y 0.95 (nunca llegará a 100% hasta la fecha)
  return Math.min(Math.max(progress, 0.1), 0.95);
};

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

interface LibraryState {
    tracks: UnifiedTrack[];
    audioRequests: any;
    audios: any;
    playableTracks: UnifiedTrack[];
    isInitialLoading: boolean;
    isBackgroundLoading: boolean;
    error: string | null;
    downloadedTracks: Record<string, { path: string, lastUpdated: number }>;
    isDownloading: Record<string, boolean>;
    downloadProgress: Record<string, number>;
    
    // Estados mejorados del sistema unificado
    networkState: NetworkState;
    cacheState: CacheState;
    lastRefresh: number;
    
    // Acciones existentes
    toggleTrackFavorites: (track: Track) => void;
    addToPlaylist: (track: Track, playlistName: string) => void;
    setTracks: (tracks: UnifiedTrack[]) => void;
    fetchUserTracks: (userId: string, isBackground?: boolean, forceRefresh?: boolean) => Promise<void>;
    syncPlayerQueue: () => Promise<void>;
    reset: () => Promise<void>;
    downloadAudio: (track: UnifiedTrack) => Promise<void>;
    deleteDownloadedAudio: (trackId: string) => Promise<void>;
    loadDownloadedAudios: () => Promise<void>;
    checkAudioRequestsStatus: () => Promise<void>;
    
    // Nuevas acciones del sistema unificado
    updateNetworkState: () => void;
    getCacheStats: () => Promise<void>;
    clearCache: (category?: CacheCategory) => Promise<void>;
    preloadImages: (imageUrls: string[]) => Promise<void>;
    initialize: (userId: string) => Promise<void>;
}


  


// Estado inicial mejorado
const initialState = {
    tracks: [],
    audioRequests: [],
    audios: [],
    playableTracks: [],
    isInitialLoading: false,
    isBackgroundLoading: false,
    error: null,
    downloadedTracks: {},
    isDownloading: {},
    downloadProgress: {},
    
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

export const useLibraryStore = create<LibraryState>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                ...initialState,
    toggleTrackFavorites: () => { },
    addToPlaylist: () => { },
    setTracks: (tracks) => set({ tracks }),
    
    loadDownloadedAudios: async () => {
        //console.log('[LibraryStore] Loading downloaded audios...');
        try {
            const downloadedAudios = await AudioDownloadService.getDownloadedAudios();
            //console.log(`[LibraryStore] Found ${Object.keys(downloadedAudios).length} downloaded audios`);
            set({ downloadedTracks: downloadedAudios });
            
            // If we have no track data but have downloaded audios, we need to update playableTracks
            const { tracks } = get();
            if (tracks.length === 0 && Object.keys(downloadedAudios).length > 0) {
                //console.log('[LibraryStore] No tracks in store but found downloaded audios, creating offline tracks');
                
                // Crear tracks offline a partir de datos descargados y metadatos guardados
                const offlineTracks = await Promise.all(
                    Object.entries(downloadedAudios).map(async ([trackId, data]) => {
                        // Intentar recuperar metadatos guardados
                        const metadataKey = `${TRACK_METADATA_KEY_PREFIX}${trackId}`;
                        const savedMetadata = await AsyncStorage.getItem(metadataKey);
                        let metadata = null;
                        
                        try {
                            metadata = savedMetadata ? JSON.parse(savedMetadata) : null;
                        } catch (e) {
                            console.error('[LibraryStore] Error parsing saved metadata:', e);
                        }
                        
                        return {
                            id: trackId,
                            audioRequestId: trackId,
                            url: data.path,
                            offlineUrl: data.path,
                            onlineUrl: metadata?.onlineUrl || '',
                            title: metadata?.title || `Hipnosis ${trackId}`,
                            artwork: metadata?.artwork || unknownTrackImageUri,
                            formattedDuration: metadata?.formattedDuration || '',
                            status: 'offline' as TrackStatus,
                            isOffline: true,
                            isProcessing: false,
                            rawAudioData: metadata?.rawAudioData || null,
                            // Propiedades adicionales para compatibilidad
                            rating: 0,
                            playlists: [],
                            customData: {}
                        } as UnifiedTrack;
                    })
                );
                
                console.log(`[LibraryStore] Created ${offlineTracks.length} offline tracks`);
                
                set({
                    tracks: offlineTracks,
                    playableTracks: offlineTracks
                });
            }
        } catch (error) {
            console.error('[LibraryStore] Error loading downloaded audios:', error);
        }
    },
    
    downloadAudio: async (track: UnifiedTrack) => {
        const audioUrl = track.onlineUrl || track.url;
        if (!audioUrl || !track.audioRequestId) {
            console.error('[LibraryStore] No se puede descargar el audio: URL o ID faltante');
            return;
        }
        
        console.log(`[LibraryStore] Iniciando descarga para track: ${track.title || track.audioRequestId}`);
        
        // Marcar como descargando
        set(state => ({ 
            isDownloading: { ...state.isDownloading, [track.audioRequestId]: true },
            downloadProgress: { ...state.downloadProgress, [track.audioRequestId]: 0 }
        }));
        
        try {
            // Iniciar descarga
            console.log(`[LibraryStore] Llamando a AudioDownloadService para track: ${track.audioRequestId}`);
            const localPath = await AudioDownloadService.downloadAudio(
                audioUrl,
                track.audioRequestId,
                (progress) => {
                    console.log(`[LibraryStore] Progreso: ${Math.round(progress * 100)}%`);
                    set(state => ({
                        downloadProgress: { ...state.downloadProgress, [track.audioRequestId]: progress }
                    }));
                }
            );
            
            if (localPath) {
                console.log(`[LibraryStore] Descarga completada, path: ${localPath}`);
                
                // Guardar metadatos para uso offline
                const metadataKey = `${TRACK_METADATA_KEY_PREFIX}${track.audioRequestId}`;
                const metadataToStore = {
                    title: track.title,
                    artwork: track.artwork,
                    onlineUrl: audioUrl,
                    formattedDuration: track.formattedDuration,
                    // Datos mínimos para identificación
                    rawAudioData: { 
                        _id: track.id,
                        title: track.title,
                        audioRequestId: track.audioRequestId,
                    }
                };
                
                await AsyncStorage.setItem(metadataKey, JSON.stringify(metadataToStore));
                console.log(`[LibraryStore] Metadatos guardados para: ${track.audioRequestId}`);
                
                // Actualizar lista de descargas
                const downloadedAudios = await AudioDownloadService.getDownloadedAudios();
                set({ downloadedTracks: downloadedAudios });
                
                // Actualizar tracks en memoria
                const currentTracks = [...get().tracks];
                const trackIndex = currentTracks.findIndex(t => t.audioRequestId === track.audioRequestId);
                
                if (trackIndex >= 0) {
                    currentTracks[trackIndex] = {
                        ...currentTracks[trackIndex],
                        offlineUrl: localPath,
                        isOffline: true
                    };
                    set({ tracks: currentTracks });
                }
                
                console.log('[LibraryStore] Estado actualizado con nuevas descargas');
            } else {
                console.error(`[LibraryStore] Fallo en la descarga: No se recibió localPath`);
                Alert.alert(
                    "Error de descarga",
                    "No se pudo descargar el audio. Por favor, inténtalo de nuevo más tarde.",
                    [{ text: "Aceptar" }]
                );
            }
        } catch (error) {
            console.error(`[LibraryStore] Error durante la descarga:`, error);
            Alert.alert(
                "Error de descarga",
                "Ocurrió un error al descargar el audio. Por favor, inténtalo de nuevo más tarde.",
                [{ text: "Aceptar" }]
            );
        } finally {
            // Marcar como no descargando
            set(state => ({ 
                isDownloading: { ...state.isDownloading, [track.audioRequestId]: false }
            }));
        }
    },
    
    deleteDownloadedAudio: async (trackId: string) => {
        const success = await AudioDownloadService.deleteDownloadedAudio(trackId);
        if (success) {
            // Eliminar también los metadatos guardados
            const metadataKey = `${TRACK_METADATA_KEY_PREFIX}${trackId}`;
            await AsyncStorage.removeItem(metadataKey);
            
            const downloadedAudios = await AudioDownloadService.getDownloadedAudios();
            set({ downloadedTracks: downloadedAudios });
            
            // Actualizar estado de tracks en memoria
            const currentTracks = [...get().tracks];
            const trackIndex = currentTracks.findIndex(t => t.audioRequestId === trackId);
            
            if (trackIndex >= 0) {
                currentTracks[trackIndex] = {
                    ...currentTracks[trackIndex],
                    offlineUrl: undefined,
                    isOffline: false
                };
                set({ tracks: currentTracks });
            }
        }
    },
    
    reset: async () => {
        console.log('[LibraryStore] Reseteando estado y eliminando todas las descargas');
        
        try {
            // Limpiar todas las descargas y metadatos
            await AudioDownloadService.clearAllDownloads();
            console.log('[LibraryStore] Todas las descargas y metadatos eliminados');
        } catch (error) {
            console.error('[LibraryStore] Error al eliminar descargas:', error);
        }
        
        // Restablecer el estado
        set({
            tracks: [],
            audioRequests: [],
            audios: [],
            playableTracks: [],
            isInitialLoading: false,
            isBackgroundLoading: false,
            error: null,
            downloadedTracks: {},
            isDownloading: {},
            downloadProgress: {}
        });
    },
    
    syncPlayerQueue: async () => {
        try {
            const currentTrack = await TrackPlayer.getActiveTrackIndex();
            if (currentTrack === null || currentTrack === undefined) return;

            const currentQueue = await TrackPlayer.getQueue();
            const { activeQueueId } = useQueueStore.getState();
            const { playableTracks } = get();

            if (!activeQueueId || currentQueue.length === 0) return;

            const currentTrackData = await TrackPlayer.getTrack(currentTrack);
            if (!currentTrackData?.url) return;

            // Usar audioRequestId como identificador estable en lugar de URL
            const currentTrackIds = new Set(
                currentQueue.map(track => track.audioRequestId)
                    .filter(id => id !== undefined)
            );
            
            const newTrackIds = new Set(
                playableTracks
                    .filter(track => !track.isProcessing)
                    .map(track => track.audioRequestId)
            );

            const hasNewTracks = playableTracks
                .filter(track => !track.isProcessing)
                .some(track => !currentTrackIds.has(track.audioRequestId));
                
            const hasRemovedTracks = currentQueue
                .filter(track => track.audioRequestId !== undefined)
                .some(track => !newTrackIds.has(track.audioRequestId));

            if (!hasNewTracks && !hasRemovedTracks) {
                return;
            }

            // Añadir tracks nuevos
            const newTracks = playableTracks
                .filter(track => !track.isProcessing && !currentTrackIds.has(track.audioRequestId));

            if (newTracks.length > 0) {
                console.log(`[LibraryStore] Añadiendo ${newTracks.length} tracks nuevos a la cola`);
                // Convertir UnifiedTrack a Track para TrackPlayer.add
                await TrackPlayer.add(newTracks as unknown as Track[]);
            }

            // Eliminar tracks que ya no están
            const tracksToRemove = currentQueue.reduce<number[]>((indices, track, index) => {
                if (track.audioRequestId && !newTrackIds.has(track.audioRequestId)) {
                    indices.push(index);
                }
                return indices;
            }, []);

            if (tracksToRemove.length > 0) {
                console.log(`[LibraryStore] Eliminando ${tracksToRemove.length} tracks de la cola`);
                await TrackPlayer.remove(tracksToRemove);
            }

        } catch (error) {
            console.error("[LibraryStore] Error syncing player queue:", error);
        }
    },
    
    // Nuevo método para actualizar estado de audioRequests
    checkAudioRequestsStatus: async () => {
        // Importación dinámica para evitar el ciclo
        const { useAuthStore } = require("./authStore");
        const { userId } = useAuthStore.getState();
        const { tracks } = get();

        if(!userId) {
            console.log('[LibraryStore] No se puede verificar el estado de audioRequests: No hay usuario');
            return;
        }
        
        // Identificar tracks que están en proceso
        const processingTracks = tracks.filter(t => t.isProcessing);
        if (processingTracks.length === 0) return;
        
        try {
            console.log(`[LibraryStore] Verificando estado de ${processingTracks.length} audioRequests`);
            const requestIds = processingTracks.map(t => t.audioRequestId);
            
            // Como getAudioRequestsStatus no existe, usamos getAudioRequests
            // y filtramos por los IDs que necesitamos
            const requestsResponse = await AudioRequestService.getAudioRequests(userId);
            const filteredRequests = requestsResponse.audiorequests.filter(
                (req: any) => requestIds.includes(req._id)
            );
            
            // Verificar si algún audioRequest se completó
            const completedRequests = filteredRequests.filter(
                (req: any) => req.status === 'completed'
            );
            
            if (completedRequests.length > 0) {
                console.log(`[LibraryStore] ${completedRequests.length} requests completados, recargando biblioteca`);
                // Si hay nuevos audios completos, recargar biblioteca
                await get().fetchUserTracks(userId, true);
            } else {
                // Actualizar progreso de los que siguen en proceso
                const updatedTracks = [...tracks];
                filteredRequests.forEach((reqStatus: any) => {
                    const trackIndex = updatedTracks.findIndex(t => t.audioRequestId === reqStatus._id);
                    if (trackIndex >= 0) {
                        updatedTracks[trackIndex].progress = reqStatus.progress || 0;
                    }
                });
                set({ tracks: updatedTracks });
            }
        } catch (error) {
            console.error('[LibraryStore] Error checking audioRequests status:', error);
        }
    },
    
    fetchUserTracks: async (userId, isBackground = false) => {
        if ((isBackground && get().isBackgroundLoading) || 
            (!isBackground && get().isInitialLoading)) return;

        try {
            set({ 
                [isBackground ? 'isBackgroundLoading' : 'isInitialLoading']: true,
                error: null 
            });
            
            const [audiosResponse, requestsResponse] = await Promise.all([
                AudioService.getAudios(userId),
                AudioRequestService.getAudioRequests(userId)
            ]);

            console.log('audiosResponse', audiosResponse);
            console.log('requestsResponse', requestsResponse);

            if (!audiosResponse?.audios) {
                throw new Error('No se pudieron cargar los audios');
            }

            const { downloadedTracks } = get();
            const processedTracks: UnifiedTrack[] = [];

            // Procesar audios finalizados
            audiosResponse.audios.forEach((audio: any) => {
                // Asegurarnos de que publicationDate tenga un valor, usando Date.now() como fallback
                const pubDate = new Date(audio.publicationDate || Date.now());
                const now = new Date();
                const isReady = !audio.publicationDate || pubDate <= now;
                const isDownloaded = audio.audioRequestId && downloadedTracks[audio.audioRequestId];
                
                // Determinar si está en proceso     basado en la fecha de publicación
                const isProcessing = audio.publicationDate && pubDate > now;
                const trackStatus: TrackStatus = isProcessing 
                    ? 'processing' 
                    : (isReady ? 'ready' : 'not-ready');
                
                // Usar title solo si existe, de lo contrario usar un valor por defecto
                const safeTitle = audio.title;
                console.log(`[LibraryStore] Track ${safeTitle}: pubDate=${pubDate.toISOString()}, now=${now.toISOString()}, isProcessing=${isProcessing}, status=${trackStatus}`);
                
                const track: UnifiedTrack = {
                    id: audio._id,
                    audioRequestId: audio.audioRequestId || audio._id,
                    onlineUrl: audio.audioUrl || '',
                    url: isDownloaded ? downloadedTracks[audio.audioRequestId].path : (audio.audioUrl || ''),
                    offlineUrl: isDownloaded ? downloadedTracks[audio.audioRequestId].path : undefined,
                    artwork: audio.imageUrl || unknownTrackImageUri,
                    title: !isProcessing ? (audio.customData?.name || safeTitle) : 'Estoy creando tu hipnosis',
                    description: audio.customData?.description || '',
                    formattedDuration: audio.formattedDuration,
                    status: trackStatus,
                    isOffline: !!isDownloaded,
                    isProcessing: isProcessing,
                    progress: isProcessing ? calculateRemainingTimeProgress(now, pubDate) : undefined,
                    rawAudioData: audio,
                    // Propiedades de TrackWithPlaylist para compatibilidad
                    rating: 0,
                    playlists: [],
                    customData: audio.customData || {}
                };
                
                processedTracks.push(track);
            });

            // Procesar audioRequests en progreso
            requestsResponse.audiorequests.forEach((request: any) => {
                // Verificar si ya existe un audio para este request
                const existingAudio = processedTracks.find(t => t.audioRequestId === request._id);
                if (!existingAudio) {
                    processedTracks.push({
                        id: request._id,
                        audioRequestId: request._id,
                        url: '',
                        artwork: unknownTrackImageUri,
                        title: "Estoy creando tu hipnosis",
                        status: 'processing',
                        isOffline: false,
                        isProcessing: true,
                        progress: request.progress || 0,
                        rawRequestData: request,
                        // Propiedades de TrackWithPlaylist para compatibilidad
                        rating: 0,
                        playlists: [],
                        customData: {}
                    });
                }
            });

            // Los tracks reproducibles son aquellos que están listos y no en proceso
            const playableTracks = processedTracks
                .filter(track => (track.status === 'ready' || track.status === 'offline') && !track.isProcessing);

            set({
                audioRequests: requestsResponse,
                audios: audiosResponse,
                tracks: processedTracks.reverse(),
                playableTracks: playableTracks,
                [isBackground ? 'isBackgroundLoading' : 'isInitialLoading']: false,
                error: null
            });

            // Verificar si los tracks reproducibles han cambiado para sincronizar la cola
            const previousPlayableTracks = get().playableTracks;
            const hasPlayableTracksChanged = !_.isEqual(
                _.sortBy(previousPlayableTracks, 'audioRequestId'),
                _.sortBy(playableTracks, 'audioRequestId')
            );
    
            if (hasPlayableTracksChanged && playableTracks.length > 0) {
                await get().syncPlayerQueue();
            }
            
            // Si no es carga en background, actualizar información de descargas
            if (!isBackground) {
                await get().loadDownloadedAudios();
            }

        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Error al cargar los audios',
                [isBackground ? 'isBackgroundLoading' : 'isInitialLoading']: false
            });
        }
    },
    
    // Nuevas funciones del sistema unificado
    updateNetworkState: () => {
        const networkState = NetworkManager.getNetworkState();
        set({ networkState });
        console.log('🌐 [Library] Estado de red actualizado:', networkState);
    },
    
    getCacheStats: async () => {
        try {
            const stats = {
                totalSize: 0,
                itemCount: 0,
                lastCleanup: Date.now()
            };
            set(state => ({
                cacheState: {
                    ...state.cacheState,
                    stats
                }
            }));
            console.log('📊 [Library] Estadísticas de cache actualizadas:', stats);
        } catch (error) {
            console.error('❌ [Library] Error obteniendo estadísticas de cache:', error);
        }
    },
    
    clearCache: async (category?: CacheCategory) => {
        try {
            // Simulación de limpieza de cache
            console.log('🧹 [Library] Cache limpiado');
            await get().getCacheStats();
        } catch (error) {
            console.error('❌ [Library] Error limpiando cache:', error);
        }
    },
    
    preloadImages: async (imageUrls: string[]) => {
        try {
            console.log(`🖼️ [Library] Precargando ${imageUrls.length} imágenes...`);
            // Simulación de precarga de imágenes
            const results = await Promise.allSettled(
                imageUrls.map(async (url) => {
                    console.log(`📸 [Library] Precargando: ${url}`);
                    return Promise.resolve();
                })
            );
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ [Library] ${successful}/${imageUrls.length} imágenes precargadas`);
        } catch (error) {
            console.error('❌ [Library] Error precargando imágenes:', error);
        }
    },
    
    initialize: async (userId: string) => {
        try {
            console.log('🚀 [Library] Inicializando sistema...');
            
            // Simulación de inicialización de cache
            set(state => ({
                cacheState: {
                    ...state.cacheState,
                    isInitialized: true
                }
            }));
            
            // Actualizar estado de red
            get().updateNetworkState();
            
            // Cargar audios descargados
            await get().loadDownloadedAudios();
            
            // Obtener estadísticas de cache
            await get().getCacheStats();
            
            console.log('✅ [Library] Sistema inicializado correctamente');
        } catch (error) {
             console.error('❌ [Library] Error inicializando sistema:', error);
         }
     }
}),
            {
                name: 'library-storage',
                storage: createJSONStorage(() => AsyncStorage),
                partialize: (state) => ({
                    downloadedTracks: state.downloadedTracks,
                    lastRefresh: state.lastRefresh,
                    cacheState: state.cacheState,
                }),
            }
        )
    )
);

export const useTracks = () => useLibraryStore((state) => state.tracks);
export const usePlayableTracks = () => useLibraryStore((state) => state.playableTracks);
export const useAudioRequests = () => useLibraryStore((state) => state.audioRequests);
export const useAudios = () => useLibraryStore((state) => state.audios);

export const useFavorites = () => {
    const favorites = useLibraryStore((state) =>
        state.tracks.filter(track => track.rating === 1)
    );
    const toggleFavorites = useLibraryStore((state) =>
        state.toggleTrackFavorites
    );

    return {
        favorites,
        toggleFavorites
    };
};