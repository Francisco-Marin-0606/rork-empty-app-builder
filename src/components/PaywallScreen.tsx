import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases, { CustomerInfo, PurchasesError, PurchasesPackage, PurchasesStoreTransaction } from 'react-native-purchases';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import uuid from 'react-native-uuid';
import axios from 'axios';

import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onBoardingStore';
import { useAppConfigStore } from '@/store/appConfigStore';
import { WizardFormData } from '@/helpers/types';
import { UserService } from '@/services/api/userService';
import { AudioRequest, AuxAudioRequest } from '@/services/api/audioRequestService';
import { FormQuestionsService } from '@/services/api/formQuestionsService';
import { BASE_URL } from '@/services/api/config';
import { IconX } from '@tabler/icons-react-native';
import { colors } from '@/constants/tokens';
import { PAYMENT_SCREEN_VIEW, PAYMENT_SCREEN_VIEW_CANCELLED, PAYMENT_SCREEN_VIEW_COMPLETED } from '@/services/analytics/screenTracking';
import { analyticsService } from '@/services/analytics/AnalyticsService';

interface PaywallScreenProps {
  onComplete: () => void;
  onBack: () => void;
  formData?: WizardFormData;
}

const API_KEYS = {
  apple: "appl_JIgqffPngTJdriVoNIdXjDxZisc",
  google: "goog_NxdUftDeAYMdsAdqhvDiiNOZnKi",
};

