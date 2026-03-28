import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases, { CustomerInfo, PurchasesError, PurchasesPackage, PurchasesStoreTransaction } from 'react-native-purchases';
import { Platform } from 'react-native';
import { APIKeys, useAuthStore } from '@/store/authStore';
import { UserService } from '@/services/api/userService';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/tokens';
import { BASE_URL } from '@/services/api/config';
import axios from 'axios';

interface PaywallScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

const PaywallScreenRenewal: React.FC<PaywallScreenProps> = ({ onComplete, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, fetchUserData, userData } = useAuthStore();
  
  // Create a UUID reference that will be consistent throughout component lifecycle
  const customUuidRef = useRef<string>(uuid.v4().toString());

  // ========================= SETUP EFFECT =========================
  useEffect(() => {
    const setupPaywall = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Validar que tenemos los datos necesarios
        if (!userData?.email) {
          console.error('Email is required but not provided');
          setError('No se pudo obtener la información del usuario');
          return;
        }

        // Solo configurar RevenueCat si no tenemos customId
        if (!userData?.processorData?.customId) {
          const apiKey = Platform.OS === 'ios' ? APIKeys.apple : APIKeys.google;
          
          await Purchases.configure({ apiKey });
          
          const attributes = {
            email: userData.email,
            customUuid: customUuidRef.current,
            onBoardingPaywall: 'false'
          };
          
          await Purchases.setAttributes(attributes);
          await Purchases.setEmail(userData.email);
          await Purchases.syncAttributesAndOfferingsIfNeeded();
        }

        console.log('Paywall setup completed successfully');
      } catch (error) {
        console.error('Error setting up paywall:', error);
        setError('Error al configurar el sistema de pagos');
        // No llamar onComplete aquí, dejar que el usuario decida
      } finally {
        setIsLoading(false);
      }
    };

    if (userData) {
      setupPaywall();
    }
  }, [userData]);


  const getMembershipType = useCallback((customerInfo: CustomerInfo): string => {
    const entitlement = customerInfo.entitlements.active.Mental;
    if (!entitlement) return 'monthly';

    if (entitlement.periodType === 'TRIAL') return 'trial';
    if (entitlement.productIdentifier === 'mental_100_1y') return 'yearly';
    if (entitlement.productIdentifier === 'mental_20_1m') return 'monthly';
    return 'monthly';
  }, []);

  // ========================= PURCHASE HANDLERS =========================
  const handlePurchaseCompleted = useCallback(async (customerInfo: CustomerInfo) => {
    try {
      console.log('Purchase completed successfully');
      setIsLoading(true);
      
      const appUserId = await Purchases.getAppUserID();
      if (!appUserId) {
        throw new Error('No se pudo obtener el ID de usuario');
      }

      const purchaseDate = customerInfo.entitlements.active.Mental?.originalPurchaseDate || new Date().toISOString();
      const membershipType = getMembershipType(customerInfo);

      // Configurar datos del procesador si no existen
      if (!userData?.processorData?.customId && userId) {
        await UserService.setProcessorData({
          userId: userId,
          processorData: {
            appId: appUserId,
            customId: customUuidRef.current,
          }
        });
      }

      console.log('Membership type:', membershipType);
      console.log('Purchase date:', purchaseDate);

      // Actualizar datos de usuario después de la compra
      if (userId) {
        await fetchUserData();
      }

      onComplete();
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert(
        'Error', 
        'Hubo un problema procesando tu suscripción. Por favor, contacta soporte si el problema persiste.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [getMembershipType, userData, userId, fetchUserData, onComplete]);

  const handleSendAbandonedCartEmail = useCallback(async () => {
    try {
      if (userData?.email) {
        console.log('Sending abandoned cart email for:', userData.email)
        console.log('Sending abandoned cart email for:', userData.email);
        await axios.post(`${BASE_URL}user/sendAbandonedCart`, {
          email: userData.email
        });
        console.log('Abandoned cart email sent successfully');
      }
    } catch (error) {
      console.error('Error sending abandoned cart email:', error);
      // No lanzar el error, es una funcionalidad secundaria
    }
  }, [userData?.email]);

  const handlePurchaseCancelled = useCallback(async () => {
    try {
      console.log('Purchase cancelled by user');
      await handleSendAbandonedCartEmail();
      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('Error handling purchase cancellation:', error);
      if (onBack) {
        onBack();
      }
    }
  }, [onBack, handleSendAbandonedCartEmail]);

  const handlePurchaseError = useCallback(async (error: PurchasesError) => {
    console.error('Purchase error:', error);
    await handleSendAbandonedCartEmail();
    if (onBack) {
      onBack();
    }
  }, [onBack, handleSendAbandonedCartEmail]);

  const handleCloseButton = useCallback(async () => {
    await handleSendAbandonedCartEmail();
    if (onBack) {
      onBack();
    }
  }, [onBack, handleSendAbandonedCartEmail]);

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
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Volver</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }


  return (
    <View style={styles.container} >
      <RevenueCatUI.Paywall
        onPurchaseStarted={({ packageBeingPurchased }: { packageBeingPurchased: PurchasesPackage }) => {
          console.log('Purchase started:', packageBeingPurchased.identifier);
        }}
        onPurchaseCompleted={({ customerInfo }: { customerInfo: CustomerInfo; storeTransaction: PurchasesStoreTransaction }) => {
          handlePurchaseCompleted(customerInfo);
        }}
        onPurchaseError={({ error }: { error: PurchasesError }) => {
          handlePurchaseError(error);
        }}
        onPurchaseCancelled={handlePurchaseCancelled}
        onRestoreCompleted={({ customerInfo }: { customerInfo: CustomerInfo }) => {
          console.log('Restore completed');
          handlePurchaseCompleted(customerInfo);
        }}
        onDismiss={() => {
          console.log('Paywall dismissed');
        }}
      />
      {onBack && (
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity onPress={handleCloseButton} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary || '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default PaywallScreenRenewal;