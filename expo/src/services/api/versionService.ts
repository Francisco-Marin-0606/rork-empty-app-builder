// versionService.ts
import * as Updates from 'expo-updates';
  import apiManager from "./apiManager";
interface PlatformBuildNumbers {
  android: number;
  ios: number;
}

export interface VersionResponse {
  latestVersion: string;
  minRequiredVersion: string;
  latestBuildNumbers: PlatformBuildNumbers;
  minRequiredBuildNumbers: PlatformBuildNumbers;
}

export class VersionService {
    static async getVersionInfo(): Promise<VersionResponse> {
      try {
        const response = await apiManager.get('/appVersion/latestVersion');
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    }
  
    static async checkExpoUpdates(): Promise<boolean> {
      try {
        const update = await Updates.checkForUpdateAsync();
        return update.isAvailable;
      } catch (error) {
        console.error('Error checking for OTA updates:', error);
        return false;
      }
    }
  
    // Eliminamos downloadAndInstallUpdate ya que no queremos instalar inmediatamente
    
    private static handleError(error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          message: error.response.data.message || 'Error del servidor',
        };
      }
      return {
        status: 503,
        message: 'Error de conexión',
      };
    }
  }
