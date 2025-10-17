import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, StyleProp, Animated, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import { colors, fontSize } from '@/constants/tokens';
import PulsingLoader from './PulsingLoader';
import Markdown from 'react-native-markdown-display';
import { ChatMessage } from '@/hooks/useChatMessages';

interface MessageBubbleProps {
    msg: ChatMessage;
    // Estilos personalizables
    containerStyle?: StyleProp<ViewStyle>;
    bubbleStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    imageStyle?: any; // Usar 'any' para evitar conflictos entre los tipos de estilo
    loadingContainerStyle?: StyleProp<ViewStyle>;
    loadingBubbleStyle?: StyleProp<ViewStyle>;
    // Colores personalizables
    senderColor?: string;
    receiverColor?: string;
}

const MessageBubble = ({ 
    msg, 
    containerStyle, 
    bubbleStyle, 
    textStyle, 
    imageStyle,
    loadingContainerStyle,
    loadingBubbleStyle,
    senderColor = colors.primary,
    receiverColor = colors.secondary,
}: MessageBubbleProps) => {
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // State for typewriter effect
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Handle both animations
    useEffect(() => {
        // Reset animations for new messages
        setDisplayedText('');
        fadeAnim.setValue(0);
        
        // Start fade-in animation for the bubble
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000, // Fast fade-in for the bubble
            useNativeDriver: true
        }).start();
        
        // Apply typewriter effect for receiver messages that aren't loading and have animate=true
        if (msg.type !== 'loading' && msg.sender !== 'sender' && msg.text && msg.animate === true) {
            setIsTyping(true);
            let currentIndex = 0;
            const textToType = msg.text;
            
            // Speed of typing (lower = faster)
            const typingSpeed = 30;
            
            // Function to add one character at a time
            const typeNextCharacter = () => {
                if (currentIndex < textToType.length) {
                    setDisplayedText(textToType.substring(0, currentIndex + 1));
                    currentIndex++;
                    setTimeout(typeNextCharacter, typingSpeed);
                } else {
                    setIsTyping(false);
                }
            };
            
            // Start the typing animation after a slight delay
            setTimeout(() => {
                typeNextCharacter();
            }, 300); // Start typing after bubble appears
        } else {
            // Para mensajes del remitente o cuando animate=false, mostrar el texto completo inmediatamente
            setDisplayedText(msg.text || '');
        }
    }, [msg.id, msg.text, msg.type, msg.sender, msg.animate]);

    // Estilos para Markdown
    const markdownStyles: any = {
        body: {
            fontSize: fontSize.sm,
            color: colors.text,
            lineHeight: 21,
            ...(textStyle as any),
            // Para imitar el efecto de cursor durante la animación
            ...(isTyping && msg.sender !== 'sender' ? {
                borderRightWidth: 1,
                borderRightColor: colors.text
            } : {})
        },
        paragraph: {
            marginBottom: 0,
            marginTop: 0,
        },
        // Estilos para los diferentes elementos de Markdown
        strong: {
            fontWeight: 'bold' as const,
        },
        em: {
            fontStyle: 'italic' as const,
        },
        link: {
            color: colors.primary,
            textDecorationLine: 'underline',
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

    if (msg.type === 'loading') {
        return (
            <View style={[
                styles.loadingContainer,
                loadingContainerStyle
            ]}>
                <View style={[
                    styles.loadingBubble,
                    { backgroundColor: 'transparent' },
                    loadingBubbleStyle
                ]}>
                    <PulsingLoader />
                </View>
            </View>
        );
    }

    return (
        <View style={[
            styles.container,
            { justifyContent: msg.sender === 'sender' ? 'flex-end' : 'flex-start' },
            containerStyle
        ]}>
            <Animated.View style={[
                styles.bubble,
                { 
                    backgroundColor: msg.sender === 'sender' ? senderColor : receiverColor,
                    opacity: msg.sender !== 'sender' ? fadeAnim : 1 // Only apply fade animation to receiver messages
                },
                bubbleStyle
            ]}>
                {msg.image && (
                    <FastImage
                        source={{
                            uri: msg.image,
                            priority: FastImage.priority.high,
                            cache: FastImage.cacheControl.immutable,
                        }}
                        style={[
                            styles.image,
                            { marginBottom: msg.text ? 8 : 0 },
                            imageStyle
                        ]}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                )}
                {displayedText ? (
                    <Markdown 
                        style={markdownStyles}
                        mergeStyle={true}
                    >
                        {displayedText}
                    </Markdown>
                ) : null}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    bubble: {
        maxWidth: '75%',
        padding: 15,
        borderRadius: 20,
    },
    text: {
        fontSize: fontSize.sm,
        color: colors.text,
        lineHeight: 21
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },
    loadingContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 10,
    },
    loadingBubble: {
        backgroundColor: colors.screenBackground,
        padding: 0,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center'
    }
});

// Función personalizada para comparar props
const arePropsEqual = (prevProps: MessageBubbleProps, nextProps: MessageBubbleProps) => {
    // Si el ID del mensaje es el mismo, asumimos que es el mismo mensaje
    if (prevProps.msg.id === nextProps.msg.id) {
        // También verificamos si el estado de animación cambió
        return prevProps.msg.animate === nextProps.msg.animate;
    }
    // Si los IDs son diferentes, son mensajes diferentes
    return false;
};

export default React.memo(MessageBubble, arePropsEqual); 