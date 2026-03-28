import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useSimpleAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  isLoading: true,

  initialize: async () => {
    try {
      const email = await AsyncStorage.getItem('user_email');
      set({ 
        isAuthenticated: !!email, 
        email,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },

  signIn: async (email: string) => {
    try {
      await AsyncStorage.setItem('user_email', email);
      set({ isAuthenticated: true, email });
    } catch (error) {
      console.error('Error signing in:', error);
    }
  },

  signOut: async () => {
    try {
      await AsyncStorage.removeItem('user_email');
      set({ isAuthenticated: false, email: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));
