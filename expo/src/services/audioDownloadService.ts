import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DOWNLOADS_DIRECTORY = FileSystem.documentDirectory + 'downloads/';
const DOWNLOADS_METADATA_KEY = '@mental_magnet_downloads';
const TRACK_METADATA_KEY_PREFIX = '@mental_magnet_track_metadata_';
const CURRENT_USER_KEY = '@mental_magnet_current_user';

// Variable estática para almacenar el userId actual
let currentUserId: string | null = null;

// Asegurar que el directorio de descargas existe
const ensureDownloadDirectoryExists = async () => {
  console.log('Asegurando que el directorio de descargas existe 1')
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIRECTORY);
  console.log('dirInfo', dirInfo)
  if (!dirInfo.exists) {
    console.log('Creando directorio de descargas')
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIRECTORY, { intermediates: true });
  }
};

// Generar un nombre de archivo encriptado para el almacenamiento local
const generateEncryptedFilename = async (url: string, trackId: string) => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    url + trackId
  );
  return hash + '.mp3';
};

// Construir la ruta completa a partir del nombre del archivo
const getFullPath = (fileName: string): string => {
  return DOWNLOADS_DIRECTORY + fileName;
};

console.log(`Ruta absoluta de descarga: ${DOWNLOADS_DIRECTORY}`);

export class AudioDownloadService {
  // Establecer el usuario actual
  static async setCurrentUser(userId: string | null): Promise<void> {
    //console.log(`[AudioDownloadService] Estableciendo usuario actual: ${userId}`);
    currentUserId = userId;
    
    // Guardar el userId actual para persistencia entre sesiones
    if (userId) {
      await AsyncStorage.setItem(CURRENT_USER_KEY, userId);
    } else {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    }
  }
  
  // Obtener el usuario actual
  static async getCurrentUser(): Promise<string | null> {
    if (!currentUserId) {
      // Intentar recuperar de AsyncStorage
      currentUserId = await AsyncStorage.getItem(CURRENT_USER_KEY);
    }
    return currentUserId;
  }
  
  // Obtener todos los audios descargados
  static async getDownloadedAudios(): Promise<Record<string, { path: string, fileName: string, lastUpdated: number }>> {
    try {
      //console.log('[AudioDownloadService] Getting downloaded audios from storage');
      const userId = await this.getCurrentUser();
      
      if (!userId) {
        console.log('[AudioDownloadService] No hay usuario actual, retornando lista vacía');
        return {};
      }
      
      const downloadsData = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      
      if (!downloadsData) {
       // console.log('[AudioDownloadService] No downloaded audios found in storage');
        return {};
      }
      
      let parsedData = {};
      try {
        parsedData = JSON.parse(downloadsData);
       // console.log(`[AudioDownloadService] Found ${Object.keys(parsedData).length} total downloaded audios`);
      } catch (parseError) {
     //   console.error('[AudioDownloadService] Error parsing downloaded audios data:', parseError);
        return {};
      }
      
      // Verify files actually exist and filter by current user
      const verifiedDownloads: Record<string, { path: string, fileName: string, lastUpdated: number }> = {};
      const orphanedTracks: string[] = [];
      
      for (const [trackId, data] of Object.entries(parsedData as Record<string, { 
        fileName: string, 
        lastUpdated: number,
        userId?: string 
      }>)) {
        // Omitir si no pertenece al usuario actual
        if (data.userId && data.userId !== userId) {
          //console.log(`[AudioDownloadService] Omitiendo track ${trackId} porque pertenece a otro usuario (${data.userId})`);
          continue;
        }
        
        try {
          // Construir la ruta completa usando el directorio actual
          const fullPath = getFullPath(data.fileName);
          
          const fileInfo = await FileSystem.getInfoAsync(fullPath);
          if (fileInfo.exists) {
            verifiedDownloads[trackId] = { 
              path: fullPath,
              fileName: data.fileName,
              lastUpdated: data.lastUpdated 
            };
          } else {
            console.log(`[AudioDownloadService] File for track ${trackId} does not exist at path ${fullPath}, marking for cleanup`);
            orphanedTracks.push(trackId);
          }
        } catch (fileError) {
          console.error(`[AudioDownloadService] Error checking file for track ${trackId}:`, fileError);
          orphanedTracks.push(trackId);
        }
      }
      
      // Limpiar metadatos huérfanos automáticamente
      if (orphanedTracks.length > 0) {
        console.log(`[AudioDownloadService] Cleaning up ${orphanedTracks.length} orphaned metadata entries`);
        await this.cleanOrphanedMetadata(orphanedTracks, parsedData);
      }
      
      //console.log(`[AudioDownloadService] Verified ${Object.keys(verifiedDownloads).length} downloaded audios for user ${userId}`);
      return verifiedDownloads;
    } catch (error) {
      //console.error('[AudioDownloadService] Error retrieving downloaded audios:', error);
      return {};
    }
  }

