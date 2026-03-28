import { create } from 'zustand'
import { Track } from 'react-native-track-player'

interface PlayerState {
	displayedTrack: Track | null
	setDisplayedTrack: (track: Track | null) => void
	isPlayerVisible: boolean
	setIsPlayerVisible: (visible: boolean) => void
	isFloatingPlayerVisible: boolean
	setIsFloatingPlayerVisible: (visible: boolean) => void
	fullTrackData: Track | null
	setFullTrackData: (data: any | null) => void
	isAuraExpanded: boolean
	setIsAuraExpanded: (expanded: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
	displayedTrack: null,
	setDisplayedTrack: (track) => set({ displayedTrack: track, isPlayerVisible: !!track }),
	isPlayerVisible: false,
	setIsPlayerVisible: (visible) => set({ isPlayerVisible: visible }),
	isFloatingPlayerVisible: false,
	setIsFloatingPlayerVisible: (visible) => set({ isFloatingPlayerVisible: visible }),
	fullTrackData: null,
	setFullTrackData: (data) => set({ fullTrackData: data }),
	isAuraExpanded: false,
	setIsAuraExpanded: (expanded) => set({ isAuraExpanded: expanded }),
}))
