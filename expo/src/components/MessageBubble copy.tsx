import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import FastImage from 'react-native-fast-image';
import { colors, fontSize } from '@/constants/tokens';
import PulsingLoader from './PulsingLoader';

interface MessageBubbleProps {
    msg: {
        id: number;
        text?: string;
        image?: string;
        sender: string;
        type?: string;
    };
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
    receiverColor = colors.secondary
}: MessageBubbleProps) => {
    if (msg.type === 'loading') {
        return (
            <View style={[
                styles.loadingContainer,
                loadingContainerStyle
            ]}>
                <View style={[
                    styles.loadingBubble,
                    { backgroundColor: receiverColor },
                    loadingBubbleStyle
                ]}>
                    <PulsingLoader />
                    {/* <ActivityIndicator size="small" color="white" /> */}
                    {/* <Text maxFontSizeMultiplier={1.1}  style={{ color: 'white', marginLeft: 10 }}></Text> */}
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
            <View style={[
                styles.bubble,
                { backgroundColor: msg.sender === 'sender' ? senderColor : receiverColor },
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
                <Text maxFontSizeMultiplier={1.1}  maxFontSizeMultiplier={1.1} style={[
                    styles.text,
                    textStyle
                ]}>
                    {msg.text}
                </Text>
            </View>
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

export default MessageBubble; 