  // Verificar si un audio está descargado
  static async isAudioDownloaded(trackId: string): Promise<boolean> {
    console.log('Verificando si el audio está descargado')
    const downloads = await this.getDownloadedAudios();
    console.log('downloads', downloads)
    return !!downloads[trackId];
  }

  // Descargar un archivo de audio
  static async downloadAudio(url: string, trackId: string, onProgress?: (progress: number) => void): Promise<string | null> {
    try {
      const userId = await this.getCurrentUser();
      
      if (!userId) {
        console.error('[AudioDownloadService] No hay usuario actual, cancelando descarga');
        return null;
      }
      
      console.log(`Iniciando proceso de descarga para trackId: ${trackId}, userId: ${userId}`);
      await ensureDownloadDirectoryExists();
       
      // Generar nombre de archivo encriptado
      const fileName = await generateEncryptedFilename(url, trackId);
      const localPath = getFullPath(fileName);
      console.log(`Ruta local del archivo: ${localPath}`);
      
      // Verificar si ya existe el archivo
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        console.log(`Archivo ya existente, devolviendo ruta: ${localPath}`);
        
        // Actualizar metadatos por si acaso (para asegurar migración desde formato antiguo)
        await this.updateTrackMetadata(trackId, fileName, userId);
        
        return localPath;
      }
      console.log(`Iniciando descarga desde: ${url}`);
      
      // Descargar el archivo
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Progreso de descarga: ${Math.round(progress * 100)}%`);
          onProgress && onProgress(progress);
        }
      );
      
      console.log(`Descarga creada, ejecutando downloadAsync()`);
      const result = await downloadResumable.downloadAsync();
      //console.log(`Resultado de descarga:`, result);
      
      if (result?.uri) {
        // Verificar que el archivo se haya descargado correctamente
        const downloadedFileInfo = await FileSystem.getInfoAsync(localPath);
        console.log(`Información del archivo descargado:`, downloadedFileInfo);
        
        if (!downloadedFileInfo.exists || downloadedFileInfo.size === 0) {
          console.error(`Error: El archivo descargado no existe o tiene tamaño cero`);
          return null;
        }
        
        // Actualizar metadatos de las descargas
        await this.updateTrackMetadata(trackId, fileName, userId);
        console.log(`Descarga completada y guardada en metadatos`);
        
        return localPath;
      } else {
        console.error(`Error: No se recibió URI en el resultado de la descarga`);
      }
      
      return null;
    } catch (error) {
      console.error(`Error al descargar el audio (${trackId}):`, error);
      // Intentar eliminar archivos parciales en caso de error
      try {
        const fileName = await generateEncryptedFilename(url, trackId);
        const localPath = getFullPath(fileName);
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localPath);
          console.log(`Archivo parcial eliminado: ${localPath}`);
        }
      } catch (cleanupError) {
        console.error('Error al limpiar archivo parcial:', cleanupError);
      }
      return null;
    }
  }
  
  // Método auxiliar para actualizar metadatos de un track
  private static async updateTrackMetadata(trackId: string, fileName: string, userId: string): Promise<void> {
    // Obtener todos los metadatos existentes (para todos los usuarios)
    const downloadsData = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
    const allDownloads = downloadsData ? JSON.parse(downloadsData) : {};
    
    // Actualizar o agregar metadatos para este track
    allDownloads[trackId] = { 
      fileName: fileName,
      lastUpdated: Date.now(),
      userId: userId // Guardar el ID del usuario que descargó
    };
    
    // Guardar los metadatos actualizados
    await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(allDownloads));
  }
  
  // Obtener la ruta local de un audio descargado
  static async getLocalAudioPath(trackId: string): Promise<string | null> {
    const downloads = await this.getDownloadedAudios();
    return downloads[trackId]?.path || null;
  }
  
  // Eliminar un audio descargado
  static async deleteDownloadedAudio(trackId: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUser();
      if (!userId) {
        console.error('[AudioDownloadService] No hay usuario actual, cancelando eliminación');
        return false;
      }
      
      const downloads = await this.getDownloadedAudios();
      if (!downloads[trackId]) return false;
      
      const localPath = downloads[trackId].path;
      
      // Obtener todos los metadatos
      const downloadsData = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      const allDownloads = downloadsData ? JSON.parse(downloadsData) : {};
      
      // Eliminar este track de los metadatos
      delete allDownloads[trackId];
      
      // Guardar metadatos actualizados
      await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(allDownloads));
      
      // Eliminar el archivo físico
      await FileSystem.deleteAsync(localPath);
      
      // Eliminar también metadatos del track
      await this.deleteTrackMetadata(trackId);
      
      return true;
    } catch (error) {
      console.error('Error al eliminar el audio descargado:', error);
      return false;
    }
  }
  
  // Limpiar todas las descargas del usuario actual
  static async clearAllDownloads(): Promise<boolean> {
    try {
      const userId = await this.getCurrentUser();
      if (!userId) {
        console.error('[AudioDownloadService] No hay usuario actual, cancelando limpieza');
        return false;
      }
      
      const downloads = await this.getDownloadedAudios();
      
      // Obtener todos los metadatos
      const downloadsData = await AsyncStorage.getItem(DOWNLOADS_METADATA_KEY);
      const allDownloads = downloadsData ? JSON.parse(downloadsData) : {};
      
      // Eliminar cada archivo del usuario actual
      for (const trackId in downloads) {
        // Eliminar archivo físico
        await FileSystem.deleteAsync(downloads[trackId].path);
        
        // Eliminar de los metadatos globales
        delete allDownloads[trackId];
        
        // Eliminar metadatos del track
        await this.deleteTrackMetadata(trackId);
      }
      
      // Guardar metadatos actualizados
      await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(allDownloads));
      
      return true;
    } catch (error) {
      console.error('Error al limpiar todas las descargas:', error);
      return false;
    }
  }
  
  // Guardar metadatos de un track para uso offline
  static async saveTrackMetadata(trackId: string, metadata: any): Promise<boolean> {
    try {
      const userId = await this.getCurrentUser();
      if (!userId) {
        console.error('[AudioDownloadService] No hay usuario actual, cancelando guardado de metadatos');
        return false;
      }
      
      // Incluir userId en la clave para separar metadatos por usuario
      const metadataKey = `${TRACK_METADATA_KEY_PREFIX}${userId}_${trackId}`;
      await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
      console.log(`[AudioDownloadService] Metadatos del track ${trackId} guardados correctamente para usuario ${userId}`);
      return true;
    } catch (error) {
      console.error(`[AudioDownloadService] Error guardando metadatos del track ${trackId}:`, error);
      return false;
    }
  }
  
  // Obtener metadatos de un track
  static async getTrackMetadata(trackId: string): Promise<any | null> {
    try {
      const userId = await this.getCurrentUser();
      if (!userId) {
        console.log('[AudioDownloadService] No hay usuario actual, no se pueden recuperar metadatos');
        return null;
      }
      
      // Usar userId en la clave
      const metadataKey = `${TRACK_METADATA_KEY_PREFIX}${userId}_${trackId}`;
      const data = await AsyncStorage.getItem(metadataKey);
      
      // Compatibilidad con formato antiguo (sin userId en la clave)
      if (!data) {
        const oldMetadataKey = `${TRACK_METADATA_KEY_PREFIX}${trackId}`;
        const oldData = await AsyncStorage.getItem(oldMetadataKey);
        if (oldData) {
          // Migrar al nuevo formato
          await AsyncStorage.setItem(metadataKey, oldData);
          return JSON.parse(oldData);
        }
        return null;
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`[AudioDownloadService] Error recuperando metadatos del track ${trackId}:`, error);
      return null;
    }
  }
  
  // Eliminar metadatos de un track
  static async deleteTrackMetadata(trackId: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUser();
      if (!userId) {
        console.error('[AudioDownloadService] No hay usuario actual, cancelando eliminación de metadatos');
        return false;
      }
      
      // Usar userId en la clave
      const metadataKey = `${TRACK_METADATA_KEY_PREFIX}${userId}_${trackId}`;
      await AsyncStorage.removeItem(metadataKey);
      
      // Eliminar también en formato antiguo por si acaso
      const oldMetadataKey = `${TRACK_METADATA_KEY_PREFIX}${trackId}`;
      await AsyncStorage.removeItem(oldMetadataKey);
      
      console.log(`[AudioDownloadService] Metadatos del track ${trackId} eliminados correctamente para usuario ${userId}`);
      return true;
    } catch (error) {
      console.error(`[AudioDownloadService] Error eliminando metadatos del track ${trackId}:`, error);
      return false;
    }
  }

  // Limpiar metadatos huérfanos (archivos que no existen)
  private static async cleanOrphanedMetadata(orphanedTracks: string[], currentMetadata: any): Promise<void> {
    try {
      console.log(`[AudioDownloadService] Limpiando ${orphanedTracks.length} metadatos huérfanos`);
      
      // Crear una copia de los metadatos sin los tracks huérfanos
      const cleanedMetadata = { ...currentMetadata };
      
      for (const trackId of orphanedTracks) {
        // Eliminar del objeto de metadatos principales
        delete cleanedMetadata[trackId];
        
        // Eliminar también metadatos específicos del track
        await this.deleteTrackMetadata(trackId);
      }
      
      // Guardar los metadatos limpiados
      await AsyncStorage.setItem(DOWNLOADS_METADATA_KEY, JSON.stringify(cleanedMetadata));
      
      console.log(`[AudioDownloadService] Limpieza completada: ${orphanedTracks.length} entradas eliminadas`);
      
      // Notificar a los stores que se ha realizado una limpieza
      this.notifyStoresOfCleanup(orphanedTracks);
    } catch (error) {
      console.error('[AudioDownloadService] Error durante la limpieza de metadatos huérfanos:', error);
    }
  }

  // Notificar a los stores sobre la limpieza de metadatos huérfanos
  private static notifyStoresOfCleanup(cleanedTrackIds: string[]): void {
    if (cleanedTrackIds.length > 0) {
      console.log(`[AudioDownloadService] Notificando limpieza de ${cleanedTrackIds.length} tracks huérfanos: ${cleanedTrackIds.join(', ')}`);
      
      // Los stores que usen getDownloadedAudios() se sincronizarán automáticamente
      // en su próxima llamada, ya que los metadatos huérfanos han sido eliminados
      
      // Opcional: Emitir evento personalizado si se necesita sincronización inmediata
      // EventEmitter.emit('orphaned-metadata-cleaned', cleanedTrackIds);
    }
  }
}