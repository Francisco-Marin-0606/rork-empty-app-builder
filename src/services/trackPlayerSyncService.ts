import TrackPlayer, { Event } from 'react-native-track-player';

// Callbacks para sincronización
let onPlayCallback: (() => void) | null = null;
let onPauseCallback: (() => void) | null = null;
let onNextCallback: (() => void) | null = null;
let onPreviousCallback: (() => void) | null = null;
let onStopCallback: (() => void) | null = null;
let onSeekCallback: ((position: number) => void) | null = null;
let onTrackChangedCallback: ((trackId: string | number | null) => void) | null = null;

// Función para configurar los listeners del TrackPlayer
export const setupTrackPlayerListeners = () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[TrackPlayerSync] Remote play clicked');
    onPlayCallback?.();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[TrackPlayerSync] Remote pause clicked');
    onPauseCallback?.();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[TrackPlayerSync] Remote next clicked');
    onNextCallback?.();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[TrackPlayerSync] Remote previous clicked');
    onPreviousCallback?.();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[TrackPlayerSync] Remote stop clicked');
    onStopCallback?.();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event: any) => {
    console.log('[TrackPlayerSync] Remote seek to:', event.position);
    onSeekCallback?.(event.position);
  });

  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (event: any) => {
    console.log('[TrackPlayerSync] Track changed to:', event.nextTrack);
    onTrackChangedCallback?.(event.nextTrack);
  });
};

// Función para registrar callbacks
export const registerTrackPlayerCallbacks = (callbacks: {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onStop?: () => void;
  onSeek?: (position: number) => void;
  onTrackChanged?: (trackId: string | number | null) => void;
}) => {
  onPlayCallback = callbacks.onPlay || null;
  onPauseCallback = callbacks.onPause || null;
  onNextCallback = callbacks.onNext || null;
  onPreviousCallback = callbacks.onPrevious || null;
  onStopCallback = callbacks.onStop || null;
  onSeekCallback = callbacks.onSeek || null;
  onTrackChangedCallback = callbacks.onTrackChanged || null;
};

// Función para limpiar los callbacks
export const cleanupTrackPlayerCallbacks = () => {
  onPlayCallback = null;
  onPauseCallback = null;
  onNextCallback = null;
  onPreviousCallback = null;
  onStopCallback = null;
  onSeekCallback = null;
  onTrackChangedCallback = null;
};

// Funciones de prueba para simulador (solo en desarrollo)
export const simulateNativeEvent = (eventType: 'play' | 'pause' | 'next' | 'previous' | 'stop' | 'seek' | 'trackChanged', data?: any) => {
  if (!__DEV__) return;
  
  console.log(`[TEST] Simulando evento nativo: ${eventType}`);
  console.log(`[TEST] Callback disponible:`, eventType === 'pause' ? !!onPauseCallback : !!onPlayCallback);
  
  switch (eventType) {
    case 'play':
      console.log('[TEST] Ejecutando onPlayCallback:', !!onPlayCallback);
      onPlayCallback?.();
      break;
    case 'pause':
      console.log('[TEST] Ejecutando onPauseCallback:', !!onPauseCallback);
      onPauseCallback?.();
      break;
    case 'next':
      onNextCallback?.();
      break;
    case 'previous':
      onPreviousCallback?.();
      break;
    case 'stop':
      onStopCallback?.();
      break;
    case 'seek':
      onSeekCallback?.(data?.position || 0);
      break;
    case 'trackChanged':
      onTrackChangedCallback?.(data?.trackId || null);
      break;
  }
};
