import { create } from 'zustand'
import { setStorageItemAsync } from './secureStorage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import TrackPlayer from 'react-native-track-player'

interface AuthState {
  session: string | null
  isLoading: boolean
  initialize: () => Promise<void>
  signIn: () => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  initialize: async () => {
    try {
      let savedSession = null
      if (Platform.OS === 'web') {
        try {
          savedSession = localStorage.getItem('session')
        } catch (e) {
          console.error('Local storage is unavailable:', e)
        }
      } else {
        savedSession = await SecureStore.getItemAsync('session')
      }
      set({ session: savedSession, isLoading: false })
    } catch (error) {
      console.error('Error initializing auth store:', error)
      set({ isLoading: false })
    }
  },
  signIn: () => {
    set({ session: 'xxx' })
    setStorageItemAsync('session', 'xxx')
  },
  signOut: () => {
    set({ session: null })
    setStorageItemAsync('session', null)
    TrackPlayer.reset()
  }
}))