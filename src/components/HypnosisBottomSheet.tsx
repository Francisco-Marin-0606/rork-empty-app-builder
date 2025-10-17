import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useKeyboard } from '@react-native-community/hooks';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconDownload, IconCheck } from '@tabler/icons-react-native';
import { colors, cutOffDate, fontSize, screenPadding } from '@/constants/tokens';
import { UnifiedTrack } from '@/helpers/types';
import { QuestionHypnosisCard } from './QuestionAnswerCard';
import { useLibraryStore } from '@/store/library';
import { useNewLibraryStore } from '@/store/newLibrary';
import { useActiveTrack } from 'react-native-track-player';
import { formatTitle } from '@/helpers/miscellaneous';
import { useAuthStore } from '@/store/authStore';
import { usePaymentStatus } from '@/store/userPaymentStatus';
import { useNetworkStore } from '@/store/networkStore';
import { useSubscriptionLogic } from '@/hooks/useSubscriptionLogic';
import * as WebBrowser from 'expo-web-browser';
import { AppConfigCacheService } from '@/services/cache/appConfigCacheService';
import FastImage from 'react-native-fast-image';
import Markdown from 'react-native-markdown-display';
import HypnosisInstructionsScreen from './HypnosisInstructionsScreen';
import { AudioRequestService } from '@/services/api/audioRequestService';
import PaywallScreenRenewal from './PaywallScreenRenewal';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';

import VideoPlayerWithComments from './VideoPlayerWithComments';
import { Comment } from '@/types/video';
import { VideoCommentsService } from '@/services/api/videoCommentsService';
const verExplicacionIcon = require('../../assets/ver-explicacion.png');


const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// Calcular el tamaño de la imagen basado en el ancho de pantalla
const IMAGE_SIZE = Math.min(SCREEN_WIDTH * 0.9, 400); // Máximo 400px, o 90% del ancho de pantalla

// Tipo para las preguntas
type Question = {
  id: string;
  question: string;
  answer: string;
};

interface HypnosisBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onPlay?: (item: UnifiedTrack) => void;
  data: UnifiedTrack | null;
  portal?: number;
}



