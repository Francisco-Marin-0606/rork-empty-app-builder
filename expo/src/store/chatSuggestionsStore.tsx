import { create } from 'zustand';

interface ChatSuggestionsState {
  showSuggestions: boolean;
  hasShownSuggestionsThisSession: boolean;
  setShowSuggestions: (show: boolean) => void;
  setHasShownSuggestionsThisSession: (hasShown: boolean) => void;
  hideSuggestionsForSession: () => void;
  initialize: () => Promise<void>;
}

export const useChatSuggestionsStore = create<ChatSuggestionsState>((set, get) => ({
  showSuggestions: true,
  hasShownSuggestionsThisSession: false,
  
  setShowSuggestions: (show) => set({ showSuggestions: show }),
  
  setHasShownSuggestionsThisSession: (hasShown) => set({ hasShownSuggestionsThisSession: hasShown }),
  
  hideSuggestionsForSession: () => {
    set({
      showSuggestions: false,
      hasShownSuggestionsThisSession: true
    });
  },
  
  initialize: async () => {
    try {
      // Al inicializar, siempre mostramos las sugerencias para una nueva sesión
      set({
        showSuggestions: true,
        hasShownSuggestionsThisSession: false
      });
    } catch (error) {
      console.error('[ChatSuggestionsStore] Error initializing:', error);
    }
  }
}));