const PaywallScreen: React.FC<PaywallScreenProps> = ({ onComplete, onBack, formData = {} }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { userId, fetchUserData, automaticSignIn } = useAuthStore();
  const { setShowOnboardingAudioRequestError } = useOnboardingStore();
  const { configs } = useAppConfigStore();

  const customUuidRef = useRef<string>(uuid.v4().toString());

  // ========================= CONFIGURATION =========================

  const configureRevenueCat = useCallback(async () => {
    try {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

      const apiKey = Platform.OS === 'ios' ? API_KEYS.apple : API_KEYS.google;
      Purchases.configure({ apiKey });

      if (formData.email) {
        const attributes = {
          email: String(formData.email),
          customUuid: customUuidRef.current,
          onBoardingPaywall: 'true',
          wantToBeCalled: String(formData.userName),
          gender: String(formData.gender),
          birthdate: String(formData.birthDate)
        };

        await Purchases.setAttributes(attributes);
        await Purchases.setEmail(String(formData.email));
        await Purchases.logIn(customUuidRef.current);
        await PAYMENT_SCREEN_VIEW();
      }
    } catch (error) {
      console.warn('RevenueCat configuration warning:', error);
    }
  }, [formData]);

  const sendAuxAudioRequest = useCallback(async () => {
    try {
      const firstLevelData = await FormQuestionsService.getFirstUserLevel(null);
      const questions = firstLevelData.questions || [];

      const questionsWithAnswers = questions.map((question: any, index: number) => ({
        question: question.referenceQuestion,
        answer: String(formData[index] || formData[`${index}`] || ''),
        ...question
      }));

      const auxAudioRequest: AuxAudioRequest = {
        email: formData.email?.toString().toLowerCase() || '',
        requestDate: new Date().toISOString(),
        audioMotive: { questions: questionsWithAnswers }
      };

      console.log("Sending aux audio request:", auxAudioRequest);
      const audioResponse = await axios.post(
        'https://mm-aux-audiorequest-x7owe.ondigitalocean.app/auxAudioRequest/create',
        auxAudioRequest,
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log("Aux audio request response:", audioResponse);
    } catch (error) {
      console.error('Error sending aux audio request:', error);
    }
  }, [formData]);

  // ========================= PURCHASE HANDLERS =========================

  const getMembershipType = (customerInfo: CustomerInfo): string => {
    const entitlement = customerInfo.entitlements.active.Mental;
    if (!entitlement) return 'monthly';

    if (entitlement.periodType === 'TRIAL') return 'trial';
    if (entitlement.productIdentifier === 'mental_100_1y') return 'yearly';
    if (entitlement.productIdentifier === 'mental_20_1m') return 'monthly';
    return 'monthly';
  };

  const createUserTrial = useCallback(async (appUserId: string, membership: any) => {
    if (!formData.email) {
      console.error('No email found in form data');
      router.replace('/login');
      return null;
    }

    const trialData = {
      email: formData.email,
      gender: formData.gender,
      birthdate: formData.birthDate,
      wantToBeCalled: formData.userName,
      language: 'es', // Idioma por defecto en español
      processorData: {
        appId: appUserId,
        customId: customUuidRef.current
      },
      membership
    };

    return await UserService.trialUser(trialData);
  }, [formData]);

  const sendAudioRequestAfterPurchase = useCallback(async (userTrialResponse: any) => {
      console.log("Preparing to send audio request...");

      const firstLevelData = await FormQuestionsService.getFirstUserLevel(null);
      const questions = firstLevelData.questions || [];

      const questionsWithAnswers = questions.map((question: any, index: number) => {
        const answer = formData[index] || formData[`${index}`] || '';
        return {
          question: question.referenceQuestion,
          answer: String(answer),
          ...question
        };
      });

      const audioRequest: AudioRequest = {
        userId: userTrialResponse.membership.userId,
        email: formData.email?.toString().toLowerCase() || '',
        requestDate: new Date().toISOString(),
        audioMotive: {
          questions: questionsWithAnswers
        }
      };

      await axios.post(
        `${BASE_URL}audioRequest/createAudioRequest`,
        audioRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userTrialResponse.token}`
          }
        }
      ).catch((error) => {
        console.warn('Error sending audio request:', error);
        if(error.response?.status !== 400) {
          setShowOnboardingAudioRequestError(true);
        }
        return null;
      });

  }, [formData, setShowOnboardingAudioRequestError]);

  const handlePurchaseCompleted = useCallback(async (customerInfo: CustomerInfo) => {
    try {
      console.log('Paywall purchased');
      const appUserId = await Purchases.getAppUserID();

      const purchaseDate = customerInfo.entitlements.active.Mental?.originalPurchaseDate || new Date().toISOString();
      const activeSubscriptions = customerInfo.activeSubscriptions[0];
      const subscriptionInfo = customerInfo.subscriptionsByProductIdentifier[activeSubscriptions];

      const membershipType = getMembershipType(customerInfo);

      // Handle price data safely
      let membership = {
        paymentDate: purchaseDate,
        currency: 'USD', // Default to USD if not available
        amount: 0, // Default to 0 if not available
        type: membershipType,
        membershipType: membershipType
      };

      // Try to get price info if available
      if (subscriptionInfo && typeof subscriptionInfo === 'object') {
        try {
          // @ts-ignore - Handle price access even if TypeScript doesn't recognize it
          if (subscriptionInfo.price) {
            // @ts-ignore
            membership.currency = subscriptionInfo.price.currency || 'USD';
            // @ts-ignore
            membership.amount = subscriptionInfo.price.amount || 0;
          }
        } catch (e) {
          console.log('Error accessing price information:', e);
        }
      }

      console.log('App user ID:', appUserId);
      console.log('Customer info:', customerInfo);

      const userTrialResponse = await createUserTrial(appUserId, membership);
      if(userTrialResponse.membership.userId) {
         analyticsService.setUserId(userTrialResponse.membership.userId);
      }
      console.log('User trial response:', userTrialResponse);

      // After creating the user, immediately set the auth token for subsequent API calls
      if (userTrialResponse && userTrialResponse.token && userTrialResponse.membership && userTrialResponse.membership.userId) {
        console.log('User trial response token:', userTrialResponse.token);

        // Send audio request after successful purchase
       try {
        await sendAudioRequestAfterPurchase(userTrialResponse);
       } catch (error) {
        throw error;  
       }

        // Sign in the user
        await automaticSignIn(userTrialResponse.token, userTrialResponse.membership.userId);
       
        await PAYMENT_SCREEN_VIEW_COMPLETED();

        if (userId) await fetchUserData();

        onComplete()

        setIsLoading(false);

      } else {
        router.replace('/login');
        throw new Error('Error getting appUserId or creating trial');
      }
    } catch (error) {
      router.replace('/login');
      throw error;
    }
  }, [createUserTrial, sendAudioRequestAfterPurchase, automaticSignIn, userId, fetchUserData, onComplete]);

  const handleSendAbandonedCartEmail = useCallback(async () => {
    try {

      await PAYMENT_SCREEN_VIEW_CANCELLED();
    
//       if (formData.email) {
//         console.log('Sending abandoned cart email for:', formData.email);
//         await axios.post(`${BASE_URL}user/sendAbandonedCart`, {
//           email: formData.email
//         });
//         console.log('Abandoned cart email sent successfully');
//       }
    } catch (error) {
      throw error;
    }
    onBack();
  }, [formData.email, onBack]);

  // ========================= SETUP EFFECT =========================

  useEffect(() => {
    const setupPaywall = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Usar email de test si está configurado
        if (configs?.test === true) {
          formData.email = 'testusemental01@gmail.com';
        }

        // Validar email requerido
        if (!formData.email) {

          console.error('Email is required but not provided');
          router.replace('/login');
          return;
        }

        // Configurar RevenueCat
        await configureRevenueCat();

        // Enviar solicitud de audio auxiliar
        await sendAuxAudioRequest();

      } catch (error) {
        console.error('Error setting up paywall:', error);
        onBack();
      } finally {
        setIsLoading(false);
      }
    };

    setupPaywall();
  }, [configureRevenueCat, sendAuxAudioRequest, formData.email, configs?.test]);

  // ========================= RENDER =========================

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
       </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseStarted={({ packageBeingPurchased }: { packageBeingPurchased: PurchasesPackage }) => {
          console.log('Purchase started:', packageBeingPurchased.identifier);
        }}
        onPurchaseCompleted={({ customerInfo }: { customerInfo: CustomerInfo; storeTransaction: PurchasesStoreTransaction }) => {
          console.log('Purchase completed');
          handlePurchaseCompleted(customerInfo);
        }}
        onPurchaseError={({ error }: { error: PurchasesError }) => {
          console.error('Purchase error:', error);
          setShowOnboardingAudioRequestError(true);
          onBack();
        }}
        onPurchaseCancelled={() => {
          console.log('Purchase cancelled');
          handleSendAbandonedCartEmail();
        }}
        onRestoreCompleted={({ customerInfo }: { customerInfo: CustomerInfo }) => {
          console.log('Restore completed');
          handlePurchaseCompleted(customerInfo);
        }}
        onDismiss={() => {
          setIsLoading(true);
        }}
      />
       <View style={styles.closeButtonContainer} >
              <TouchableOpacity onPress={handleSendAbandonedCartEmail} style={styles.closeButton}>
                <IconX size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 30,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(121, 118, 118, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaywallScreen;