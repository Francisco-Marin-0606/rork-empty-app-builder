import { create } from 'zustand';
import { FormQuestionsService } from '../services/api/formQuestionsService';

type OnboardingState = {
  firstLevel: any;
  loading: boolean;
  error: string | null;
  
  // Onboarding AudioRequest error tracking
  showOnboardingAudioRequestError: boolean;
  
  // Actions
  getFirstLevel: () => Promise<void>;
  resetOnboarding: () => void;
  
  // Actions for AudioRequest error
  setShowOnboardingAudioRequestError: (show: boolean) => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  firstLevel: null,
  loading: false,
  error: null,
  
  // Track if onboarding audio request error should be shown
  showOnboardingAudioRequestError: false,
  
  // Fetch the first level data for onboarding
  getFirstLevel: async () => {
    set({ loading: true, error: null });
    
    try {
      const firstLevel = await FormQuestionsService.getFirstUserLevel(null);
      set({ firstLevel, loading: false });
      return firstLevel;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch first level data';
      set({ error: errorMessage, loading: false });
      console.error('[onboardingStore] Error fetching first level:', error);
    }
  },
  
  // Reset the onboarding store
  resetOnboarding: () => {
    set({ firstLevel: null, error: null });
  },
  
  // Set whether to show the onboarding audio request error
  setShowOnboardingAudioRequestError: (show: boolean) => {
    set({ showOnboardingAudioRequestError: show });
  },
})); 