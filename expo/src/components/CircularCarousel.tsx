import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ViewToken,
  Alert,
  Image,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated'
import { UnifiedTrack } from '@/helpers/types'
import { Ionicons } from '@expo/vector-icons'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { usePaymentStatus } from '@/store/userPaymentStatus'
import { useSubscriptionLogic } from '@/hooks/useSubscriptionLogic'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { colors, cutOffDate } from '@/constants/tokens'
import { formatTitle } from '@/helpers/miscellaneous'
import { createLevelDataMap } from '@/helpers/levelDataHelper'
import { useNetworkStore } from '@/store/networkStore'
import { useNewLibraryStore } from '@/store/newLibrary'
import { useCarrouselStore } from '@/store/carrouselStore'
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const ITEM_SPACING = 5
const ITEM_HEIGHT = 150
const VISIBLE_ITEMS = 4
const CARD_WIDTH = SCREEN_WIDTH * 1

interface CircularCarouselProps {
  data: any[] // requestSettings
  onCardPressProp?: (item: UnifiedTrack) => void
  id: string
  audioRequests: any[]
  levelAudios: any[]
  levelDataMap?: Record<number, { audioRequest: any; levelAudios: any; requestSetting: any }>
}

interface CardProps {
  item: UnifiedTrack
  index: number
  scrollY: Animated.SharedValue<number>
  currentIndex: number
  onPress: (item: UnifiedTrack) => void
  daysRemaining: number
  isDownloaded?: boolean
  levelDataMap: any
}

const Card: React.FC<CardProps> = ({
  item,
  index,
  scrollY,
  currentIndex,
  onPress,
  daysRemaining,
  isDownloaded,
  levelDataMap,
}) => {
  const { userData, isMembershipActive, isProfileComplete } = useAuthStore()
  const userGender = userData?.gender || ''

  const currentUserLevel = Number(userData?.userLevel || 0)
  const cardUserLevel = Number(item.userLevel)

  const dataMapRequestSettings = useCarrouselStore((state) => state.dataMap)
  const [cardState, setCardState] = useState<
    'locked' | 'processing' | 'available' | 'request_needed'
  >('locked')

  const setDataMap = useCarrouselStore((state) => state.setDataMap)

  // Mover setDataMap dentro de useEffect para evitar bucle infinito
  useEffect(() => {
    if (levelDataMap) {
      setDataMap(levelDataMap)
    }
  }, [levelDataMap, setDataMap])

  // Check if this card has audio content
  const hasAudioContent =
    dataMapRequestSettings &&
    dataMapRequestSettings[item.userLevel] &&
    ((dataMapRequestSettings[item.userLevel].levelAudios &&
      Object.keys(dataMapRequestSettings[item.userLevel].levelAudios).length > 0) ||
      (dataMapRequestSettings[item.userLevel].audioRequest &&
        Object.keys(dataMapRequestSettings[item.userLevel].audioRequest).length > 0))

  useEffect(() => {
    //console.log("dataMapRequestSettings", dataMapRequestSettings);
    validateStateCard()
  }, [dataMapRequestSettings])

  // Calculate audio creation progress if audio doesn't exist yet
  const calculateAudioProgress = () => {
    if (
      dataMapRequestSettings &&
      dataMapRequestSettings[item.userLevel] &&
      dataMapRequestSettings[item.userLevel].levelAudios
    ) {
      const levelAudio = dataMapRequestSettings[item.userLevel].levelAudios
      if (levelAudio.publicationDate) {
        const publicationDate = new Date(levelAudio.publicationDate)
        const now = new Date()

        // If publication date has passed, audio is ready
        if (now >= publicationDate) {
          return 100
        }
        // Calculate time remaining until publication in milliseconds
        const timeRemaining = publicationDate.getTime() - now.getTime()
        const oneDayInMs = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

        if (timeRemaining > oneDayInMs) {
          // If more than 24 hours remain, return minimum 20%
          return Math.max(20, 5)
        } else {
          // Within 24 hours window, calculate percentage
          // 0 hours remaining = 95%, 24 hours remaining = 5%
          const hoursRemaining = timeRemaining / (60 * 60 * 1000)
          const percentage = 95 - (hoursRemaining / 24) * 90 // Maps 0-24 hours to 95%-5%
          return Math.max(20, Math.round(Math.max(5, Math.min(95, percentage))))
        }
      }
    }
    return 20 // Default minimum 20% if no publication date
  }

  const validateStateCard = () => {
    const levelAudio = dataMapRequestSettings[item.userLevel]?.levelAudios
    const audioRequest = dataMapRequestSettings[item.userLevel]?.audioRequest

    const now = new Date().toISOString()

    // locked, lockedWithDays, processing, available, request_needed
    if (cardUserLevel > currentUserLevel) {
      setCardState('locked')
      return
    }

    if (cardUserLevel === currentUserLevel && now < userData.features?.nextAvailableForm?.value) {
      setCardState('locked')
      return
    }

    if (!audioRequest) {
      setCardState('request_needed')
      return
    }

    if (audioRequest && !levelAudio) {
      setCardState('processing')
      return
    }

    if (audioRequest && levelAudio && now < levelAudio.publicationDate) {
      setCardState('processing')
      return
    }

    if (audioRequest && levelAudio && now >= levelAudio.publicationDate) {
      setCardState('available')
      return
    }

    setCardState('locked')
    return
  }

  const messageRandom = [
    {
      title: 'Este portal aún no se abre...',
      description: 'Pero guarda una verdad que te está esperando.',
    },
    {
      title: 'Aún no es momento de abrir este portal.',
      description: 'Porque guarda algo que todavía no sabes que te espera. Confía en tu proceso.',
    },
    {
      title: 'Este portal se abrirá cuando sea tu momento.',
      description: 'Cada versión de ti tiene su tiempo. Confía.',
    },
    {
      title: 'Este portal guarda algo tan grande…',
      description: 'Que solo puede abrirse cuando sea tu momento para recibirlo. Llegará.',
    },
    {
      title: 'Todavía no es momento de cruzar esta puerta.',
      description: 'Pero cuando lo sea… lo vas a sentir.',
    },
    {
      title: 'Este portal se abrirá cuando puedas sostener lo que vas a despertar.',
      description: 'Esta parte de ti aún se está formando. Ten paciencia y confía.',
    },
    {
      title: 'Esta puerta se abre cuando dejas de empujarla.',
      description: 'Llegará el momento perfecto.',
    },
    {
      title: 'Todavía no es momento de abrir este portal',
      description: 'Nadie te está deteniendo. Solo te estás preparando para entrar en él.',
    },
  ]

  const { validateHypnosisPlay } = usePaymentStatus()
  const { handleSubscription } = useSubscriptionLogic()

  // Handle card press with new logic
  const handleCardPress = () => {
    // If card is disabled, do nothing

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (cardState === 'locked') {
      const message = messageRandom[Math.floor(Math.random() * messageRandom.length)]
      Alert.alert(message.title, message.description, [{ text: 'Cerrar', style: 'cancel' }])
      return
    }

    // If card is available and has content, validate subscription and play it
    if (cardState === 'available' && hasAudioContent) {
      // Check if audioRequest status is 'sended' before allowing playback
      const audioRequest =
        dataMapRequestSettings &&
        dataMapRequestSettings[item.userLevel] &&
        dataMapRequestSettings[item.userLevel].audioRequest

      if (!audioRequest || audioRequest.status !== 'sended') {
        Alert.alert(
          'Hipnosis no disponible',
          'Esta hipnosis aún no está disponible para reproducción.',
          [{ text: 'Cerrar', style: 'cancel' }],
        )
        return
      }

      if (!validateHypnosisPlay()) {
        return
      }
      onPress(item)
    } else if (cardState === 'request_needed') {
      // No audio content and form is available - redirect to request wizard
      handleOpenWizard()
    } else if (cardState === 'processing') {
      Alert.alert(
        'Tu hipnosis está siendo creada (con mucho cariño y la prisa justa para que quede increíble)',
        '',
        [{ text: 'Cerrar', style: 'cancel' }],
      )
    }
  }

  // Function to open hypnosis request wizard
  const handleOpenWizard = () => {
    if (!isMembershipActive) {
      handleSubscription();
      return
    }

    if (!isProfileComplete) {
      router.push({
        pathname: '/(app)/(modals)/forms/userPersonalDataFormInitial',
      })
    } else {
      router.push({
        pathname: '/(app)/(modals)/forms/questionsForm',
      })
    }
  }

  // Reanimated styles
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 3) * ITEM_HEIGHT,
      (index - 2) * ITEM_HEIGHT,
      (index - 1) * ITEM_HEIGHT,
      index * ITEM_HEIGHT,
      (index + 1) * ITEM_HEIGHT,
      (index + 2) * ITEM_HEIGHT,
      (index + 3) * ITEM_HEIGHT,
    ]

    const scale = interpolate(
      scrollY.value,
      inputRange,
      [0.5, 0.5, 0.75, 1.0, 0.75, 0.5, 0.5],
      Extrapolate.EXTEND,
    )

    const translateY = interpolate(
      scrollY.value,
      inputRange,
      [-100, -160, -20, 0, 20, 160, 100],
      // [ -425, -270, -95, -55, -50, 50, 75],
      Extrapolate.EXTEND,
    )

    // New height animation - 95px for unfocused cards, 105px for focused
    const height = interpolate(
      scrollY.value,
      inputRange,
      [105, 115, 120, 150, 120, 115, 105],
      Extrapolate.CLAMP,
    )

    const width = interpolate(
      scrollY.value,
      inputRange,
      [
        CARD_WIDTH + 150,
        CARD_WIDTH + 140,
        CARD_WIDTH + 30,
        CARD_WIDTH - 35,
        CARD_WIDTH + 30,
        CARD_WIDTH + 140,
        CARD_WIDTH + 150,
      ],
      Extrapolate.CLAMP,
    )

    return {
      transform: [{ scale }, { translateY }],
      height,
      width,
      zIndex: index === currentIndex ? 999 : 998 - Math.abs(currentIndex - index),
    }
  })

  const trasformedTitle = (item: any, wantToBeCalled?: string, cardState?: string) => {
   
    if(cardState === 'processing'){
      return "Tu hipnosis está siendo creada..."
    }

    const levelAudio = dataMapRequestSettings[item.userLevel]?.levelAudios
    const publicationDate = levelAudio?.publicationDate ? Date.parse(levelAudio.publicationDate) : NaN;
    return  publicationDate && publicationDate > cutOffDate ?  levelAudio?.title : formatTitle(
      userGender === 'Hombre'
        ? item.appSettings.formSettings.genderTitle.male
        : userGender === 'Mujer'
          ? item.appSettings.formSettings.genderTitle.female
          : item.appSettings.formSettings.genderTitle.base,
      wantToBeCalled,
   )
  }


  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleCardPress}
      style={[styles.cardWrapperVertical]}
    >
      <Animated.View style={[styles.cardContainerVertical, animatedStyle]}>
        {cardState === 'available' &&
          dataMapRequestSettings[item.userLevel]?.audioRequest?.isAvailable && (
            <View style={styles.availableTextContainer}>
              <Text maxFontSizeMultiplier={1.1} style={styles.availableText}>
                {'YA DISPONIBLE'}
              </Text>
            </View>
          )}
        <View style={styles.card}>
          {cardState === 'processing' && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: `${100 - (calculateAudioProgress ? calculateAudioProgress() : 0)}%`,
                overflow: 'hidden',
                zIndex: 2,
                borderRightWidth: 1,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8,
                borderColor: 'white',
              }}
            >
              <Image
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: `${100 / (1 - (calculateAudioProgress ? calculateAudioProgress() : 0) / 100)}%`,
                  height: '100%',
                  borderRadius: 8,
                }}
                resizeMode="cover"
                source={{
                  uri:
                    userGender === 'Hombre'
                      ? item.appSettings.formSettings.genderImage.maleGray
                      : item.appSettings.formSettings.genderImage.femaleGray,
                }}
              />
            </View>
          )}
          <Image
            style={[styles.cardImage, { zIndex: 1 }]}
            source={{
              uri:
                cardState !== 'processing' && cardState !== 'available'
                  ? userGender === 'Hombre'
                    ? item.appSettings.formSettings.genderImage.maleGray
                    : item.appSettings.formSettings.genderImage.femaleGray
                  : userGender === 'Hombre'
                    ? item.appSettings.formSettings.genderImage.male
                    : item.appSettings.formSettings.genderImage.female ||
                    item.appSettings.formSettings.genderImage.base ||
                    item.unknownTrackImageUri,
            }}
          />

          <View style={styles.cardContent}>
            {cardState === 'locked' ? (
              <View style={styles.lockContainerLeft}>
                <View style={styles.lockContainer}>
                  <Ionicons name="lock-closed" size={16} color="white" />
                  {cardState === 'locked' &&
                    cardUserLevel === currentUserLevel &&
                    new Date().toISOString() < userData.features?.nextAvailableForm?.value && (
                      <Text maxFontSizeMultiplier={1.1} style={styles.lockText}>
                        {daysRemaining} días
                      </Text>
                    )}
                </View>
                <View style={{ backgroundColor: 'white', height: 60, width: 1, marginTop: 10 }} />
              </View>
            ) : null}

            <View style={styles.titleContainer}>
              <Text
                maxFontSizeMultiplier={1.1}
                style={[styles.cardTitle, { marginLeft: cardState === 'locked' ? 0 : 25 }]}
              >
{ trasformedTitle(item, (userData?.names && userData.names.trim() !== '') ? userData.names : userData?.wantToBeCalled, cardState) }
              </Text>

              {item.handwrittenText && (
                <Text maxFontSizeMultiplier={1.1} style={styles.handwrittenText}>
                  {item.handwrittenText}
                </Text>
              )}
            </View>

            {/* Indicador de descarga con diseño original */}
            {isDownloaded && (
              <View style={styles.lockContainerRight}>
                <View
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 999,
                    height: 12,
                    width: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="arrow-down" size={10} color="white" />
                </View>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const CircularCarousel: React.FC<CircularCarouselProps> = ({
  data,
  audioRequests,
  levelAudios,
  onCardPressProp,
  id,
  levelDataMap
}) => {
  const scrollY = useSharedValue(0)
  const [isInternalLoading, setIsInternalLoading] = useState(true)
  const { carouselPosition, setCarouselPosition } = useCarrouselStore()
  const [currentIndex, setCurrentIndex] = useState(Math.round(carouselPosition / ITEM_HEIGHT))
  const flatListRef = useRef<FlatList<UnifiedTrack>>(null)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const { isLevelAudioDownloaded } = useNewLibraryStore()
  const { isConnected } = useNetworkStore()
  const { setFullTrackData } = usePlayerStore()
  const { userData, checkRevenueCatSubscription,isProfileComplete } = useAuthStore()
  // Calculate days remaining until the next form is available
  const calculateDaysRemaining = () => {
    if (userData.features?.nextAvailableForm?.value) {
      const availableDate = new Date(userData.features.nextAvailableForm.value)
      const today = new Date()
      const diffTime = availableDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    }
    return 0 // Fallback if date is not available
  }

  // If levelDataMap is not provided, create it
  const dataMap = levelDataMap || createLevelDataMap(data, audioRequests, levelAudios)

  // Mover la actualización del store a useEffect para evitar ejecutarla en cada render
  useEffect(() => {
    if (dataMap) {
      useCarrouselStore.setState({ dataMap: dataMap })
    }
  }, [dataMap])

  // Filtrar datos según conexión a internet
  const filteredData = React.useMemo(() => {
    if (isConnected) {
      return data // Mostrar todos los niveles si hay conexión
    }

    // Sin conexión: mostrar solo niveles con audio descargado
    return data.filter((item: any) => {
      const levelData = dataMap[item.userLevel]
      if (levelData && levelData.levelAudios && levelData.levelAudios.audioRequestId) {
        return isLevelAudioDownloaded(levelData.levelAudios.audioRequestId)
      }
      return false
    })
  }, [data, dataMap, isConnected, isLevelAudioDownloaded])

  useEffect(() => {
    // Calculate days remaining when component mounts or userData changes
    const days = calculateDaysRemaining()
    setDaysRemaining(days)
  }, [userData])

	// Redirección automática si el perfil no está completo
	useEffect(() => {
		if (!isProfileComplete) {
			const currentRoute = router.canGoBack() ? 'unknown' : 'initial'
			if (currentRoute === 'initial') {
				router.push({
					pathname: '/(app)/(modals)/forms/userPersonalDataFormInitial',
				})
			}
		}
	}, [isProfileComplete])

	const handleCardPress = (item: any) => {
		if (onCardPressProp) {
			onCardPressProp(item)
		}

    // Using the levelDataMap to get the data for this item's userLevel
    const userLevel = item.userLevel
    const levelData = dataMap[userLevel]

    if (levelData) {
      setFullTrackData({
        requestSettings: levelData.requestSetting,
        audioRequest: levelData.audioRequest,
        levelAudios: levelData.levelAudios,
      })

      router.push({
        pathname: '/(app)/(modals)/hypnosisBottomSheetScreen',
        params: {
          queueId: id,
        },
      })
    }
  }

  const handlePrevious = () => {
    if (flatListRef.current && data && data.length > 0) {
      const newIndex = Math.max(0, currentIndex - 1)
      if (newIndex !== currentIndex) {
        // Agregar haptic feedback antes de la navegación
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        flatListRef.current.scrollToIndex({
          index: newIndex,
          animated: true,
        })
      }
    }
  }

  const handleNext = () => {
    if (flatListRef.current && data && data.length > 0) {
      const newIndex = Math.min(data.length - 1, currentIndex + 1)
      if (newIndex !== currentIndex) {
        // Agregar haptic feedback antes de la navegación
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        flatListRef.current.scrollToIndex({
          index: newIndex,
          animated: true,
        })
      }
    }
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems.find((item) => item.isViewable)
      if (firstVisible && firstVisible.index !== null && firstVisible.index !== currentIndex) {
        // Index changed - could add logic here if needed
      }
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Verificar si este nivel tiene audio descargado
    const levelData = dataMap[item.userLevel]
    const hasDownloadedAudio =
      levelData &&
      levelData.levelAudios &&
      levelData.levelAudios.audioRequestId &&
      isLevelAudioDownloaded(levelData.levelAudios.audioRequestId)

    return (
      <Card
        item={item}
        index={index}
        scrollY={scrollY}
        currentIndex={currentIndex}
        onPress={handleCardPress}
        daysRemaining={daysRemaining}
        isDownloaded={hasDownloadedAudio}
        levelDataMap={levelDataMap}
      />
    )
  }

  // Calculate the initial index based on user's current level
  const getInitialIndexForUserLevel = () => {
    if (!data || data.length === 0) return 0

    const currentUserLevel =
      carouselPosition === 0 ? Number(userData?.userLevel || 1) - 1 : carouselPosition

    // Find the index of the item that matches the current user level
    const userLevelIndex = data.findIndex((item) => item.userLevel === currentUserLevel)

    // If found, return that index; otherwise, find the closest lower level
    if (userLevelIndex !== -1) {
      return userLevelIndex
    }

    // If exact level not found, find the highest available level that's <= current user level
    const availableLevels = data
      .filter((item) => item.userLevel <= currentUserLevel)
      .sort((a, b) => b.userLevel - a.userLevel) // Sort descending

    if (availableLevels.length > 0) {
      const closestLevel = availableLevels[0]
      return data.findIndex((item) => item.userLevel === closestLevel.userLevel)
    }

    // Fallback to first item
    return 0
  }

  useEffect(() => {
    if (flatListRef.current && data && data.length > 0) {
      const initialIndex = getInitialIndexForUserLevel()
      setCurrentIndex(initialIndex)
      flatListRef.current.scrollToIndex({
        index: initialIndex,
        animated: false,
      })
    }
  }, [data, userData?.userLevel])

  const lastDetectedIndex = useRef(currentIndex)

  const updateCurrentIndex = (offsetY: number) => {
    const newIndex = Math.round(offsetY / ITEM_HEIGHT)

    if (!data || newIndex < 0 || newIndex >= data.length) {
      return
    }

    const previousIndex = lastDetectedIndex.current

    // Solo actualizar si realmente cambiamos de portal
    if (newIndex !== previousIndex) {
      // Calcular la dirección del scroll
      const direction = newIndex > previousIndex ? 1 : -1
      
      // Verificar que los elementos existan y tengan userLevel antes de acceder
      const previousItem = data[previousIndex]
      const currentItem = data[newIndex]
      
      if (previousItem?.userLevel && currentItem?.userLevel) {
        console.log('📍 Cambio de portal:', direction > 0 ? '⬇️ Siguiente' : '⬆️ Anterior', 'Portal:', previousItem.userLevel, '->', currentItem.userLevel)
        console.log('📳 Haptic ejecutado en portal:', currentItem.userLevel)
      }

      // Ejecutar haptic al cambiar de portal
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Actualizar estados - usar currentItem si existe, sino usar data[newIndex] con fallback
      setCurrentIndex(newIndex)
      setCarouselPosition(Number(currentItem?.userLevel || data[newIndex]?.userLevel || 0))
      lastDetectedIndex.current = newIndex
    }
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
      runOnJS(updateCurrentIndex)(event.contentOffset.y)
    },
    onBeginDrag: async () => {
      // No haptic al inicio del scroll
    },
    onEndDrag: async () => {
      // No haptic al final del scroll
    },
  })

  // Manejador de gestos para navegación
  const onGestureEvent = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { velocityY, translationY } = event.nativeEvent

      // Detectar swipe hacia arriba (velocidad negativa) o hacia abajo (velocidad positiva)
      if (Math.abs(velocityY) > 50 || Math.abs(translationY) > 25) {
        if (velocityY < -50 || translationY < -5) {
          handleNext() // Swipe hacia abajo
        } else if (velocityY > 250 || translationY > 25) {
          handlePrevious() // Swipe hacia arriba
        }
      }
    }
  }

  return (
    // <GestureHandlerRootView style={styles.container}>
    //   <PanGestureHandler onHandlerStateChange={onGestureEvent}>
        <View style={styles.container}>
          <LinearGradient
           				colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}

            style={styles.overlayTop}
            pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)']}

        style={styles.overlayBottom}
        pointerEvents="none"
      />
          <Animated.FlatList
            ref={flatListRef}
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate={0.92}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.listContainerVertical,
              { paddingVertical: isConnected ? SCREEN_HEIGHT * 0.2 : SCREEN_HEIGHT * 0.18 } // Menos padding cuando no hay conexión para que aparezca más arriba
            ]}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={getItemLayout}
            initialScrollIndex={getInitialIndexForUserLevel()}
            removeClippedSubviews={true}
            maxToRenderPerBatch={VISIBLE_ITEMS}
            windowSize={2}
          />
        </View>
    //   </PanGestureHandler>
    // </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
    zIndex: 1,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
    zIndex: 1,
  },
  listContainerVertical: {
    paddingHorizontal: 20,
    paddingVertical: SCREEN_HEIGHT * 0.2,
    paddingBottom: 300,
    alignItems: 'center',
  },
  cardWrapperVertical: {
    height: ITEM_HEIGHT,
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: ITEM_SPACING / 2,
  },
  cardContainerVertical: {
    width: CARD_WIDTH - 40,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 10,
    justifyContent: 'flex-end',
  },
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '91%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 8,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingRight: 10,
    zIndex: 999,
  },
  titleContainer: {
    marginLeft: 10,
    alignContent: 'center',
    justifyContent: 'center',
    width: 200,
    height: '100%',
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 19,
    marginTop: 10,
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    flexWrap: 'wrap',
    width: '100%',
  },
  handwrittenText: {
    fontSize: 32,
    color: 'white',
    fontFamily: 'Geist-Regular',
    letterSpacing: 0,
    marginTop: -5,
  },

  lockContainer: {
    marginTop: 10,
    flexDirection: 'column',
    gap: 2,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockContainerRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 10,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  lockContainerLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    padding: 10,
    height: 'auto',
  },
  lockText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
  },
  availableText: {
    color: 'black',
    fontFamily: 'Geist-SemiBold',
    fontSize: 12,
  },
  availableTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    position: 'absolute',
    top: 3,
    right: 15,
    paddingHorizontal: 17,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1000,
  },
  flatListBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flatListInvisible: {
    opacity: 0,
  },
  flatListVisible: {
    opacity: 1,
  },
})

export default CircularCarousel