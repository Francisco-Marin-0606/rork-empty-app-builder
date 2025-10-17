import TrackPlayer from 'react-native-track-player';
import { setupTrackPlayerListeners } from './trackPlayerSyncService';

module.exports = async function () {
  // Configurar los listeners del TrackPlayer para sincronización
  setupTrackPlayerListeners();
  
  // Los eventos ahora se manejan a través del sistema de sincronización
  // que se conecta con el PlayerProvider
};