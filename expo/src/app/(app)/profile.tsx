import { ScrollView, Text, View, StyleSheet, Linking, Alert, Platform, TouchableOpacity, Animated, Dimensions } from 'react-native'
import React, { useEffect, useState, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from "expo-status-bar"
import { PanGestureHandler, State } from 'react-native-gesture-handler'
import CustomButton from '@/components/CustomButton'
import { colors, fontSize, screenPadding } from '@/constants/tokens'
import { IconEdit, IconHelpHexagon, IconMail, IconShieldCheck, IconFileCheck, IconAlertTriangle, IconCircle, IconX } from '@tabler/icons-react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { useAppConfigStore } from '@/store/appConfigStore'
import { useSubscriptionLogic } from '@/hooks/useSubscriptionLogic'
import * as WebBrowser from 'expo-web-browser'
import { useNetworkStore } from '@/store/networkStore'
import { useUpdateStore } from '@/store/updateStore'
import Purchases from 'react-native-purchases'
import { usePlayerStore } from '@/store/playerStore'
import TrackPlayer, { State as PlayerState } from 'react-native-track-player'


const DEFAULT_CONFIG = {
  faq: {available: true, data: "https://www.mental.app/preguntas"},
  tos:{available: false, data: "https://www.mental.app/terminos"},
  privacy: {available: true, data: "https://www.mental.app/politicas"}
};

interface buttonConfig {
  available : boolean
  data: string
}

interface ProfileButtons {
  faq: buttonConfig;
  tos: buttonConfig;
  privacy: buttonConfig;
}

const ProfileScreen = () => {
  const { session, signOut, userData, isMembershipActive, isRevenueCatSubscriptionActive, isRevenueCatTrialCancelled, checkRevenueCatSubscription, revenueCatSubscriptionType } = useAuthStore()
  const { isConnected } = useNetworkStore()
  const { currentVersion } = useUpdateStore()
  const { configs } = useAppConfigStore()
  const { handleSubscription } = useSubscriptionLogic()
  const [profilePageConfig, setProfilePageConfig] = useState<ProfileButtons>(DEFAULT_CONFIG)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'none'>('none')
  const [subscriptionType, setSubscriptionType] = useState<string>('Gratuita')
    const setIsFloatingPlayerVisible = usePlayerStore((state) => state.setIsFloatingPlayerVisible);
    // Animation values - cambio para animación desde la derecha
    const screenWidth = Dimensions.get('window').width;
    const translateX = useRef(new Animated.Value(screenWidth)).current;
    const gestureTranslateX = useRef(new Animated.Value(0)).current;

    // Slide in animation from right on mount
    useEffect(() => {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setIsFloatingPlayerVisible(false);

      // Cleanup function: verificar estado del player cuando se cierre el modal
      return () => {
        checkAndRestoreFloatingPlayer();
      };
    }, []);

    // Handle pan gesture - cambio para gestos horizontales
    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: gestureTranslateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        const { translationX, velocityX } = event.nativeEvent;

        // If dragged right more than 100px or with sufficient velocity, close
        if (translationX > 100 || velocityX > 500) {
          // Animate out to the right
          Animated.timing(translateX, {
            toValue: screenWidth,
            duration: 300,
            useNativeDriver: true,
          }).start(closeModal);
        } else {
          // Snap back to original position
          Animated.spring(gestureTranslateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      } else if (event.nativeEvent.oldState === State.BEGAN) {
        // When gesture starts, reset the animation
        Animated.spring(gestureTranslateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    };

  useEffect(() => {
    try {
      // Validamos la existencia de cada nivel del objeto usando el operador opcional
      const profileConfig = configs?.tabs?.profile?.components;
      
      if (profileConfig) {
        setProfilePageConfig({
          faq: profileConfig?.faq || DEFAULT_CONFIG.faq,
          tos: profileConfig?.tos || DEFAULT_CONFIG.tos,
          privacy: profileConfig?.privacy || DEFAULT_CONFIG.privacy
        });
      }
    } catch (error) {
      console.error('Error processing profile config:', error);
      // En caso de error, mantenemos los valores por defecto
      setProfilePageConfig(DEFAULT_CONFIG);
    }

    console.log(profilePageConfig)
  }, [configs]);

  useEffect(() => {
    // Determinar el estado de la suscripción
    const updateSubscriptionStatus = async () => {
      // Si el usuario tiene processorData, usar RevenueCat
      if (userData?.processorData?.customId) {
        // Verificar suscripción de RevenueCat
        await checkRevenueCatSubscription();
        setSubscriptionStatus(isRevenueCatSubscriptionActive ? 'active' : 'none');
        if(!isRevenueCatSubscriptionActive){
          setSubscriptionType('Gratuita');
          return
        }

        // Determinar tipo de suscripción si está activa
        if (isRevenueCatSubscriptionActive && userData?.processorData?.customId) {
          if ( revenueCatSubscriptionType === 'Anual') {
            setSubscriptionType('Anual');
          } else {
            setSubscriptionType('Mensual');
          }
        }
      } else {
        
        setSubscriptionStatus(isMembershipActive ? 'active' : 'none');
        if(!isMembershipActive){
          setSubscriptionType('Gratuita');
          return
        }
        
        // Usar lógica existente para usuarios sin RevenueCat
        if ( userData?.lastMembership?.type === 'yearly') {
          setSubscriptionType('Anual');
        } else if ( userData?.lastMembership?.type === 'monthly') {
          setSubscriptionType('Mensual');
        } else if ( userData?.lastMembership?.type === 'free') {
          setSubscriptionType('Gratuita');
        } else {
          setSubscriptionType('Gratuita');
        }

      }
    };

    updateSubscriptionStatus();
  }, [userData, isMembershipActive, isRevenueCatSubscriptionActive, checkRevenueCatSubscription, revenueCatSubscriptionType]);

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Por favor, intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
  }

  const editPersonalData = (): void => {
    if (isConnected) {
      router.push({
        pathname: '/(app)/(modals)/forms/userPersonalDataForm',
      });
    } else {
      Alert.alert(
        'Sin conexion',
        'No puedes editar tu información si no tienes conexión a internet.',
        [{ text: 'Aceptar', style: 'cancel' }]
      );
    }
  }

  const handleOpenBrowser = async (url: string, retryFunction: () => void) => {
    if (!url) {
      console.error('URL no válida');
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(url, {
        controlsColor: colors.primary || '#FF9F40',
        toolbarColor: 'black',
        enableBarCollapsing: true,
        showTitle: true
      });
    } catch (error) {
      console.error('Error al abrir el enlace:', error);
      Alert.alert(
        'Error',
        'No se pudo abrir el enlace. Verifica tu conexión a internet.',
        [
          { text: 'Reintentar', onPress: retryFunction },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    }
  };

  const handleOpenContact = async () => {
    const email = 'apoyo@mental.app';
    const subject = 'Contacto desde la aplicación';
    
    try {
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
      await Linking.openURL(mailtoUrl);
    } catch (error) {
      console.error('Error al abrir la aplicación de correo:', error);
      Alert.alert(
        'Información de contacto',
        `No se pudo abrir la aplicación de correo. Por favor, envíame un correo a ${email} con el asunto: Contacto desde la aplicación`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleOpenFAQ = () => handleOpenBrowser(profilePageConfig.faq.data, handleOpenFAQ);
  const handleOpenTerms = () => handleOpenBrowser(profilePageConfig.tos.data, handleOpenTerms);
  const handleOpenPrivacy = () => handleOpenBrowser(profilePageConfig.privacy.data, handleOpenPrivacy);

  const getSubscriptionStatusUI = () => {
    switch(subscriptionStatus) {
      case 'active':
        // Si es trial cancelado, mostrar un indicador especial
        return (
          <View style={[styles.subscriptionStatusContainer, { backgroundColor: '#113d0a' }]}>
            <Text maxFontSizeMultiplier={1.1}  style={[styles.subscriptionStatusText, { color: '#8ae286' }]}>ACTIVA</Text>
          </View>
        );
      case 'none':
        return (
          <TouchableOpacity onPress={handleSubscriptionPress}>
          <View style={[styles.subscriptionStatusContainer, { backgroundColor: '#FE892E' , borderRadius: 99}]}>
            <Text maxFontSizeMultiplier={1.1}  style={[styles.subscriptionStatusText, { color: 'white' }]}>SUSCRIBIRME</Text>
          </View>
          </TouchableOpacity>
        );
    }
  };

  const handleSubscriptionPress = async () => {
    if (subscriptionStatus === 'none') {
      handleSubscription();
    } else if (subscriptionStatus === 'active') {
      // Verificar si es usuario de Stripe (no tiene processorData)
      if (!userData?.processorData) {
        router.push('/(app)/(modals)/subscriptionManagement')
      } else {
        // Usuario de RevenueCat - abrir URL de gestión
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const managementUrl = customerInfo.managementURL;

          if (managementUrl) {
            await Linking.openURL(managementUrl);
          } else {
            // URL por defecto según la plataforma
            const defaultUrl = Platform.OS === 'ios'
              ? 'https://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions';
            await Linking.openURL(defaultUrl);
          }
        } catch (error) {
          console.error('Error opening management URL:', error);
          Alert.alert(
            'Error',
            'No se pudo abrir la página de gestión de suscripciones',
            [{ text: 'OK' }]
          );
        }
      }
    }
  }

  const handleRestoreSubscription = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active?.Mental?.isActive) {
        Alert.alert(
          'Suscripción restaurada',
          'Tu suscripción ha sido restaurada exitosamente.',
          [{ text: 'OK' }]
        );
        // Actualizar el estado
        await checkRevenueCatSubscription();
      } else {
        Alert.alert(
          'Sin suscripción',
          'No se encontró ninguna suscripción activa para restaurar.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error restoring subscription:', error);
      Alert.alert(
        'Error',
        'No se pudo restaurar la suscripción. Por favor, intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePaywallComplete = async () => {
    router.push('/(app)/(modals)/paywallScreenRenewal');
    await checkRevenueCatSubscription();
  };

  // Función para verificar si hay audio reproduciéndose y reactivar el floating player
  const checkAndRestoreFloatingPlayer = async () => {
    try {
      const playerState = await TrackPlayer.getPlaybackState();
      const isPlaying = playerState.state === PlayerState.Playing || playerState.state === PlayerState.Buffering;
      
      if (isPlaying) {
        setIsFloatingPlayerVisible(true);
      }
    } catch (error) {
      console.error('Error checking player state:', error);
    }
  };

  // Función para cerrar el modal con animación
  const handleCloseModal = () => {
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(closeModal);
  };

  // Función para cerrar el modal con verificación de audio
  const closeModal = async () => {
    await checkAndRestoreFloatingPlayer();
    router.back();
  };

  return (
    <View style={{flex: 1, backgroundColor: 'black'}}>
      <PanGestureHandler
        enabled={false}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            { backgroundColor: 'black', flex: 1 },
            {
              transform: [
                { translateX: Animated.add(translateX, gestureTranslateX) }
              ]
            }
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentContainer}>
                <View style={{ height:45, justifyContent: 'space-between', flexDirection: 'row'}}>
                  <Text maxFontSizeMultiplier={1.1}  style={{ fontSize: 30,color: 'white', fontFamily: 'Geist-SemiBold'}}>Mi cuenta</Text>
                   {/* Close button */}
            <View >
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <IconX size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
                </View>

                <View style={styles.subscriptionContainer}>
                  <View>
                    <Text maxFontSizeMultiplier={1.1}  style={styles.subscriptionTitle}>Suscripción</Text>
                    <Text maxFontSizeMultiplier={1.1}  style={styles.subscriptionSubtitle}>{subscriptionType}</Text>
                  </View>
                  {getSubscriptionStatusUI()}
                </View>

                <View>
                  <CustomButton
                    title="Gestionar suscripción"
                    containerStyles={styles.buttonContainer}
                    textStyles={{ color: colors.text, fontSize: fontSize['sm-18'], fontWeight: 'bold' }}
                    handlePress={handleSubscriptionPress}
                    icon={<IconCircle size={20} color={colors.icon} fill={colors.icon} />}
                  />
                </View>

                <View>
                  <CustomButton
                    title="Editar mi perfil"
                    containerStyles={styles.buttonContainer}
                    textStyles={{ color: colors.text, fontSize: fontSize['sm-18'] }}
                    handlePress={editPersonalData}
                    icon={<IconEdit size={25} color={colors.icon} />}
                  />
                </View>

                { profilePageConfig.faq.available && <View>
                  <CustomButton
                    title="Preguntas frecuentes"
                    containerStyles={styles.buttonContainer}
                    textStyles={{ color: colors.text, fontSize: fontSize['sm-18'] }}
                    handlePress={handleOpenFAQ}
                    icon={<IconHelpHexagon size={24} color={colors.icon} />}
                  />
                </View>}

                <View>
                  <CustomButton
                    title="Contacto"
                    containerStyles={styles.buttonContainer}
                    textStyles={{ color: colors.text, fontSize: fontSize['sm-18'] }}
                    handlePress={handleOpenContact}
                    icon={<IconMail size={24} color={colors.icon} />}
                  />
                </View>

                <View>
                  <CustomButton
                    title="Cerrar sesión"
                    containerStyles={[
                      styles.logoutButton,
                      subscriptionStatus === 'none' ? styles.logoutButtonNoSubscription : null
                    ]}
                    textStyles={{ 
                      color: subscriptionStatus === 'none' ? 'black' : 'white', 
                      fontSize: fontSize.sm 
                    }}
                    handlePress={logout}
                  />
                </View>
              </View>

              <View style={styles.versionContainer}>
                <Text maxFontSizeMultiplier={1.1} 
                  style={styles.versionText}
                >
                  Versión de la app {currentVersion}
                </Text>
              </View>
              <View style={{flex: 1}} />

              <View style={styles.footerContainer}>
                <TouchableOpacity onPress={handleOpenTerms} style={styles.footerButton}>
                  <Text maxFontSizeMultiplier={1.1}  style={styles.footerText}>
                    Términos de uso
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenPrivacy} style={styles.footerButton}>
                  <Text maxFontSizeMultiplier={1.1}  style={styles.footerText}>
                    Politicas de privacidad
                  </Text>
                </TouchableOpacity>
              </View>
          </SafeAreaView>
          <StatusBar
            style="light"
            backgroundColor="transparent"
            translucent={true}
          />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  closeButtonContainer: {
    paddingTop: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.secondary || '#191919',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos,
    paddingTop: 20,
  },
  buttonContainer: {
    marginTop: 10,
    backgroundColor: colors.secondary || '#191919',
    justifyContent: 'flex-start',
    height: 60
  },
  logoutButton: {
    marginTop: 12,
    borderWidth: 1,
    backgroundColor: '#F2741B'
  },
  logoutButtonNoSubscription: {
    backgroundColor: 'white',
    borderColor: 'white'
  },
  versionContainer: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  versionText: {
    fontFamily: 'Geist-Regular',
    letterSpacing: -0.5,
    fontSize: fontSize.xs,
    color: colors.tertiary,
    opacity: 0.3,
    textAlign: 'center',
  },
  footerContainer: {
     
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos: screenPadding.horizontalAndroid,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerButton: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footerText: {
    color: colors.tertiary,
    fontSize: fontSize.xs,
  },
  subscriptionContainer: {
    marginTop: 50,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionTitle: {
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subscriptionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    opacity: 0.7,
    letterSpacing: -0.5,
  },
  subscriptionStatusContainer: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    width: 120,
  },
  subscriptionStatusText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontFamily: 'Geist-Semibold',
    letterSpacing: -0.5,
  }
});

export default ProfileScreen;