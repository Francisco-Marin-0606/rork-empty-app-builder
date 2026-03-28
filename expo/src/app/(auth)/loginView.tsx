import React, { useCallback, useEffect, useState, useRef } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Keyboard, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, SafeAreaView, Animated } from 'react-native'
import { Audio } from 'expo-av'
import { useAuthStore, APIKeys } from '../../store/authStore'
import { router, useLocalSearchParams } from 'expo-router'
import { colors, fontSize, screenPadding } from '@/constants/tokens'
import FormInput from '@/components/FormInput'
import { validateField } from '@/helpers/miscellaneous'
import FastImage from 'react-native-fast-image'
import CustomButton from '@/components/CustomButton'
import introLoginMusic from '@/assets/music/intro_login_music.mp3'
import logoBlanco from '@/assets/Images/logo_blanco.png'
import { IconChevronLeft } from '@tabler/icons-react-native'
import Purchases from "react-native-purchases"

const LoginView = () => {
    const { getCode } = useAuthStore();
    const params = useLocalSearchParams<{ email: string }>();
    const [email, setEmail] = useState(params.email || '');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));
    const [touched, setTouched] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);
    const [hasRevenueCatAccount, setHasRevenueCatAccount] = useState(false);
    const [isCheckingRevenueCat, setIsCheckingRevenueCat] = useState(true);
  
    const navigateToVerification = useCallback(() => {
      // Entrar manualmente al flujo de verificación
      useAuthStore.setState({ isInVerificationFlow: true });
      router.push({
        pathname: '/verification',
        params: { email: email }
      });
      setIsSubmitting(false);
    }, [email]);
  
    // Load and play background music
    useEffect(() => {
      const loadSound = async () => {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
          });
          
          const { sound } = await Audio.Sound.createAsync(
            introLoginMusic,
            { isLooping: true, shouldPlay: true }
          );
          
          soundRef.current = sound;
        } catch (error) {
          console.error('Error loading sound', error);
        }
      };
      
      loadSound();
      
      return () => {
        // Cleanup function to unload sound when component unmounts
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      };
    }, []);
  
    // Check if the current device already has a RevenueCat account
    useEffect(() => {
      const checkRevenueCatAccount = async () => {
        setIsCheckingRevenueCat(true);
        try {
          // Configure RevenueCat with the appropriate API key
          if (Platform.OS === 'ios') {
            await Purchases.configure({ apiKey: APIKeys.apple });
          } else if (Platform.OS === 'android') {
            await Purchases.configure({ apiKey: APIKeys.google });
          }
          
          // Get the current anonymous app user ID
          const appUserId = await Purchases.getAppUserID();
          
          // Try to get customer info without logging in
          const customerInfo = await Purchases.getCustomerInfo();
          
          // Check if this device has any previous purchases or subscriptions
          const hasActiveSubscription = customerInfo.entitlements.active?.Mental?.isActive || false;
          const hasAnySubscriptions = customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0;
          
          // If there are any active subscriptions, this user already has an account
          setHasRevenueCatAccount(hasActiveSubscription || hasAnySubscriptions);
          
          console.log('[LoginScreen] RevenueCat check - AppUserId:', appUserId);
          console.log('[LoginScreen] RevenueCat check - Has account:', hasActiveSubscription || hasAnySubscriptions);
        } catch (error) {
          console.error('[LoginScreen] Error checking RevenueCat account:', error);
        } finally {
          setIsCheckingRevenueCat(false);
        }
      };
      
      checkRevenueCatAccount();
    }, []);
  
    // Eliminado: navegación automática basada en isInVerificationFlow
  
    // Remover la validación automática - solo validar al presionar entrar
    
    // Limpiar error cuando el usuario empiece a escribir
    const handleEmailChange = (text: string) => {
      setEmail(text);
      if (error) {
        setError(''); // Limpiar error cuando el usuario escriba
      }
    };
  
    const handleStartFirstHypnosis = () => {
      // If user already has a RevenueCat account, redirect to login instead of first hypnosis
      if (hasRevenueCatAccount) {
        handleStartLogin();
      } else {
        router.push('/(auth)/(onboarding)/OnBoardingHypnosisScreen');
      }
    }
  
    const handleStartLogin = () => {
      if (isAnimating) return;
      
      setIsAnimating(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowLoginForm(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      });
    };
  
    const handleBackToWelcome = () => {

        router.back();
    //   if (isAnimating) return;
      
    //   setIsAnimating(true);
    //   Animated.timing(fadeAnim, {
    //     toValue: 0,
    //     duration: 500,
    //     useNativeDriver: true,
    //   }).start(() => {
    //     setShowLoginForm(false);
    //     Animated.timing(fadeAnim, {
    //       toValue: 1,
    //       duration: 500,
    //       useNativeDriver: true,
    //     }).start(() => {
    //       setIsAnimating(false);
    //     });
    //   });
    };
  
    const handleLogin = async () => {
      if (isSubmitting) return;
      // Ocultar el teclado
      Keyboard.dismiss();
      
      // Validar antes de intentar el login
      const validationError = validateField(
        {
          name: 'email',
          label: 'Correo electrónico',
          type: 'email',
          required: true,
          minLength: 2,
          maxLength: 50,
          placeholder: 'Ingresa tu correo electrónico'
        }, email);

      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);
      try {
        // Caso especial de soporte: navegar directo
        if (email.split("?").length === 2) {
          if (email.split("?")[1] === "support") {
            setEmail(email.split("?")[0]);
            navigateToVerification();
            return;
          }
        }

        // 1) Pedir código
        const ok = await getCode({ email });
        // 2) Navegar SOLO si el backend respondió OK
        if (ok) {
          navigateToVerification();
        }
      } catch (error: any) {
        console.log('Error en el login completo:', error);
        console.log('Error status:', error.status);
        console.log('Error message:', error.message);
        
        // Para el login, la mayoría de errores son por email no válido
        // Solo mostrar error de conexión real si hay problemas de red graves
        if(error.status === 404 || 
           error.status === 400 || 
           error.status === 401 ||
           error.status === 503 || // Incluir 503 como email inválido para login
           error.message?.toLowerCase().includes('not found') || 
           error.message?.toLowerCase().includes('no existe') || 
           error.message?.toLowerCase().includes('usuario no encontrado') ||
           error.message?.toLowerCase().includes('email inválido') ||
           error.message?.toLowerCase().includes('email not found')) {
          setError('Email inválido')
        } else {
          // Solo para errores muy específicos de red
          setError('Email inválido') // Por defecto asumir email inválido
        }
        setIsSubmitting(false);
      }
    };

    const handleError = (error: string) => {
       switch (error) {
        case "Email inválido":
         return "O yo soy muy tonto o este correo no está registrado en mi lista de usuarios."
        default:
         return error
      }
    }

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.formContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackToWelcome}
          >
            <IconChevronLeft size={36} color="white" />
          </TouchableOpacity>
          <View style={styles.formLogo}>
            <FastImage
              source={logoBlanco}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.formTitle}>
          { hasRevenueCatAccount 
            ? <Text style={[styles.formTitleText, {textAlign: 'center'}]}>Ya tienes cuenta,{'\n'}inicia sesión</Text> 
            : <Text style={styles.formTitleText}>Iniciar Sesión</Text>
          }
          </View>
          <View style={{width: '100%', paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : 0}}>
          <FormInput
            name='names'
            label='Correo electrónico'
            type='email'
            required={true}
            minLength={2}
            maxLength={50}
            placeholder='Correo electrónico'
            value={email}
            onChange={(value) => handleEmailChange(String(value))}
            
           // error={error}
            showLabel={false}
            isCapitilize={false}
            inputBackgroundColor={'#1a1a1a'}
            inputTextColor={colors.text}
          />
          <CustomButton
            containerStyles={[styles.button, {width: '100%'}, (isSubmitting || !email) && {opacity: 1, backgroundColor: colors.gray}]}
            handlePress={handleLogin}
            disabled={(isSubmitting || !email)}
            isLoading={isSubmitting}
            title='Entrar'
            textStyles={[styles.buttonText, (isSubmitting || !email) && {color: 'white'}]}
          />
          
              {error && (
                <Text maxFontSizeMultiplier={1} style={styles.errorText}>
                  {typeof error === 'string' ? handleError(error) : ''}
                </Text>
              )}

          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screenBackground,
      paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    },
    backgroundVideo: {
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    overlay: {
      flex: 1,
    },
    errorText: {
       color: colors.error || '#ff0000',
        textAlign: 'center',
        marginTop: 10,
        fontSize: fontSize.sm,
    },
    logoText: {
      fontSize: 48,
      color: 'white',
      marginBottom: 100,
      fontWeight: 'bold',
    },
    formContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
  
    },
    formLogo: {
      height: '44%',
      width: '80%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    formTitle: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 40,
    },
    formTitleText: {
      fontSize: 50,
      fontWeight: '600',
      color: 'white',
      letterSpacing: -2.5,
    },
    buttonText: {
      color: 'white',
      fontSize: fontSize['sm-18'],
    },
    content: {
      flex: 1, 
      justifyContent: 'space-between',
      paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    },
    welcomeContainer: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logoContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      width: '100%',
      height: '55%',
    },
    logo: {
      width: 200,
      height: 100,
    },
    buttonContainer: {
      width: '100%',
      paddingBottom: 50,
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
      flex:1,
    },
    button: {
      width: '100%',
      backgroundColor: '#F2741B',
      justifyContent: 'center',
      alignItems: 'center',
    
    },
    backButton: {
        width: 45,
        height: 45,
        zIndex: 9999,
        alignSelf: 'flex-end',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 42 : 42,
        left: Platform.OS === 'ios' ? 41 : 0,
        padding: 0
    },
    cornerLogo: {
      position: 'absolute',
      top: 100,
      left: 0,
      zIndex: 10,
      padding: 0,
    },
    keyboardAvoidingContainer: {
      flex: 1,
      width: '100%',
    },
  })

export default LoginView