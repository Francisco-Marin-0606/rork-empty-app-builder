import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import HypnosisBottomSheet from '@/components/HypnosisBottomSheet'
import { UnifiedTrack } from '@/helpers/types';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { formatTitle } from '@/helpers/miscellaneous';
import { Track } from 'react-native-track-player';
import { usePlayerStore } from '@/store/playerStore';
import { usePlayer } from '@/providers/PlayerProvider';
import { AudioDownloadService } from '@/services/audioDownloadService';
import TrackPlayer from 'react-native-track-player';
import { useNewLibraryStore } from '@/store/newLibrary';
import { useQueue } from '@/store/queue';
import { colors, cutOffDate } from '@/constants/tokens';
import Modal from '@/components/Modal';
import * as Haptics from 'expo-haptics';






const HypnosisBottomSheetScreen = () => {
    const {isLevelAudioDownloaded, levelAudios} = useNewLibraryStore();
    const { activeQueueId, setActiveQueueId } = useQueue();
    const setDisplayedTrack = usePlayerStore((state) => state.setDisplayedTrack);
    const setIsFloatingPlayerVisible = usePlayerStore((state) => state.setIsFloatingPlayerVisible);
    const {fullTrackData,setFullTrackData} = usePlayerStore();
    const { userData, checkRevenueCatSubscription } = useAuthStore();
    const { queueId } = useLocalSearchParams();
    const { pause: pauseAuraMusic, isPlaying: auraIsPlaying } = usePlayer();

    // Extraer el portal del userLevel de fullTrackData
    const getPortalFromTrackData = () => {
        if (!fullTrackData) return 6001;
        
        // Buscar userLevel en diferentes lugares de fullTrackData
        const userLevel = fullTrackData.audioRequest?.userLevel || 
                         fullTrackData.requestSettings?.userLevel || 
                         fullTrackData.levelAudios?.userLevel;
        
        // Convertir userLevel a número y mapear a portal (6000 + userLevel)
        const numericUserLevel = userLevel ? parseInt(userLevel.toString(), 10) : 1;
        const portal = 6000 + numericUserLevel;
        
        console.log('🔍 [Portal Detection] fullTrackData:', {
            audioRequestUserLevel: fullTrackData.audioRequest?.userLevel,
            requestSettingsUserLevel: fullTrackData.requestSettings?.userLevel,
            levelAudiosUserLevel: fullTrackData.levelAudios?.userLevel,
            detectedUserLevel: userLevel,
            numericUserLevel: numericUserLevel,
            calculatedPortal: portal,
            userLevelType: typeof userLevel
        });
        
        return portal;
    };

    const portal = getPortalFromTrackData();

    const handleCloseBottomSheet = () => {
         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Cerrar el modal y regresar a la UI de descripción del portal de hipnosis
        router.dismiss();
    };
    
    useEffect(() => {
      setIsFloatingPlayerVisible(false);
    }, []);

    const onPlay = async (selectedTrack: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!fullTrackData) return;
        
        console.log('[CircularCarousel] onPlay llamado con:', {
          selectedTrack,
          levelAudios: levelAudios?.length,
          fullTrackData: !!fullTrackData
        });
        
        try {
          // if (selectedTrack.isProcessing) {
          //   //console.log('[CircularCarousel] No se puede reproducir un track en proceso');
          //   return;
          // }
    
          const userGender = userData?.gender || '';
          const genderTitle = userGender === 'Hombre' 
            ? fullTrackData.requestSettings.appSettings.formSettings.genderTitle.male 
            : userGender === 'Mujer' 
              ? fullTrackData.requestSettings.appSettings.formSettings.genderTitle.female 
              : fullTrackData.requestSettings.appSettings.formSettings.genderTitle.base;
    
          let trackToDisplay: any = { ...selectedTrack, title: formatTitle(genderTitle, userData?.wantToBeCalled)};
    
          setDisplayedTrack(trackToDisplay as unknown as Track);
          
          let trackToPlay: any = { ...selectedTrack};
    
          // Verificar si es un levelAudio y está descargado
          if (selectedTrack.audioRequestId && isLevelAudioDownloaded(selectedTrack.audioRequestId)) {
            const localPath = await AudioDownloadService.getLocalAudioPath(selectedTrack.audioRequestId);
    
            if (localPath) {
              trackToPlay = {
                ...trackToPlay,
                url: localPath,
                offlineUrl: localPath,
                isOffline: true
              };
    
            }
          }
    
          const trackIndex = levelAudios.findIndex((track : any) =>
            !track.isProcessing && track.audioRequestId === selectedTrack.audioRequestId
          );
    
          if (trackIndex === -1) {
            console.log('[CircularCarousel] Track no encontrado en levelAudios:', selectedTrack.audioRequestId);
            return;
          }
          
          // Validar que trackIndex esté dentro de los límites
          if (trackIndex < 0 || trackIndex >= levelAudios.length) {
            console.log('[CircularCarousel] Track index fuera de límites:', trackIndex, 'de', levelAudios.length);
            return;
          }
    
          const isChangingQueue = queueId !== activeQueueId;
    
          const formatTitleNew = (data: any) => {

            if (Date.parse(data.levelAudios.publicationDate) > cutOffDate) {
              return data.levelAudios.title;
            }

            // Get gender title settings
            const genderTitles = data.requestSettings?.appSettings?.formSettings?.genderTitle;
            if (!genderTitles) return '';

            // Select appropriate title based on user gender
            let title = genderTitles.base;
            if (userData.gender === 'Hombre' && genderTitles.male) {
              title = genderTitles.male;
            } else if (userData.gender === 'Mujer' && genderTitles.female) {
              title = genderTitles.female;
            }

            // Format title with user's preferred name
            return formatTitle(title, userData.wantToBeCalled);
          }

          if (isChangingQueue) {
    
            await TrackPlayer.reset();
            const tracksToAdd = await Promise.all(
              levelAudios
                .filter((track: any) => !track.isProcessing)
                .map(async (track: any) => {
                  // Verificar si este levelAudio está descargado
                  if (track.audioRequestId && isLevelAudioDownloaded(track.audioRequestId)) {
                    const localPath = await AudioDownloadService.getLocalAudioPath(track.audioRequestId);
                    if (localPath) {

                      return {
                        ...track,
                        url: localPath,
                        offlineUrl: localPath,
                        isOffline: true,
                        artwork: track.imageUrl, 
                        artist: 'Julián Alborna', 
                        title: formatTitleNew(fullTrackData),
                        album: track.album, 
                        genre: track.genre, 
                        year: track.year, 
                        duration: track.duration
                      };
                    }
                  }
                  return {
                    url: track.audioUrl, 
                    artwork: track.imageUrl, 
                    artist: 'Julián Alborna', 
                    title: formatTitleNew(fullTrackData),
                    album: track.album, 
                    genre: track.genre, 
                    year: track.year, 
                    duration: track.duration, 
                    isOffline: false
                  };
                })
            );
    
    
            // Pausar música de Aura antes de reproducir hipnosis
            if (auraIsPlaying) {
              console.log('🎵 [AURA] Pausando música de Aura para reproducir hipnosis');
              await pauseAuraMusic();
            }
            
            await TrackPlayer.add(tracksToAdd as unknown as Track[]);
            await TrackPlayer.skip(trackIndex);
            await TrackPlayer.play();
            setActiveQueueId(queueId as string);
            setIsFloatingPlayerVisible(false);
            router.push('/new-player');
          } else {
    
            if (trackToPlay.url) { // Asegurarse de que URL existe
              const currentTrack = await TrackPlayer.getTrack(trackIndex);
    
              if (currentTrack && currentTrack.url !== trackToPlay.url) {
                 await TrackPlayer.remove([trackIndex]);
                 // Asegurar que la URL no se pierde al agregar
                 const trackToAdd = {
                   ...trackToPlay,
                   url: trackToPlay.url, // Reforzar la URL
                   isOffline: false, // Cambiar a false para probar
                   artist: 'Julián Alborna' // Asegurar que siempre tenga el artista correcto
                 };
    
                 await TrackPlayer.add([trackToAdd as unknown as Track], trackIndex);
              }
            }
            
            // Pausar música de Aura antes de reproducir hipnosis
            if (auraIsPlaying) {
              console.log('🎵 [AURA] Pausando música de Aura para reproducir hipnosis');
              await pauseAuraMusic();
            }
            
            await TrackPlayer.skip(trackIndex);
            await TrackPlayer.play();
            setIsFloatingPlayerVisible(false);
            router.push('/new-player');
          }
        } catch (error) {
          console.error('[CircularCarousel] Error handling track selection:', error);
        }
      };

    return (
        <Modal  
        title="Pedir mi hipnosis" 
        showTitle={false} 
        headerBackgroundColor={colors.formBackground}
        showBackButton={false}
        showHeader={false}
        >
            <HypnosisBottomSheet
                isVisible={true}
                onClose={handleCloseBottomSheet}
                onPlay={onPlay}
                data={fullTrackData as any}
                portal={portal}
            />
        </Modal>


    )
}

export default HypnosisBottomSheetScreen