import { FlatList, FlatListProps, StyleSheet } from 'react-native'
import React from 'react'
import TrackListItem from './TrackListItem'
import TrackPlayer, { Track } from 'react-native-track-player'
import { useQueue } from '@/store/queue'
import { usePlayerStore } from '@/store/playerStore'
import { AudioDownloadService } from '@/services/audioDownloadService'
import { UnifiedTrack } from '@/helpers/types'
import { useRouter } from 'expo-router'

export type TrackListProps = Partial<FlatListProps<UnifiedTrack>> & {
    id: string
    tracks: UnifiedTrack[]
    playableTracks: UnifiedTrack[]
    downloadedTracks: Record<string, { path: string, lastUpdated: number }>
    requestSettings: any
    audioRequest: any
}

const TrackList2 = ({ id, tracks, requestSettings, audioRequest, playableTracks, downloadedTracks, ...flatlistProps }: TrackListProps) => {
    const { activeQueueId, setActiveQueueId } = useQueue();
    const {setDisplayedTrack, setFullTrackData} = usePlayerStore();
    const router = useRouter();

    const onPlay = async (selectedTrack: UnifiedTrack) => {
        try {
            // if (selectedTrack.isProcessing) {
            //   //console.log('[TrackList2] No se puede reproducir un track en proceso');
            //   return;
            // }
            let trackToDisplay: any = {
                 ...selectedTrack, 
                title: selectedTrack.customData?.name || selectedTrack.title
                };
            setDisplayedTrack(trackToDisplay as unknown as Track);

            //console.log('[TrackList2] Track to display:', trackToDisplay);

            let trackToPlay: any = { ...selectedTrack };

            //console.log('before audioRequestId')
            if (selectedTrack.audioRequestId && downloadedTracks[selectedTrack.audioRequestId]) {
                //console.log('[TrackList2] Track descargado');
                const localPath = await AudioDownloadService.getLocalAudioPath(selectedTrack.audioRequestId);
                //console.log('[TrackList2] Local audio path:', localPath);
                if (localPath) {
                    trackToPlay = {
                        ...trackToPlay,
                        url: localPath,
                        offlineUrl: localPath,
                        isOffline: true
                    };
                    //console.log('[TrackList2] Track configurado para reproducción offline:', trackToPlay);
                }
            }

            //console.log('before findIndex')
            const trackIndex = tracks.findIndex((track: UnifiedTrack) =>
                track.audioRequestId === selectedTrack.audioRequestId
            );

            //console.log('[TrackList2] Track index:', trackIndex);

            if (trackIndex === -1) {
                //console.log('[TrackList2] Track no encontrado en la lista de reproducibles (tracks)');
                return;
            }

            // SIEMPRE forzar cambio de cola para evitar conflictos con CircularCarousel
            //console.log('[TrackList2] Forzando cambio de cola para evitar conflictos');
            //console.log('[TrackList2] TrackToPlay antes de reset:', trackToPlay);
            await TrackPlayer.reset();
            
            const tracksToAdd = await Promise.all(
                tracks
                    .filter((track: UnifiedTrack) => !track.isProcessing)
                    .map(async (track: UnifiedTrack) => {
                        if (track.audioRequestId && downloadedTracks[track.audioRequestId]) {
                            const localPath = await AudioDownloadService.getLocalAudioPath(track.audioRequestId);
                            if (localPath) {
                                return {
                                    url: localPath,
                                    artwork: track.artwork, 
                                    artist: track.audioRequestId ? 'Julián Alborna' : 'Mental', 
                                    title: track.customData?.name || track.title,
                                    album: track.album || '', 
                                    genre: track.genre || '', 
                                    year: track.year || null, 
                                    duration: track.duration || null,
                                    offlineUrl: localPath,
                                    isOffline: true
                                };
                            }
                        }
                        return { 
                            url: track.onlineUrl || track.url, 
                            artwork: track.artwork, 
                            artist: track.audioRequestId ? 'Julián Alborna' : 'Mental', 
                            title: track.customData?.name || track.title,
                            album: track.album || '', 
                            genre: track.genre || '', 
                            year: track.year || null, 
                            duration: track.duration || null,
                            isOffline: false 
                        };
                    })
            );
            
            //console.log('[TrackList2] Tracks a agregar:', tracksToAdd);

            await TrackPlayer.add(tracksToAdd as unknown as Track[]);
            await TrackPlayer.skip(trackIndex);
            await TrackPlayer.play();
            setActiveQueueId(id);
            setFullTrackData(null);
            // Navegación al player
            router.push('/new-player');
        } catch (error) {
            console.error('[TrackList2] Error handling track selection:', error);
        }
    };

    return (
        <>
            <FlatList
                contentInsetAdjustmentBehavior='automatic'
                data={tracks}
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => item.audioRequestId || `track-${index}`}
                renderItem={({ item: track }) => (
                    <TrackListItem track={track} requestSettings={requestSettings} audioRequest={audioRequest} onTrackSelect={onPlay} />
                )}
                ListHeaderComponentStyle={{ marginBottom: 0, padding: 0, gap: 0, flex: 1 }}
                ListFooterComponentStyle={styles.footer}
                {...flatlistProps}
            />
        </>
    )
}

const styles = StyleSheet.create({
    footerContainer: {
        marginTop: 15,
        marginBottom: 15
    },
    buttonContainer: {
        // Estilos específicos para el botón si los necesitas
    },
    footer: {
        // Si necesitas ajustar el contenedor del footer
    },

    container: {
        width: '100%',
        aspectRatio: 2.24, // Ajusta esto según la proporción de tu imagen
        marginBottom: 10,
    },
    touchable: {
        flex: 1,
    },
    headerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
    }
})

export default TrackList2

