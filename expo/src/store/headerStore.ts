import { create } from 'zustand';
import { Animated } from 'react-native';

interface HeaderState {
  showHeader: boolean;
  setShowHeader: (show: boolean) => void;
  headerOpacity: Animated.Value;
  animateHeaderOpacity: (toValue: number, duration: number) => void;
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
  showHzHeader: boolean;
  setShowHzHeader: (show: boolean) => void;
}

export const useHeaderStore = create<HeaderState>((set, get) => ({
  showHeader: false,
  headerOpacity: new Animated.Value(0),
  headerTitle: "",
  showHzHeader: false,
  setShowHeader: (show: boolean) => set({ showHeader: show }),
  setHeaderTitle: (title: string) => set({ headerTitle: title }),
  setShowHzHeader: (show: boolean) => set({ showHzHeader: show }),
  animateHeaderOpacity: (toValue: number, duration: number) => {
    Animated.timing(get().headerOpacity, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  },
}));