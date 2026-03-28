import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Keyboard, Animated, TouchableWithoutFeedback } from 'react-native';
import FormInput from './FormInput';
import CustomButton from './CustomButton'
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { FormField } from '@/helpers/types';
import { validateField } from '@/helpers/miscellaneous';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SimpleFormProps {
    fields: FormField[];
    onSubmit: (formData: Record<string, any>) => Promise<void>;
    onCancel?: () => void;
    title?: string;
    initialData?: Record<string, any>; 
    description?: string;
    disableBackButton?: boolean;
    customErrorStyles?: {
        errorText?: any;
        errorContainer?: any;
    };
    themeColors?: {
        background: string;
        text: string;
        textMuted: string;
        border: string;
        inputBackground: string;
        inputText: string;
        inputBorder: string;
        buttonBackground: string;
        buttonText: string;
    };
}

const SimpleForm: React.FC<SimpleFormProps> = ({
    fields,
    onSubmit,
    onCancel,
    title,
    initialData = {},
    description,
    disableBackButton = false,
    customErrorStyles,
    themeColors
}) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Animación para el desplazamiento vertical (igual que FormWizard)
    const contentShiftAnimation = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    // Keyboard event listeners with animations (EXACTAMENTE igual que unavailableRegistration.tsx)
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
                Animated.timing(contentShiftAnimation, {
                    toValue: -120, // Mover hacia arriba cuando aparece el teclado
                    duration: Platform.OS === 'ios' ? 300 : 250,
                    useNativeDriver: true,
                }).start(() => {
                    setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 50);
                });
            },
        );
        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                Animated.timing(contentShiftAnimation, {
                    toValue: 0, // Volver a la posición original
                    duration: Platform.OS === 'ios' ? 300 : 250,
                    useNativeDriver: true,
                }).start();
            },
        );

        return () => {
            keyboardWillShowListener?.remove();
            keyboardWillHideListener?.remove();
        };
    }, [contentShiftAnimation]);

    // Improved handleInputFocus function with animation (EXACTAMENTE igual que unavailableRegistration.tsx)
    const handleInputFocus = () => {
        setTimeout(() => {
            // Animar el contenido hacia arriba
            Animated.timing(contentShiftAnimation, {
                toValue: -120, // Mover hacia arriba cuando se enfoca un input
                duration: Platform.OS === 'ios' ? 300 : 250,
                useNativeDriver: true,
            }).start(() => {
                // Después de la animación, hacer scroll
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 50);
            });
        }, 1);
    };

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};
        let hasErrors = false;
        let allRequiredFieldsFilled = true;

        fields.forEach(field => {
            const value = formData[field.name];
            
            // Verificar validez del formulario siempre (para bloquear envío)
            // Pero solo mostrar errores si se ha tocado o intentado enviar
            
            // Si el campo no es requerido y está vacío, no lo validamos
            if (!field.required && (!value || value.toString().trim() === '')) {
                return;
            }

            const error = validateField(field, value);
            
            if (error) {
                hasErrors = true;
                // Solo mostrar error si se ha intentado enviar
                if (hasAttemptedSubmit) {
                    newErrors[field.name] = error;
                }
            }

            // Verificar campos requeridos vacíos
            if (field.required && (!value || value.toString().trim() === '')) {
                hasErrors = true;
                allRequiredFieldsFilled = false;
                // Solo mostrar error si se ha intentado enviar
                if (hasAttemptedSubmit) {
                    newErrors[field.name] = 'Este campo es requerido';
                }
            }
        });

        // Solo mostrar errores si se ha intentado enviar
        if (hasAttemptedSubmit) {
            setErrors(newErrors);
        } else {
            setErrors({});
        }
        
        const formIsValid = !hasErrors && allRequiredFieldsFilled;
        setIsValid(formIsValid);
        return formIsValid;
    }, [fields, formData, hasAttemptedSubmit]);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    useEffect(() => {
        validateForm();
    }, [formData, validateForm, touchedFields, hasAttemptedSubmit]);

    const handleInputChange = useCallback((fieldName: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
        
        setTouchedFields(prev => ({
            ...prev,
            [fieldName]: true
        }));
    }, []);

    const handleSubmit = async () => {
        setHasAttemptedSubmit(true);
        const allFieldsTouched = fields.reduce((acc, field) => ({
            ...acc,
            [field.name]: true
        }), {});
        setTouchedFields(allFieldsTouched);

        if (!validateForm()) {
            return;
        }

        try {
            setIsSubmitting(true);
            // Filtrar campos vacíos antes de enviar
            const filteredFormData = Object.entries(formData).reduce((acc, [key, value]) => {
                // Convertir a string y verificar si está vacío
                const stringValue = value?.toString().trim();
                if (stringValue !== '' && stringValue !== undefined && stringValue !== null) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, any>);

            await onSubmit(filteredFormData);
        } catch (error) {
            console.error('Error al enviar el formulario:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[
            {width: '100%', height: '100%'},
            themeColors?.background ? { backgroundColor: themeColors.background } : {}
        ]}>
            <KeyboardAvoidingView 
                style={[
                    {flex: 1},
                    themeColors?.background ? { backgroundColor: themeColors.background } : {}
                ]} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={[
                    {flex: 1},
                    themeColors?.background ? { backgroundColor: themeColors.background } : {}
                ]}>
                    <ScrollView 
                        ref={scrollViewRef}
                        style={[
                            styles.container,
                            themeColors?.background ? { backgroundColor: themeColors.background } : {}
                        ]}
                        contentContainerStyle={[
                            styles.contentContainer,
                            { 
                                paddingBottom: keyboardVisible ? 15 : 160, // Minimal padding when keyboard is visible
                                paddingTop: keyboardVisible ? 120 : 8 // Compensar el desplazamiento de la animación (-120px + 20px de margen)
                            },
                            themeColors?.background ? { backgroundColor: themeColors.background } : {}
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        alwaysBounceVertical={true}
                        overScrollMode="always"
                        scrollEnabled={true}
                        bounces={Platform.OS === 'ios'}
                        scrollEventThrottle={16}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <Animated.View
                                style={[
                                    styles.animatedContainer,
                                    { transform: [{ translateY: contentShiftAnimation }] },
                                ]}
                            >
                                {title && (
                                    <View style={styles.titleContainer}>
                                        <View>
                                            <Text maxFontSizeMultiplier={1.1}  
                                                style={[
                                                    styles.title,
                                                    themeColors?.text ? { color: themeColors.text } : {}
                                                ]}
                                            >
                                                {title}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                
                                {description && (
                                    <View style={[
                                        styles.descriptionContainer,
                                        themeColors?.border ? { borderColor: themeColors.border } : {}
                                    ]}>
                                        <Text style={styles.stepDescription}>
                                            {description}
                                        </Text>
                                    </View>
                                )}
                                            

                                <View style={styles.fieldsContainer}>
                                    {fields.map((field) => (
                                        <View key={field.name} style={styles.fieldWrapper}>
                                            <FormInput
                                                {...field}
                                                value={formData[field.name] || ''}
                                                onChange={(value) => handleInputChange(field.name, value)}
                                                onFocus={handleInputFocus}
                                                error={errors[field.name]}
                                                showLabel={true}
                                                inputTextColor={themeColors?.inputText || 'black'}
                                                labelColor={themeColors?.text || 'black'}
                                                inputBorderColor={themeColors?.inputBorder || 'white'}
                                                inputBackgroundColor={themeColors?.inputBackground || '#cccccc50'}
                                                customErrorStyles={customErrorStyles}
                                                themeColors={themeColors}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </ScrollView>
                
                    <Animated.View 
                        style={[
                            styles.buttonContainer,
                            { 
                                transform: [{ translateY: contentShiftAnimation }],
                                backgroundColor: themeColors?.background || '#0A0A0A',
                                position: 'absolute',
                                bottom: keyboardVisible ? (Platform.OS === 'ios' ? -60 : -130) : (Platform.OS === 'ios' ? -20 : -10),
                                left: 0,
                                right: 0,
                                paddingTop: Platform.OS === 'ios' ? 20 : 15,
                                paddingBottom: Platform.OS === 'ios' ? 20 : 15,
                            }
                        ]}
                    >
                        <CustomButton
                            title="Siguiente"
                            handlePress={handleSubmit}
                            containerStyles={[
                                styles.button, 
                                styles.submitButton,
                                themeColors?.buttonBackground ? { backgroundColor: themeColors.buttonBackground } : {}
                            ]}
                            textStyles={{
                                color: themeColors?.buttonText || 'white'
                            }}
                            disabled={!isValid}
                            isLoading={isSubmitting}
                        />
                        {onCancel && (
                            <CustomButton
                                title="Atrás"
                                handlePress={onCancel}
                                containerStyles={[styles.button, styles.cancelButton]}
                                textStyles={{
                                    color: themeColors?.textMuted || '#A1A1AA'
                                }}
                                disabled={disableBackButton}
                            />
                        )}
                    </Animated.View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
       
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
        paddingVertical: 0,
    },
    contentContainer: {
        // padding: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
        paddingBottom: 24,
    },
    animatedContainer: {
        flex: 1,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
        letterSpacing: -2.5,
        color: colors.formTitle,
        textAlign: 'left',
        fontSize: fontSize['4xl'],
        lineHeight: Platform.OS === 'android' ? fontSize['3xl'] * 1.2 : fontSize['3xl'] * 1.1,
        paddingTop: fontSize['3xl'] - (fontSize['3xl'] * 0.75),
    },
    fieldsContainer: {
        gap: 4,
    },
    fieldWrapper: {
        width: '100%',
    },
    buttonContainer: {
        flexDirection: 'column',
        gap: 4,
        paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
        paddingBottom: 0,
        paddingTop: 0,
        justifyContent: 'flex-start',
    },
    button: {
        flex: 1,
        minHeight: 50,
    },
    cancelButton: {
        minHeight: 50,

        backgroundColor: 'transparent',
    },
    submitButton: {
        backgroundColor: 'black',
        minHeight: 50,

    },
    titleContainer: {
        flexDirection: 'column',
        marginBottom: 16,
        gap: 6,
    },
    descriptionContainer: {
        borderLeftWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom:16,     
        paddingLeft: 16,
    },

    stepTitle: {
        fontFamily: 'Geist-SemiBold',
        letterSpacing: -0.5,
        fontSize: fontSize['xl'],
        fontWeight: '700',
        color: colors.formTitle,
        textAlign: 'left',
    },
    stepDescription: {
        justifyContent: 'center',
        fontFamily: 'Inter',
        letterSpacing: -1,
        fontSize: fontSize.sm,
        color: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para subtítulos
        textAlign: 'left',
        lineHeight: 22
    },
});

export default SimpleForm;