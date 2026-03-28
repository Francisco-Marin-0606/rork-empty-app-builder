import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, Dimensions, LayoutChangeEvent, Modal, SafeAreaView, Alert, Animated } from 'react-native';
import FormInput from './FormInput';
import { FormStep, WizardFormData } from '../helpers/types';
import CustomButton from './CustomButton';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { FormSuccessScreen } from './SuccessScreen';
import { ErrorScreen } from './ErrorScreen';
import ProgressSteps from './ProgressSteps';
import QuestionNavigator from './QuestionNavigator';
import { UserService } from '@/services/api/userService';
import HypnosisReadyScreen from './HypnosisReadyScreen';
import PaywallScreen from './PaywallScreen';
import { BASE_URL } from '@/services/api/config';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import { useFormCache } from '@/hooks/useFormCache';

const height = Dimensions.get('window').height;
const availableHeightForInput = height - (Platform.OS === 'ios' ? 230 : 200);
const maxCharacterCount = 400;

interface FormWizardProps {
    steps: FormStep[];
    onComplete: (formData: WizardFormData) => Promise<boolean>;
    onCancel: () => void;
    confirmModalTitle?: string;
    confirmModalDescription?: string;
    confirmButtonTitle?: string;
    cancelButtonTitle?: string;
    confirmButtonColor?: string;
    cancelButtonColor?: string;
    showConfirmation?: boolean;
    formId?: string;
    themeColors?: any;
}

// User profile form fields
const USER_PROFILE_STEP: FormStep = {
    title: "Estas preguntas\nno son raras.",
    description: "",
    fields: [
        {
            name: "userName",
            label: "¿Cómo quieres que te llame?",
            type: "onlytextrestricted",
            description: "Escríbelo como se lee, y si tiene algún acento raro, márcalo. (Que no es lo mismo Julián, que Julian o Yulian)",
            placeholder: "Escríbelo aquí...",
            maxLength: 15,
            minLength: 2,
            inputPaddingHorizontal: 16,
            textAlignVertical: 'top',
            hideBorder: true,
            hideMaxLength: true,
        },
        {
            name: "gender",
            label: "Eres...",
            type: "segmentedRadio",
            options: [
                { label: "Hombre", value: "Hombre" },
                { label: "Mujer", value: "Mujer" }
            ]
        },
        {
            name: "email",
            label: "Tu correo electrónico",
            type: "email",
            inputPaddingHorizontal: 16,
            hideBorder: true,
            hideMaxLength: true,
            placeholder: "Escribe tu correo aquí...",
            maxLength: 50,
            minLength: 10
        },
        {
            name: "birthDate",
            label: "Fecha de nacimiento",
            type: "date",
            placeholder: "DD / MM / AA"
        }
    ]
};

// Variable global para isLastStep
let isLastStep = false;

