import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableOpacity, 
    Dimensions, 
    Animated, 
    TouchableWithoutFeedback,
    PanResponder,
    Easing
} from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { FormStep } from '@/helpers/types';
import { Ionicons } from '@expo/vector-icons';

interface QuestionNavigatorProps {
    isVisible: boolean;
    onClose: () => void;
    steps: FormStep[];
    currentStepIndex: number;
    onSelectQuestion: (index: number) => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.35; // Reduced height

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
    isVisible,
    onClose,
    steps,
    currentStepIndex,
    onSelectQuestion,
}) => {
    const [activeIndex, setActiveIndex] = useState(currentStepIndex);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const handleCloseMenu = () => {
        // Animate closing
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) { // Only allow downward drag
                    slideAnim.setValue(gestureState.dy);
                    // Calculate backdrop opacity based on drag position
                    const newOpacity = Math.max(0, 1 - (gestureState.dy / (SCREEN_HEIGHT * 0.4)));
                    backdropOpacity.setValue(newOpacity);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) { // Threshold to close
                    // Close the menu if dragged down far enough
                    handleCloseMenu();
                } else {
                    // Otherwise snap back to open position
                    Animated.parallel([
                        Animated.spring(slideAnim, {
                            toValue: 0,
                            useNativeDriver: true,
                        }),
                        Animated.timing(backdropOpacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (isVisible) {
            // Animate opening
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 650,
                    useNativeDriver: true,
                    easing: Easing.bezier(0.34, 1.20, 0.64, 1),
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                    easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
                }),
            ]).start();
        } else {
            // Reset animations when not visible
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);
        }
    }, [isVisible]);

    const handleNext = () => {
        if (activeIndex < steps.length - 1) {
            setActiveIndex(activeIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }
    };

    const handleRespond = () => {
        onSelectQuestion(activeIndex);
        handleCloseMenu();
    };

    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="none"
            onRequestClose={handleCloseMenu}
        >
            <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={handleCloseMenu}>
                    <Animated.View 
                        style={[
                            styles.modalOverlay,
                            { opacity: backdropOpacity }
                        ]}
                    />
                </TouchableWithoutFeedback>
                
                <Animated.View 
                    style={[
                        styles.modalContent,
                        {
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Pill Indicator */}
                    <View style={styles.pillIndicator} />

                    {/* Question Counter */}
                    <Text style={styles.questionCounter}>
                        PREGUNTA {activeIndex + 1}
                    </Text>

                    {/* Question Content */}
                    <View style={styles.mainContainer}>
                        <TouchableOpacity 
                            onPress={handlePrevious}
                            style={[styles.navButton, activeIndex === 0 && styles.navButtonDisabled]}
                            disabled={activeIndex === 0}
                        >
                            <Ionicons 
                                name="chevron-back" 
                                size={32} 
                                color={activeIndex === 0 ? colors.textMuted : colors.text} 
                            />
                        </TouchableOpacity>

                        <View style={styles.questionContainer}>
                            <Text style={styles.questionTitle}>
                                {steps[activeIndex]?.title || ''}
                            </Text>
                        </View>

                        <TouchableOpacity 
                            onPress={handleNext}
                            style={[styles.navButton, activeIndex === steps.length - 1 && styles.navButtonDisabled]}
                            disabled={activeIndex === steps.length - 1}
                        >
                            <Ionicons 
                                name="chevron-forward" 
                                size={32} 
                                color={activeIndex === steps.length - 1 ? colors.textMuted : colors.text} 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Respond Button */}
                    {/* <TouchableOpacity 
                        style={styles.respondButton}
                        onPress={handleRespond}
                    >
                        <Text style={styles.respondButtonText}>Responder</Text>
                    </TouchableOpacity> */}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: colors.screenBackground,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: screenPadding.horizontal,
        paddingBottom: 24,
        height: MODAL_HEIGHT,
    },
    pillIndicator: {
        width: 80,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    questionCounter: {
        color: colors.tertiary,
        fontSize: fontSize.sm,
        fontFamily: 'Inter-Regular',
        textAlign: 'center',
        marginTop: 12,
        letterSpacing: 1,
        opacity: 0.8,
    },
    mainContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
    },
    questionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // paddingHorizontal: 10,
    },
    questionTitle: {
        color: colors.text,
        fontSize: fontSize.base,
        fontFamily: 'Geist-SemiBold',
        textAlign: 'center',
        letterSpacing: -0.5,
        fontWeight: '600',
    },
    navButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    respondButton: {
        backgroundColor: colors.primary,
        paddingVertical: 9,
        borderRadius: 9,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
    },
    respondButtonText: {
        color: colors.text,
        fontSize: fontSize.lg,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default QuestionNavigator; 