const HypnosisBottomSheet: React.FC<HypnosisBottomSheetProps> = ({
  isVisible = true,
  onClose,
  onPlay,
  data,
  portal = 6001,
}) => {
  if (!data) return null;

  const isActiveTrack = useActiveTrack()?.url === data.url;
  const {
    audioRequests
  } = useLibraryStore();

  // Usar el nuevo store para levelAudios
  const {
    downloadedLevelAudios,
    isDownloadingLevel,
    downloadProgressLevel,
    downloadLevelAudio,
    deleteLevelAudioDownload,
    isLevelAudioDownloaded
  } = useNewLibraryStore();

  // Estados para las preguntas y respuestas
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errorQuestions, setErrorQuestions] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('psicoanálisis');
  const [showInstructionWithVideo, setShowInstructionWithVideo] = useState(false);

  // Estado para mostrar instrucciones de hipnosis
  const [showInstructions, setShowInstructions] = useState(false);
  const instructionsOpacity = useState(new Animated.Value(0))[0];
  const instructionsScale = useState(new Animated.Value(1))[0];

  // Estado para mostrar el video de explicación
  const [showExplanationVideo, setShowExplanationVideo] = useState(false);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  // Estados para el progreso del video (mantenidos para compatibilidad)
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [isVideoPaused, setIsVideoPaused] = useState(false);

  // Referencia al ScrollView de comentarios para auto-scroll
  const commentsScrollViewRef = useRef<ScrollView>(null);

  // Estados para comentarios locales
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [isSendingComment, setIsSendingComment] = useState<boolean>(false);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [totalCommentsCount, setTotalCommentsCount] = useState<number>(0);
  const { userData } = useAuthStore();
  const { isConnected } = useNetworkStore();

  // Función para cargar comentarios desde la API
  const loadComments = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setIsLoadingComments(true);
      }
      // Cargar todos los comentarios de una vez con un límite alto
      const response = await VideoCommentsService.getVideoComments(portal, page, userData?._id, 1000);
      if (append) {
        setLocalComments(prev => [...prev, ...response.comments]);
      } else {
        setLocalComments(response.comments);
        setTotalCommentsCount(response.pagination.totalComments);
      }
      
      setHasMorePages(response.pagination.hasNextPage);
      setCurrentPage(page);
      
      console.log(`Comentarios cargados en HypnosisBottomSheet portal ${portal} página ${page}:`, response.comments.length);
      console.log(`Total de comentarios disponibles:`, response.pagination.totalComments);
    } catch (error) {
      console.error('Error cargando comentarios en HypnosisBottomSheet:', error);
      if (!append) {
        setLocalComments([]);
        setTotalCommentsCount(0);
      }
    } finally {
      setIsLoadingComments(false);
    }
  }, [portal, userData?._id]);

  const loadMoreComments = useCallback(async (page: number) => {
    await loadComments(page, true);
  }, [loadComments]);

  // Funciones para comentarios
  const sendComment = async () => {
    if (!commentText.trim() || isSendingComment) return;
    
    setIsSendingComment(true);
    try {
      // Enviar comentario al servidor
      const newCommentData = await VideoCommentsService.postVideoComment(
        portal,
        commentText.trim(),
        userData?.wantToBeCalled || 'Usuario Local', // El author será el wantToBeCalled
        userData?._id || '507f1f77bcf86cd799439011' // Usar el userId del usuario actual o el fallback
      );
      
      // Agregar el nuevo comentario al final para que aparezca cerca del input (evitar duplicados)
      setLocalComments(prevComments => {
        // Verificar si el comentario ya existe para evitar duplicados
        const exists = prevComments.some(comment => comment._id === newCommentData._id);
        if (exists) {
          return prevComments;
        }
        return [...prevComments, newCommentData];
      });
      setCommentText('');

      // Auto-scroll hacia abajo para mostrar el comentario recién publicado
      setTimeout(() => {
        commentsScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      console.log('✅ [HypnosisBottomSheet] Comentario enviado exitosamente');
    } catch (error) {
      console.error('❌ [HypnosisBottomSheet] Error enviando comentario:', error);
      // En caso de error, agregar el comentario localmente como fallback
      const newComment: Comment = {
        _id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: commentText.trim(),
        author: userData?.wantToBeCalled || 'Usuario Local',
        publishedAt: new Date().toISOString(),
        portal: portal,
        state: 'PENDING',
        __v: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setLocalComments([...localComments, newComment]);
      setCommentText('');

      // Auto-scroll hacia abajo para mostrar el comentario recién publicado
      setTimeout(() => {
        commentsScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setIsSendingComment(false);
    }
  };
  // Función para actualizar el estado en la DB cuando se reproduce por primera vez
  const updateFirstPlayStatus = async () => {
    try {
      if (data?.audioRequest?._id && data.audioRequest.isAvailable) {
        // Actualizar isAvailable a false en la DB

        await AudioRequestService.updateIsAvailable(data.audioRequest._id);
      }
    } catch (error) {
      console.error('Error al actualizar estado de primera reproducción:', error);
    }
  };



  // Estado de descarga - usar el estado de levelAudios
  const levelAudio = data.levelAudios;
  const isDownloaded = levelAudio && levelAudio.audioRequestId ? isLevelAudioDownloaded(levelAudio.audioRequestId) : false;
  const isCurrentlyDownloading = levelAudio && levelAudio.audioRequestId ? !!isDownloadingLevel[levelAudio.audioRequestId] : false;
  const currentProgress = levelAudio && levelAudio.audioRequestId ? (downloadProgressLevel[levelAudio.audioRequestId] || 0) : 0;

  const [showPaywall, setShowPaywall] = useState(false);
  const { checkRevenueCatSubscription, isMembershipActive } = useAuthStore();
  const { handleSubscription } = useSubscriptionLogic();

  useEffect(() => {
    if (isVisible) {

    }
  }, [isVisible]);

  // Cargar comentarios cuando se monte el componente
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Función para renderizar el título con las últimas dos palabras en fuente diferente
  const renderTitleWithSpecialFont = (title: string) => {
    // Eliminar saltos de línea del título
    const cleanTitle = title.replace(/\n/g, ' ').trim();
    const words = cleanTitle.split(' ');

    if (words.length <= 2) {
      // Si hay 2 palabras o menos, todas usan la fuente especial
      return (
        <Text maxFontSizeMultiplier={1.1} style={[styles.headerHandwritten]}>
          {cleanTitle}
        </Text>
      );
    }

    // Separar las primeras palabras de las últimas dos
    const firstWords = words.slice(0, -2).join(' ');
    const lastTwoWords = words.slice(-2).join(' ');
    return (
      <Text maxFontSizeMultiplier={1.1} style={styles.headerHandwritten}>
        {firstWords && <Text maxFontSizeMultiplier={1.1} >{firstWords} </Text>}
        <Text maxFontSizeMultiplier={1.1} style={styles.headerHandwritten}>
          {replaceAccents(lastTwoWords)}
        </Text>
      </Text>
    );
  };

  const replaceAccents = (text: string) => {
    return text.replace("í", 'i').replace("Í", 'I');
  }

  // Animación para el tab indicator
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current; // 0 para 'psicoanálisis', 1 para 'respuestas'
  const tabTextOpacity = useRef(new Animated.Value(1)).current; // Para animar el texto

  // Nuevas animaciones para el solapamiento de tabs
  const tabOverlapAnimation = useRef(new Animated.Value(0)).current; // 0 para 'psicoanálisis', 1 para 'respuestas'
  const tabScaleAnimation = useRef(new Animated.Value(1)).current;

  // Animaciones para el movimiento del texto
  const firstTabTextTranslate = useRef(new Animated.Value(0)).current; // Para centrar el texto del primer tab
  const secondTabTextTranslate = useRef(new Animated.Value(0)).current; // Para centrar el texto del segundo tab


  const handlePaywallComplete = async () => {
    setShowPaywall(false);
    // Actualizar el estado de suscripción
    await checkRevenueCatSubscription();
  };
  // Función para animar el cambio de tab
  const animateTabChange = (newTab: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetValue = newTab === 'psicoanálisis' ? 0 : 1;

    // Animación del indicador con spring
    Animated.timing(tabIndicatorPosition, {
      toValue: targetValue,
      useNativeDriver: false,
      duration: 300,
    }).start();

    // Animación de solapamiento
    Animated.timing(tabOverlapAnimation, {
      toValue: targetValue,
      useNativeDriver: false,
      duration: 300,
    }).start();

    // Animación del movimiento del texto para centrarlo
    if (newTab === 'psicoanálisis') {
      // Cuando se selecciona psicoanálisis, centrar su texto y mover el otro hacia la derecha
      Animated.parallel([
        Animated.spring(firstTabTextTranslate, {
          toValue: 1, // Centrado
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(secondTabTextTranslate, {
          toValue: 1, // Mover hacia la derecha (igual que cuando pierde foco)
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        })
      ]).start();
    } else {
      // Cuando se selecciona respuestas, centrar su texto y mover el otro hacia la izquierda
      Animated.parallel([
        Animated.spring(firstTabTextTranslate, {
          toValue: 0, // Mover hacia la izquierda (simétrico al movimiento del otro tab)
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }),
        Animated.spring(secondTabTextTranslate, {
          toValue: 9, // Centrado
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        })
      ]).start();
    }

    // Animación suave del texto
    Animated.sequence([
      Animated.timing(tabTextOpacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(tabTextOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start();

    setSelectedTab(newTab);
  };


  // Cargar preguntas y respuestas al abrir el modal
  useEffect(() => {
    const loadQuestions = async () => {
      if (!data.audioRequest._id || !isVisible) return;

      setIsLoadingQuestions(true);
      setErrorQuestions(null);

      try {

        const audioRequest = data.audioRequest

        if (!audioRequest) {

          setErrorQuestions("No se encontró información de esta hipnosis");
          setIsLoadingQuestions(false);
          return;
        }



        if (audioRequest.audioMotive && audioRequest.audioMotive.questions) {
          setQuestions(audioRequest.audioMotive.questions);
        } else {
          setQuestions([]);
        }
      } catch (error) {
        console.error('Error al cargar preguntas:', error);
        setErrorQuestions("Error al cargar las preguntas");
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [data.audioRequestId, isVisible, audioRequests]);

  const handleExplanationPress = async () => {
    // Feedback inmediato para el usuario
    setIsExplanationLoading(true);

    try {
      // Haptics en background para no bloquear la UI
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Validar suscripción antes de permitir ver el video
      if (!isMembershipActive) {
        // Usar la lógica de suscripción directamente aquí para mostrar el modal local
        try {
          const configData = await AppConfigCacheService.getInstance().getConfigs();
          const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
          const linkStripe = configData?.redirectStripe?.linkStripe || '';

          console.log('[HypnosisBottomSheet] Configuración completa:', JSON.stringify(configData, null, 2));
          console.log('[HypnosisBottomSheet] enabledStripe:', enabledStripe);
          console.log('[HypnosisBottomSheet] linkStripe:', linkStripe);

          if (enabledStripe && linkStripe) {
            console.log('[HypnosisBottomSheet] Abriendo enlace externo:', linkStripe);
            await WebBrowser.openBrowserAsync(linkStripe, {
              controlsColor: colors.primary || '#FF9F40',
              toolbarColor: 'black',
              enableBarCollapsing: true,
              showTitle: true
            });
          } else {
            console.log('[HypnosisBottomSheet] Mostrando modal de RevenueCat');
            setShowPaywall(true);
          }
        } catch (error) {
          console.error('[HypnosisBottomSheet] Error al manejar suscripción:', error);
          setShowPaywall(true);
        }
        return;
      }

      // Validar suscripción antes de permitir ver el video
      if (!validateHypnosisPlay()) {
        return;
      }

      // Mostrar el video de explicación inmediatamente
      setShowExplanationVideo(true);

      // Operaciones pesadas en background
      await Promise.all([
        // Habilitar rotación automática para el video
        ScreenOrientation.unlockAsync(),
        updateFirstPlayStatus()
      ]);

    } catch (error) {
      console.error('Error al abrir explicación:', error);
      // En caso de error, mantener el video abierto pero loguear el error
    } finally {
      // Ocultar loading después de un delay mínimo para evitar parpadeo
      setTimeout(() => setIsExplanationLoading(false), 100);
    }
  };

  const handleCloseExplanationVideo = () => {
    setShowExplanationVideo(false);

    // Bloquear la orientación en portrait cuando se cierre el video
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    // Actualizar isAvailable a false en la DB cuando se cierra el video (skip o close)
    updateFirstPlayStatus();

    // Mostrar modal pre-audio cuando se cierra el video (igual que cuando termina)
    setShowInstructions(true);
    setShowInstructionWithVideo(true);

    // Animar fade in y scale de las instrucciones
    Animated.parallel([
      Animated.timing(instructionsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(instructionsScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Hook para detectar el estado del teclado
  const { keyboardShown } = useKeyboard();

  // Nueva función para manejar el fin del video y mostrar instrucciones automáticamente
  const handleVideoEnd = () => {


    // Cerrar el video de explicación
    setShowExplanationVideo(false);

    // Bloquear la orientación en portrait
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    // Actualizar isAvailable a false en la DB cuando termina el video
    updateFirstPlayStatus();

    // Mostrar instrucciones de hipnosis (reutilizando la lógica existente)
    setShowInstructions(true);
    setShowInstructionWithVideo(true);

    // Animar fade in y scale de las instrucciones (reutilizando animaciones existentes)
    Animated.parallel([
      Animated.timing(instructionsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(instructionsScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const { validateDownload } = usePaymentStatus();

  const handleDownload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isMembershipActive) {
      // Usar la misma lógica de suscripción que en otros botones
      try {
        const configData = await AppConfigCacheService.getInstance().getConfigs();
        const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
        const linkStripe = configData?.redirectStripe?.linkStripe || '';

        console.log('[HypnosisBottomSheet] handleDownload - Configuración completa:', JSON.stringify(configData, null, 2));
        console.log('[HypnosisBottomSheet] handleDownload - enabledStripe:', enabledStripe);
        console.log('[HypnosisBottomSheet] handleDownload - linkStripe:', linkStripe);

        if (enabledStripe && linkStripe) {
          console.log('[HypnosisBottomSheet] handleDownload - Abriendo enlace externo:', linkStripe);
          await WebBrowser.openBrowserAsync(linkStripe);
        } else {
          console.log('[HypnosisBottomSheet] handleDownload - Stripe no habilitado, mostrando PayWall');
          setShowPaywall(true);
        }
      } catch (error) {
        console.error('[HypnosisBottomSheet] handleDownload - Error al obtener configuración:', error);
        setShowPaywall(true);
      }
      return;
    }

    // Validar suscripción antes de permitir descarga
    if (!validateDownload()) {
      return;
    }

    if (isCurrentlyDownloading || !levelAudio) {
      return; // No hacer nada si ya está descargando o no hay levelAudio
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
            onPress: () => levelAudio.audioRequestId && deleteLevelAudioDownload(levelAudio.audioRequestId),
            style: "destructive"
          }
        ]
      );
    } else {
      // Iniciar descarga
      if (levelAudio.audioRequestId && levelAudio.audioUrl) {
        const newLevelAudio = {
            ...levelAudio,
            title: (Date.parse(levelAudio.publicationDate) || NaN) > cutOffDate ? levelAudio.customData?.name || levelAudio.title : data.requestSettings.appSettings.formSettings.genderTitle && (
                           data.requestSettings.appSettings.formSettings.genderTitle && (
                             userData.gender === 'Hombre' && data.audioRequest.settings.appSettings.formSettings.genderTitle.male
                               ? formatTitle(data.audioRequest.settings.appSettings.formSettings.genderTitle.male, userData.wantToBeCalled)
                               : userData.gender === 'Mujer' && data.audioRequest.settings.appSettings.formSettings.genderTitle.female
                                 ? formatTitle(data.audioRequest.settings.appSettings.formSettings.genderTitle.female, userData.wantToBeCalled)
                                 : formatTitle(data.audioRequest.settings.appSettings.formSettings.genderTitle.base, userData.wantToBeCalled)
                           )
                         )
        }
        downloadLevelAudio(newLevelAudio);
      }
    }
  };

  const { validateHypnosisPlay } = usePaymentStatus();

  const urlVideoIntro = data?.requestSettings?.appSettings?.videoIntro;

  const handlePlayPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isMembershipActive) {
      // Usar la lógica de suscripción directamente aquí para mostrar el modal local
      try {
        const configData = await AppConfigCacheService.getInstance().getConfigs();
        const enabledStripe = configData?.redirectStripe?.enabledStripe || false;
        const linkStripe = configData?.redirectStripe?.linkStripe || '';

        console.log('[HypnosisBottomSheet] Configuración completa:', JSON.stringify(configData, null, 2));
        console.log('[HypnosisBottomSheet] enabledStripe:', enabledStripe);
        console.log('[HypnosisBottomSheet] linkStripe:', linkStripe);

        if (enabledStripe && linkStripe) {
          console.log('[HypnosisBottomSheet] Abriendo enlace externo:', linkStripe);
          await WebBrowser.openBrowserAsync(linkStripe, {
            controlsColor: colors.primary || '#FF9F40',
            toolbarColor: 'black',
            enableBarCollapsing: true,
            showTitle: true
          });
        } else {
          console.log('[HypnosisBottomSheet] Mostrando modal de RevenueCat');
          setShowPaywall(true);
        }
      } catch (error) {
        console.error('[HypnosisBottomSheet] Error al manejar suscripción:', error);
        setShowPaywall(true);
      }
      return;
    }

    // Validar suscripción antes de permitir reproducción
    if (!validateHypnosisPlay()) {
      return;
    }

      // Si es la primera vez (isAvailable = true), mostrar el video de explicación automáticamente
      console.log('🎬 [Video Explanation] Checking conditions:', {
        isAvailable: data.audioRequest?.isAvailable,
        urlVideoIntro: urlVideoIntro,
        urlVideoIntroLength: urlVideoIntro?.length,
        shouldShowVideo: data.audioRequest?.isAvailable && urlVideoIntro && urlVideoIntro.length > 0,
        fullTrackDataStructure: {
          requestSettings: !!data.requestSettings,
          appSettings: !!data.requestSettings?.appSettings,
          videoIntro: data.requestSettings?.appSettings?.videoIntro,
          audioRequest: !!data.audioRequest,
          levelAudios: !!data.levelAudios
        }
      });
      
      if (data.audioRequest?.isAvailable && urlVideoIntro && urlVideoIntro.length > 0 && isConnected) {
        console.log('🎬 [Video Explanation] Showing explanation video');
        setShowExplanationVideo(true);
        return;
      }

    // Si ya se reprodujo (isAvailable = false), mostrar modal pre-audio directamente
    setShowInstructions(true);
     updateFirstPlayStatus();
    // Animar fade in y scale
    Animated.parallel([
      Animated.timing(instructionsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(instructionsScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // NO reproducir audio automáticamente - solo mostrar modal pre-audio

  };

  const handleStartHypnosis = () => {
    // Animar fade out y scale out, luego cerrar instrucciones
    Animated.parallel([
      Animated.timing(instructionsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(instructionsScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Callback después de la animación
      setShowInstructions(false);
      onClose()
      if (onPlay) onPlay(data.levelAudios);
    });
  };



  useEffect(() => {
    if (isVisible) {
      setShowInstructions(false);
    }
  }, [isVisible]);


  const getTitle = () => {
    const publicationDate = Date.parse(levelAudio.publicationDate) || NaN;

    return renderTitleWithSpecialFont(
       publicationDate && publicationDate > cutOffDate ? levelAudio.title : data.requestSettings.appSettings.formSettings.genderTitle && (
        data.requestSettings.appSettings.formSettings.genderTitle && (
          userData.gender === 'Hombre' && data.audioRequest.settings.appSettings.formSettings.genderTitle.male
            ? formatTitle(data.audioRequest.settings.appSettings.formSettings.genderTitle.male, userData.wantToBeCalled)
            : userData.gender === 'Mujer' && data.audioRequest.settings.appSettings.formSettings.genderTitle.female
              ? formatTitle(data.audioRequest.settings.appSettings.formSettings.genderTitle.female, userData.wantToBeCalled)
              : formatTitle(data.audioRequest.settings.appSettings.formSettings.genderTitle.base, userData.wantToBeCalled)
        )
      )
    )
  }

    // Restaurar orientación cuando se cierre el modal
    useEffect(() => {
      if (!isVisible && showExplanationVideo) {
        setShowExplanationVideo(false);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    }, [isVisible, showExplanationVideo]);

  // Efecto para manejar el estado del video cuando se abre/cierra el teclado
  useEffect(() => {
    if (keyboardShown && showExplanationVideo) {
      // Si el teclado se abre y el video está visible, pausarlo
      setIsVideoPaused(true);

    } else if (!keyboardShown && showExplanationVideo && isVideoPaused) {
      // Si el teclado se cierra y el video estaba pausado, reanudarlo
      setIsVideoPaused(false);

    }
  }, [keyboardShown, showExplanationVideo, isVideoPaused]);

  return (
    <>
      <View style={styles.bottomSheetContent}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerImageContainer}>
            <FastImage
              source={{ uri: data.audioRequest.settings.exportSettings.audioImg ?? data.unknownTrackImageUri }}
              style={styles.headerImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>
          <View style={styles.headerContent}>
            {getTitle()}

            <View style={styles.buttonsContainer}>
              <View style={styles.topButtonsRow}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handlePlayPress}
                >
                  <Ionicons name="play" size={24} color="white" />
                  <Text maxFontSizeMultiplier={1.1} style={styles.buttonPlay}>Reproducir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, isDownloaded ? styles.downloadedButton : {}]}
                  onPress={handleDownload}
                  disabled={isCurrentlyDownloading}
                >
                  {isDownloaded ? (
                    <>
                      <IconCheck size={18} color="white" strokeWidth={3} />
                      <Text maxFontSizeMultiplier={1.1} style={styles.buttonDownload}>Descargada</Text>
                    </>
                  ) : isCurrentlyDownloading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      {/* Barra de progreso de fondo */}
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${Math.round(currentProgress * 100)}%` }]} />
                      </View>
                      {/* Contenido encima de la barra */}
                      <View style={styles.progressBarContent}>
                        <IconDownload size={18} color="white" strokeWidth={2} />
                        <Text maxFontSizeMultiplier={1.1} style={[styles.buttonDownload, { fontSize: fontSize.xs }]}>Descargando {Math.round(currentProgress * 100)}%</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <IconDownload size={18} color="white" strokeWidth={2} />
                      <Text maxFontSizeMultiplier={1.1} style={styles.buttonDownload}>Descargar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {(!data.audioRequest?.isAvailable && urlVideoIntro.length > 0 && isConnected) && (
                <TouchableOpacity
                  style={[
                    styles.explanationButton,
                    isExplanationLoading && styles.explanationButtonDisabled
                  ]}
                  onPress={handleExplanationPress}
                  disabled={isExplanationLoading}
                >
                  {isExplanationLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <FastImage
                      source={verExplicacionIcon}
                      style={{ width: 18, height: 18 }}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  )}
                  <Text maxFontSizeMultiplier={1.1} style={styles.buttonExplanation}>
                    {isExplanationLoading ? 'Abriendo...' : 'Ver explicación'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Text maxFontSizeMultiplier={1.1} style={styles.metadata}>
                  Duración:
                </Text>
                <Text maxFontSizeMultiplier={1.1} style={styles.metadataValue}>
                  {data.levelAudios.formattedDuration || "00:00"}
                </Text>
              </View>
            </View>

            {/* Tabs para navegar entre psicoanálisis y respuestas */}
            <View style={styles.tabContainer}>
              {/* Tab de Mensaje de universo */}
              <Animated.View style={[
                styles.overlappingTab,
                styles.firstTab,
                {
                  width: tabOverlapAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      220,
                      220], // Se expande cuando está activo (psicoanálisis)
                  }),
                  zIndex: selectedTab === 'psicoanálisis' ? 1. : 1,
                }
              ]}>
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => animateTabChange('psicoanálisis')}
                >
                  <Animated.View style={{
                    transform: [{ translateX: firstTabTextTranslate }]
                  }}>
                    <Animated.Text maxFontSizeMultiplier={1} style={[
                      styles.tabText,
                      selectedTab === 'psicoanálisis' && styles.activeTabText,
                      {
                        opacity: tabTextOpacity,
                        textAlign: 'left',
                        left: -2
                      }
                    ]}>
                      {'Mensaje para ti'}
                    </Animated.Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>

              {/* Tab de Preguntas y respuestas */}
              <Animated.View style={[
                styles.overlappingTab,
                styles.secondTab,
                {
                  width: tabOverlapAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      210,
                      215], // Se expande cuando está activo (respuestas)
                  }),
                  left: tabOverlapAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [170, 165], // Se mueve hacia la izquierda cuando está activo
                  }),

                  zIndex: selectedTab === 'respuestas' ? 1.5 : 1,
                }
              ]}>
                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => animateTabChange('respuestas')}
                >
                  <Animated.View style={{
                    transform: [{ translateX: secondTabTextTranslate }]
                  }}>
                    <Animated.Text maxFontSizeMultiplier={1} style={[
                      styles.tabText,
                      selectedTab === 'respuestas' && styles.activeTabText,
                      {
                        opacity: tabTextOpacity,
                        textAlign: 'left'
                      }
                    ]}>
                      {"Mis respuestas"}
                    </Animated.Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>

              {/* Indicador animado de fondo */}
              <Animated.View
                style={[
                  styles.animatedTabIndicator,
                  {
                    left: tabOverlapAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 175],
                    }),
                    width: tabOverlapAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        140,
                        140],
                    }),
                  }
                ]}
              />
            </View>

            {/* Contenido según la pestaña seleccionada */}
            {selectedTab === 'psicoanálisis' ? (
              <View style={styles.tabContentContainer}>
                <View style={styles.textWrapper}>
                  <Text 
                    style={styles.markdownText}
                    numberOfLines={0}
                    allowFontScaling={true}
                    textBreakStrategy="highQuality"
                    adjustsFontSizeToFit={false}
                    minimumFontScale={1}
                  >
                    {formatTitle(data.audioRequest.audioMotive?.frontAnalysis || "¿Y si todo sale bien?", userData.wantToBeCalled)
                      .replace(/\.\s+/g, '.\n\n')
                      .replace(/\?\s+/g, '?\n\n')
                      .replace(/!\s+/g, '!\n\n')}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.tabContentContainer}>
                {isLoadingQuestions ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text maxFontSizeMultiplier={1.1} style={styles.loadingText}>Cargando preguntas...</Text>
                  </View>
                ) : errorQuestions ? (
                  <Text maxFontSizeMultiplier={1.1} style={styles.errorText}>{errorQuestions}</Text>
                ) : questions && questions.length > 0 ? (
                  <>
                    {questions.map((item, index) => (
                      <QuestionHypnosisCard
                        key={index}
                        question={item.question}
                        answer={item.answer}
                        index={index}
                        isDivider={index !== (questions?.length || 0) - 1}
                      />
                    ))}
                  </>
                ) : (
                  <Text maxFontSizeMultiplier={1.1} style={styles.noDataText}>No hay respuestas disponibles</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Modal de Instrucciones de Hipnosis */}
      {showInstructions && (
        <Animated.View style={[
          styles.instructionsOverlay,
          {
            opacity: instructionsOpacity,
            transform: [{ scale: instructionsScale }]
          }
        ]}>
          <HypnosisInstructionsScreen
            onBack={()=>{
              setShowInstructions(false);
              if(showInstructionWithVideo){
               setShowInstructionWithVideo(false);
               setShowExplanationVideo(true);
              }
            }}
            onStart={handleStartHypnosis}
          />
        </Animated.View>
      )}


      {showPaywall && (
        <View style={styles.paywallOverlay}>
          <PaywallScreenRenewal
            onComplete={handlePaywallComplete}
            onBack={() => setShowPaywall(false)}
          />
        </View>
      )}

        {/* VideoPlayerWithComments Integrado */}
        {showExplanationVideo && (() => {
          const dbVideoUrl = data?.requestSettings?.appSettings?.videoIntro;

          // Solo mostrar el video si existe una URL válida
          if (!dbVideoUrl || dbVideoUrl.trim() === '') {
            return null;
          }

          
          return (
          <View style={styles.explanationVideoOverlay}>
            <View style={styles.videoFullScreenContainer}>
              <VideoPlayerWithComments
                uri={dbVideoUrl}
                isPlaying={!isVideoPaused}
                comments={localComments}
                onLoadMoreComments={loadMoreComments}
                portal={portal}
                totalCommentsCount={totalCommentsCount}
                onProgress={(info) => {
                  setVideoProgress(info.positionMillis / info.durationMillis);
                  setVideoDuration(info.durationMillis);
                  setVideoPosition(info.positionMillis);
                }}
                onEnd={handleVideoEnd}
                onClose={handleCloseExplanationVideo}
              />
            </View>
          </View>
        );
      })()}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  bottomSheet: {
    backgroundColor: colors.screenBackground,
    minHeight: BOTTOM_SHEET_HEIGHT,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  bottomSheetContent: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // Mantiene proporción cuadrada
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 1.25 }],

  },
  headerImage: {
    width: '100%',
    height: '100%',
    maxWidth: IMAGE_SIZE,
    maxHeight: IMAGE_SIZE,
  },
  scrollView: {
    marginTop: 0,
    flex: 2,
    width: '100%',
  },
  scrollViewContent: {
    paddingBottom: 50,
    width: '100%',
  },
  headerContent: {
    paddingVertical: 18,
    paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
  },
  headerTitle: {
    fontSize: 28,
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  headerHandwritten: {
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -1,
    marginBottom: 10,
    marginTop: 10,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['3xl'] * 1,
    paddingTop: fontSize['3xl'] - (fontSize['3xl'] * 0.75),
  },
  description: {
    fontSize: fontSize.base,
    color: 'white',
    fontFamily: 'Geist-Regular',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  metadataContainer: {
    flexDirection: 'row',
    paddingBottom: 20,
    gap: 30,
    position: 'relative',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  metadata: {
    fontSize: fontSize.sm,
    color: 'white',
    opacity: 0.6,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: fontSize.sm,
    color: 'white',
    opacity: 0.6,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  topButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: "#FE892E",
    padding: 4,
    borderRadius: 6,
    height: 42,
    gap: 5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    gap: 4,
    height: 42,
    position: 'relative',
    overflow: 'hidden',
  },
  downloadedButton: {
    backgroundColor: colors.fourth,
  },
  buttonPlay: {
    color: "white",
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  buttonText: {
    color: 'black',
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },

  buttonDownload: {
    color: "white",
    padding: 4,
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    borderRadius: 6,
    gap: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'flex-start',
    position: 'relative',
    height: 48,
  },
  overlappingTab: {
    position: 'absolute',
    top: 0,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  firstTab: {
    overflow: 'hidden',
  },
  secondTab: {
    overflow: 'hidden',
    // backgroundColor: 'red',
    // left será controlado por animación
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  tab: {
    paddingVertical: 8,
    flex: 1,
    height: 48,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  activeTab: {
    flex: 2,
    textDecorationLine: 'none',
    textOverflow: 'ellipsis',
    height: 48,
    // Se maneja con la línea inferior
  },
  tabText: {
    color: '#999999',
    fontSize: 20,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,

    // backgroundColor: 'red',
  },
  activeTabText: {
    color: 'white',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -3,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  animatedTabIndicator: {
    position: 'absolute',
    bottom: 5,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  tabContentContainer: {
    marginTop: 5,
    width: '100%',
    flex: 1,
  },
  textWrapper: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  markdownText: {
    color: 'white',
    opacity: 0.6,
    fontSize: fontSize['sm-18'],
    fontFamily: 'Geist-Regular',
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'left',
    flexWrap: 'wrap',
    flex: 1,
    width: '100%',
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  downloadedIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'white',
    borderRadius: 999,
    height: 16,
    width: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    borderRadius: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#9e9e9e",
    zIndex: 2,
  },
  progressBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 42,
    zIndex: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: fontSize.base,
    marginTop: 10,
    fontFamily: 'Geist-Regular',
  },
  errorText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'left',
    fontFamily: 'Geist-Regular',
  },
  noDataText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'left',
    marginVertical: 15,
    fontFamily: 'Geist-Regular',
  },
  instructionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  paywallOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 2000,
  },
  explanationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    gap: 8,
    height: 42,
    width: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  explanationButtonDisabled: {
    backgroundColor: "#1a1a1a",
    opacity: 0.7,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  buttonExplanation: {
    color: "white",
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  explanationVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoFullScreenContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  explanationVideoCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1001,
  },
  explanationVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playPauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
  },
  playPauseIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  playPauseText: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'Geist-Bold',
    marginLeft: 4, // Ajuste para centrar visualmente el triángulo
  },


  // Estilos para los controles de video
  videoControlsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 1004,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 8,
  },
  seekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 40,
    flexShrink: 0,
  },
  seekLabel: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: 'Geist-Medium',
  },
  skipIntroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    minHeight: 40, // Misma altura que los botones de seek
    flexShrink: 0,
  },
  skipIntroText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Geist-Medium',
  },
  // Estilos para la sección de comentarios
  commentsSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 24,
    maxHeight: 500, // Aumentamos más la altura para dar más espacio a los comentarios
  },
  commentsGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1, // Asegurar que esté por debajo del contenido
  },
  unifiedCommentsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 2, // Asegurar que esté por encima del gradiente
  },
  commentsContainer: {
    minHeight: 200, // Altura mínima para asegurar espacio para comentarios
    maxHeight: 350, // Aumentamos la altura máxima del contenedor de comentarios
    paddingBottom: 20,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingBottom: 10,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
  },
  commentTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.9)',

  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20, // Aumentamos el padding vertical
    paddingBottom: 55, // Aumentamos más el padding inferior para subir el input
    backgroundColor: 'transparent',
  },
  commentInput: {
    flex: 1,
    fontSize: 18, // Aumentamos el tamaño de la fuente del placeholder
    maxHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderRadius: 20,
    color: 'white',
    borderWidth: 0, // Quitamos el borde
    borderColor: 'transparent', // Borde transparente
  },
  sendButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF7A00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  noCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCommentsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    textAlign: 'center',
  },
  controlIcon: {
    width: 36,
    height: 36,
    tintColor: 'white',
  },
});

const markdownStyles = {
  body: {
    color: 'white',
    opacity: 0.6,
    fontSize: fontSize['sm-18'],
    fontFamily: 'Geist-Regular',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  paragraph: {
    marginBottom: 10,
  },
  heading1: {
    fontSize: fontSize['2xl'],
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom: 16,
    marginTop: 20,
  },
  heading2: {
    fontSize: fontSize.xl,
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom: 14,
    marginTop: 18,
  },
  heading3: {
    fontSize: fontSize.lg,
    color: 'white',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom: 12,
    marginTop: 16,
  },
  strong: {
    fontFamily: 'Geist-SemiBold',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  listItem: {
    marginBottom: 6,
  },
  bullet: {
    color: 'white',
  },
  ordered: {
    color: 'white',
  },
};



export default HypnosisBottomSheet;