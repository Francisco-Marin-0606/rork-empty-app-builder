import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    NativeSyntheticEvent,
    TextInputKeyPressEventData,
    StyleProp,
    TextStyle,
    BackHandler,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Dimensions,
    ScrollView,
    StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import CustomButton from '@/components/CustomButton';
import { useAuthStore } from '@/store/authStore';
import { IconChevronLeft, IconProgressCheck } from '@tabler/icons-react-native';
import { ResizeMode, Video } from 'expo-av';
import { defaultStyles } from '@/styles';

interface VerificationScreenProps {
    onCodeComplete?: (code: string) => void;
    codeLength?: number;
}

type VerificationParams = {
    email: string;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

const VerificationScreen: React.FC<VerificationScreenProps> = ({
    onCodeComplete,
    codeLength = 4,
}) => {
    const [code, setCode] = useState<string[]>(Array(codeLength).fill(''));
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRefs = useRef<Array<TextInput | null>>([]);
    const { signIn, getCode } = useAuthStore();

    const params = useLocalSearchParams<VerificationParams>();

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [countdown]);

    const handleCodeChange = (text: string, index: number): void => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < codeLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (
        e: NativeSyntheticEvent<TextInputKeyPressEventData>,
        index: number
    ): void => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const getInputStyle = (index: number, digit: string): StyleProp<TextStyle> => {
        const baseStyle = styles.codeInput;
        const filledStyle = digit ? styles.filledInput : {};
        const activeStyle = index === code.findIndex(d => d === '') ? styles.activeInput : {};

        return [baseStyle, filledStyle, activeStyle];
    };

    const isCodeComplete = code.every(digit => digit !== '');

    const handleVerifyPress = async () => {
        try {
            if (isCodeComplete) {
                const completeCode = code.join('');

                onCodeComplete?.(completeCode);

                if (!params.email) {
                    setError('Error al verificar el código, inténtelo nuevamente.');
                    return;
                }

                setIsSubmitting(true);
                setError(null);
                const email = params.email.split("?")[0];
                await signIn({
                    loginCode: completeCode.toString(),
                    email: email
                });
            }
        } catch (err: any) {
            if (err.status == 401) setError('No era probable, pero te equivocaste, o pasaron más de 555 segundos, checa de nuevo.');
            if (err.status == 503) setError('Error de conexión, inténtelo nuevamente.');
            setCode(Array(codeLength).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackPress = () => {
        useAuthStore.setState({ isInVerificationFlow: false });
        router.back();
    };

    const handleResendCode = async () => {
        try {
            if (countdown === 0) {
                await getCode({ email: params.email });
                setCountdown(60);
            }
        } catch (error) {
            //console.log('Error en el login:', error);
        }
    };

    const formatTime = (seconds: number): string => {
        return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    };

    useFocusEffect(
        React.useCallback(() => {
            const handleBackPress = () => {
                useAuthStore.setState({ isInVerificationFlow: false });
                router.back();
                return true;
            };

            if (Platform.OS === 'android') {
                BackHandler.addEventListener('hardwareBackPress', handleBackPress);

                return () => {
                    BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
                };
            }
        }, [])
    );

    return (
        <SafeAreaView style={defaultStyles.androidSafeArea}>
                               {/* <View style={{ position: 'absolute', top:0, left:0, right:0, bottom:0, zIndex: -1, opacity: 0.2}}>
                    <FastImage
                                    style={{ height: '100%', width: '100%' }}
                                    source={require('@/assets/Images/verification.png')}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                    </View> */}
             
                    {/* <View style={styles.titleContainer}>
                        <Text maxFontSizeMultiplier={1} style={styles.headerTitle}>Verifica tu identidad</Text>
                    </View> */}

            <StatusBar
                style="light"
                backgroundColor="transparent"
                translucent={true}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                
                <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackPress}
                    >
                        <IconChevronLeft  size={32} color={colors.icon} />
                    </TouchableOpacity>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                   
 
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.content}>
                            <View style={styles.checkmarkContainer}>
                                <View>
                                {/* <FastImage
                                    style={{ width: 250, height: 250 }}
                                    source={require('@/assets/Images/mail_animation.mp4')}
                                    resizeMode={FastImage.resizeMode.contain}
                                /> */}

                        <Video
                                source={require('@/assets/Images/mail_animation.mp4')}
                                resizeMode={ResizeMode.COVER}   
                                style={{ width: Platform.OS === 'ios' ? 225 : 250, height: Platform.OS === 'ios' ? 225 : 250 }}
                                shouldPlay
                                isLooping
                                isMuted
                            />
                                </View>
                            </View>

                            <Text maxFontSizeMultiplier={1} style={styles.title}>
                                Ingresa el código{'\n'}que llegó a tu correo
                            </Text>

                            <Text maxFontSizeMultiplier={1} style={styles.subtitle}>
                                Tiene cuatro dígitos. {'\n'}Y una duración de 555 segundos.{'\n'}(No hagas la cuenta, te sobra tiempo)
                               
                            </Text>

                            <View style={styles.codeContainer}>
                                {code.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => (inputRefs.current[index] = ref)}
                                        style={getInputStyle(index, digit)}
                                        value={digit}
                                        onChangeText={(text) => handleCodeChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="numeric"
                                        maxLength={1}
                                        selectionColor={'white'}
                                        testID={`code-input-${index}`}
                                    />
                                ))}
                            </View>

                            <CustomButton
                                title="Verificar"
                                handlePress={handleVerifyPress}
                                disabled={!isCodeComplete || isSubmitting}
                                containerStyles={[
                                    styles.verifyButton,
                                    (!isCodeComplete || isSubmitting) && styles.verifyButtonDisabled
                                ]}
                                textStyles={ (!isCodeComplete || isSubmitting) ? { color: colors.textMuted} : { color: 'white'}}
                                isLoading={isSubmitting}
                            />

                            {error && (
                                <Text maxFontSizeMultiplier={1} style={styles.errorMessage}>
                                    {typeof error === 'string' ? error : ''}
                                </Text>
                            )}

                            <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
                                {/* <Text maxFontSizeMultiplier={1} style={[styles.info, { marginTop: 14 }]}>
                                    ¿No has recibido tú código?
                                </Text> */}
                                <TouchableOpacity
                                    onPress={handleResendCode}
                                    disabled={countdown > 0}
                                    style={{ margin: 0, padding: 0, marginTop: 20 }}
                                >
                                    <Text maxFontSizeMultiplier={1} style={[
                                        styles.resend,
                                        countdown > 0 && styles.resendDisabled
                                    ]}>
                                        {countdown > 0 ? ` (${formatTime(countdown)})` : 'Reenviar código'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        marginTop: 30,
        paddingBottom: 300,

    },

    header: {
        paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
        height: Platform.OS === 'ios' ? 50 : 100,
        flexDirection: 'row',
        alignItems: 'center',
 
    },
    backButton: {
        width: 45,
        height: 45,
        zIndex: 9999,
        alignSelf: 'flex-end',
        position: 'absolute',
        top: 42,
        left: 41,
        padding: 0,

    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'RobotoMono-Medium',
        letterSpacing: -0.5,
        color: colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    backButtonText: {
        fontSize: fontSize.lg,
        color: '#ffffff',
    },
    content: {
        paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
        paddingTop: 63,
    },
    checkmarkContainer: {
        alignItems: 'center',

    },
    checkmark: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary || '#FF9F40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: 'red1',
        fontSize: 30,
    },
    title: {
        fontFamily: 'Geist-Semibold',
        letterSpacing: -2.5,
        lineHeight: 42,
        color: colors.text,
        fontSize: Platform.OS === 'ios' ? fontSize['3.5xl'] : fontSize['3.5xl'],
        textAlign: 'center',
        marginBottom:  15,
    },
    subtitle: {
        fontFamily: 'Geist-Medium',
        letterSpacing: 0,
        color: colors.tertiary,
        fontSize: Platform.OS === 'ios' ? 19 : 17,
        textAlign: 'center',
 
    },
    info: {
        fontFamily: 'Geist-Medium',
        letterSpacing: -1.7,
        fontSize: fontSize.base,
        color: colors.tertiary,
        textAlign: 'center',
        marginBottom: 10,
    },
    resend: {
        fontFamily: 'Inter-Semibold',
        letterSpacing: -1.2,
        fontSize: fontSize.base,
        color: colors.text,
        textAlign: 'center',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 25
    },
    codeInput: {
        width: 55,
        height: 55,
        borderColor: '#ddd',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: fontSize.lg,
        fontFamily: 'Geist-Medium',
        backgroundColor: colors.gray || '#191919',
        color: colors.text
    },
    filledInput: {
        backgroundColor: colors.gray || '#191919',
    },
    activeInput: {
        // borderColor: colors.primary || '#FF9F40',


    },
    verifyButton: {
        backgroundColor: '#F2741B',
        borderRadius: 12,
        marginTop: 25,
    },
    verifyButtonDisabled: {
        backgroundColor: colors.gray,
        opacity: 1
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    errorMessage: {
        color: colors.error || '#ff0000',
        textAlign: 'center',
        marginTop: 10,
        fontSize: fontSize.sm,
    },
    resendDisabled: {
        color: colors.tertiary,
    }
});

export default VerificationScreen;