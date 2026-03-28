import { create } from 'zustand';
import { getStorageItemAsync, getObjectAsync } from './secureStorage';

interface UserData {
  email: string;
  names: string;
  lastnames: string;
  [key: string]: any;
}

interface SessionManagerState {
  isSessionExpiredModalVisible: boolean;
  userEmail: string | null;
  showSessionExpiredModal: (email?: string | null) => void;
  hideSessionExpiredModal: () => void;
  handleUnauthorizedError: () => Promise<void>;
}

export const useSessionManager = create<SessionManagerState>((set, get) => ({
  isSessionExpiredModalVisible: false,
  userEmail: null,

  showSessionExpiredModal: (email = null) => {
    // Almacenamos el email del usuario si está disponible para pre-completarlo en la pantalla de login
    set({ 
      isSessionExpiredModalVisible: true,
      userEmail: email
    });
  },

  hideSessionExpiredModal: () => {
    set({ 
      isSessionExpiredModalVisible: false 
    });
  },

  handleUnauthorizedError: async () => {
    // Solo mostrar el modal si hay una sesión activa
    const session = await getStorageItemAsync('session');
    
    if (session) {
      // Intentamos obtener el email del usuario desde el almacenamiento seguro
      try {
        const userData = await getObjectAsync('userData') as UserData | null;
        const email = userData?.email || null;
        get().showSessionExpiredModal(email);
      } catch (error) {
        // Si no podemos obtener el email, mostrar el modal sin email
        get().showSessionExpiredModal(null);
      }
    }
  }
}));