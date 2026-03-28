import { Platform } from 'react-native';
import { getStorageItemAsync } from '../../store/secureStorage';
import { apiClient, secondaryApiClient } from './config';
import { useAuthStore } from '@/store/authStore';
import { useSessionManager } from '@/store/sessionManager';

export const setupInterceptors = () => {
  apiClient.interceptors.request.use(
    async (config) => {
      const session = await getStorageItemAsync('session');
      
      const deviceInfo = useAuthStore.getState().getDeviceInfo();
      
      if (config.headers) {
        config.headers['deviceId'] = deviceInfo.deviceId;
        config.headers['ipAddress'] = deviceInfo.ipAddress;
        config.headers['deviceType'] = deviceInfo.deviceType;
        config.headers['osVersion'] = deviceInfo.osVersion;
        config.headers['appVersion'] = deviceInfo.appVersion;
        
        if (session) {
          console.log("session", session)
          config.headers['Authorization'] = `Bearer ${session}`;
        }
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      if (error.response && error.response.status === 401) {
        await useSessionManager.getState().handleUnauthorizedError();
      }
      
      return Promise.reject(error);
    }
  );
};

export const setupSecondaryApiInterceptors = () => {
  secondaryApiClient.interceptors.request.use(
    async (config) => {
      const session = await getStorageItemAsync('session');
      
      if (config.headers) {
        if (session) {
          config.headers['Authorization'] = `Bearer ${session}`;
        }
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  secondaryApiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      if (error.response && error.response.status === 401) {
        await useSessionManager.getState().handleUnauthorizedError();
      }
      
      return Promise.reject(error);
    }
  );
};