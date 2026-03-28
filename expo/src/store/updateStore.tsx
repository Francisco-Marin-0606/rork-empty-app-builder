
interface UpdateState {
  isChecking: boolean;
  hasRequiredUpdate: boolean;
  hasOptionalUpdate: boolean;
  updateType: 'none' | 'optional' | 'required';
  isDownloading: boolean;
  error: string | null;
  versionInfo: VersionResponse | null;
  checkForUpdates: () => Promise<void>;
  currentVersion: string | null;
  hasOtaUpdate: boolean | null;
}

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { create } from 'zustand';
import { VersionService, VersionResponse } from '../services/api/versionService';

export const useUpdateStore = create<UpdateState>((set, get) => ({
  isChecking: false,
  hasRequiredUpdate: false,
  hasOptionalUpdate: false,
  updateType: 'none',
  isDownloading: false,
  error: null,
  versionInfo: null,
  currentVersion: null,
  hasOtaUpdate: null,

  checkForUpdates: async () => {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    
    try {
      if (get().isChecking) return;
      set({ isChecking: true, error: null });
      
      const versionInfo = await VersionService.getVersionInfo();
      

      // Ahora solo verificamos la versión semántica
      const requiresStoreUpdate = compareVersions(currentVersion, versionInfo.minRequiredVersion) < 0;
      const hasNewVersion = compareVersions(currentVersion, versionInfo.latestVersion) < 0;
      
      if (!requiresStoreUpdate && hasNewVersion) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            set({
              hasOtaUpdate: true
            })
          }else{
            set({
              hasOtaUpdate: false
            })
          }
        } catch (error) {
          console.error('Error checking OTA updates:', error);
        }
      }

      set({
        versionInfo,
        hasRequiredUpdate: requiresStoreUpdate,
        hasOptionalUpdate: false,
        updateType: requiresStoreUpdate ? 'required' : 'none',
        isChecking: false,
        error: null,
        currentVersion : currentVersion
      });
    } catch (error: any) {
      set({
        error: error.message || 'Error al verificar actualizaciones',
        isChecking: false,
        currentVersion : currentVersion
      });
    }
  }
}));

// Utility function for version comparison
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const diff = (parts1[i] || 0) - (parts2[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}