const FormWizardOnBoarding: React.FC<FormWizardProps> = ({
    steps,
    onComplete,
    onCancel,
    confirmModalTitle = "Estas son las respuestas que quieres enviar, ¿cierto?",
    confirmModalDescription = "Una vez enviadas, no podrás cambiarlas.",
    confirmButtonTitle = "Enviar sin miedo",
    cancelButtonTitle = "Revisar respuestas",
    confirmButtonColor,
    cancelButtonColor,
    showConfirmation = true,
    formId = 'onboarding_form',
    themeColors
}) => {
    // Use the form cache hook
    const { formData, currentStep, isLoadingCache, updateFormData, updateCurrentStep, clearCache } = useFormCache({ formId });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showUserProfileForm, setShowUserProfileForm] = useState(false);
    const [showHypnosisReady, setShowHypnosisReady] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [keyHeight, setKeyboardHeight] = useState(0);
    const [scrollViewHeight, setScrollViewHeight] = useState(0);
    const [scrollViewY, setScrollViewY] = useState(0);
    const [activeInputField, setActiveInputField] = useState<string | null>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [allowAutoScroll, setAllowAutoScroll] = useState(false);
    
    // Animación para el desplazamiento vertical
    const contentShiftAnimation = useRef(new Animated.Value(0)).current;
    
    // Combine original steps with the user profile step
    const allSteps = useMemo(() => {
        // Add user profile as the last step
        return [...steps, USER_PROFILE_STEP];
    }, [steps]);

    const scrollViewRef = useRef<ScrollView>(null);
    const inputRefs = useRef<Record<string, { y: number }>>({});
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setKeyboardVisible(true);
                setKeyboardHeight(event.endCoordinates.height);
                setAllowAutoScroll(true); // Permitir auto-scroll cuando aparece el teclado
                // Animar el contenido hacia arriba cuando aparece el teclado
                const duration = 1;
                Animated.timing(contentShiftAnimation, {
                    toValue: 0,
                    duration: duration,
                    useNativeDriver: true
                }).start(() => {
                    setTimeout(() => {
                        if (!isLastStep) {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                        }
                    }, 1);
                });
            }
        );
        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                setKeyboardVisible(false);
                setAllowAutoScroll(false); // Deshabilitar auto-scroll cuando se oculta el teclado
                const duration = 1;
                // Regresar el contenido a su posición original cuando se oculta el teclado
                Animated.timing(contentShiftAnimation, {
                    toValue: 0,
                    duration: duration,
                    useNativeDriver: true
                }).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    // Función para detectar si un input está visible en la pantalla
    const isInputVisible = useCallback((fieldName: string): boolean => {
        const inputInfo = inputRefs.current[fieldName];
        if (!inputInfo || !scrollViewHeight) return true; // Asumir visible si no hay info

        const inputPosition = inputInfo.y;
        const visibleAreaTop = scrollViewY;
        const visibleAreaBottom = scrollViewY + scrollViewHeight - (keyHeight + 100); // Agregar margen adicional

        return inputPosition >= visibleAreaTop && inputPosition <= visibleAreaBottom;
    }, [scrollViewHeight, scrollViewY, keyHeight]);

    // Función para hacer scroll hacia un input específico
    const scrollToInput = useCallback((fieldName: string) => {
        if (isUserScrolling || !allowAutoScroll) return; // No hacer auto-scroll si el usuario está scrolleando

        const inputInfo = inputRefs.current[fieldName];
        if (!inputInfo) return;

        // Hacer scroll suave hacia el input
        setTimeout(() => {
            if (!isLastStep) {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            } else {
                scrollViewRef.current?.scrollTo({y: fieldName === 'email' ? 350 : 100, animated: true });
            }
        }, 200);
    }, [isUserScrolling, allowAutoScroll]);

    const handleInputChange = useCallback((fieldName: string, value: any) => {
        updateFormData(fieldName, value);
        
        // Limpiar el error cuando el usuario empiece a escribir
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }

        // Auto-scroll solo si el input no está visible, hay teclado, y está permitido
        if (keyboardVisible && allowAutoScroll && activeInputField === fieldName && !isInputVisible(fieldName)) {
            scrollToInput(fieldName);
        }
    }, [errors, keyboardVisible, allowAutoScroll, activeInputField, isInputVisible, scrollToInput, updateFormData]);

    // Improved handleInputFocus function
    const handleInputFocus = (fieldName: string) => {
        setActiveInputField(fieldName);
        setIsUserScrolling(false); // Resetear el estado cuando se enfoca un input
        setTimeout(() => {
            const inputInfo = inputRefs.current[fieldName];
            if (!inputInfo) return;

            // Animar el contenido hacia arriba
            Animated.timing(contentShiftAnimation, {
                toValue: -50,
                duration: 1,
                useNativeDriver: true
            }).start(() => {
                // Después de la animación, hacer scroll al final
                setTimeout(() => {
                    if(!isLastStep) {
                        scrollViewRef.current?.scrollTo({y: 0, animated: true });
                    } else {
                        scrollViewRef.current?.scrollTo({y: fieldName === 'email' ? 350 : 100, animated: true });
                    }
                }, 1);
            });
        }, 1);
    };

    const handleLayout = (fieldName: string) => (event: LayoutChangeEvent) => {
        const { y } = event.nativeEvent.layout;
        inputRefs.current[fieldName] = { y };
    };

    const handleContentLayout = (event: LayoutChangeEvent) => {
        setContentHeight(event.nativeEvent.layout.height);
        isLastStep = currentStep === allSteps.length - 1;
        if(isLastStep) {
            scrollViewRef.current?.scrollTo({y: 0, animated: true });
        }
    };

    const handleScrollViewLayout = (event: LayoutChangeEvent) => {
        setScrollViewHeight(event.nativeEvent.layout.height);
    };

    const handleScroll = (event: any) => {
        setScrollViewY(event.nativeEvent.contentOffset.y);
        
        // Detectar cuando el usuario está scrolleando manualmente
        setIsUserScrolling(true);
        
        // Resetear el estado después de un breve período sin scroll
        setTimeout(() => {
            setIsUserScrolling(false);
        }, 500);
    };

    const handleScrollBeginDrag = () => {
        setIsUserScrolling(true);
    };

    const handleScrollEndDrag = () => {
        setTimeout(() => {
            setIsUserScrolling(false);
        }, 300);
    };
    

    const validateCurrentStep = (): boolean => {
        const currentStepFields = allSteps[currentStep]?.fields || [];
        const newErrors: Record<string, string> = {};
        let isValid = true;

        currentStepFields.forEach(field => {
            // Skip validation for optional fields
            if (field.optional) {
                return;
            }

            const value = formData[field.name];
            const stringValue = String(value || '');

            if (!stringValue.trim()) {
                newErrors[field.name] = 'Este campo es obligatorio';
                isValid = false;
            } else if (field.minLength && stringValue.length < field.minLength) {
                newErrors[field.name] = `Mínimo ${field.minLength} caracteres`;
                isValid = false;
            } else if (field.maxLength && stringValue.length > field.maxLength) {
                newErrors[field.name] = `Máximo ${field.maxLength} caracteres`;
                isValid = false;
            }

            // Validación específica para emails
            if (field.type === 'email' && stringValue.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(stringValue)) {
                    newErrors[field.name] = 'Ingresa un correo electrónico válido';
                    isValid = false;
                }
            }
        });
        setErrors(newErrors);
        return isValid;
        
    };

    const heightInput = () : number => {
        return availableHeightForInput - keyHeight ;
    }

    const handleSubmitForm = async () => {
        if (isSubmitting) return; // Prevenir múltiples envíos

        // Ensure all optional empty fields have an empty string
        const currentFormData = { ...formData };
        allSteps.forEach(step => {
            step.fields.forEach(field => {
                if (field.optional && (currentFormData[field.name] === undefined || currentFormData[field.name] === null)) {
                    currentFormData[field.name] = '';
                }
            });
        });

        // Clear cache when form is successfully submitted
        try {
            await clearCache();
            console.log('[FormWizardOnBoarding] Caché limpiado exitosamente');
        } catch (error) {
            console.error('[FormWizardOnBoarding] Error al limpiar caché:', error);
        }

        // Ya no ejecutamos onComplete aquí, solo ocultamos el modal y mostramos HypnosisReadyScreen
        setShowConfirmModal(false);
        setShowHypnosisReady(true);
    };

    const handleCancel = () => {
        const isCurrentStepValid = currentStepFields.every(field => {
            if (field.optional) return true;
            const value = String(formData[field.name] || '').trim();
            return value.length > 0;
        });

        console.log('isCurrentStepValid', isCurrentStepValid);

        if (isCurrentStepValid) {
            Alert.alert("¿Deseas responder estas preguntas luego?", "", [
                {
                    text: "No",
                    style: "cancel",
                    onPress: () => {
                        // No hacer nada, solo cerrar la alerta
                    }
                },
                {
                    text: "Sí",
                    style: "destructive",
                    onPress: () => onCancel()
                }
            ]);
        } else {
            onCancel();
        }
    }


    const handleNext = async () => {
        if (!validateCurrentStep()) {
            return;
        }

        if (currentStep === allSteps.length - 1) {
            // Mostrar indicador de carga mientras verifica el email
            setIsSubmitting(true);

            // Verificar si el email ya existe en la base de datos
            try {
                const email = formData.email;
                if (email) {
                    const emailExists = await UserService.emailExist(email.toString().toLowerCase());
                    await axios.post(`${BASE_URL}user/onboardingMailRegister`, {
                        email: email,
                        language: 'es'
                      });
                    if (emailExists) {
                        // Si el email existe, mostrar un error
                        setErrors(prev => ({
                            ...prev,
                            email: 'Este correo ya está registrado, inicia sesión.'
                        }));
                        // Quitar indicador de carga
                        setIsSubmitting(false);
                        return;
                    }
                }

                // Quitar indicador de carga
                setIsSubmitting(false);

                // Continuar con el proceso normal si el email no existe
                if (showConfirmation) {
                    // Show confirmation modal instead of submitting directly
                    setShowConfirmModal(true);
                } else {
                    // Skip confirmation and submit directly
                    handleSubmitForm();
                }
            } catch (error) {
                console.error('Error verificando email:', error);
                // Quitar indicador de carga
                setIsSubmitting(false);

                // Mostrar alerta al usuario sobre el problema de conexión
                Alert.alert(
                    "Error de conexión",
                    "No pudimos verificar tu correo electrónico debido a un problema de conexión. Verifica tu conexión a internet e intenta nuevamente.",
                    [
                        {
                            text: "Entendido",
                            style: "default"
                        }
                    ]
                );
            }
        } else {
            await updateCurrentStep(currentStep + 1);
        }
    };

    const handleBack = async () => {
        if (currentStep === 0) {
            handleCancel();
        } else {
            await updateCurrentStep(currentStep - 1);
        }
    };

    const handleCloseSuccess = () => {
        setShowSuccess(false);
        onCancel();
    };

    const handleCloseError = () => {
        setShowError(false);
        onCancel();
    };

    // Validación de seguridad para el paso actual
    const currentStepIndex = Math.min(Math.max(0, currentStep), allSteps.length - 1);
    const currentStepData = allSteps[currentStepIndex];
    const currentStepFields = currentStepData?.fields || [];

    const getCharacterCount = (value: any): number => {
        if (value == null) return 0;
        return String(value).length;
    };

    // Verificar si el paso actual está completo
    const isCurrentStepValid = useMemo(() => {
        return currentStepFields.every(field => {
            // Skip validation for optional fields
            if (field.optional) return true;

            const value = String(formData[field.name] || '').trim();
            return value.length > 0;
        });
    }, [currentStepFields, formData]);

    const handleSelectQuestion = async (index: number) => {
        await updateCurrentStep(index);
    };

    const handleHypnosisReadyContinue = () => {
        setShowHypnosisReady(false);
        setShowPaywall(true);
    };

    const handleOnBack = () => {
        setShowPaywall(false);
    }

    const handlePaywallComplete = () => {
        setShowPaywall(false);
    };

    if (showSuccess) {
        return <FormSuccessScreen onClose={handleCloseSuccess} />;
    }

    if (showError) {
        return (
            <ErrorScreen
                onClose={handleCloseError}
                errorTitle="Es broma, algo falló en el sistema. Intenta de nuevo."
                errorMessage="Sí, ya sé… tienes que escribir todo otra vez. Pero si pasó, es por algo. Confía."
                buttonTitle='Volver al mundo'
            />
        );
    }

    if (showPaywall) {
        return <PaywallScreen
            onComplete={handlePaywallComplete}
            formData={formData}
            onBack={handleOnBack}
         />;
    }

    if (showHypnosisReady) {
        return (
            <HypnosisReadyScreen
                onContinue={handleHypnosisReadyContinue}
                onComplete={onComplete}
                formData={formData}
            />
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: themeColors?.background || colors.formBackground }}>
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.keyboardAvoidingView, { backgroundColor: themeColors?.background || colors.formBackground }]}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 :  keyboardVisible  ? 50 : 0}
            enabled={true}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.mainContainer}>
                    {!isLastStep && (
                        <Animated.View
                            style={[
                                styles.progressContainer,
                                { 
                                    transform: [{ translateY: contentShiftAnimation }],
                                    backgroundColor: themeColors?.background || colors.formBackground 
                                }
                            ]}
                        >
                            <ProgressSteps
                                totalSteps={allSteps.length - 1}
                                currentStep={currentStep}
                                onViewAllPress={() => setShowQuestionNavigator(true)}
                            />
                        </Animated.View>
                    )}
                    
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={[
                            styles.scrollViewContent,
                            { minHeight: contentHeight }
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        alwaysBounceVertical={true}
                        overScrollMode="always"
                        scrollEnabled={true}
                        bounces={true}
                        scrollEventThrottle={16}
                        onLayout={handleScrollViewLayout}
                        onScroll={handleScroll}
                        onScrollBeginDrag={handleScrollBeginDrag}
                        onScrollEndDrag={handleScrollEndDrag}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <Animated.View
                                style={[
                                    styles.contentContainer,
                                    { transform: [{ translateY: contentShiftAnimation }] }
                                ]}
                                onLayout={handleContentLayout}
                            >
                                {/* Hide title and description when keyboard is visible for cleaner UI */}
                                {!keyboardVisible && (
                                    <View style={{ flex: 0, paddingTop: isLastStep ? 60: 0 }}>
                                        {currentStepData?.title && (
                                            <View style={styles.titleContainer}>
                                                {currentStepData.header && (
                                                    <Text style={styles.optionalLabel}>{currentStepData.header}</Text>
                                                )}
                                                {currentStepData.title.split('\n').map((textPart, index) => (
                                                    textPart.trim() ? (
                                                    <View key={`title-part-${index}`} >
                                                        <Text 
                                                            maxFontSizeMultiplier={1} 
                                                            style={[styles.stepTitle, { color: themeColors?.text || colors.formTitle }]}
                                                        >
                                                            {textPart}
                                                        </Text>
                                                    </View>
                                                    ) : null
                                                ))}
                                            </View>
                                        )}

                                        {currentStepData?.description && (
                                            <View style={styles.descriptionContainer}>
                                                <Markdown style={markdownStyles}>
                                                    {currentStepData.description}
                                                </Markdown>
                                            </View>
                                        )}
                                    </View>
                                )}
                        
                                <View style={[styles.fieldsContainer, { flex: 1, height: (keyboardVisible && !isLastStep) ? heightInput() : 'auto' }]}>
                                    {currentStepFields.map((field) => (
                                        <View
                                            key={field.name}
                                            style={styles.fieldWrapper}
                                            onLayout={handleLayout(field.name)}
                                        >
                                            <FormInput
                                                {...field}
                                                value={formData[field.name] ?? ''}
                                                onChange={(value) => handleInputChange(field.name, value)}
                                                error={errors[field.name]}
                                                onFocus={() => handleInputFocus(field.name)}
                                                themeColors={themeColors}
                                                inputBackgroundColor={themeColors ? (isLastStep ? '#1A1A1A' : themeColors.inputBackground || '#0A0A0A') : (isLastStep ? '#dbdbdb' : 'white')}
                                                inputTextColor={themeColors ? themeColors.inputText || '#FFFFFF' : 'black'}
                                                labelColor={themeColors ? themeColors.text || '#FFFFFF' : 'black'}
                                                hideBorder={field.hideBorder || false}
                                                inputPaddingHorizontal={field.inputPaddingHorizontal || 0}
                                                inputBorderColor={themeColors ? themeColors.inputBorder || '#333333' : 'black'} 
                                                inputHeight={field.inputHeight || (isLastStep ? 'auto' : 200)}
                                                margin={{
                                                    bottom: isLastStep ? 0 : 40,
                                                }}
                                                showLabel={isLastStep ? true : false}
                                            />
                                            {field.hideMaxLength !== true && field.type !== 'date' && field.type !== 'segmentedRadio' && (
                                                <View style={{ 
                                                    marginTop: 10,
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0}}>
                                                      <Text maxFontSizeMultiplier={1.1} style={styles.characterCount}>
                                                    {getCharacterCount(formData[field.name])}/{field.maxLength || maxCharacterCount }
                                                </Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </ScrollView>
                    
                    <View style={[styles.buttonContainer, { backgroundColor: themeColors?.background || colors.formBackground }]}>
                        <CustomButton
                            title={isLastStep ? 'Enviar' : 'Siguiente'}
                            handlePress={handleNext}
                            containerStyles={[
                                styles.button,
                                isCurrentStepValid 
                                    ? { backgroundColor: themeColors?.buttonBackground || '#F2741B' }
                                    : styles.disabledButton
                            ]}
                            textStyles={{ color: colors.formNextButtonText }}
                            disabled={!isCurrentStepValid || isSubmitting}
                            isLoading={isLastStep && isSubmitting}
                            indicatorColor={colors.primary}

                        />
                        <CustomButton
                            title="Atrás"
                            handlePress={handleBack}
                            containerStyles={[styles.button, styles.backButton]}
                            textStyles={styles.backButtonText}
                            indicatorColor={colors.primary}

                        />
                    </View>
                </View>
            </SafeAreaView>

            {/* Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showConfirmModal}
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.modalTitle}>¿Todo listo?</Text>
                        </View>

                        <View style={styles.modalButtonContainer}>
                            <CustomButton
                                title="Enviar mis respuestas"
                                handlePress={() => {
                                    setShowConfirmModal(false);
                                    handleSubmitForm();
                                }}
                                containerStyles={styles.modalConfirmButton}
                                textStyles={styles.modalConfirmButtonText}
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            />
                            <CustomButton
                                handlePress={() => setShowConfirmModal(false)}
                                containerStyles={styles.modalCancelButton}
                                title="Revisar respuestas"
                                textStyles={{ color: colors.tertiary }}
                            >
                            </CustomButton>
                        </View>
                    </View>
                </View>
            </Modal>

            <QuestionNavigator
                isVisible={showQuestionNavigator}
                onClose={() => setShowQuestionNavigator(false)}
                steps={allSteps}
                currentStepIndex={currentStep}
                onSelectQuestion={handleSelectQuestion}
            />
        </KeyboardAvoidingView>
        </View>
    );
};


const markdownStyles = {
    body: {
        lineHeight: 25,
        fontSize: fontSize.sm,
        color: 'rgba(255, 255, 255, 0.3)',
        letterSpacing: -0.5,
    },
    italic: {
        fontFamily: 'Inter-Italic',
    },
    normal: {
        fontFamily: 'Inter',
    },
    bold: {
        fontFamily: 'Inter-Bold',
    },
  };
  
const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
        backgroundColor: colors.formBackground,
    },
    mainContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollViewContent: {
        flexGrow: 1,
        width: '100%',
        paddingBottom: 70,
        justifyContent: 'center',
        paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos
    },
    contentContainer: {
        paddingBottom: 16,
        flex: 1,
        flexDirection: 'column',
    },
    stepTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
        letterSpacing: -2.5,
        color: colors.formTitle,
        textAlign: 'left',
        fontSize: fontSize['4xl'],
        lineHeight: Platform.OS === 'android' ? fontSize['3xl'] * 1.2 : fontSize['3xl'] * 1.1,
        paddingTop: fontSize['3xl'] - (fontSize['3xl'] * 0.75),
    },
    descriptionContainer: {
        borderLeftWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        paddingLeft: 16,
    },
    stepDescription: {
        lineHeight: 25,
        fontSize: fontSize.sm,
        fontFamily: 'Geist-Regular',
        color: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para subtítulos
        fontWeight: '500',
        textAlign: 'left',
        letterSpacing: -1,
    },
    fieldsContainer: {
        marginBottom: 24,
    },
    fieldWrapper: {
        marginBottom: 16,
        flex: 1,
        position: 'relative',
    },
    characterCount: {
        fontSize: fontSize.xs || 12,
        color: colors.textMuted,
        textAlign: 'right',
        marginTop: 10,
        paddingRight: 4,
    },
    errorText: {
        fontSize: fontSize.xs || 12,
        color: colors.error || '#FF3B30',
        marginTop: 4,
        marginLeft: 4,
    },
    buttonContainer: {
        flexDirection: 'column',
        backgroundColor: 'white',
        paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
        position: 'absolute',
        bottom: 0,
        paddingTop: 20,
        width: '100%',
    },
    button: {
        flex: 1,
        minHeight: 50,
        borderRadius: 12,
    },
    backButton: {
        backgroundColor: colors.formBackButton || 'transparent',
    },
    nextButton: {
        backgroundColor: colors.formNextButton || 'black',
    },
    disabledButton: {
        backgroundColor: '#808080',
    },
    progressContainer: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: colors.formBackground,
        zIndex: 1,
        width: '50%',
        alignSelf: 'center',
    },
    titleContainer: {
        flexDirection: 'column',
        marginBottom: 32,
    },
    seeAllText: {
        color: colors.primary,
        fontSize: fontSize.sm,
        fontFamily: 'Geist-SemiBold',
        fontWeight: '600',
    },
    optionalLabel: {
        color: colors.textMutedVisible,
        fontSize: fontSize.sm,
        marginBottom: 4,
        fontFamily: 'Geist-Regular',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgb(0, 0, 0)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'black',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    modalTitle: {
        fontFamily: 'Geist-SemiBold',
        fontSize: 48,
        color: 'white',
        textAlign: 'center',
        letterSpacing: -1.5,
    },
    modalButtonContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        gap: 8,
        marginBottom: Platform.OS === 'ios' ? 30 : 0,
    },
    modalConfirmButton: {
        borderRadius: 12,
        minHeight: 50,
        backgroundColor: 'white',
        width: '100%',
    },
    modalConfirmButtonText: {
        color: 'black',
        fontWeight: '600',
    },
    modalCancelButton: {
        width: '100%',
        backgroundColor: 'transparent',
    },
    modalCancelButtonText: {
        color: 'white',
        fontSize: fontSize.sm,
        fontFamily: 'Geist-Regular',
    },
    backButtonText: {
        color: 'white',
    },
});

export default FormWizardOnBoarding;

