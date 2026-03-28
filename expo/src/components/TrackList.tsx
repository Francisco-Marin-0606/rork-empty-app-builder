import { View, Text, FlatList, FlatListProps, StyleSheet, ImageBackground, TouchableHighlight, Linking } from 'react-native'
import React, { useRef } from 'react'
import TrackListItem from './TrackListItem'
import CustomButton from './CustomButton'
import TrackPlayer, { Track, Event } from 'react-native-track-player'
import { useQueue } from '@/store/queue'
import { usePlayerStore } from '@/store/playerStore'
import { useLibraryStore } from '@/store/library'
import { AudioDownloadService } from '@/services/audioDownloadService'
import { UnifiedTrack } from '@/helpers/types'

export type TrackListProps = Partial<FlatListProps<UnifiedTrack>> & {
    id: string
    tracks: UnifiedTrack[]
    playableTracks: UnifiedTrack[]
}

const ItemDivider = () => (
    <View style={{
        marginVertical: 5,
        marginLeft: 60
    }} />
)

const TrackList = ({ id, tracks, playableTracks, ...flatlistProps }: TrackListProps) => {

    const queueOffset = useRef(0);
    const { activeQueueId, setActiveQueueId } = useQueue();
    const setDisplayedTrack = usePlayerStore((state) => state.setDisplayedTrack);
    const { downloadedTracks } = useLibraryStore();

    const handleTrackSelect = async (selectedTrack: UnifiedTrack) => {
        try {
            // No manejar tracks en proceso
            if (selectedTrack.isProcessing) {
                console.log('[TrackList] No se puede reproducir un track en proceso');
                return;
            }
            
            // Actualizar inmediatamente el track seleccionado en UI
            setDisplayedTrack(selectedTrack as unknown as Track);
            
            // Determinar qué URL usar (priorizar siempre la versión local)
            let trackToPlay: UnifiedTrack = { ...selectedTrack };
            
            // Si el track tiene audioRequestId y está descargado, usar la versión local
            if (selectedTrack.audioRequestId && downloadedTracks[selectedTrack.audioRequestId]) {
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
            
            // Encontrar el índice del track en la lista de reproducibles
            const trackIndex = playableTracks.findIndex((track) => 
                !track.isProcessing && track.audioRequestId === selectedTrack.audioRequestId
            );

            if (trackIndex === -1) {
                console.log('[TrackList] Track no encontrado en la lista de reproducibles');
                return;
            }

            const isChangingQueue = id !== activeQueueId;
            console.log(`[TrackList] ${isChangingQueue ? 'Cambiando cola' : 'Usando cola actual'}`);

            if (isChangingQueue) {
                await TrackPlayer.reset();
                
                // Preparar tracks para añadir, priorizando versiones locales
                const tracksToAdd = await Promise.all(
                    playableTracks
                        .filter(track => !track.isProcessing)
                        .map(async (track) => {
                            // Si el track está descargado, usar la versión local
                            if (track.audioRequestId && downloadedTracks[track.audioRequestId]) {
                                const localPath = await AudioDownloadService.getLocalAudioPath(track.audioRequestId);
                                if (localPath) {
                                    return { 
                                        ...track, 
                                        url: localPath,
                                        isOffline: true 
                                    };
                                }
                            }
                            return track;
                        })
                );
                
                // Añadir los tracks a la cola
                await TrackPlayer.add(tracksToAdd as unknown as Track[]);
                await TrackPlayer.skip(trackIndex);
                await TrackPlayer.play();
                setActiveQueueId(id);
            } else {
                // Si es la misma cola, simplemente saltamos al track seleccionado
                // Si es la versión local de un track ya en cola, primero actualizamos la URL
                if (trackToPlay.isOffline) {
                    await TrackPlayer.remove([trackIndex]);
                    await TrackPlayer.add([trackToPlay as unknown as Track], trackIndex);
                }
                
                await TrackPlayer.skip(trackIndex);
                await TrackPlayer.play();
            }
        } catch (error) {
            console.error('[TrackList] Error handling track selection:', error);
        }
    };

    const RequestAudioButton = () => (
        <View style={styles.footerContainer}>
            <CustomButton
                title="Pedir mi nueva hipnosis"
                containerStyles={{ backgroundColor: '#FE892E', minHeight: 50 }}
                textStyles={{ color: 'white' }}
                handlePress={() => { //console.log("Pidiendo nueva hipnosis") 
                }}
            />
        </View>
    )

    return (
        <>
          <FlatList
            contentInsetAdjustmentBehavior='automatic'
            data={tracks}
            keyExtractor={(item, index) => item.audioRequestId || `track-${index}`}
            renderItem={({ item: track }) => (
                <TrackListItem track={track} onTrackSelect={handleTrackSelect} />
            )}
            ListHeaderComponentStyle={{marginBottom: 0, padding: 0, gap: 0, flex: 1}}
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

export default TrackList