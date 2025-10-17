import { useEffect, useRef } from 'react';
import { usePlayer } from '@/providers/PlayerProvider';

/**
 * Hook que pausa automáticamente la música de Aura cuando se reproduce un video o hipnosis
 * @param isPlaying - Estado de reproducción del video/hipnosis
 * @param shouldPause - Condición adicional para determinar si debe pausar (opcional)
 */
export const usePauseAuraMusic = (isPlaying: boolean, shouldPause: boolean = true) => {
  const { pause: pauseAuraMusic, isPlaying: auraIsPlaying } = usePlayer();
  const wasPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    // Solo pausar si la música de Aura está reproduciéndose y el video/hipnosis comienza a reproducirse
    if (shouldPause && auraIsPlaying && !wasPlayingRef.current && isPlaying) {
      //console.log('🎵 [AURA] Pausando música de Aura para reproducir video/hipnosis');
      pauseAuraMusic();
    }
    
    // Actualizar el estado anterior
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, shouldPause, auraIsPlaying, pauseAuraMusic]);

  return { pauseAuraMusic };
};
