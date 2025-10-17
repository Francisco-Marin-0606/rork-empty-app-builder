/* Copiado de a727223 con ajustes mínimos de rutas/estilos locales */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity, Animated, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { PanGestureHandler, State } from 'react-native-gesture-handler'
import { colors, fontSize, screenPadding } from '@/constants/tokens'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { SubscriptionService } from '@/services/api/subscriptionService'
import { useNetworkStore } from '@/store/networkStore'
import { User, getMembershipStatus, getSubscriptionType, formatDateUTC } from '@/helpers/membershipUtils'
import SubscriptionCancelModal from '@/components/SubscriptionCancelModal'
import Skeleton from '@/components/Skeleton'
import { NoInternetAlert } from '@/components/NoInternetAlert'

const SubscriptionManagementScreen = () => {
  const { userData, userId, fetchUserData } = useAuthStore()
  const { isConnected } = useNetworkStore()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isSubscriptionCanceled, setIsSubscriptionCanceled] = useState(false)

  const screenHeight = Dimensions.get('window').height
  const translateY = React.useRef(new Animated.Value(screenHeight)).current
  const gestureTranslateY = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }).start()
  }, [])

  const onGestureEvent = Animated.event([{ nativeEvent: { translationY: gestureTranslateY } }], { useNativeDriver: true })
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent
      if (translationY > 200 || velocityY > 500) {
        // Close immediately without animation
        router.back()
      } else {
        // Reset to original position without animation
        translateY.setValue(0)
        gestureTranslateY.setValue(0)
      }
    }
  }

  useEffect(() => { 
    setIsLoading(true)
    loadUserData() 
     getSubscriptionStatus()   
  }, [])

  const loadUserData = async () => {
    if (!userId) return
    try {
      setError(null)
      if (userData?.lastMembership) {
        setUser({
          _id: userId,
          email: userData.email || '',
          names: userData.names || '',
          lastnames: userData.lastnames || '',
          lastMembership: userData.lastMembership,
          source: '',
          userLevel: '',
        })
      } else {
        setError('No hay datos de membresía disponibles')
      }
    } catch (e: any) {
      setError('Error al cargar datos del usuario')
    }
  }

  const getSubscriptionStatus = async () => {
    try {
      const response = await SubscriptionService.getSubscriptionInfo()
      // Si el status no es "active", retornar true
      setIsSubscriptionCanceled((response?.membership?.stripeStatus??true) === false)
      console.log('response', response)
    } catch (error) {
      console.error('Error getting subscription status:', error)
      return false
    }finally{
      setIsLoading(false)
    }
  }

  const getSubscriptionStatusUI = () => {
    if (!user?.lastMembership) return null
    const status = getMembershipStatus(user.lastMembership)
    const isActive = status === 'Activa'
    return (
      <View style={[styles.subscriptionStatusContainer, { backgroundColor: isActive ? '#113d0a' : '#8B0000' }]}>
        <Text style={[styles.subscriptionStatusText, { color: isActive ? '#8ae286' : '#ff6b6b' }]}>{status.toUpperCase()}</Text>
      </View>
    )
  }

  const handleCancelSubscription = () => setShowCancelModal(true)
  const handleConfirmCancel = () => { setShowCancelModal(false); confirmCancelSubscription() }
  const handleCancelModal = () => setShowCancelModal(false)

  const confirmCancelSubscription = async () => {
  
    if (!user?._id || !isConnected) {
      Alert.alert('Error', 'No se pudo procesar la cancelación. Verifica tu conexión a internet.', [{ text: 'OK' }])
      return
    }
    
    try {
      setIsLoading(true)
      await SubscriptionService.cancelSubscriptionProduction(user._id)
      Alert.alert('Suscripción cancelada', 'Tu suscripción ha sido cancelada exitosamente. Podrás seguir usando la app hasta el final del período actual.', [{ text: 'OK', onPress: () => { fetchUserData(); router.back() } }])
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo cancelar la suscripción. Por favor, intenta nuevamente.', [{ text: 'OK' }])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !user) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>Cargando...</Text></View>
      </View>
    )
  }
  if (error && !user) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}><Text style={styles.errorText}>Error: {error}</Text></View>
      </View>
    )
  }
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}><Text style={styles.errorText}>Usuario no encontrado</Text></View>
      </View>
    )
  }

  const membershipStatus = getMembershipStatus(user.lastMembership)
  const subscriptionType = getSubscriptionType(user.lastMembership.type)

  return (
    <>
      <View style={styles.container}>
        <StatusBar style="light" />
        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
          <Animated.View style={[styles.animatedContainer, { transform: [{ translateY: Animated.add(translateY, gestureTranslateY) }] }]}>

            <View style={styles.contentContainer}>
              <View style={styles.dragIndicator} />
              <View style={styles.header}>
                <Text style={styles.title}>Gestionar Suscripción</Text>
              </View>
              <View style={styles.subscriptionDetailsContainer}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Suscripción:</Text>{getSubscriptionStatusUI()}</View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan actual:</Text>
                  <View style={styles.planValueContainer}>
                    <Text style={styles.detailValue}>{subscriptionType}</Text>
                  </View>
                </View>
                {subscriptionType !== 'Free' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Próximo pago:</Text>
                    <Text style={isSubscriptionCanceled ? styles.detailValueCanceled : styles.detailValue}>
                      {formatDateUTC((user.lastMembership.billingDate || user.lastMembership.membershipDate))}
                    </Text>
                  </View>
                )}
              </View>
               {subscriptionType !== 'Free' && isConnected && (
                 isSubscriptionCanceled ?(
                  <View style={[styles.cancelButtonEnabled]}>
                    <Text style={styles.cancelButtonTextEnabled}>{'Cancelar suscripción'}</Text>
                  </View>
                 ):(
                membershipStatus === 'Activa' && 
                  <TouchableOpacity style={[styles.cancelButton, isLoading && styles.cancelButtonDisabled]} onPress={handleCancelSubscription} disabled={isLoading}>
                    <Text style={styles.cancelButtonText}>{isLoading ? 'Procesando...' : 'Cancelar suscripción'}</Text>
                  </TouchableOpacity>
                )
               )}
              {subscriptionType !== 'Free' && isSubscriptionCanceled && (
                <Text
                  style={[styles.subscriptionStatusText, { color: "white", fontSize: fontSize.xs, fontFamily: 'Geist-Regular',  alignItems: 'center', marginBottom: 16, textAlign: 'center' }]}
                >
                 {' Ya has cancelado tu suscripción. \n Seguirá activa hasta que finalice tu período de pago.'}
                </Text>
              )
            }
            </View>
          </Animated.View>
        </PanGestureHandler>
       </View>
      <SubscriptionCancelModal visible={showCancelModal} onConfirm={handleConfirmCancel} onCancel={handleCancelModal} isLoading={isLoading} />
      {!isConnected && (
        <View style={styles.noInternetAlert}>
          <Text style={styles.noInternetText}>
            No tienes conexión a Internet.
          </Text>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  animatedContainer: { flex: 1, backgroundColor: 'black' },

  contentContainer: { flex: 1, paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos, paddingTop: 50, marginTop: 20 },
  dragIndicator: { width: 40, height: 4, backgroundColor: colors.tertiary, borderRadius: 2, alignSelf: 'center', marginTop: 0, marginBottom: 15 },
  header: { alignItems: 'flex-start', justifyContent: 'flex-start', marginBottom: 30, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 24, color: colors.text, fontFamily: 'Geist-SemiBold' },
  subscriptionDetailsContainer: { marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, opacity: 1 },
  detailLabel: { fontSize: fontSize.base, color: colors.text, fontFamily: 'Geist-SemiBold' },
  detailValue: { fontSize: fontSize.base, color: colors.text },
  planValueContainer: { 
    minWidth: 120, 
    justifyContent: 'center', 
    alignItems: 'flex-end'
  },
  detailValueCanceled: { fontSize: fontSize.base, color: colors.text, opacity: 0.5 },
  subscriptionStatusContainer: { paddingVertical: 8, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', borderRadius: 8, minWidth: 120 },
  subscriptionStatusText: { fontSize: fontSize.xs, fontFamily: 'Geist-Bold', letterSpacing: -0.5 },
  cancelButton: { backgroundColor: '#470000', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, alignItems: 'center', alignSelf: 'stretch', marginBottom: 16,},
  cancelButtonEnabled: { backgroundColor: '#282123', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12, alignItems: 'center', alignSelf: 'stretch', marginBottom: 16, },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelButtonText: { color: '#CC0000', fontSize: fontSize.base, fontFamily: 'Geist-Medium' },
  cancelButtonTextEnabled: { color: '#5E5456', fontSize: fontSize.base, fontFamily: 'Geist-Medium' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, fontSize: fontSize.base, fontFamily: 'Geist-Regular' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorText: { color: '#ff6b6b', fontSize: fontSize.base, textAlign: 'center', fontFamily: 'Geist-Regular' },
  noInternetAlert: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    backgroundColor: 'gray',
    paddingVertical: 4,
  },
  noInternetText: {
    color: colors.text,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
})

export default SubscriptionManagementScreen


