import React, { useCallback, useEffect, useRef, useState } from "react"
import CustomButton from "@/components/CustomButton"
import { colors, fontSize, screenPadding } from "@/constants/tokens"
import { defaultStyles } from "@/styles"
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Animated, AppState, useWindowDimensions } from "react-native"
import {  useLibraryStore } from "@/store/library"
import { usePlayerStore } from "@/store/playerStore"
import { usePlayer } from "@/providers/PlayerProvider"
import { router, useFocusEffect } from "expo-router"
import { useAuthStore, useRequestHipnosisStore } from "@/store/authStore"
import { debounce } from 'lodash'
import { generateTracksListId } from "@/helpers/miscellaneous"
import { useNetworkStore } from "@/store/networkStore"
import TrackPlayer from "react-native-track-player"
import CircularCarousel from "@/components/CircularCarousel"
import { useNewLibraryStore } from "@/store/newLibrary"
import TrackList2 from "@/components/TrackList2"
import { createLevelDataMap } from "@/helpers/levelDataHelper";
import { UnifiedTrack } from "@/helpers/types";
import { useOnboardingStore } from '@/store/onBoardingStore';
import { ErrorScreen } from '@/components/ErrorScreen';
import CountdownButton from "@/components/CountdownButton"
import { useSubscriptionLogic } from '@/hooks/useSubscriptionLogic'
import * as Haptics from 'expo-haptics';
import { CircularCarouselSkeleton } from "@/components/CircularCarouselSkeleton"

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Constante para asegurar alineación consistente entre título y subtítulo
// Usa porcentajes del ancho de pantalla para máxima compatibilidad entre dispositivos
const HEADER_MARGIN_LEFT = Platform.OS === 'ios' ? SCREEN_WIDTH * 0.11 : SCREEN_WIDTH * 0.09;

