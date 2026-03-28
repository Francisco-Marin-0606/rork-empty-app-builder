import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, X } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS
} from 'react-native-reanimated';

import { Comment } from '@/types/video';
import { VideoCommentsService } from '@/services/api/videoCommentsService';
import { useAuthStore } from '@/store/authStore';
import { formatCommentTimestamp } from '@/utils/dateHelpers';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  onKeyboardChange?: (visible: boolean) => void;
  onTopAreaHeightChange?: (height: number) => void;
  onWillClose?: () => void;
  comments?: Comment[];
  isLoading?: boolean;
  onLoadMoreComments?: (page: number) => Promise<void>;
  portal?: number;
}

const { height: screenHeight } = Dimensions.get('window');

export default function CommentsModal({
  visible, onClose, onCountChange, onKeyboardChange, onTopAreaHeightChange, onWillClose, comments: initialComments = [], isLoading = false, onLoadMoreComments, portal = 6001,
}: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const { userData } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState<string>('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [isSendingComment, setIsSendingComment] = useState<boolean>(false);

  // Sincronizar comentarios cuando cambien las props
  useEffect(() => {
    // Limpiar comentarios duplicados basándose en _id
    const uniqueComments = initialComments.filter((comment, index, self) => 
      index === self.findIndex(c => c._id === comment._id)
    );
    setComments(uniqueComments);
  }, [initialComments]);

  // Función para cargar más comentarios
  const loadMoreComments = useCallback(async () => {
    if (!onLoadMoreComments || isLoadingMore || !hasMorePages) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      await onLoadMoreComments(nextPage);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error cargando más comentarios:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [onLoadMoreComments, isLoadingMore, hasMorePages, currentPage]);

  // Función para detectar cuando se llega al final del scroll
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreComments();
    }
  }, [loadMoreComments]);
  const lastKbHeightRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const pullDownAccumRef = useRef<number>(0);
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const scrollRef = useRef<ScrollView | null>(null);

  const ENTER_DURATION = 280;
  const EXIT_DURATION = 240;

  const [localVisible, setLocalVisible] = useState<boolean>(visible);
  const isAndroid = Platform.OS === 'android';

  // --- Reanimated shared values
  const openProgress = useSharedValue(0); // 0: oculto, 1: visible
  const dragY = useSharedValue(0);        // seguimiento del drag

  const sheetHeight = Math.round(screenHeight *  (isAndroid?(isKeyboardVisible ? 0.60 : 0.75) : 0.75));
  const offscreenTranslate = sheetHeight + (insets?.bottom ?? 0);

