import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TextInput, TouchableOpacity, Text, StyleProp, ViewStyle, TextStyle, Animated, ScrollView } from 'react-native';
import { colors, fontSize } from '@/constants/tokens';
import { IconArrowUp, IconPlus } from '@tabler/icons-react-native';
import { useImagePicker } from '@/hooks/useImagePicker';
import { ChatService } from '@/services/api/chatService';
import { useAuthStore } from '@/store/authStore';
import { usePaymentStatus } from '@/store/userPaymentStatus';
import FastImage from 'react-native-fast-image';
import Markdown from 'react-native-markdown-display';
import ImagePreview from './ImagePreview';
import WelcomeScreen from './ChatWelcomeScreen';
import { useHeaderStore } from '@/store/headerStore';
import { ResizeMode } from 'expo-av';
import { Video } from 'expo-av';
import { useChatSuggestionsStore } from '@/store/chatSuggestionsStore';
import { router } from 'expo-router';

// Define the message interface for this component
interface Message {
    id: string;
    text: string;
    sender: 'sender' | 'receiver';
    animate?: boolean;
    url?: string; // Add URL field for images
    type?: 'loading'; // Add a type field for loading messages
}

// Simplified message bubble component without animations
interface SimpleBubbleProps {
    msg: {
        id: string;
        text?: string;
        sender: string;
        type?: string;
        url?: string; // Add URL field for images
    };
    bubbleStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

// Array ampliado de sugerencias para los botones con scrollview
const suggestions = [
    "Anoche soñé algo rarísimo",
    "No sé qué me pasa",
    "¿Y si todo sale bien?",
    "No sé qué quiero",
    "¿Qué hago si estoy triste?",
    "Siento que algo va a pasar",
    "Creo que vi una señal",
    "Me acordé de algo",
    "Mi cuerpo sabe algo que yo no",
    "¿Por qué me siento raro hoy?"
];

const SimpleBubble = ({
    msg,
    bubbleStyle,
    textStyle
}: SimpleBubbleProps) => {
    const [imageLoading, setImageLoading] = useState(true);

    // Skeleton component for image loading
    const ImageSkeleton = ({ style }: { style: any }) => {
        const pulseAnim = useRef(new Animated.Value(0.3)).current;

        useEffect(() => {
            const pulse = () => {
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.7,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]).start(() => pulse());
            };
            pulse();
        }, [pulseAnim]);

