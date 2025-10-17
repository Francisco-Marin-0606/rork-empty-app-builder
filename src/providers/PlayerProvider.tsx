import React, { useCallback, useEffect, useRef, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { Platform, Alert } from "react-native";
import { Audio as ExpoAudio, AVPlaybackStatus } from "expo-av";
import type { AlbumData } from "@/types/music";
import TrackPlayer from "react-native-track-player";
import { registerTrackPlayerCallbacks, cleanupTrackPlayerCallbacks } from "@/services/trackPlayerSyncService";


export type ChangeDirection = 'next' | 'prev' | 'none';

export type SelectOptions = {
  forceAutoplay?: boolean;
  direction?: ChangeDirection;
  queue?: AlbumData[];
};

export type PlayerState = {
  current: AlbumData | null;
  previous: AlbumData | null;
  changeDirection: ChangeDirection;
  isPlaying: boolean;
  url: string | null;
  userPaused: boolean;
  uiOpen: boolean;
  queue: AlbumData[];
  setQueue: (list: AlbumData[]) => void;
  setUIOpen: (open: boolean) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  toggle: () => Promise<void>;
  playAlbum: (album: AlbumData, url: string, direction?: ChangeDirection, forceAutoplay?: boolean) => Promise<void>;
  select: (album: AlbumData, opts?: SelectOptions) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seekBy: (seconds: number) => Promise<void>;
};

const baseId = (id?: string | null) => (id ? String(id).split('-')[0] : '');

export const [PlayerProvider, usePlayer] = createContextHook<PlayerState>(() => {
  const [current, setCurrent] = useState<AlbumData | null>(null);
  const [previous, setPrevious] = useState<AlbumData | null>(null);
  const [changeDirection, setChangeDirection] = useState<ChangeDirection>('none');
  const [url, setUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [userPaused, setUserPaused] = useState<boolean>(false);
  const [queue, setQueueState] = useState<AlbumData[]>([]);

  const isPlayingRef = useRef<boolean>(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  const userPausedRef = useRef<boolean>(false);
  useEffect(() => { userPausedRef.current = userPaused; }, [userPaused]);

  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<ExpoAudio.Sound | null>(null);
  const loadIdRef = useRef<number>(0);
  const [uiOpen, setUIOpenState] = useState<boolean>(false);
  const advanceNextRef = useRef<() => void>(() => {});
  const isConfiguringRef = useRef<boolean>(false);

  const stopAndUnload = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const el = webAudioRef.current;
        if (el) {
          try { el.onended = null as any; } catch { /* ignore */ }
          try { el.onplay = null as any; } catch { /* ignore */ }
          try { el.onpause = null as any; } catch { /* ignore */ }
          try { el.pause(); } catch { /* ignore */ }
          try { el.currentTime = 0; } catch { /* ignore */ }
          try { el.removeAttribute('src'); } catch { /* ignore */ }
          try { el.load?.(); } catch { /* ignore */ }
          webAudioRef.current = null;
        }
      } else {
        const s = soundRef.current;
        if (s) {
          try { await s.pauseAsync(); } catch { /* ignore */ }
          try { await s.stopAsync(); } catch { /* ignore */ }
          try { s.setOnPlaybackStatusUpdate(null as any); } catch { /* ignore */ }
          try { await s.unloadAsync(); } catch { /* ignore */ }
          soundRef.current = null;
        }
      }
    } catch (e) {
      console.log('[player] stopAndUnload error', e);
    }
  }, []);

  // Helper to prefer local downloaded path if available
  const resolveAudioUrl = useCallback((track: AlbumData): string => {
    const original = track?.audioUrl || '';
    const id = track?.id ? String(track.id) : '';
    const b = baseId(id);
    try {
      const { useAuraStore } = require('@/store/auraStore');
      const local = useAuraStore.getState().downloadedAura?.[b]?.path;
      return local || original;
    } catch {
      return original;
    }
  }, []);

  useEffect(() => {
    return () => { stopAndUnload(); };
  }, [stopAndUnload]);

  const ensureLoaded = useCallback(async (nextUrl: string) => {
    if (!nextUrl) return null as unknown as HTMLAudioElement | ExpoAudio.Sound | null;
    const idSnapshot = loadIdRef.current;
    if (Platform.OS === "web") {
      const currentEl = webAudioRef.current;
      if (currentEl) {
        try { currentEl.pause(); } catch { /* ignore */ }
        try { currentEl.currentTime = 0; } catch { /* ignore */ }
        try { currentEl.removeAttribute('src'); } catch { /* ignore */ }
        try { currentEl.load?.(); } catch { /* ignore */ }
      }
      const el = new (window as any).Audio(nextUrl) as HTMLAudioElement;
      try { (el as any).crossOrigin = 'anonymous'; } catch { /* ignore */ }
      el.preload = "auto";
      try { (el as any).playsInline = true; } catch { /* ignore */ }
      el.onended = () => {
        // No cambiar isPlaying automáticamente, solo avanzar al siguiente track
        try { advanceNextRef.current?.(); } catch { /* ignore */ }
      };
      el.onplay = () => { 
        // No cambiar isPlaying automáticamente desde callbacks de audio web
        console.log('[player] Audio web onplay event - no cambiando estado automáticamente');
      };
      el.onpause = () => { 
        // No cambiar isPlaying automáticamente desde callbacks de audio web
        console.log('[player] Audio web onpause event - no cambiando estado automáticamente');
      };
      try { (el as any).autoplay = false; } catch { /* ignore */ }
      webAudioRef.current = el;
      return el;
    } else {
      await ExpoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        allowsRecordingIOS: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,
        playThroughEarpieceAndroid: false,
      });
      const currentSound = soundRef.current;
      if (currentSound) {
        try { await currentSound.pauseAsync(); } catch { /* ignore */ }
        try { await currentSound.stopAsync(); } catch { /* ignore */ }
        try { currentSound.setOnPlaybackStatusUpdate(null as any); } catch { /* ignore */ }
        try { await currentSound.unloadAsync(); } catch { /* ignore */ }
        soundRef.current = null;
      }
      const onStatusUpdate = (status: AVPlaybackStatus) => {
        if (!('isLoaded' in status) || !status.isLoaded) return;
        if (idSnapshot !== loadIdRef.current) return;
        // No cambiar isPlaying automáticamente desde callbacks de audio nativo
        if ('didJustFinish' in status && status.didJustFinish) {
          try { advanceNextRef.current?.(); } catch {/* ignore */}
        }
      };
      const { sound } = await ExpoAudio.Sound.createAsync({ uri: nextUrl }, { shouldPlay: false }, onStatusUpdate);
      soundRef.current = sound;
      return sound;
    }
  }, []);

  const play = useCallback(async (fromNativePlayer = false) => {
    const targetUrl = url;
    if (!targetUrl) return;  
    try {
      // Siempre llamar TrackPlayer.play() para mantener sincronización
      await TrackPlayer.play();
      
      // Actualizar estado interno para mantener sincronización
      setIsPlaying(true);
      setUserPaused(false);
    } catch (error) {
  
      // Fallback a la lógica anterior si TrackPlayer falla
      if (Platform.OS === "web") {
        try {
          const el = webAudioRef.current ?? (await ensureLoaded(targetUrl) as HTMLAudioElement);
          await el?.play?.();
          setIsPlaying(true);
          setUserPaused(false);
        } catch (e) {
          Alert.alert?.("Reproducción", "No se pudo reproducir el audio en el navegador");
        }
      } else {
        try {
          let s = soundRef.current as ExpoAudio.Sound | null;
          if (!s) {
            s = (await ensureLoaded(targetUrl)) as ExpoAudio.Sound | null;
          } else {
            const st = (await s.getStatusAsync()) as AVPlaybackStatus;
            if (!st.isLoaded) {
              try { await s.unloadAsync(); } catch {/* ignore */}
              soundRef.current = null;
              s = (await ensureLoaded(targetUrl)) as ExpoAudio.Sound | null;
            }
          }
          await s?.playAsync();
          setIsPlaying(true);
          setUserPaused(false);
        } catch (e) {
          console.error("[player] native play fallback fail", e);
          Alert.alert?.("Reproducción", "No se pudo reproducir el audio");
        }
      }
    }
  }, [url, ensureLoaded]);

  const pause = useCallback(async (fromNativePlayer = false) => {
    try {
      // PRIMERO: Pausar el audio REAL (expo-av)
      if (Platform.OS === "web") {
        const el = webAudioRef.current;
        try { await el?.pause?.(); } catch {/* ignore */}
      } else {
        const s = soundRef.current;
        if (s) {
          try { 
            await s.pauseAsync(); 
          } catch (error) {
            console.log('[player] ❌ Error pausando native audio:', error);
          }
        }
      }
      
      // SEGUNDO: Siempre pausar TrackPlayer si está activo
      try {
        await TrackPlayer.pause();
      } catch (error) {
        console.log('[player] ⚠️ TrackPlayer pause falló (normal si no hay track activo):', error);
      }
      
      // TERCERO: Actualizar estado interno
      setIsPlaying(false);
      setUserPaused(true);
    } catch (error) {
      console.log('[player] ❌ Pause falló completamente:', error);
      // Fallback: solo actualizar estado
      setIsPlaying(false);
      setUserPaused(true);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) return pause();
    return play();
  }, [isPlaying, pause, play]);

  const internalPlayAlbumWithQueue = useCallback(async (album: AlbumData, nextUrl: string, direction: ChangeDirection = 'none', forceAutoplay?: boolean, customQueue?: AlbumData[]) => {    
    // Marcar que estamos configurando para evitar interferencia de callbacks
    isConfiguringRef.current = true;
    
    const wasPlaying = isPlayingRef.current;
    setPrevious(current);
    setCurrent(album);
    setChangeDirection(direction);
    setUrl(nextUrl);
    const shouldAutoplayInitial = forceAutoplay === true ? true : wasPlaying;
    
    setUserPaused(!shouldAutoplayInitial);
    if (!shouldAutoplayInitial) {
      setIsPlaying(false);
    } else {
      // Si vamos a hacer autoplay, actualizar inmediatamente el estado para la UI
      setIsPlaying(true);
    }

    // Configurar TrackPlayer para notificaciones del sistema
    try {
      await TrackPlayer.reset(); 
      // Agregar toda la queue personalizada al TrackPlayer si viene proporcionada
      const tracks = (customQueue || []).map((track) => ({
        id: track.id,
        url: resolveAudioUrl(track) || '',
        title: track.title || '',
        artist: "Mental",
        artwork: track.imageUrl,
        duration: 0,
      }));
      if (tracks.length > 0) {
        await TrackPlayer.add(tracks);
      }

      // Buscar el track actual en la queue
      const tracksInQueue = customQueue || [];
      const foundIndex = tracksInQueue.findIndex(track => track.id === album.id);
 
      if (foundIndex >= 0) {
        await TrackPlayer.skip(foundIndex);
      } else {
        // Búsqueda alternativa por baseId
        const baseId = (id: string) => id.split('-')[0];
        const albumBaseId = baseId(album.id);
        const alternativeIndex = tracksInQueue.findIndex(track => baseId(track.id) === albumBaseId);
        
        if (alternativeIndex >= 0) {
          await TrackPlayer.skip(alternativeIndex);
        }
      }
    } catch (error) {
      console.log('[player] ❌ Error configurando TrackPlayer:', error);
    }

    // Reproducir si es necesario
    if (shouldAutoplayInitial) {
      try {
        // Ejecutar inmediatamente para mantener sincronización
        await TrackPlayer.play();
        // El estado isPlaying ya se actualizó arriba, no es necesario actualizarlo aquí
      } catch (error) {
        // Si falla, revertir el estado
        setIsPlaying(false);
        setUserPaused(true);
      }
    }

    // Marcar que terminamos de configurar después de un delay
    setTimeout(() => {
      isConfiguringRef.current = false;
    }, 500);

  }, [current]);

  const internalPlayAlbum = useCallback(async (album: AlbumData, nextUrl: string, direction: ChangeDirection = 'none', forceAutoplay?: boolean) => {
    
    // Marcar que estamos configurando para evitar interferencia de callbacks
    isConfiguringRef.current = true;
    
    const wasPlaying = isPlayingRef.current;
    setPrevious(current);
    setCurrent(album);
    setChangeDirection(direction);
    setUrl(nextUrl);
    const shouldAutoplayInitial = forceAutoplay === true ? true : wasPlaying;
    setUserPaused(!shouldAutoplayInitial);
    if (!shouldAutoplayInitial) {
      setIsPlaying(false);
    } else {
      // Si vamos a hacer autoplay, actualizar inmediatamente el estado para la UI
      setIsPlaying(true);
    }

    // Configurar TrackPlayer para notificaciones del sistema
    try {
      await TrackPlayer.reset();
      // Agregar toda la queue al TrackPlayer para que pueda navegar correctamente
      const tracks = queue.map((track) => {
        return {
          id: track.id,
          url: resolveAudioUrl(track) || '',
          title: track.title || 'Track',
          artist: "Mental",
          album: 'Aura',
          artwork: track.imageUrl,
        };
      });

      // Si no hay queue o está vacía, agregar solo el track actual
      if (tracks.length === 0) {
        tracks.push({
          id: album.id,
          url: nextUrl,
          title: album.title || 'Track',
          artist: "Mental",
          album: 'Aura',
          artwork: album.imageUrl,
        });
      }

      await TrackPlayer.add(tracks);
      //console.log('[player] ✅ TrackPlayer add completado con', tracks.length, 'tracks');
      
      // IMPORTANTE: Sincronizar TrackPlayer con el track actual
      const currentTrackIndex = tracks.findIndex(t => t.id === album.id);

      if (currentTrackIndex !== -1) {
        await TrackPlayer.skipToNext(); 
        // Si debe reproducir automáticamente, iniciar reproducción en TrackPlayer
        if (shouldAutoplayInitial) {          
          // Pequeño delay para asegurar que TrackPlayer esté completamente configurado
          setTimeout(async () => {
            try {
              await TrackPlayer.play();
              
              // Asegurar que el estado interno esté sincronizado
              setIsPlaying(true);
              setUserPaused(false);
            } catch (error) {
              console.log('[player] ❌ Error en reproducción automática:', error);
            }
          }, 100);
        }
        
        // Marcar que la configuración ha terminado
        setTimeout(() => {
          isConfiguringRef.current = false;
        }, 500);
        
      } else {        
        // Búsqueda alternativa por baseId
        const baseId = album.id ? String(album.id).split('-')[0] : '';
        const alternativeIndex = tracks.findIndex(t => {
          const trackBaseId = t.id ? String(t.id).split('-')[0] : '';
          return trackBaseId === baseId;
        });
        
        if (alternativeIndex !== -1) {
          await TrackPlayer.skip(alternativeIndex);
        }
      }
    } catch (error) {
      console.log('[player] ❌ TrackPlayer configuración falló:', error);
    }

    const myId = ++loadIdRef.current;
    await stopAndUnload();
    await ensureLoaded(nextUrl);
    if (myId !== loadIdRef.current) return;

    if (userPausedRef.current) {
      setIsPlaying(false);
      return;
    }

    if (shouldAutoplayInitial) {
      try {
        // NO reproducir con expo-av si TrackPlayer está activo
        // Solo actualizar el estado para que TrackPlayer maneje la reproducción
        if (!userPausedRef.current) {
          setIsPlaying(true);
          setUserPaused(false);
        }
      } catch (e) {
        console.log('[player] playAlbum immediate play failed', e);
      }
    }
  }, [ensureLoaded, current, stopAndUnload, queue, resolveAudioUrl]);

  const playAlbum = useCallback(async (album: AlbumData, nextUrl: string, direction: ChangeDirection = 'none', forceAutoplay?: boolean) => {
    if (!nextUrl) {
      Alert.alert?.('Audio', 'No se encontró el audio de esta pista');
      return;
    }
    await internalPlayAlbum(album, nextUrl, direction, forceAutoplay);
  }, [internalPlayAlbum]);

  const select = useCallback(async (album: AlbumData, opts?: SelectOptions) => {
    const chosen = album;
    const urlToUse = resolveAudioUrl(chosen);
    if (!urlToUse) {
      Alert.alert?.('Audio', 'Esta pista no tiene audio disponible');
      return;
    }
    const dir = (() => {
      if (opts?.direction) return opts.direction;
      if (!current) return 'none';
      const a = Number(baseId(chosen.id));
      const b = Number(baseId(current.id));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        if (a > b) return 'next';
        if (a < b) return 'prev';
        return 'none';
      }
      return chosen.id !== current.id ? 'next' : 'none';
    })();
    
    // Si se proporciona una queue personalizada, usarla temporalmente
    if (opts?.queue) {
      await internalPlayAlbumWithQueue(chosen, urlToUse, dir, opts.forceAutoplay, opts.queue);
    } else {
      await internalPlayAlbum(chosen, urlToUse, dir, opts?.forceAutoplay);
    }
  }, [internalPlayAlbum, internalPlayAlbumWithQueue, current, resolveAudioUrl]);

  const indexInQueue = useCallback((id: string | null | undefined) => {
    if (!id) return -1;
    return queue.findIndex(a => a.id === id);
  }, [queue]);

  const next = useCallback(async () => {
    const total = queue.length;
    if (total <= 0) return;
    let idx = indexInQueue(current?.id);
    if (idx === -1) {
      const bi = queue.findIndex(a => baseId(a.id) === baseId(current?.id ?? null));
      idx = bi !== -1 ? bi : -1;
    }
    if (idx === -1) idx = 0;
    const nextIdx = (idx + 1) % total;
    const a = queue[nextIdx];
    const nextUrl = resolveAudioUrl(a);
    try {
      // Primero actualizar el estado interno
      setPrevious(current);
      setCurrent(a);
      setChangeDirection('next');
      setUrl(nextUrl);
      
      // Detectar si estamos en el último track para manejar el loop correctamente
      if (nextIdx === 0) {
        // Si el siguiente track es el primero (índice 0), significa que estamos en el último
        await TrackPlayer.skip(0);
      } else {
        // Usar skipToNext() para tracks intermedios
        await TrackPlayer.skipToNext();
      }
      
      // Crear tracks para TrackPlayer
      const tracks = queue.map((track) => {
        return {
          id: track.id,
          url: resolveAudioUrl(track) || '',
          title: track.title || 'Track',
          artist: "Mental",
          album: 'Aura',
          artwork: track.imageUrl,
        };
      });
      await TrackPlayer.add(tracks);
      
      // Buscar el índice del track actual en la nueva queue
      const currentTrackIndex = tracks.findIndex(t => t.id === a.id);
      if (currentTrackIndex !== -1) {
        await TrackPlayer.skip(currentTrackIndex);
        
        // SIEMPRE reproducir el nuevo track (cortar el actual y reproducir el nuevo)
        await TrackPlayer.play();
        setIsPlaying(true);
        setUserPaused(false);
      }
    } catch (error) {
      // Fallback a la lógica anterior
      await internalPlayAlbum(a, nextUrl, 'next', true);
    }
  }, [queue, current, internalPlayAlbum, indexInQueue, resolveAudioUrl]);

  const prev = useCallback(async () => {
    const total = queue.length;
    if (total <= 0) return;
    let idx = indexInQueue(current?.id);
    if (idx === -1) {
      const bi = queue.findIndex(a => baseId(a.id) === baseId(current?.id ?? null));
      idx = bi !== -1 ? bi : -1;
    }
    if (idx === -1) idx = 0;
    const prevIdx = (idx - 1 + total) % total;
    const a = queue[prevIdx];
    const prevUrl = resolveAudioUrl(a);
    
    try {
      // Primero actualizar el estado interno
      setPrevious(current);
      setCurrent(a);
      setChangeDirection('prev');
      setUrl(prevUrl);
      
      if (prevIdx === total - 1) {
        // Si el track anterior es el último (índice total-1), significa que estamos en el primero
        await TrackPlayer.skip(total - 1);
      } else {
        // Usar skipToPrevious() para tracks intermedios
        await TrackPlayer.skipToPrevious();
      }
      
      // Crear tracks para TrackPlayer
      const tracks = queue.map((track) => {
        return {
          id: track.id,
          url: resolveAudioUrl(track) || '',
          title: track.title || 'Track',
          artist: "Mental",
          album: 'Aura',
          artwork: track.imageUrl,
        };
      });
      
      await TrackPlayer.add(tracks);
      
      // Buscar el índice del track actual en la nueva queue
      const currentTrackIndex = tracks.findIndex(t => t.id === a.id);
      if (currentTrackIndex !== -1) {
        await TrackPlayer.skip(currentTrackIndex);
        
        // SIEMPRE reproducir el nuevo track (cortar el actual y reproducir el nuevo)
        await TrackPlayer.play();
        setIsPlaying(true);
        setUserPaused(false);
      }
    } catch (error) {
      console.log('[player] ❌ TrackPlayer prev falló, usando fallback:', error);
      // Fallback a la lógica anterior
      await internalPlayAlbum(a, prevUrl, 'prev', true);
    }
  }, [queue, current, internalPlayAlbum, indexInQueue, resolveAudioUrl]);

  const seekBy = useCallback(async (seconds: number) => {
    try {
      // Usar TrackPlayer como reproductor principal
      const position = await TrackPlayer.getPosition();
      const duration = await TrackPlayer.getDuration();
      
      let nextPosition = position + seconds;
      if (duration > 0) {
        nextPosition = Math.max(0, Math.min(duration - 0.2, nextPosition));
      } else {
        nextPosition = Math.max(0, nextPosition);
      }
      
      await TrackPlayer.seekTo(nextPosition);
    } catch (error) {
      // Fallback a la lógica anterior si TrackPlayer falla
      try {
        if (Platform.OS === "web") {
          const el = webAudioRef.current;
          if (!el) return;
          const duration = Number.isFinite(el.duration) ? el.duration : 0;
          const currentTime = el.currentTime ?? 0;
          let nextTime = currentTime + seconds;
          if (duration > 0) {
            nextTime = Math.max(0, Math.min(duration - 0.2, nextTime));
          } else {
            nextTime = Math.max(0, nextTime);
          }
          el.currentTime = nextTime;
          if (isPlaying) {
            await el.play().catch(() => {});
          }
        } else {
          const s = soundRef.current;
          if (!s) return;
          const status = (await s.getStatusAsync()) as AVPlaybackStatus;
          if (!status.isLoaded) return;
          const durationMs = status.durationMillis ?? 0;
          const positionMs = status.positionMillis ?? 0;
          const nextMs = Math.max(0, Math.min(durationMs > 0 ? durationMs - 200 : positionMs + seconds * 1000, positionMs + seconds * 1000));
          await s.setPositionAsync(nextMs);
          if (isPlaying) {
            await s.playAsync().catch(() => {});
          }
        }
      } catch (e) {
        console.log("[player] seek fallback error", e);
      }
    }
  }, [isPlaying]);

  const setUIOpen = useCallback((open: boolean) => {
    setUIOpenState(open);
  }, []);

  const setQueue = useCallback((list: AlbumData[]) => {
    setQueueState(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    advanceNextRef.current = () => { next().catch(() => {}); };
  }, [next]);

  // Sincronización con TrackPlayer para notificaciones nativas
  useEffect(() => {
    const handleTrackPlayerPlay = async () => {
      // Llamar función play con flag de reproductor nativo
      await play(true); // fromNativePlayer = true
    };

    const handleTrackPlayerPause = async () => { 
      // Ignorar eventos de pausa durante la configuración inicial
      if (isConfiguringRef.current) {
        return;
      }
      
      // Llamar función pause con flag de reproductor nativo
      await pause(true); // fromNativePlayer = true
    };

    const handleTrackPlayerNext = () => {
      // Ejecutar la función next() para cambiar al siguiente track
      next().catch(console.error);
    };

    const handleTrackPlayerPrevious = () => {
      // Ejecutar la función prev() para cambiar al track anterior
      prev().catch(console.error);
    };

    const handleTrackPlayerStop = () => {
      // Ignorar eventos de stop durante la configuración inicial
      if (isConfiguringRef.current) {
        return;
      }
      
      setIsPlaying(false);
      setUserPaused(true);
    };

    const handleTrackPlayerSeek = (position: number) => {
      console.log('[PlayerProvider] TrackPlayer seek event received:', position);
      // No necesitamos hacer nada aquí porque TrackPlayer ya cambió la posición
    };

    const handleTrackPlayerTrackChanged = async (trackId: string | number | null) => {      
      // Ignorar cambios durante la configuración inicial
      if (isConfiguringRef.current) {
        return;
      }

      // Ignorar cambios a undefined o null (pero NO a 0, que es un índice válido)
      if (trackId === undefined || trackId === null) {
        return;
      }
      
      let targetTrack: AlbumData | null = null;
      
      // Si es un índice numérico, buscar por posición en la queue
      if (typeof trackId === 'number') {
        if (trackId >= 0 && trackId < queue.length) {
          targetTrack = queue[trackId];
        } else {
          return;
        }
      } else {
        // Si es un string, buscar por ID
        targetTrack = queue.find(t => t.id === trackId) || null;
        if (!targetTrack) {
          return;
        }
      }
      
      // Actualizar el estado si encontramos un track válido
      if (targetTrack && targetTrack.id !== current?.id) {
        setPrevious(current);
        setCurrent(targetTrack);
        setChangeDirection('none');
        const resolved = resolveAudioUrl(targetTrack);
        setUrl(resolved);
        
        // IMPORTANTE: NO cambiar el estado automáticamente al cambiar de track
        // Solo loggear el estado para debugging, pero no modificar isPlaying
        try {
            await TrackPlayer.getState();
        } catch (error) {
          console.log('[PlayerProvider] ⚠️ Error verificando estado de TrackPlayer:', error);
        }
        
        // IMPORTANTE: Sincronizar el audio real (expo-av) con el nuevo track
        try {
          const newUrl = resolved;
          if (newUrl) {
            // Cargar el nuevo audio en expo-av
            await ensureLoaded(newUrl);
          }
        } catch (error) {
          console.log('[PlayerProvider] ⚠️ Error sincronizando audio real:', error);
        }
      }
    };

    // Registrar callbacks
    registerTrackPlayerCallbacks({
      onPlay: handleTrackPlayerPlay,
      onPause: handleTrackPlayerPause,
      onNext: handleTrackPlayerNext,
      onPrevious: handleTrackPlayerPrevious,
      onStop: handleTrackPlayerStop,
      onSeek: handleTrackPlayerSeek,
      onTrackChanged: handleTrackPlayerTrackChanged,
    });

    // Cleanup
    return () => {
      cleanupTrackPlayerCallbacks();
    };
  }, [isPlaying, current, queue, next, prev, ensureLoaded, play, pause]);

  return { current, previous, changeDirection, isPlaying, url, userPaused, uiOpen, queue, setQueue, setUIOpen, play, pause, toggle, playAlbum, select, next, prev, seekBy };
});
