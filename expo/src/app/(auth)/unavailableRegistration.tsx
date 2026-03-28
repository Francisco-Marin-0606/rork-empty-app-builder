import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Dimensions,
    Platform,
    TouchableOpacity,
    Animated,
    Alert,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    KeyboardAvoidingView,
} from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import CustomButton from '../../components/CustomButton';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { router, useRouter } from 'expo-router';
import FormInput from '@/components/FormInput';
import axios from 'axios';
import { validateField } from '@/helpers/miscellaneous';

const { height } = Dimensions.get('window');

const UnavailableRegistrationScreen: React.FC = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const translateY = useState(new Animated.Value(0))[0];
    const scrollViewRef = useRef<ScrollView>(null);

    // Manejar eventos del teclado
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                Animated.timing(translateY, {
                    toValue: 100, // Reducir el desplazamiento
                    duration: Platform.OS === 'ios' ? 250 : 200,
                    useNativeDriver: true,
                }).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? 250 : 200,
                    useNativeDriver: true,
                }).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [translateY]);

    // Función para hacer scroll hacia el input cuando reciba focus
    const handleInputFocus = () => {
        setTouched(true);
        
        // Hacer scroll hacia abajo para mostrar el input
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 300); // Delay para esperar a que aparezca el teclado
    };

    // Validar email cuando cambie el valor (solo si ya fue tocado)
    useEffect(() => {
        if (touched && email.length > 0) {
            const validationError = validateField({
                name: 'email',
                label: 'Correo electrónico',
                type: 'email',
                required: true,
                minLength: 2,
                maxLength: 50,
                placeholder: 'Tu correo electrónico'
            }, email);
            setError(validationError);
        } else if (!touched || email.length === 0) {
            setError(null);
        }
    }, [email, touched]);

    const handleSubmitEmail = async () => {
        setTouched(true);

        // Validar el email antes de enviar
        const validationError = validateField({
            name: 'email',
            label: 'Correo electrónico',
            type: 'email',
            required: true,
            minLength: 2,
            maxLength: 50,
            placeholder: 'Tu correo electrónico'
        }, email);

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);

        try {
            // Hacer la llamada HTTP POST
            await axios.post(`https://hooks.zapier.com/hooks/catch/17514134/uytf52g/`, {
                email: email.toLowerCase().trim()
            });

            // Si la llamada es exitosa, navegar a confirmedWaitlist
            router.push('/confirmedWaitlist');
        } catch (error) {
            console.error('Error enviando email a waitlist:', error);

            // Mostrar alerta de error
            Alert.alert(
                'Error',
                'No se pudo enviar tu correo. Por favor, intenta de nuevo.',
                [
                    {
                        text: 'Entendido',
                        style: 'default'
                    }
                ]
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = email.length > 0 && !error;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Animated.View style={[styles.content, { transform: [{ translateY }] }]}>
                                <View style={styles.containerBackButton}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => router.back()}
                                >
                                    <IconChevronLeft size={36} color="white" />
                                </TouchableOpacity>
                                </View>

                                <View style={{alignSelf: 'flex-start'}}>
                                    <Text style={styles.title}>
                                        Ya no{'\n'}
                                        puedo{'\n'}
                                        producir más{'\n'}
                                        hipnosis.{'\n'}
                                        De momento.
                                    </Text>
                                </View>

                                <View style={styles.formContainer}>
                                    <View style={styles.messageContainer}>
                                        <Text style={styles.message}>
                                            Si quieres probar, déjame tu correo y te aviso cuando pueda.
                                        </Text>
                                    </View>
                                    
                                    <FormInput
                                        name='emailNotification'
                                        label='Correo electrónico'
                                        type='email'
                                        required={true}
                                        minLength={2}
                                        maxLength={50}
                                        placeholder='Tu correo electrónico'
                                        value={email}
                                        onChange={(value) => setEmail(String(value))}
                                        onFocus={handleInputFocus}
                                        error={error || undefined}
                                        showLabel={false}
                                        isCapitilize={false}
                                        inputBackgroundColor={'#1a1a1a'}
                                        inputTextColor={colors.text}
                                        inputBorderColor={error ? colors.error : 'transparent'}
                                    />
                                </View>

                                <CustomButton
                                    title="Avísame"
                                    handlePress={handleSubmitEmail}
                                    containerStyles={[
                                        styles.startButton,
                                        (!isFormValid || isSubmitting) && styles.disabledButton
                                    ]}
                                    textStyles={styles.startButtonText}
                                    disabled={!isFormValid || isSubmitting}
                                    isLoading={isSubmitting}
                                />
                                
                                {/* Espaciado adicional para el scroll */}
                                <View style={{ height: 100 }} />
                            </Animated.View>
                        </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        height: '100%',
        width: '100%',
        backgroundColor: 'black',
    },
    containerBackButton: {
        width: "100%",
        left: -10,
    },
    backButton: {
        width: 45,
        height: 45,
        padding: 8,
    },
    scrollView: {
        height: '100%',
        width: '100%',
    },
    scrollContent: {
        paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center' // Altura mínima más flexible
    },
    titleContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    title: {
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
        textAlign: 'left',
        letterSpacing: -3.5,
        fontSize: 60,
        lineHeight: 60 * 0.9,
        paddingTop: 60 - (60 * 0.75),
    },
    formContainer: {
        width: '100%',
        marginBottom: 40,
    },
    messageContainer: {
        width: '100%',
        marginBottom: 24,
    },
    message: {
        color: 'white',
        letterSpacing: -1.7,
        fontSize: fontSize.lg,
        fontFamily: 'Geist-Regular',
        textAlign: 'left',
        lineHeight: fontSize.xl * 1.2,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'black',
        paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
        paddingBottom: Platform.OS === 'ios' ? 34 : 0,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    startButton: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    startButtonText: {
        color: 'black',
        fontFamily: 'Geist-SemiBold',
        fontSize: fontSize.base,
    },
});

export default UnavailableRegistrationScreen; 