const AudioScreen = () => {
  const { userId, userData, fetchUserData, isMembershipActive, isProfileComplete } = useAuthStore()
  const { isConnected } = useNetworkStore();
  const { checkMembershipStatus, getRemainingDays } = useAuthStore();
  const { handleSubscription } = useSubscriptionLogic();
  const [selectedTab, setSelectedTab] = useState('nuevas');
  
  const { requestHipnosis, hasShownRequestHipnosisThisSession, setRequestHipnosis, setHasShownRequestHipnosisThisSession } = useRequestHipnosisStore();
  const { requestSettings, audios, levelAudios, fetchUserAudios, audioRequests, downloadedLevelAudios, loadDownloadedLevelAudios } = useNewLibraryStore()
  const isFloatingPlayerVisible = usePlayerStore((state) => state.isFloatingPlayerVisible)
  const { current: auraCurrentTrack, isPlaying: auraIsPlaying } = usePlayer()
  const { downloadedTracks, loadDownloadedAudios } = useLibraryStore()

  const [localError, setLocalError] = useState('')
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false)
  const [isLibraryBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [dataRefreshKey, setDataRefreshKey] = useState(0); // Para forzar actualización del levelDataMap
  const { height: windowHeight } = useWindowDimensions()
  
  const carouselHeight = React.useMemo(() => {
    if (windowHeight >= 900) return  auraCurrentTrack ? -5 : 10 // -10 para que se pueda ver el video de explicación
    if (windowHeight >= 800) return 0
    return 0 
  }, [windowHeight, isFloatingPlayerVisible])

  const carouselOnlyLevelHeight = React.useMemo(() => {
    if (windowHeight >= 900) return  auraCurrentTrack ? 30 : 60
    if (windowHeight >= 800) return 20
    return 40
  }, [windowHeight, isFloatingPlayerVisible])

  // Get the onboarding audio request error state and setter
  const { showOnboardingAudioRequestError, setShowOnboardingAudioRequestError } = useOnboardingStore();

  // Crear el mapa de datos de niveles - mover a nivel superior
  const levelDataMap = React.useMemo(() => {
    return createLevelDataMap(requestSettings || [], audioRequests || [], levelAudios || []);
  }, [requestSettings, audioRequests, levelAudios, dataRefreshKey]);

  // Filtrar audios y requestSettings según conexión y descargas - mover a nivel superior
  const filteredAudios = React.useMemo(() => {
    if (!audios || !Array.isArray(audios)) return [];

    // Transformar audios a formato UnifiedTrack
    const transformedAudios: UnifiedTrack[] = audios.map((audio: any) => {
      const isDownloaded = audio.audioRequestId && downloadedTracks[audio.audioRequestId];

      return {
        id: audio._id || audio.audioRequestId,
        audioRequestId: audio.audioRequestId,
        url: isDownloaded ? downloadedTracks[audio.audioRequestId].path : audio.audioUrl,
        onlineUrl: audio.audioUrl,
        offlineUrl: isDownloaded ? downloadedTracks[audio.audioRequestId].path : undefined,
        artwork: audio.imageUrl,
        title: audio.customData?.name || audio.title,
        description: audio.description || '',
        formattedDuration: audio.formattedDuration,
        status: 'ready' as const,
        isOffline: !!isDownloaded,
        isProcessing: false,
        rawAudioData: audio,
        // Propiedades adicionales para compatibilidad
        rating: 0,
        playlists: [],
        // Propiedades específicas de los audios
        customData: audio.customData,
        publicationDate: audio.publicationDate,
        voice: audio.voice,
        imageUrl: audio.imageUrl
      } as UnifiedTrack;
    });

    if (isConnected) {
      return transformedAudios; // Mostrar todos si hay conexión
    }

    // Sin conexión: mostrar solo audios descargados
    return transformedAudios.filter((audio: UnifiedTrack) => {
      return audio.audioRequestId && downloadedTracks[audio.audioRequestId]
    }
    );
  }, [audios, isConnected, downloadedTracks]);

  const filteredRequestSettings = React.useMemo(() => {
    if (!requestSettings || !Array.isArray(requestSettings)) return [];

    if (isConnected) {
      return requestSettings; // Mostrar todos si hay conexión
    }

    // Sin conexión: mostrar solo niveles con audio descargado
    return requestSettings.filter((setting: any) => {
      const levelData = levelDataMap[setting.userLevel];
      return levelData &&
        levelData.levelAudios &&
        levelData.levelAudios.audioRequestId &&
        downloadedLevelAudios[levelData.levelAudios.audioRequestId];
    });
  }, [requestSettings, isConnected, downloadedLevelAudios, levelDataMap]);

  // Sort requestSettings by userLevel - mover a nivel superior
  const sortedRequestSettings = React.useMemo(() => {
    if (!filteredRequestSettings || !Array.isArray(filteredRequestSettings)) return [];
    return [...filteredRequestSettings].sort((a, b) => b.userLevel - a.userLevel);
  }, [filteredRequestSettings]);

  // Create the level data map using the filtered and sorted data - mover a nivel superior
  const filteredLevelDataMap = React.useMemo(() => {
    if (!sortedRequestSettings || !Array.isArray(sortedRequestSettings)) return {};
    if (!audioRequests || !Array.isArray(audioRequests)) return {};
    if (!levelAudios || !Array.isArray(levelAudios)) return {};
    return createLevelDataMap(sortedRequestSettings, audioRequests, levelAudios);
  }, [sortedRequestSettings, audioRequests, levelAudios, dataRefreshKey]);

  // Verificar contenido descargado
  const hasDownloadedAudios = filteredAudios.length > 0;
  const hasDownloadedLevelAudios = sortedRequestSettings.length > 0;

  // Determinar qué tabs mostrar según el contenido descargado y conexión
  const shouldShowAnterioresTab = isConnected
    ? audios.length > 0
    : hasDownloadedAudios;
  const shouldShowNuevasTab = isConnected || hasDownloadedLevelAudios;

  // Lógica para mover tabs hacia abajo cuando no hay conexión
  const shouldMoveTabsDown = !isConnected;

  // Cambiar automáticamente de tab si el actual no tiene contenido en modo offline
  React.useEffect(() => {
    if (!isConnected) {
      if (selectedTab === 'anteriores' && !hasDownloadedAudios && hasDownloadedLevelAudios) {
        // Cambiar a 'nuevas' y animar el indicador
        const targetValue = 1; // 1 para 'nuevas'
        
        // Animación del indicador
        Animated.timing(tabIndicatorPosition, {
          toValue: targetValue,
          useNativeDriver: false,
          duration: 200,
        }).start();

        // Animación suave del texto
        Animated.sequence([
          Animated.timing(tabTextOpacity, {
            toValue: 0.6,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(tabTextOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start();

        setSelectedTab('nuevas');
      } else if (selectedTab === 'nuevas' && !hasDownloadedLevelAudios && hasDownloadedAudios) {
        // Cambiar a 'anteriores' y animar el indicador
        const targetValue = 0; // 0 para 'anteriores'
        
        // Animación del indicador
        Animated.timing(tabIndicatorPosition, {
          toValue: targetValue,
          useNativeDriver: false,
          duration: 200,
        }).start();

        // Animación suave del texto
        Animated.sequence([
          Animated.timing(tabTextOpacity, {
            toValue: 0.6,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(tabTextOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          })
        ]).start();

        setSelectedTab('anteriores');
      }
    }
  }, [isConnected, hasDownloadedAudios, hasDownloadedLevelAudios, selectedTab]);

  // Manejadores para las acciones del carrusel
  const handleCardPress = (item: any) => {
    // Aquí implementaremos la lógica para mostrar el bottomSheet
    //console.log('Card pressed:', item);
  };

  const getNextFormDaysRemaining = () => {
    if (userData.features?.nextAvailableForm?.value) {
      const availableDate = new Date(userData.features.nextAvailableForm.value);
      const today = new Date();
      const diffTime = availableDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return 15; // Fallback if date is not available
  };

  const getNextAvailableFormEnabled = (): boolean => {
    if (userData.features?.nextAvailableForm?.enabled) {
      return userData.features.nextAvailableForm.enabled;
    }
    return false;
  }

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setHasInitiallyLoaded(false);
    } else {
      setIsBackgroundLoading(true);
    }
    
    try {
      setLocalError('');
      
      // Siempre intentar cargar datos (fetchUserAudios maneja la lógica offline internamente)
      if (userId) {
        await fetchUserAudios(userId);
        
        if (isConnected) {
          await fetchUserData();
        }
      }
      
      // Siempre cargar contenido descargado
      await Promise.all([
        loadDownloadedAudios(),
        loadDownloadedLevelAudios()
      ]);
      
      setHasInitiallyLoaded(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLocalError('No pudimos cargar tus audios. Por favor, intenta de nuevo.');
    } finally {
      setHasInitiallyLoaded(true);
      setIsBackgroundLoading(false);
    }
  }, [userId, fetchUserData, isConnected, fetchUserAudios, loadDownloadedAudios, loadDownloadedLevelAudios]);

  const debouncedFetch = useCallback(
    debounce((showLoading: boolean) => {
      fetchData(showLoading);
    }, 300),
    [fetchData]
  );

  //Animación para el tab indicator
  const tabIndicatorPosition = useRef(new Animated.Value(1)).current; // 0 para 'anteriores', 1 para 'nuevas'
  const tabTextOpacity = useRef(new Animated.Value(1)).current; // Para animar el texto
  const tabWidth = 100; // Ancho aproximado de cada tab

  // Función para animar el cambio de tab
  const animateTabChange = async (newTab: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const targetValue = newTab === 'anteriores' ? 0 : 1;

    // Animación del indicador con spring
    Animated.timing(tabIndicatorPosition, {
      toValue: targetValue,
      useNativeDriver: false,
      duration: 200,
    }).start();

    // Animación suave del texto
    Animated.sequence([
      Animated.timing(tabTextOpacity, {
        toValue: 0.6,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(tabTextOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();

    setSelectedTab(newTab);
  };


  useFocusEffect(
    useCallback(() => {
      const checkAndSync = async () => {
        try {
          if (audios.length === 0) {
            debouncedFetch(true); // Mostrar loading solo en carga inicial
          } else {
            debouncedFetch(false); // Carga silenciosa en background
            await new Promise(resolve => setTimeout(resolve, 200));
            // Verificar si hay un track reproduciéndose y mostrar FloatingPlayer si es necesario
            const currentTrack = await TrackPlayer.getCurrentTrack();
            if (currentTrack !== null) {
              useLibraryStore.getState().syncPlayerQueue();

              const playbackState = await TrackPlayer.getPlaybackState();
              const isPlaying = playbackState.state === 'playing' || playbackState.state === 'buffering';

              console.log('[AudioScreen] Track actual:', currentTrack, 'Estado:', playbackState.state);

              const playerStore = usePlayerStore.getState();
              if (isPlaying && !playerStore.isFloatingPlayerVisible) {
                console.log('[AudioScreen] Mostrando FloatingPlayer - hay audio reproduciéndose');
                playerStore.setIsFloatingPlayerVisible(true);
              } else if (!isPlaying && playerStore.isFloatingPlayerVisible) {
                console.log('[AudioScreen] Ocultando FloatingPlayer - no hay audio reproduciéndose');
                playerStore.setIsFloatingPlayerVisible(false);
              }
            } else {
              const playerStore = usePlayerStore.getState();
              if (playerStore.isFloatingPlayerVisible) {
                console.log('[AudioScreen] Ocultando FloatingPlayer - no hay track actual');
                playerStore.setIsFloatingPlayerVisible(false);
              }
            }
          }
        } catch (error) {
          console.error('Error checking current track:', error);
        }
      };

      checkAndSync();

      return () => {
        debouncedFetch.cancel();
        // IMPORTANTE: Limpiar el FloatingPlayer cuando salimos de la sección de hipnosis
        const playerStore = usePlayerStore.getState();
        if (playerStore.isFloatingPlayerVisible) {
          console.log('[AudioScreen] Limpiando FloatingPlayer al salir de hipnosis');
          playerStore.setIsFloatingPlayerVisible(false);
        }
      };
    }, [debouncedFetch, audios.length])
  );

  const handleOpenWizard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (userData.test === 'true') {
      router.push('/(app)/(modals)/paywallScreenRenewal');
      return
    }

    if (!isMembershipActive) {
      router.push('/(app)/(modals)/paywallScreenRenewal');
    } else {
      if (!isProfileComplete) {
        router.push({
          pathname: '/(app)/(modals)/forms/userPersonalDataFormInitial'
        })
      } else {
        router.push({
          pathname: '/(app)/(modals)/forms/questionsForm'
        })
      }
    }
  }

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    handleSubscription();
  }

  // Actualizar los datos de membresía incluso cuando no hay conexión
  useEffect(() => {
    // Si no hay datos de usuario pero estamos sin conexión, verificar la membresía
    if (!isConnected && (!userData || !userData.lastMembership)) {
      checkMembershipStatus();
      getRemainingDays();
    }
  }, [isConnected, userData, checkMembershipStatus, getRemainingDays]);

  useEffect(() => {
    if (!hasInitiallyLoaded) return;
    if (hasShownRequestHipnosisThisSession) return; // No mostrar si ya se mostró en esta sesión
    if (!isConnected) return; // No mostrar si no está conectado
    
    const daysRemaining = getNextFormDaysRemaining();
    
    if (daysRemaining === 0 && !requestHipnosis && isMembershipActive && getNextAvailableFormEnabled()) {
      setRequestHipnosis(true);
      setHasShownRequestHipnosisThisSession(true); // Marcar como mostrado en esta sesión
      setTimeout(() => {
        router.push('/(app)/(modals)/requestHipnosis');
      }, 1000);
    }
  }, [getNextFormDaysRemaining(), requestHipnosis, hasInitiallyLoaded, hasShownRequestHipnosisThisSession, getNextAvailableFormEnabled , isConnected]);

  // AppState listener para detectar cuando la app vuelve de estar minimizada
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && hasInitiallyLoaded) {
        // La app ha vuelto al estado activo, recargar datos
        console.log('App volvió del estado minimizado, recargando datos...');
        await fetchData(false); // false para no mostrar loading

        // Forzar actualización del levelDataMap después de recargar datos
        setDataRefreshKey(prev => prev + 1);
        console.log('LevelDataMap actualizado después de volver del estado minimizado');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [hasInitiallyLoaded, fetchData]);

  // Add a handler function to close the error screen
  const handleCloseOnboardingError = () => {
    setShowOnboardingAudioRequestError(false);
  };


  const renderContent = () => {
    if (!hasInitiallyLoaded) {
      return (
             <View style={styles.emptyContainer}>
              <CircularCarouselSkeleton />
              </View>
         )
      }


    if (localError) {
      return (
        <View style={styles.errorContainer}>
          <Text maxFontSizeMultiplier={1.1} style={styles.title}>{localError}</Text>
        </View>
      )
    }

    // Regla 1: Si no hay conexión y no hay contenido descargado de ningún tipo, mostrar mensaje
    if (!isConnected && !hasDownloadedAudios && !hasDownloadedLevelAudios) {
      return <NoOfflineContentMessage />;
    }
    
    if (sortedRequestSettings.length === 0 && !hasDownloadedAudios && !hasDownloadedLevelAudios) {
      return <FistRequestMessage />;
    }

    // Si no hay conexión y solo hay levelAudios descargados, forzar tab 'nuevas'
    if (!isConnected && !hasDownloadedAudios && hasDownloadedLevelAudios) {
      return (
        <View style={{}}>
          {/* <Text maxFontSizeMultiplier={1.1}  style={[styles.title, { textAlign: 'left' }]}>
            Hipnosis descargadas
          </Text> */}

          <View style={styles.carouselContainer}>
           </View>
          <View style={[styles.carouselContainer, { 
            height: SCREEN_HEIGHT * 0.70, 
            marginTop: shouldShowAnterioresTab ? carouselHeight : carouselOnlyLevelHeight // Mismo posicionamiento que con conexión
          }]}>
            <CircularCarousel
              id={generateTracksListId('hipnosis', Math.random().toString())}
              data={sortedRequestSettings}
              audioRequests={audioRequests || []}
              levelAudios={levelAudios || []}
              onCardPressProp={handleCardPress}
              levelDataMap={filteredLevelDataMap}
            />
          </View>
        </View>
      );
    }

    // Mostrar contenido normal con tabs (conexión o ambos tipos de contenido descargado)
    return (
      <View style={{ flex: 1}}>

        <View style={{ paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos }}>

          {/* Solo mostrar tabs si hay contenido para mostrar */}
          {(shouldShowAnterioresTab && shouldShowNuevasTab) && (
            <View style={[
              styles.tabContainer,
              shouldMoveTabsDown && styles.tabContainerMovedDown
            ]}>

              <Animated.View
                style={[
                  selectedTab === 'anteriores' ? styles.animatedTabIndicator : styles.animatedTabIndicatorAnteriores,
                  {
                    transform: [{
                      translateX: tabIndicatorPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, tabWidth],
                      })
                    }]
                  }
                ]}
              />

              {shouldShowAnterioresTab && (
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => animateTabChange('anteriores')}
                >
                  <Animated.Text maxFontSizeMultiplier={1} style={[
                    styles.tabText,
                    selectedTab === 'anteriores' && styles.activeTabText,
                    { opacity: tabTextOpacity }
                  ]}>Anteriores</Animated.Text>

                </TouchableOpacity>
              )}

              {shouldShowNuevasTab && (
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => animateTabChange('nuevas')}
                >
                  <Animated.Text maxFontSizeMultiplier={1} style={[
                    styles.tabText,
                    selectedTab === 'nuevas' && styles.activeTabText,
                    { opacity: tabTextOpacity }
                  ]}>Nuevas</Animated.Text>

                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Contenido según la pestaña seleccionada */}
        {selectedTab === 'anteriores' && shouldShowAnterioresTab ? (
          <View style={{ 
            paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos, 
            flex: 1,
            marginTop: !isConnected && !(shouldShowAnterioresTab && shouldShowNuevasTab) ? 40 : 0
          }}>
            <TrackList2
              id={generateTracksListId('hipnosis', Math.random().toString())}
              tracks={filteredAudios}
              playableTracks={[]}
              style={{ flex: 1 }}
              downloadedTracks={downloadedTracks}
              requestSettings={requestSettings || []}
              audioRequest={audioRequests || []}
            />
          </View>
        ) : (
          shouldShowNuevasTab && (
            sortedRequestSettings.length > 0 ? (
              <View style={[styles.carouselContainer, { 
                height: SCREEN_HEIGHT * 0.70, 
                marginTop: shouldShowAnterioresTab ? carouselHeight : carouselOnlyLevelHeight // Mismo posicionamiento que con conexión
              }]}>
                <CircularCarousel
                  id={generateTracksListId('hipnosis', Math.random().toString())}
                  data={sortedRequestSettings}
                  audioRequests={audioRequests || []}
                  levelAudios={levelAudios || []}
                  onCardPressProp={handleCardPress}
                  levelDataMap={filteredLevelDataMap}
                />
              </View>
            ) : (
              <FistRequestMessage />
            )
          )
        )}
      </View>
    )
  }

  return (
    <>
      {/* Show the error screen when the flag is set */}
      {showOnboardingAudioRequestError ? (
        <ErrorScreen
          onClose={handleCloseOnboardingError}
          errorTitle="Es broma, algo falló en el sistema. Intenta de nuevo."
          errorMessage="Sí, ya sé… tienes que escribir todo otra vez. Pero si pasó, es por algo. Confía."
          buttonTitle='Volver al mundo'
        />
      ) : (
        <View style={[
          defaultStyles.container,
          {
            backgroundColor: colors.screenBackground,
            paddingBottom: (() => {
              const auraSpace = auraCurrentTrack ? (Platform.OS === 'android'? 80:55) : 0; // Solo verificar si hay track, no si está reproduciendo
              return Math.max(auraSpace);
            })()
          }
        ]}>
          { (<View style={styles.contentContainer}>
            <View style={styles.trackListContainer}>

              {renderContent()}

              {
                (selectedTab === 'nuevas'
                  && isMembershipActive
                  && !userData.features
                  && isConnected
                  && userData.userLevel == 1
                ) && (<View style={{
                  width: '100%',
                  position: 'absolute',
                  bottom: 0,
                  zIndex: 999,
                  backgroundColor: 'transparent',
                  paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
                }}>
                  <View style={styles.buttonContainer}>
                    <CustomButton
                      containerStyles={{ backgroundColor: '#FE892E', minHeight: 50 }}
                      textStyles={{ color: 'white' }}
                      title="Pedir mi nueva hipnosis"
                      handlePress={handleOpenWizard}
                    />
                  </View>
                </View>)
              }
              {(() => {
                const shouldShowButton = selectedTab === 'nuevas'
                  && isMembershipActive
                  && userData.features
                  && userData.features.nextAvailableForm
                  && (new Date().toISOString() >= userData.features.nextAvailableForm.value
                    && isConnected
                    && getNextAvailableFormEnabled());
                return shouldShowButton;
              })() &&
                <View style={{
                  width: '100%',
                  position: 'absolute',
                  bottom: 0,
                  zIndex: 10000,
                  backgroundColor: 'transparent',
                  paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
                }}>
                  <View style={styles.buttonContainer}>
                    <CustomButton
                      containerStyles={{ backgroundColor: '#FE892E', minHeight: 50 }}
                      textStyles={{ color: 'white' }}
                      title="Pedir mi nueva hipnosis"
                      handlePress={handleOpenWizard}
                    />
                  </View>
                </View>}


              {(selectedTab === 'nuevas' && isMembershipActive && userData.features && userData.features.nextAvailableForm && (new Date().toISOString() < userData.features.nextAvailableForm.value && isConnected)) &&
                <View style={{
                  width: '100%',
                  position: 'absolute',
                  bottom: 0,
                  zIndex: 10000,
                  backgroundColor: 'transparent',
                  paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
                }}>
                  <View style={styles.buttonContainer}>
                    <CountdownButton
                      daysRemaining={getNextFormDaysRemaining()}
                      expirationDate={userData.features.nextAvailableForm.value}
                      handlePress={() => { }}
                    />
                  </View>
                </View>}

              {
                (!isMembershipActive && isConnected) && (
                  <View style={{
                    width: '100%',
                    position: 'absolute',
                    bottom: 0,
                     zIndex: 10000,
                    backgroundColor: 'transparent',
                    paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
                  }}>
                    <View style={styles.buttonContainer}>
                      <CustomButton
                        containerStyles={{ backgroundColor: '#FE892E', minHeight: 50 }}
                        textStyles={{ color: 'white' }}
                        title="Suscribirme"
                        handlePress={handleSubscribe}
                      />
                    </View>
                  </View>
                )
              }
            </View>
          </View>) }

        </View>
      )}


    </>
  )
}

// Componente separado para el mensaje de sin contenido offline
const NoOfflineContentMessage = () => {
  return (
    <View style={styles.emptyContainer}>
      <Text maxFontSizeMultiplier={1.1} style={styles.title}>No tienes hipnosis descargadas</Text>
      <Text maxFontSizeMultiplier={1.1} style={styles.descriptionNoConnection}>
        No es culpa del universo. Es que no te has conectado a internet.{"\n\n"}
        Conéctate y descarga tus hipnosis para escucharlas en el avión o en la Luna.
      </Text>
    </View>
  );
};

const FistRequestMessage = () => {
  return (
    <View style={styles.emptyContainerFistRequest}>
      <Text maxFontSizeMultiplier={1.1} style={styles.title}>Pide tu primera hipnosis</Text>
      <Text maxFontSizeMultiplier={1.1} style={styles.descriptionNoConnection}>
               {"Cada vez que pidas una, a los 15 días te \nhabilitaré para que puedas pedirme tu \nsiguiente hipnosis."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    marginTop: 10,
  },
  trackListContainer: {
    flex: 1,

  },
  buttonContainer: {
  },
  emptyContainer: {
    gap: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
  },
  emptyContainerFistRequest: {
    gap: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },

  tabContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    position: 'relative',
  },
  tabContainerMovedDown: {
    marginTop: 28, // Mover las tabs hacia abajo cuando se cumplan las condiciones
  },
  tab: {
    paddingVertical: 8,
    position: 'relative',
    width: 110, // Ancho fi

    alignItems: 'flex-start',
  },
  tabText: {
    color: '#999999',
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  activeTabText: {
    color: 'white',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -3,
    left: 5,
    right: 5,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  title: {
    fontSize: fontSize["2.5xl"],
    fontWeight: '700',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  description: {
    marginTop: Platform.OS === 'ios' ? 0 : -10,
    fontSize: 15,
    marginLeft:  Platform.OS === 'android' ? -2 : 0,
    fontFamily: 'Geist-Medium',
    letterSpacing: -0.7,
    color: colors.tertiary,
    textAlign: 'center',
    paddingHorizontal: 20,

  },
  descriptionNoConnection: {
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.5,
    fontSize: fontSize.sm,
    color: colors.tertiary,
    textAlign: 'center',
    marginBottom: 40,
  },

  errorContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorText: {
    color: colors.error,
    textAlign: 'center'
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: 10,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonContent: {
    marginLeft: 12,
    flex: 1,
  },
  skeletonTitle: {
    height: 20,
    width: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },

  // Hero Card Styles
  heroSkeletonCard: {
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroTitleContainer: {
    width: '100%',
  },
  heroTitle: {
    height: 30,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginBottom: 8,
  },
  heroSubtitle: {
    height: 20,
    width: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
  },

  // Track Card Styles
  skeletonTrackCard: {
    height: 90,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  waveContainer: {
    width: 90,
    height: '100%',
    overflow: 'hidden',
  },
  waveSkeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transform: [{ scaleX: 1.2 }],
  },
  trackContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  trackTitle: {
    height: 20,
    width: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    marginBottom: 8,
  },
  trackDuration: {
    height: 16,
    width: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
  },
  headerContainer: {
    paddingHorizontal: screenPadding.horizontal,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    color: colors.text,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  carouselContainer : {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  animatedTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 75, // Ancho del indicador (tab width - padding)
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  animatedTabIndicatorAnteriores: {
    position: 'absolute',
    bottom: 0,
    left: 11,
    width: 53, // Ancho del indicador (tab width - padding)
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
})

export default AudioScreen