// reportar altura del área superior para encajar el video
useEffect(() => {
  try {
    if (!onTopAreaHeightChange) return;
    if (!visible) return;
    const topArea = Math.max(0, screenHeight - sheetHeight);
    onTopAreaHeightChange(topArea);
  } catch (e) {
    console.log('onTopAreaHeightChange error', e);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [visible, isKeyboardVisible, sheetHeight, insets?.bottom]);

  // abrir/cerrar por prop
  useEffect(() => {
    if (visible) {
      if (!localVisible) setLocalVisible(true);
      openProgress.value = withTiming(1, { duration: ENTER_DURATION });
    } else if (localVisible) {
      openProgress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        if (finished) runOnJS(setLocalVisible)(false);
      });
    }
  }, [visible]);

  // teclado
  useEffect(() => {
    const isIOS = Platform.OS === 'ios';

    if (isIOS) {
      const changeSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        const screenY = typeof e?.endCoordinates?.screenY === 'number' ? e.endCoordinates.screenY : screenHeight;
        const nextHeight = Math.max(0, screenHeight - screenY);
        const becameVisible = nextHeight > 0;
        if (lastKbHeightRef.current === nextHeight) return;
        lastKbHeightRef.current = nextHeight;
        setIsKeyboardVisible(becameVisible);
        onKeyboardChange?.(becameVisible);
        setKeyboardHeight(nextHeight);
      });
      return () => changeSub.remove();
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      setIsKeyboardVisible(true);
      onKeyboardChange?.(true);
      const heightNum = typeof e?.endCoordinates?.height === 'number' ? e.endCoordinates.height : 0;
      lastKbHeightRef.current = heightNum;
      setKeyboardHeight(heightNum);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      onKeyboardChange?.(false);
      lastKbHeightRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [onKeyboardChange]);

  useEffect(() => { onCountChange?.(comments.length); }, [comments.length, onCountChange]);

  const handleAddComment = async () => {
    if (!newComment.trim() || isSendingComment) return;
    
    setIsSendingComment(true);
    try {
      // Enviar comentario al servidor
      const newCommentData = await VideoCommentsService.postVideoComment(
        portal,
        newComment.trim(),
        userData?.wantToBeCalled || 'Usuario Local', // El author será el wantToBeCalled
        userData?._id || '507f1f77bcf86cd799439011' // Usar el userId del usuario actual
      );
      
      // Agregar el comentario a la lista local (evitar duplicados)
      setComments(prevComments => {
        // Verificar si el comentario ya existe para evitar duplicados
        const exists = prevComments.some(comment => comment._id === newCommentData._id);
        if (exists) {
          return prevComments;
        }
        return [newCommentData, ...prevComments];
      });
      setNewComment('');
      
      console.log('✅ [CommentsModal] Comentario agregado exitosamente');
    } catch (error) {
      console.error('❌ [CommentsModal] Error enviando comentario:', error);
      // En caso de error, agregar el comentario localmente como fallback
      const comment: Comment = {
        _id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: newComment.trim(),
        author: userData?.wantToBeCalled || 'Usuario Local',
        publishedAt: new Date().toISOString(),
        portal: portal,
        state: 'PENDING',
        __v: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setComments([comment, ...comments]);
      setNewComment('');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleAnimatedClose = () => {
    try { onWillClose?.(); } catch {}
    Keyboard.dismiss();
    dragY.value = 0;
    openProgress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
      if (finished) {
        runOnJS(setLocalVisible)(false);
        runOnJS(onClose)();
      }
    });
  };

  // --- GESTO en header (flick corto y rápido)
  const pan = useMemo(() => {
    return Gesture.Pan()
      .enabled(!isKeyboardVisible)
      .onBegin(() => {
        dragY.value = 0;
      })
      .onUpdate((e) => {
        if (e.translationY > 0) {
          dragY.value = e.translationY;
        }
      })
      .onEnd((e) => {
        const fastShort = e.velocityY > 1200 && e.translationY >= 4;
        const longPull = e.translationY > 80;
        if (fastShort || longPull) {
          runOnJS(handleAnimatedClose)();
        } else {
          dragY.value = withSpring(0, { damping: 18, stiffness: 220 });
        }
      })
      .onFinalize(() => {
        if (openProgress.value === 1) {
          dragY.value = withSpring(0, { damping: 18, stiffness: 220 });
        }
      });
  }, [isKeyboardVisible]);

  // --- estilo animado del sheet
  const sheetStyle = useAnimatedStyle(() => {
    const base = offscreenTranslate * (1 - openProgress.value);
    return {
      transform: [{ translateY: base + dragY.value }],
      opacity: openProgress.value,
    };
  });

  if (!localVisible) return null;

  return (
    <Modal
      visible
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleAnimatedClose}
    >
      <View style={[
        styles.modalOverlay,
        Platform.OS === 'android' ? { height: Dimensions.get('screen').height } : null
      ]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleAnimatedClose} />
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: sheetHeight,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: 'hidden',
              backgroundColor: '#1a1a1a',
            },
            sheetStyle,
          ]}
        >
          <KeyboardAvoidingView style={styles.kbContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
            {/* HEADER */}
            <View style={styles.header}>
              {/* Overlay capturador del gesto, no tapa el botón X */}
              <GestureDetector gesture={pan}>
                <View
                  pointerEvents="box-only"
                  style={{ position: 'absolute', left: 0, right: 56, top: 0, height: 48 }}
                />
              </GestureDetector>

              <View style={styles.grabberContainer}>
                <View style={styles.grabber} />
              </View>
              <View style={styles.headerSide} />
              <Text style={styles.headerTitle}>Comentarios</Text>
              <TouchableOpacity
                onPress={handleAnimatedClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar comentarios"
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X color="#ffffff" size={22} />
              </TouchableOpacity>
            </View>

            {/* LISTA */}
            <ScrollView
              ref={(r) => { scrollRef.current = r; }}
              style={styles.commentsContainer}
              contentContainerStyle={{ paddingBottom: 96 + (isAndroid ?  20 : keyboardHeight) + (insets?.bottom ?? 0) }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              bounces={false}
              overScrollMode="never"
              alwaysBounceVertical={false}
              contentInsetAdjustmentBehavior="never"
              scrollEnabled={scrollEnabled}
              onScrollBeginDrag={(e) => {
                const y = (e?.nativeEvent?.contentOffset?.y as number) ?? 0;
                lastScrollYRef.current = y;
                pullDownAccumRef.current = 0;
                console.log('comments onScrollBeginDrag', { y });
              }}
              onScroll={(e) => {
                const y = (e?.nativeEvent?.contentOffset?.y as number) ?? 0;
                const dy = y - lastScrollYRef.current;

                if (y < 0) {
                  try { scrollRef.current?.scrollTo({ y: 0, animated: false }); } catch {}
                }

                // Acumular sólo cuando estamos en el tope y el usuario tira hacia abajo
                if (y <= 0 && dy < 0) {
                  pullDownAccumRef.current += -dy;
                  if (pullDownAccumRef.current >= 8) {
                    console.log('comments pull-to-close immediate', { accum: pullDownAccumRef.current, y, dy });
                    pullDownAccumRef.current = 0;
                    setScrollEnabled(false);
                    setTimeout(() => setScrollEnabled(true), 300);
                    handleAnimatedClose();
                    return;
                  }
                } else if (y > 0) {
                  pullDownAccumRef.current = 0;
                }
                lastScrollYRef.current = y;
                
                // Detectar scroll para cargar más comentarios
                handleScroll(e);
              }}
              testID="comments-scroll"
            >
              {comments.map((c) => (
                <View key={c._id} style={styles.commentItem}>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.username}>{c.author}</Text>
                      <Text style={styles.timestamp}>{formatCommentTimestamp(c)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.content}</Text>
                  </View>
                </View>
              ))}
              
              {/* Indicador de carga para más comentarios */}
              {isLoadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <Text style={styles.loadingMoreText}>Cargando más comentarios...</Text>
                </View>
              )}
              
              {/* Mensaje cuando no hay más páginas */}
              {!hasMorePages && comments.length > 0 && (
                <View style={styles.noMoreCommentsContainer}>
                  <Text style={styles.noMoreCommentsText}>No hay más comentarios</Text>
                </View>
              )}
            </ScrollView>

            {/* FONDO teclado */}
            <View
              style={{
                position: 'absolute',
                left: 0, right: 0, bottom: 0,
                height: (isAndroid ?  20  : keyboardHeight) + (isKeyboardVisible ? 0 : (insets?.bottom ?? 0)),
                backgroundColor: '#1a1a1a',
              }}
              pointerEvents="none"
            />

            {/* INPUT */}
            <View
              style={[
                styles.bottomBarContainer,
                {
                  bottom: isAndroid? (isKeyboardVisible? -20: 0)  : keyboardHeight,
                  paddingBottom: isAndroid
                    ? 12 + (isKeyboardVisible ? 12 : (insets?.bottom ?? 0))
                    : (isKeyboardVisible ? 12 : 12 + (insets?.bottom ?? 0)),
                },
              ]}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Escribe un comentario…"
                  placeholderTextColor="#9aa0a6"
                  selectionColor="#5b7cfa"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={250}
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  style={[styles.sendButton, { opacity: (newComment.trim() && !isSendingComment) ? 1 : 0.6 }]}
                  disabled={!newComment.trim() || isSendingComment}
                >
                  <ArrowUp color="#ffffff" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  kbContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#1a1a1a',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center', marginTop: 10 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  commentsContainer: { flex:  5, paddingHorizontal: 16, backgroundColor: '#1a1a1a' },
  commentItem: { flexDirection: 'row', paddingVertical: 12, alignItems: 'flex-start' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  username: { color: '#fff', fontSize: 14, fontWeight: '600', marginRight: 8 },
  timestamp: { color: '#666', fontSize: 12 },
  commentText: { color: '#fff', fontSize: 14, lineHeight: 18 },
  loadingMoreContainer: { padding: 20, alignItems: 'center' },
  loadingMoreText: { color: '#666', fontSize: 14 },
  noMoreCommentsContainer: { padding: 20, alignItems: 'center' },
  noMoreCommentsText: { color: '#666', fontSize: 14, fontStyle: 'italic' },
  bottomBarContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1a1a1a' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f', backgroundColor: '#1a1a1a' },
  textInput: { flex: 1, backgroundColor: '#222427', borderRadius: 28, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#2f3236', color: '#fff', fontSize: 14, maxHeight: 100, marginRight: 12 },
  sendButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF7A00', borderRadius: 20 },
  grabberContainer: { position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center' },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#2a2a2a' },
  headerSide: { width: 36, height: 36 },
});