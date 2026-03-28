import { colors, fontSize, screenPadding } from '@/constants/tokens';
import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ProgressStepsProps {
    totalSteps: number;
    currentStep: number;
    completedColor?: string;
    activeColor?: string;
    inactiveColor?: string;
    onViewAllPress?: () => void;
    questionText?: string;
    showHeader?: boolean;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ 
    totalSteps, 
    currentStep,
    completedColor = colors.stepCompleted, // Color opaco para pasos completados
    activeColor = colors.stepActive,      // Color actual
    inactiveColor = colors.stepInactive,    // Color inactivo
    onViewAllPress,
    questionText = "PREGUNTA", // Texto predeterminado
    showHeader = false
}) => {
    return (
        <View style={styles.mainContainer}>
            {/* Header con título y botón "Ver todas" */}
            {showHeader && <View style={styles.headerContainer}>
                <Text maxFontSizeMultiplier={1.1}  style={styles.questionText}>
                    {questionText} {currentStep + 1}
                </Text>
                {onViewAllPress && (
                    <TouchableOpacity onPress={onViewAllPress}>
                        <Text maxFontSizeMultiplier={1.1}  style={styles.viewAllText}>Ver todas</Text>
                    </TouchableOpacity>
                )}
            </View>}
            
            {/* Barras de progreso (implementación original) */}
            <View style={styles.container}>
                {Array.from({ length: totalSteps  }).map((_, index) => {
                    let stepStyle;
                    if (index < currentStep) {
                        stepStyle = [styles.step, { backgroundColor: completedColor }];
                    } else if (index === currentStep) {
                        stepStyle = [styles.step, { backgroundColor: activeColor }];
                    } else {
                        stepStyle = [styles.step, { backgroundColor: inactiveColor }];
                    }
                    
                    return (
                        <View
                            key={index}
                            style={[
                                stepStyle,
                                index === 0 && styles.firstStep,
                                index === totalSteps - 1 && styles.lastStep,
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        width: '100%',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: screenPadding.horizontal,
        marginBottom: 0,
    },
    questionText: {
        color: colors.text,
        fontSize: fontSize.sm,
        fontWeight: '600',
        fontFamily: 'RobotoMono-Medium',
        letterSpacing: -0.5,
        marginLeft: 1

    },
    viewAllText: {
        color: colors.primary,
        fontSize: fontSize.sm,
        fontWeight: '600',
        fontFamily: 'RobotoMono-Medium',
        letterSpacing: -0.5
    },
    // Estilos originales
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: screenPadding.horizontal,
        height: 4,
        width: '100%',
        marginVertical: 20,
        // backgroundColor: 'red'
    },
    step: {
        flex: 1,
        height: 2,
        marginHorizontal: 2,
        borderRadius: 2
    },
    // Estilos base movidos a la lógica del componente
    firstStep: {
        borderRadius: 2
    },
    lastStep: {
       borderRadius: 2
    },
});

export default ProgressSteps;