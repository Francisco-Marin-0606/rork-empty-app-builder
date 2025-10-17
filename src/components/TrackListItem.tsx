import { Alert, StyleSheet, Text,  TouchableOpacity, View, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import FastImage from 'react-native-fast-image'
import { unknownTrackImageUri } from '@/constants/images'
import { colors, fontSize } from '@/constants/tokens'
import { defaultStyles } from '@/styles'
import { useActiveTrack } from 'react-native-track-player'
import { useAuthStore } from '@/store/authStore'
import { usePaymentStatus } from '@/store/userPaymentStatus'
import * as WebBrowser from 'expo-web-browser';
import { AppConfigCacheService } from '@/services/cache/appConfigCacheService';

import { router } from 'expo-router'
import { IconDotsVertical, IconDownload, IconEdit, IconInfoCircle, IconPlayerPlay, IconTrash, IconArrowDown } from '@tabler/icons-react-native';
import BottomSheet from './BottomSheet'
import BottomSheetOption from './BottomSheetOption'
import { useLibraryStore } from '@/store/library'
import { UnifiedTrack } from '@/helpers/types'
import * as Haptics from 'expo-haptics';

export type TrackListItemProps = {
    track: UnifiedTrack | any // Permitir también tracks de audios.audios
    onTrackSelect: (track: UnifiedTrack | any) => void
    requestSettings?: any
    audioRequest?: any
}


const TrackListItem = ({ track, onTrackSelect: handleTrackSelect, requestSettings, audioRequest }: TrackListItemProps) => {
    // Verificación más robusta del track activo
    
    const activeTrack = useActiveTrack();
    const isActiveTrack = React.useMemo(() => {
        if (!activeTrack || !track) return false;
        
        // Verificar por URL
        if (activeTrack.url && track.url && activeTrack.url === track.url) return true;
        if (activeTrack.url && track.audioUrl && activeTrack.url === track.audioUrl) return true;
        
        // Verificar por audioRequestId como fallback
        if (activeTrack.audioRequestId && track.audioRequestId && activeTrack.audioRequestId === track.audioRequestId) return true;
        
        return false;
    }, [activeTrack, track]);

    const artwork = track.imageUrl ?? track.artwork ?? track.unknownTrackImageUri;

    const { checkMembershipStatus } = useAuthStore();
    const { 
        downloadedTracks, 
        isDownloading, 
        downloadProgress, 
        downloadAudio, 
        deleteDownloadedAudio 
    } = useLibraryStore();

    // Estado de descarga
    const isDownloaded = track.isOffline || (track.audioRequestId ? !!downloadedTracks[track.audioRequestId] : false);
    const isCurrentlyDownloading = track.audioRequestId ? !!isDownloading[track.audioRequestId] : false;
    const currentProgress = track.audioRequestId ? (downloadProgress[track.audioRequestId] || 0) : 0;

    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const {checkRevenueCatSubscription} = useAuthStore();

    const handlePress = async () => {
        if (!track.isProcessing) {
        
            if (!usePaymentStatus.getState().validateHypnosisPlay()) {
                return;
            }
            const isMembershipActive = checkMembershipStatus();

            if (!isMembershipActive) {
                // Usar la misma lógica de suscripción que en HypnosisBottomSheet
                try {
                    const configData = await AppConfigCacheService.getInstance().getConfigs();
                    const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
                    const linkStripe = configData?.redirectStripe?.linkStripe || '';

                    console.log('[TrackListItem] Configuración completa:', JSON.stringify(configData, null, 2));
                    console.log('[TrackListItem] enabledStripe:', enabledStripe);
                    console.log('[TrackListItem] linkStripe:', linkStripe);

                    if (enabledStripe && linkStripe) {
                        console.log('[TrackListItem] Abriendo enlace externo:', linkStripe);
                        await WebBrowser.openBrowserAsync(linkStripe, {
                            controlsColor: colors.primary || '#FF9F40',
                            toolbarColor: 'black',
                            enableBarCollapsing: true,
                            showTitle: true
                        });
                    } else {
                        console.log('[TrackListItem] Redirigiendo a RevenueCat');
                        router.push('/(app)/(modals)/paywallScreenRenewal');
                    }
                } catch (error) {
                    console.error('[TrackListItem] Error al manejar suscripción:', error);
                    router.push('/(app)/(modals)/paywallScreenRenewal');
                }
                return;
            }

            // Crear un track unificado si es necesario
            const unifiedTrack = track.url ? track : {
                ...track,
                url: track.audioUrl,
                onlineUrl: track.audioUrl,
                artwork: track.imageUrl,
                id: track._id || track.audioRequestId,
                title: track.customData?.name || track.title,
                description: track.description || '',
                status: 'ready' as const,
                isOffline: isDownloaded,
                isProcessing: false,
                rawAudioData: track
            };

            handleTrackSelect(unifiedTrack);
        }
    };

    const handleOptionsPress = () => {
        console.log('[TrackListItem] handleOptionsPress',);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setIsMenuVisible(true);
    };

    const handleCloseMenu = (callback?: () => void) => {
        setIsMenuVisible(false);
        if (callback) setTimeout(callback, 200);
    };

    const handleRename = () => {
        handleCloseMenu(() => {
            router.push({
                pathname: "/(app)/(modals)/hypnosisDataForm",
                params: { 
                    audioRequestId: track.audioRequestId || ''
                }
            });
        });
    };
    
    const handleQuestions = async () => {
        if (!usePaymentStatus.getState().validateHypnosisPlay()) {
            return;
        }
        const isMembershipActive = checkMembershipStatus();

        if (!isMembershipActive) {
            // Usar la misma lógica de suscripción que en HypnosisBottomSheet
            try {
                const configData = await AppConfigCacheService.getInstance().getConfigs();
                const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
                const linkStripe = configData?.redirectStripe?.linkStripe || '';

                console.log('[TrackListItem] Configuración completa:', JSON.stringify(configData, null, 2));
                console.log('[TrackListItem] enabledStripe:', enabledStripe);
                console.log('[TrackListItem] linkStripe:', linkStripe);

                if (enabledStripe && linkStripe) {
                    console.log('[TrackListItem] Abriendo enlace externo:', linkStripe);
                    await WebBrowser.openBrowserAsync(linkStripe, {
                        controlsColor: colors.primary || '#FF9F40',
                        toolbarColor: 'black',
                        enableBarCollapsing: true,
                        showTitle: true
                    });
                } else {
                    console.log('[TrackListItem] Redirigiendo a RevenueCat');
                    router.push('/(app)/(modals)/paywallScreenRenewal');
                }
            } catch (error) {
                console.error('[TrackListItem] Error al manejar suscripción:', error);
                router.push('/(app)/(modals)/paywallScreenRenewal');
            }
            return;
        }
        
        handleCloseMenu(() => {
            router.push({
                pathname: '/(app)/(modals)/RequestInfoPage',
                params: { 
                    trackUrl: track.url,
                    trackTitle: track?.customData?.name || track.title,
                    trackDate: track.publicationDate || '',
                    trackRequestId: track.audioRequestId
                }
            });
        });
    }

    const handlePlay = async () => {
        if (!usePaymentStatus.getState().validateHypnosisPlay()) {
            return;
        }
        const isMembershipActive = checkMembershipStatus();

        if (!isMembershipActive) {
            // Usar la misma lógica de suscripción que en HypnosisBottomSheet
            try {
                const configData = await AppConfigCacheService.getInstance().getConfigs();
                const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
                const linkStripe = configData?.redirectStripe?.linkStripe || '';

                console.log('[TrackListItem] Configuración completa:', JSON.stringify(configData, null, 2));
                console.log('[TrackListItem] enabledStripe:', enabledStripe);
                console.log('[TrackListItem] linkStripe:', linkStripe);

                if (enabledStripe && linkStripe) {
                    console.log('[TrackListItem] Abriendo enlace externo:', linkStripe);
                    await WebBrowser.openBrowserAsync(linkStripe, {
                        controlsColor: colors.primary || '#FF9F40',
                        toolbarColor: 'black',
                        enableBarCollapsing: true,
                        showTitle: true
                    });
                } else {
                    console.log('[TrackListItem] Redirigiendo a RevenueCat');
                    router.push('/(app)/(modals)/paywallScreenRenewal');
                }
            } catch (error) {
                console.error('[TrackListItem] Error al manejar suscripción:', error);
                router.push('/(app)/(modals)/paywallScreenRenewal');
            }
            return;
        }
        handleCloseMenu(() => {
            handleTrackSelect(track)
        })
    }

    const handleDownload = async () => {
        const isMembershipActive = checkMembershipStatus();

        // Validar suscripción antes de permitir descarga
        if (!usePaymentStatus.getState().validateDownload()) {
            return;
        }

        if (isCurrentlyDownloading) {
            return; // No hacer nada si ya está descargando
        }
        
        if (isDownloaded) {
            // Mostrar alerta de confirmación para borrar
            Alert.alert(
                "Eliminar descarga",
                "¿Estás seguro que deseas eliminar esta hipnosis de tus descargas?",
                [
                    {
                        text: "Cancelar",
                        style: "cancel"
                    },
                    {
                        text: "Eliminar",
                        onPress: () => track.audioRequestId && deleteDownloadedAudio(track.audioRequestId),
                        style: "destructive"
                    }
                ]
            );
        } else {
            if (!isMembershipActive) {
                // Usar la misma lógica de suscripción que en HypnosisBottomSheet
                try {
                    const configData = await AppConfigCacheService.getInstance().getConfigs();
                    console.log('[TrackListItem] 🔍 DEBUG - Configuración completa:', JSON.stringify(configData, null, 2));
                    
                    // Verificar diferentes posibles estructuras
                    const enabledStripe = configData?.redirectStripe?.enabledStripe || 
                                       configData?.enabledStripe || 
                                       configData?.appSettings?.redirectStripe?.enabledStripe || 
                                       false;
                    const linkStripe = configData?.redirectStripe?.linkStripe || 
                                     configData?.linkStripe || 
                                     configData?.appSettings?.redirectStripe?.linkStripe || 
                                     '';

                    console.log('[TrackListItem] 🔍 DEBUG - enabledStripe:', enabledStripe);
                    console.log('[TrackListItem] 🔍 DEBUG - linkStripe:', linkStripe);
                    console.log('[TrackListItem] 🔍 DEBUG - redirectStripe object:', configData?.redirectStripe);
                    console.log('[TrackListItem] 🔍 DEBUG - appSettings.redirectStripe:', configData?.appSettings?.redirectStripe);

                    if (enabledStripe && linkStripe) {
                        console.log('[TrackListItem] ✅ Abriendo enlace externo:', linkStripe);
                        await WebBrowser.openBrowserAsync(linkStripe, {
                            controlsColor: colors.primary || '#FF9F40',
                            toolbarColor: 'black',
                            enableBarCollapsing: true,
                            showTitle: true
                        });
                    } else {
                        console.log('[TrackListItem] ❌ Redirigiendo a RevenueCat - enabledStripe:', enabledStripe, 'linkStripe:', linkStripe);
                        router.push('/(app)/(modals)/paywallScreenRenewal');
                    }
                } catch (error) {
                    console.error('[TrackListItem] Error al manejar suscripción:', error);
                    router.push('/(app)/(modals)/paywallScreenRenewal');
                }
                return;
            }
            // Iniciar descarga
            if (track.audioRequestId && (track.onlineUrl || track.url)) {
                downloadAudio(track);
            }
        }
    };

    // Renderizar contenido según tipo de track (normal o procesando)
    const renderTrackContent = () => {
        if (track.isProcessing) {
            return (
                <View style={{ width: '57%' }}>
                    <Text maxFontSizeMultiplier={1.1}  
                        numberOfLines={1}
                        style={{
                            ...styles.trackTitleText,
                            color: colors.text
                        }}
                    >
                        {track.title}
                    </Text>
                    
                    {/* <View style={styles.progressBarContainer}>
                        <View 
                            style={[
                                styles.progressBar, 
                                { width: `${Math.round((track.progress || 0) * 100)}%` }
                            ]} 
                        />
                    </View> */}
                    
                    <Text maxFontSizeMultiplier={1.1}  style={styles.processingText}>
                        {/* {track.progress 
                            ? `Progreso: ${Math.round((track.progress || 0) * 100)}%` 
                            : 'Generando hipnosis...'} */}
                        En proceso...
                    </Text>
                </View>
            );
        }

        // Track normal
        return (
            <View style={{ width: '57%' }}>
                {isCurrentlyDownloading && !track.isProcessing && (
                    <Text maxFontSizeMultiplier={1.1}  style={styles.downloadingText}>
                        Descargando... {Math.round(currentProgress * 100)}%
                    </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text maxFontSizeMultiplier={1.1}  
                        numberOfLines={1}
                        style={{
                            ...styles.trackTitleText,
                            color: isActiveTrack ? colors.primary : colors.text
                        }}
                    >
                        {track.customData?.name || track.title}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5}}>
                    {isDownloaded && (
                        <View style={{ backgroundColor: '#F2741B', borderRadius: 999,height: 12, width: 12, justifyContent: 'center', alignItems: 'center'}}>
                            <IconArrowDown size={10} color="white" strokeWidth={2} />
                        </View>
                    )}
                    <Text maxFontSizeMultiplier={1.1}  
                        numberOfLines={1}
                        style={{
                            ...styles.subtitleText,
                            color: isActiveTrack ? colors.primary : colors.tertiary
                        }}
                    >
                        {track.formattedDuration ? `Duración ${track.formattedDuration}` : ''}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View>
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.trackItemContainer,
                    { backgroundColor: track.isProcessing ? '#FF9F40B2' : colors.secondary }
                ]}>
                    <View>
                        {track.isProcessing && (
                            <View style={{
                                borderTopStartRadius: 18,
                                borderBottomStartRadius: 18,
                                width: 90,
                                height: 90,
                                backgroundColor: colors.secondary,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                            </View>
                        )}

                        {!track.isProcessing && (
                            <FastImage
                                source={{
                                    uri: artwork ?? unknownTrackImageUri,
                                    priority: FastImage.priority.normal
                                }}
                                style={{
                                    ...styles.trackArtworkImage,
                                    opacity: isActiveTrack ? 0.6 : 1
                                }}
                            />
                        )}
                    </View>

                    {renderTrackContent()}

                    {!track.isProcessing && (
                        <View style={{
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'absolute',
                            right: 0,
                            // backgroundColor: 'red'
                        }}>
                            <TouchableOpacity
                                onPress={handleOptionsPress}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={styles.optionsButton}
                            >
                                <IconDotsVertical size={25} color={colors.text} strokeWidth={1} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
            <BottomSheet 
                isVisible={isMenuVisible}
                onClose={handleCloseMenu}
                title={track.customName || track.title}
            >
                <BottomSheetOption
                    icon={<IconPlayerPlay color={colors.text} strokeWidth={1} size={25} />}
                    label="Reproducir"
                    onPress={handlePlay}
                />
                <BottomSheetOption
                    icon={
                        isDownloaded 
                            ? <IconTrash color={colors.text} strokeWidth={1} size={25} />
                            : isCurrentlyDownloading
                                ? <ActivityIndicator size="small" color={colors.text} />
                                : <IconDownload color={colors.text} strokeWidth={1} size={25} />
                    }
                    label={
                        isDownloaded 
                            ? "Eliminar de mis descargas" 
                            : isCurrentlyDownloading
                                ? `Descargando... ${Math.round(currentProgress * 100)}%`
                                : "Descargar hipnosis"
                    }
                    onPress={handleDownload}
                />
                <BottomSheetOption
                    icon={<IconInfoCircle color={colors.text} strokeWidth={1} size={25} />}
                    label="Preguntas y respuestas"
                    onPress={handleQuestions}
                />
                <BottomSheetOption
                    icon={<IconEdit color={colors.text} strokeWidth={1} size={25} />}
                    label="Cambiar nombre"
                    onPress={!isActiveTrack ? handleRename : ()=>{}}
                    disabled={isActiveTrack}
                    subText={isActiveTrack ? 'No puedes cambiar el nombre de la hipnosis que estás escuchando.' : ''}
                    showBottomBorder={false}
                />

            </BottomSheet>
        </View>
    )
}

export default TrackListItem

const styles = StyleSheet.create({
    trackItemContainer: {
        flexDirection: 'row',
        columnGap: 12,
        alignItems: 'center',
        paddingRight: 1,
        backgroundColor: colors.secondary,
        borderRadius: 18,
        // borderWidth: 1,
        // borderColor: colors.secondary,
        height: 90,
        marginTop: 10
    },
    trackPlayingIconIndicator: {
        position: 'absolute',
        top: 18,
        left: 16,
        width: 16,
        height: 16,
    },
    trackPausedIndicator: {
        position: 'absolute',
        top: 14,
        left: 14,
    },
    trackArtworkImage: {
        borderTopStartRadius: 18,
        borderBottomStartRadius: 18,
        width: 90,
        height: 90,
    },
    trackTitleText: {
        ...defaultStyles.text,
        fontFamily: 'Geist-SemiBold',
        fontSize: fontSize.sm,
        letterSpacing: -0.5,
        // fontWeight: '600',
        // maxWidth: '100%',

    },
    subtitleText: {
        ...defaultStyles.text,
        fontFamily: 'Inter-Regular',
        fontSize: fontSize.xs,
        letterSpacing: -0.5,
        // fontWeight: '600',
        maxWidth: '90%',

    },
    trackArtistText: {
        ...defaultStyles.text,
        color: colors.textMuted,
        fontSize: 14,
        marginTop: 4,
    },
    optionsButton: {
        padding: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
      },
      backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      bottomSheet: {
        backgroundColor: '#1E1E1E', // Color oscuro similar al de la imagen
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: 320,
        paddingBottom: 30, // Para dispositivos con home indicator
      },
      bottomSheetContent: {
        padding: 15,
      },
      bottomSheetTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 20,
        fontFamily: 'Geist-SemiBold',
        letterSpacing: -0.5,

      },
      menuOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      },
      optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      iconContainer: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
      },
      menuOptionText: {
        flex: 1,
        color: colors.text,
        fontSize: fontSize.base,
        marginLeft: 8,
        fontFamily: 'Geist-SemiBold',
        letterSpacing: -0.5,

      },
      downloadTextContainer: {
        flex: 1,
        marginLeft: 8,
      },
      subText: {
        color: colors.textMuted,
        fontSize: fontSize.xs,
        marginTop: 4,
      },
      dragIndicator: {
        width: 80,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    downloadedIndicator: {
        position: 'absolute',
        bottom: 15,
        right: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 10,
        padding: 4,
    },
    
    offlineAvailableText: {
        color: '#F97316', // Color naranjo como en la imagen
        fontSize: fontSize.xs,
        fontFamily: 'Inter-Regular',
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    downloadingText: {
        color: colors.primary,
        fontSize: fontSize.xs,
        fontFamily: 'Inter-Regular',
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    progressBarContainer: {
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 5,
        marginTop: 5,
        marginBottom: 5,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 5,
    },
    processingText: {
        color: colors.text,
        fontSize: fontSize.xs,
        fontFamily: 'Inter-Regular',
        letterSpacing: -0.5,
    },
})