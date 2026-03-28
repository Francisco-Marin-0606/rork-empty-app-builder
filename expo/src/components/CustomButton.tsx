import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import React, { ReactNode } from 'react';
import { colors, fontSize } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';

interface CustomButtonProps {
    title: string;
    handlePress: () => void;
    containerStyles?: object;
    textStyles?: object;
    isLoading?: boolean;
    icon?: ReactNode;
    disabled?: boolean;
    indicatorColor?: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({
    title,
    handlePress,
    containerStyles,
    textStyles,
    isLoading = false,
    disabled = false,
    icon,
    indicatorColor = 'white'
}) => {
    return (
        <TouchableOpacity
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                handlePress();
            }}
            activeOpacity={0.7}
            style={[
                styles.container,
                isLoading && styles.loadingState,
                disabled && styles.disabledState,
                containerStyles
            ]}
            disabled={isLoading || disabled}
        >
            {icon && !isLoading && (
                <View style={styles.iconContainer}>
                    {icon}
                </View>
            )}

            {isLoading ? (
                <ActivityIndicator 
                    size="large" 
                    color={indicatorColor} 
                    style={styles.loadingIndicator} 
                />
            ) : (
                <Text maxFontSizeMultiplier={1} style={[
                    styles.text, 
                    textStyles,
                    disabled && styles.disabledText
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: 12,
        minHeight: 55,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 3
    },
    loadingState: {
        backgroundColor: colors.disabled,
        opacity: 0.4
    },
    loadingIndicator: {
        marginHorizontal: 10
    },
    disabledState: {
        // backgroundColor: colors.disabled || '#A1A1A1',
        opacity: 0.3
    },
    disabledText: {
        opacity: 0.7
    },
    text: {
        fontFamily: 'Inter-Semibold',
        letterSpacing: -0.5,
        color: 'white',
        fontSize: fontSize.base,
        textAlign: 'center'
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '15%',
        height: '100%',

    }
});

export default CustomButton;