        return (
            <Animated.View
                style={[
                    style,
                    {
                        backgroundColor: colors.secondary,
                        opacity: pulseAnim,
                    }
                ]}
            />
        );
    };

    // Markdown styles
    const markdownStyles = {
        body: {
            fontSize: fontSize.sm,
            color: colors.text,
            lineHeight: 21,
            ...(textStyle as any),
        },
        paragraph: {
            marginBottom: 0,
            marginTop: 0,
        },
        // Styles for different Markdown elements
        strong: {
            fontWeight: 'bold' as const,
        },
        em: {
            fontStyle: 'italic' as const,
        },
        link: {
            color: colors.primary,
            textDecorationLine: 'underline' as 'none' | 'underline' | 'line-through' | 'underline line-through',
        },
        blockquote: {
            borderLeftWidth: 4,
            borderLeftColor: colors.tertiary,
            paddingLeft: 10,
            marginLeft: 0,
            marginRight: 0,
        },
        code_inline: {
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: 3,
            paddingHorizontal: 2,
        },
        code_block: {
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            backgroundColor: 'rgba(0,0,0,0.05)',
            padding: 10,
            borderRadius: 5,
        },
        bullet_list: {
            marginTop: 0,
            marginBottom: 0,
        },
        ordered_list: {
            marginTop: 0,
            marginBottom: 0,
        },
    };

    // If it's a loading message, render the loading indicator
    if (msg.type === 'loading') {
        return (
            <View style={[
                styles.bubbleContainer,
                { justifyContent: 'flex-start' }
            ]}>
                <View style={[
                    { backgroundColor: 'transparent' }
                ]}>
                    <Video
                        source={require('@/assets/Images/RespuestaPsilocogo.mp4')}
                        style={styles.artworkImage}
                        resizeMode={ResizeMode.STRETCH}
                        shouldPlay={true}
                        isLooping={true}
                        isMuted={true}
                    />
                </View>
            </View>
        );
    }

    // Determinar si solo hay imagen sin texto
    const isImageOnly = msg.url && msg.url.length > 0 && (!msg.text || msg.text.trim().length === 0);

    return (
        <View style={[
            styles.bubbleContainer,
            { justifyContent: msg.sender === 'sender' ? 'flex-end' : 'flex-start' }
        ]}>
            <View style={[
                styles.bubble,
                { backgroundColor: msg.sender === 'sender' ? colors.secondary : 'transparent' },
                // Si solo hay imagen, aplicar estilos para quitar bordes
                isImageOnly ? { padding: 0, backgroundColor: 'transparent' } : null,
                bubbleStyle
            ]}>
                {msg.url && msg.url.length > 0 && (
                    <View style={styles.imageContainer}>
                        {imageLoading && (
                            <ImageSkeleton
                                style={[
                                    isImageOnly ? styles.imageOnly : styles.image,
                                    {
                                        marginBottom: msg.text ? 8 : 0,
                                        position: 'absolute',
                                        zIndex: 1
                                    }
                                ]}
                            />
                        )}
                        <FastImage
                            source={{
                                uri: msg.url,
                                priority: FastImage.priority.high,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={[
                                isImageOnly ? styles.imageOnly : styles.image,
                                {
                                    marginBottom: msg.text ? 8 : 0,
                                    opacity: imageLoading ? 0 : 1
                                }
                            ]}
                            resizeMode={FastImage.resizeMode.cover}
                            onLoadStart={() => setImageLoading(true)}
                            onLoad={() => setImageLoading(false)}
                            onError={() => setImageLoading(false)}
                        />
                    </View>
                )}
                {msg.text ? (
                    <Markdown
                        style={markdownStyles}
                        mergeStyle={true}
                    >
                        {msg.text}
                    </Markdown>
                ) : null}
            </View>
        </View>
    );
};

const ChatRefactor: React.FC = () => {
    // State for storing messages
    const [messages, setMessages] = useState<Message[]>([]);
    // State for the current input message
    const [inputMessage, setInputMessage] = useState('');
    // State for tracking if a response is loading
    const [isLoading, setIsLoading] = useState(false);
    // State for tracking if waiting for API response
    const [isResponseLoading, setIsResponseLoading] = useState(false);
    // Reference to the FlatList for scrolling
    const flatListRef = useRef<FlatList>(null);
    // State for input height to handle multiline input
    const [inputHeight, setInputHeight] = useState(40);
    // State to track if data is still loading
    const [isDataLoading, setIsDataLoading] = useState(true);
    // State to store the current chat data
    const [currentChat, setCurrentChat] = useState<any>(null);
    // State to track welcome screen animation
    const [isWelcomeExiting, setIsWelcomeExiting] = useState(false);
    // State to control visibility of welcome screen
    const [showWelcome, setShowWelcome] = useState(true);
    // Animation value for chat opacity
    const [chatOpacity] = useState(new Animated.Value(0));
    // Get suggestions state from global store
    const { showSuggestions, hasShownSuggestionsThisSession, setShowSuggestions, hideSuggestionsForSession } = useChatSuggestionsStore();
    const suggestionsOpacity = useRef(new Animated.Value(1)).current;

    const { userId, userData } = useAuthStore();
    const { selectedImage, pickImage, removeImage } = useImagePicker(15);
    const setShowHeader = useHeaderStore((state) => state.setShowHeader);
    const animateHeaderOpacity = useHeaderStore((state) => state.animateHeaderOpacity);
    const setHeaderTitle = useHeaderStore((state) => state.setHeaderTitle);
    const { isMembershipActive } = useAuthStore();

    const { checkRevenueCatSubscription } = useAuthStore();

    // Get user's email from userData if available
    const userEmail = userData?.email || '';

    // Fetch chat data when component mounts
    useEffect(() => {
        const fetchChatData = async () => {
            try {
                setIsDataLoading(true);
                if (!userId) throw new Error('User ID is not available');

                const chatData = await ChatService.getChatByUserId(userId);
                // console.log('Chat data fetched:', chatData);

                // Store the chat data for later use
                setCurrentChat(chatData?.chat || null);

                // Check if chat data exists and has messages
                if (chatData?.chat?.messages?.length > 0) {
                    // Transform the messages from the API response to match our Message interface
                    const historicalMessages = chatData.chat.messages.map((msg: any) => ({
                        id: msg._id || Date.now().toString(),
                        text: msg.content,
                        sender: msg.role === 'user' ? 'sender' : 'receiver',
                        animate: false,
                        url: msg.url || '' // Add the URL from the response
                    }));

                    // Update the messages state with the historical messages
                    setMessages(historicalMessages);

                    // If there are messages, hide the welcome screen and animate the chat in
                    setShowWelcome(false);

                    // Show and animate header when there's chat history
                    setShowHeader(true);
                    animateHeaderOpacity(1, 400);

                    // Animate the chat container
                    Animated.timing(chatOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();

                    // No es necesario hacer scroll aquí, ya que FlatList inverted mostrará automáticamente los mensajes más recientes
                } else {
                    // If there's no history, hide the header
                    setShowHeader(false);
                    animateHeaderOpacity(0, 0);
                }
            } catch (error) {
                console.error('Error fetching chat data:', error);
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchChatData();
    }, [userId, setShowHeader, animateHeaderOpacity, hideSuggestionsForSession]);

    // Monitor messages for first-time chats
    useEffect(() => {
        if (messages.length > 0 && showWelcome === false) {
            // When messages appear and welcome screen is gone, show header
            setShowHeader(true);
        }
    }, [messages.length, showWelcome, setShowHeader]);

    useEffect(() => {
        if (messages.length > 0 && !showWelcome) {
            setHeaderTitle("Psilocogo");
        } else {
            setHeaderTitle("");
        }
    }, [messages.length, showWelcome, setHeaderTitle]);

    const { validatePsychologistMessage } = usePaymentStatus();

    const scrollToBottom = () => {
        if (messages.length > 0) {
            setTimeout(() => {
                const scrollView = flatListRef.current;
                if (scrollView) {
                    scrollView.scrollToIndex({ animated: true, index: 0 });
                }
            }, 100);
        }
    };


    // Function to handle sending a message
    const handleSendMessage = useCallback(async () => {

        if (!isMembershipActive) {
            router.push('/(app)/(modals)/paywallScreenRenewal');
            return;
        }

        // Validar suscripción antes de permitir envío de mensaje
        if (!validatePsychologistMessage()) {
            return;
        }

        // Don't proceed if there's no text and no image
        if (!inputMessage.trim() && !selectedImage) return;

        // Create a new user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputMessage.trim(),
            sender: 'sender',
            url: selectedImage?.uri || ''
        };

        // Create a loading message
        const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: '',
            sender: 'receiver',
            type: 'loading'
        };

        // Trigger welcome screen exit animation if visible
        if (messages.length === 0 && showWelcome) {
            setIsWelcomeExiting(true);

            // Wait for animation to complete before hiding welcome screen
            setTimeout(() => {
                setShowWelcome(false);

                // Show and animate the header
                setShowHeader(true);
                animateHeaderOpacity(1, 400);

                // Animate in the chat view
                Animated.timing(chatOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }, 600); // Match the animation duration in WelcomeScreen
        }

        // Add loading state
        setIsLoading(true);
        setIsResponseLoading(true);

        // Hacer una copia completa de la imagen seleccionada antes de limpiar UI
        const imageToSend = selectedImage ? {
            uri: selectedImage.uri,
            name: selectedImage.name || `image_${Date.now()}.jpg`,
            size: selectedImage.size
        } : null;

        // Add user message immediately to UI
        setMessages(prev => [ loadingMessage, userMessage, ...prev ]);
        
        // Ocultar sugerencias para toda la sesión cuando se envía un mensaje
        hideSuggestionsForSession();

        // Clear input and image
        setInputMessage('');
        if (selectedImage) {
            removeImage();
        }

        // No es necesario hacer scroll aquí, ya que FlatList inverted mostrará automáticamente los mensajes más recientes

        try {
            let response;

            // Prepare the message data
            const messageData: any = {
                userId: userId || '',
                email: userEmail,
                message: inputMessage.trim() || ' ' // Enviar al menos un espacio si no hay texto
            };

            // Add file data if we have an image
            if (imageToSend) {
                console.log('Sending image:', JSON.stringify(imageToSend));
                messageData.file = {
                    uri: imageToSend.uri,
                    name: imageToSend.name,
                    type: 'image/jpeg'  // Usar un tipo fijo para imágenes JPEG
                };
            }

            // If we don't have a chat yet, start a new conversation
            if (!currentChat) {
                console.log('Starting new conversation');
                console.log("messageData", messageData);
                response = await ChatService.startConversation(userId, userEmail, messageData);

                // Update the current chat with the new chat data
                setCurrentChat(response.chat);
            } else {
                // Otherwise, send to existing conversation
                console.log('Sending to existing conversation');
                console.log("messageData", messageData);

                messageData.chatId = currentChat._id;
                messageData.threadId = currentChat.threadId;

                response = await ChatService.sendMessageToAssistant(userId, userEmail, messageData);
            }

            console.log('Chat response:', response);

            // Remove the loading message
            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

            // Handle the assistant's response
            if (response && response.chat.messages) {
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: response.chat.messages[response.chat.messages.length - 1].content,
                    sender: 'receiver',
                    url: response.chat.messages[response.chat.messages.length - 1].url || '',
                    animate: true
                };

                // Add assistant message to the UI
                setMessages(prev => [ assistantMessage, ...prev ]);

                // No es necesario hacer scroll aquí, ya que FlatList inverted mostrará automáticamente los mensajes más recientes
            }
        } catch (error) {
            console.error('Error sending message:', error);

            // Remove the loading message
            setMessages(prev => prev.filter(msg => msg.type !== 'loading'));

            // Add error message
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta nuevamente.',
                sender: 'receiver',
                animate: false
            };

            setMessages(prev => [errorMessage, ...prev ]);

            // No es necesario hacer scroll aquí, ya que FlatList inverted mostrará automáticamente los mensajes más recientes
        } finally {
            setIsLoading(false);
            setIsResponseLoading(false);
            scrollToBottom();
        }

    }, [inputMessage, selectedImage, userId, userEmail, currentChat, removeImage, showWelcome, messages.length, chatOpacity, setShowHeader, animateHeaderOpacity, hideSuggestionsForSession]);

    // Render message bubble
    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isImageOnly = item.url && item.url.length > 0 && (!item.text || item.text.trim().length === 0);

        return (
            <SimpleBubble
                msg={{
                    type: item.type,
                    id: item.id,
                    text: item.text,
                    sender: item.sender,
                    url: item.url // Pass the URL to the SimpleBubble component
                }}
                bubbleStyle={
                    item.sender === 'sender'
                        ? isImageOnly ? styles.senderBubbleImage : styles.senderBubble
                        : styles.receiverBubble
                }
                textStyle={styles.messageText}
            />

        )
    }, []);

    // Función para animar la salida de las sugerencias
    const animateSuggestionsOut = () => {
        Animated.timing(suggestionsOpacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
        }).start(() => {
            // Ocultar sugerencias para toda la sesión
            hideSuggestionsForSession();
        });
    };

    // Función para animar la entrada de las sugerencias
    const animateSuggestionsIn = () => {
        // Solo mostrar sugerencias si no se han mostrado ya en esta sesión
        if (!hasShownSuggestionsThisSession) {
            setShowSuggestions(true);
            Animated.timing(suggestionsOpacity, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }).start();
        }
    };

    // Handle input change
    const handleInputChange = (text: string) => {
        setInputMessage(text);
        if (text.trim().length === 0 && !hasShownSuggestionsThisSession) {
            animateSuggestionsIn();
        } else {
            animateSuggestionsOut();
        }
    };

    // Handle content size change for multiline input
    const handleContentSizeChange = (event: any) => {
        setInputHeight(Math.min(150, Math.max(40, event.nativeEvent.contentSize.height)));
    };

    // Función para manejar cuando se presiona una sugerencia
    const handleSuggestionPress = useCallback((text: string) => {
        setInputMessage(text);
        // Ocultar sugerencias para toda la sesión cuando se selecciona una
        animateSuggestionsOut();
    }, []);

    // No es necesario un useEffect para manejar el scroll, ya que FlatList inverted mostrará automáticamente los mensajes más recientes

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <View style={styles.chatContainer}>
                {/* Show welcome screen if data loading is complete and we should still show welcome */}
                <View style={styles.chatContainer}>
                    {!isDataLoading && showWelcome && (
                        <View style={styles.welcomeContainer}>
                            <WelcomeScreen
                                isExiting={isWelcomeExiting}
                                onSuggestionPress={handleSuggestionPress}
                            />
                        </View>
                    )}
                    {/* Animated chat container */}
                    <Animated.View
                        style={[
                            styles.messagesContainer,
                            { opacity: chatOpacity }
                        ]}
                    >
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            inverted={true}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.messageListContent}
                            // No es necesario manejar onLayout y onContentSizeChange para el scroll,
                            // ya que FlatList inverted mostrará automáticamente los mensajes más recientes
                            scrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            keyboardShouldPersistTaps="handled"
                            removeClippedSubviews={false}
                            maintainVisibleContentPosition={{
                                minIndexForVisible: 0,
                                autoscrollToTopThreshold: 10
                            }}
                        />
                    </Animated.View>
                </View>
                {showSuggestions && (
                        <View style={{ height: 70 }} />
                    )
                }
                {/* Contenedor de sugerencias con ScrollView y animación */}
                {showSuggestions && (
                    <Animated.View style={[
                        styles.suggestionsContainer,
                        { opacity: suggestionsOpacity }
                    ]
                    }>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollViewContent}
                        >
                            {suggestions.map((suggestion, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.suggestionButton}
                                    onPress={() => handleSuggestionPress(suggestion)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.suggestionText} numberOfLines={3} ellipsizeMode="tail">
                                        {suggestion}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                <View style={styles.wrapperinputContainer}>

                    {selectedImage && <View style={styles.inputImageContainer}>
                        <ImagePreview
                            selectedImage={selectedImage}
                            onRemove={removeImage}
                        />
                    </View>}
                    <View style={styles.inputContainer}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>

                            <View style={styles.textInputContainer}>

                                <TextInput
                                    style={[styles.input, { height: inputHeight }]}
                                    value={inputMessage}
                                    onChangeText={handleInputChange}
                                    placeholder="Déjalo que fluya..."
                                    placeholderTextColor={colors.tertiary}
                                    maxLength={200}
                                    multiline
                                    onContentSizeChange={handleContentSizeChange}
                                />
                            </View>
                        </TouchableWithoutFeedback>

                        <TouchableOpacity
                            onPress={pickImage}
                            style={[
                                styles.sendButton,
                                {
                                    opacity: isLoading ? 0.5 : 1,
                                    backgroundColor: colors.secondary
                                }
                            ]}
                            disabled={isLoading}
                        >
                            <IconPlus size={25} color={colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                {
                                    opacity: isLoading || (!inputMessage.trim() && !selectedImage) ? 0.2 : 1,
                                    backgroundColor: colors.text
                                }
                            ]}
                            onPress={handleSendMessage}
                            disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                        >
                            <IconArrowUp size={24} color={colors.screenBackground} />
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.screenBackground
    },
    chatContainer: {
        flex: 1,
        paddingTop: 10,
        backgroundColor: colors.screenBackground
    },
    welcomeContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 70,
        zIndex: 10,
        // backgroundColor: 'red'
    },
    messagesContainer: {
        flex: 1,
        paddingBottom: 0,
        // backgroundColor: colors.screenBackground
    },
    messageListContent: {
        paddingHorizontal: 12,
        paddingTop: 10,
        marginHorizontal: 10,
        paddingBottom: 20,
        flexGrow: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        backgroundColor: colors.secondary,
        borderRadius: 30,
        // backgroundColor: 'yellow'
    },
    wrapperinputContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
        backgroundColor: colors.secondary,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        // backgroundColor: 'blue'
    },
    textInputContainer: {
        flex: 1,
        // marginLeft: 4,
        backgroundColor: colors.secondary,
        borderRadius: 30,
        paddingHorizontal: 0,
        // backgroundColor: 'red'
    },
    input: {
        color: colors.text,
        fontSize: fontSize.sm,
        paddingTop: 11,
        paddingBottom: Platform.OS === 'ios' ? 0 : 10,
        paddingHorizontal: 5,
        // backgroundColor: 'red'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        backgroundColor: 'red'
    },
    bubbleContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    bubble: {
        maxWidth: '75%',
        padding: 15,
        borderRadius: 20,
    },
    senderBubble: {
        marginBottom: 10,
        borderRadius: 10,
        padding: 15,
        backgroundColor: colors.secondary,
        alignSelf: 'flex-end',
        maxWidth: '75%'
    },
    senderBubbleImage: {
        marginBottom: 10,
        borderRadius: 10,
        backgroundColor: 'transparent',
        maxWidth: '75%'
    },
    receiverBubble: {
        marginBottom: 10,
        borderRadius: 10,
        padding: 0,
        backgroundColor: 'transparent',
        alignSelf: 'flex-start',
        maxWidth: '75%'
    },
    messageText: {
        fontSize: fontSize.sm,
        color: colors.text,
        lineHeight: 21
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginBottom: 8,
        resizeMode: 'cover'
    },
    imageOnly: {
        width: 200,
        height: 200,
        borderRadius: 10,
        marginBottom: 8,
        resizeMode: 'cover'
    },
    inputImageContainer: {
        maxWidth: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        marginLeft: 16,
        // backgroundColor: 'red'
    },
    imageContainer: {
        maxWidth: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 8
    },
    artworkImage: {
        width: 40,
        height: 30,
        resizeMode: 'cover'
    },
    suggestionsContainer: {
        position: 'absolute',
        bottom: 70,
        width: '100%',
        backgroundColor: colors.screenBackground,
        paddingVertical: 10
    },
    scrollViewContent: {
        marginTop: 5,
        paddingHorizontal: 16,
        paddingRight: 32,
        flexDirection: 'row'
    },
    suggestionButton: {
        backgroundColor: colors.secondary,
        borderRadius: 10,
        padding: 18,
        marginHorizontal: 6,
        minHeight: 40,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    suggestionText: {
        color: colors.text,
        fontSize: 14,
        textAlign: 'left',
        fontFamily: 'Geist-Regular'
    }
});

export default ChatRefactor;