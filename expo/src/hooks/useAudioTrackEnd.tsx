import { useState, useEffect, useRef } from 'react';
import { Event, State, useTrackPlayerEvents, useProgress } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore } from '@/store/playerStore';
import { router } from 'expo-router';
import { useNewLibraryStore } from '@/store/newLibrary';
import cacheManager from '@/services/cache/cacheManager';

export const useAudioTrackEnd = () => {
  const [showPostHypnosisModal, setShowPostHypnosisModal] = useState(false);
  const [cachedImageUrl, setCachedImageUrl] = useState<string>('');
  const { position, duration } = useProgress(250);
  const hasShownModal = useRef(false);
  const wasPlayingRef = useRef(false);
  const { userData } = useAuthStore();
  const { fullTrackData } = usePlayerStore();
  const { fetchUserAudios } = useNewLibraryStore();

  // Función para verificar si el audio tiene userLevel
  const hasUserLevel = () => {
    if (!fullTrackData) return false;

    // Verificar en audioRequest
    if (fullTrackData.audioRequest?.userLevel !== undefined) {
      return true;
    }

    // Verificar en requestSettings
    if (fullTrackData.requestSettings?.userLevel !== undefined) {
      return true;
    }

    // Verificar en levelAudios
    if (fullTrackData.levelAudios?.userLevel !== undefined) {
      return true;
    }

    return false;
  };

  // Función para manejar el final del track
  const handleTrackEnd = async () => {
    if (hasShownModal.current) return;

    // Detener completamente la reproducción y limpiar la cola
    try {
      await TrackPlayer.pause();
      await TrackPlayer.reset();
    } catch (error) {
      console.log('[useAudioTrackEnd] Error stopping playback:', error);
    }

    const trackHasUserLevel = hasUserLevel();
    //console.log('[useAudioTrackEnd] Track has userLevel:', trackHasUserLevel);

    if (trackHasUserLevel) {
      // Si tiene userLevel, mostrar el modal post-hipnosis
      //console.log('[useAudioTrackEnd] Mostrando modal post-hipnosis');
      setShowPostHypnosisModal(true);
      hasShownModal.current = true;
    } else {
      // Si no tiene userLevel, navegar directamente a /tabs/audios
      //console.log('[useAudioTrackEnd] Audio sin userLevel terminado, navegando a la sección de audios');
      hasShownModal.current = true;

      // Navegar a la sección de audios
      if (router.canGoBack()) {
        router.back();
      }

      // Recargar los datos del usuario para actualizar la vista
      if (userData?.userId) {
        setTimeout(() => {
          fetchUserAudios(userData.userId);
        }, 500);
      }
    }
  };


  // Listen for PlaybackQueueEnded event
  useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackState], async (event) => {

    if (event.type === Event.PlaybackQueueEnded) {
      //console.log('[useAudioTrackEnd] PlaybackQueueEnded event - audio terminado');
      handleTrackEnd();
    } else if (event.type === Event.PlaybackState) {
      //console.log('[useAudioTrackEnd] PlaybackState changed to:', event.state);

      // Actualizar el estado de reproducción
      if (event.state === State.Playing) {
        wasPlayingRef.current = true;
      } else if (event.state === State.Paused && wasPlayingRef.current) {
        // Solo procesar cuando cambia a Paused, estaba reproduciéndose antes, y estamos cerca del final
        if (duration > 0 && position > 0 && position >= duration - 1) {
          //console.log('[useAudioTrackEnd] Audio pausado cerca del final después de estar reproduciéndose');
          handleTrackEnd();
        }
      } else if (event.state === State.Stopped || event.state === State.Ready) {
        wasPlayingRef.current = false;
      }
    }
  });

  // Also detect track completion by monitoring position vs duration
  useEffect(() => {
    const checkTrackEnd = async () => {
      
      if (duration > 0 && position > 0 && position >= duration - 0.5 && wasPlayingRef.current) {
       // console.log(`[useAudioTrackEnd] Detectado final por posición mientras estaba reproduciéndose: ${position}/${duration}`);
        handleTrackEnd();
      }
    };

    checkTrackEnd();
  }, [position, duration]);

  // Reset flags when modal is closed
  const closeModal = async () => {
    //console.log('[useAudioTrackEnd] Cerrando modal post-hipnosis');
    setShowPostHypnosisModal(false);
    hasShownModal.current = false;
    wasPlayingRef.current = false;

    // Asegurar que el reproductor esté completamente parado
    try {
      await TrackPlayer.pause();
      await TrackPlayer.reset();
    } catch (error) {
     // console.log('[useAudioTrackEnd] Error stopping playback in closeModal:', error);
    }

    // Navegar a la sección de audios cuando se cierra el modal
    if (router.canGoBack()) {
      router.back();
    }

    // Recargar los datos del usuario para actualizar la vista
    if (userData?.userId) {
      setTimeout(() => {
        fetchUserAudios(userData.userId);
      }, 500);
    }
  };

  // Get postHypnosis data from track or rawRequestData if available
  const getPostHypnosisData = () => {
    if (!fullTrackData) return { text: '', imageUrl: '', userName: '' };

    // Get the raw request data if available
    const rawData = fullTrackData.audioRequest || {};

    // Get postHypnosis text
    const postHypnosisText = rawData?.audioMotive?.postHypnosis || '';

    // Get user's name and gender
    const userName = userData?.wantToBeCalled || '';
    const userGender = userData?.gender || 'male'; // Default to male if gender is not specified

    // Get the appropriate image URL based on gender
    let originalImageUrl = '';
    if (rawData?.settings?.customization?.postHypnosis?.genderImage) {
      if (userGender.toLowerCase() === 'mujer' || userGender.toLowerCase() === 'female') {
        originalImageUrl = rawData.settings.customization.postHypnosis.genderImage.female;
      } else if (userGender.toLowerCase() === 'hombre' || userGender.toLowerCase() === 'male') {
        originalImageUrl = rawData.settings.customization.postHypnosis.genderImage.male;
      } else {
        // Use base as fallback
        originalImageUrl = rawData.settings.customization.postHypnosis.genderImage.base;
      }
    }
    return { text: postHypnosisText, imageUrl: originalImageUrl, userName };
  };

  const { text: postHypnosisText, imageUrl: originalImageUrl, userName } = getPostHypnosisData();

  // Cache image and get cached URL
  useEffect(() => {
    const loadCachedImage = async () => {
      if (!originalImageUrl) {
        setCachedImageUrl('');
        return;
      }

      try {
        // Try to get cached image first
        const cachedUri = await cacheManager.getCachedImage(originalImageUrl);
        if (cachedUri) {
          //console.log('[useAudioTrackEnd] Using cached image:', cachedUri);
          setCachedImageUrl(cachedUri);
        } else {
          // If not cached, cache it and use original URL as fallback
          ///console.log('[useAudioTrackEnd] Caching image:', originalImageUrl);
          await cacheManager.cacheImage(originalImageUrl);
          const newCachedUri = await cacheManager.getCachedImage(originalImageUrl);
          setCachedImageUrl(newCachedUri || originalImageUrl);
        }
      } catch (error) {
        //console.warn('[useAudioTrackEnd] Error loading cached image:', error);
        setCachedImageUrl(originalImageUrl); // Fallback to original URL
      }
    };

    loadCachedImage();
  }, [originalImageUrl]);

  // Return the modal component and controls
  return {
    showPostHypnosisModal,
    setShowPostHypnosisModal,
    closeModal,
    postHypnosisText,
    imageUrl: cachedImageUrl,
    userName
  };
};

export default useAudioTrackEnd;