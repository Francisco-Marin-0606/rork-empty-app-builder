
import { create } from 'zustand';

interface CarrouselState {
  dataMap: any;
  carouselPosition: number;


  // Actions
  setDataMap: (dataMap: any) => void;
  setCarouselPosition: (position: number) => void;
  reset: () => void;
}

export const useCarrouselStore = create<CarrouselState>((set, get) => ({
  dataMap: 0,
  carouselPosition: 0,


  setDataMap: (dataMap: any) => set({ dataMap }),
  setCarouselPosition: (position: number) => set({ carouselPosition: position }),

  reset: () => set({
    dataMap: {},
    carouselPosition: 0,
  }),
}));