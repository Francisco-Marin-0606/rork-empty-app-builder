import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform } from 'react-native'
import { colors, fontSize, screenPadding } from '@/constants/tokens'

interface SubscriptionCancelModalProps {
        visible: boolean
        onConfirm: () => void
        onCancel: () => void
        isLoading?: boolean
}

const SubscriptionCancelModal: React.FC<SubscriptionCancelModalProps> = ({ visible, onConfirm, onCancel, isLoading = false }) => {
        return (
                <Modal visible={visible} transparent={true} animationType="fade" statusBarTranslucent={true}>
                        <View style={styles.overlay}>
                                <View style={styles.modalContainer}>
                                        <View style={styles.dragIndicator} />
                                        <View style={styles.content}>
                                                <View style={styles.textContainer}>
                                                        <Text style={styles.title}>¿Estás seguro que{'\n'}quieres cancelar tu {'\n'}suscripción a Mental?</Text>
                                                        <Text style={styles.explanationText}>El siguiente click abre una línea de tiempo en la que no podrás pedir nuevas hipnosis.</Text>
                                                        <Text style={styles.explanationText}>Y para escuchar las anteriores, tendrás que renovar tu suscripción.</Text>
                                                </View>
                                                <View style={styles.buttonContainer}>
                                                        <TouchableOpacity style={[styles.confirmButton, isLoading && styles.disabledButton]} onPress={onConfirm} disabled={isLoading}>
                                                                <Text style={styles.confirmButtonText}>{isLoading ? 'Procesando...' : 'Sí, quiero cancelar'}</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isLoading}>
                                                                <Text style={styles.cancelButtonText}>No, deseo continuar</Text>
                                                        </TouchableOpacity>
                                                </View>
                                        </View>
                                </View>
                        </View>
                </Modal>
        )
}

const styles = StyleSheet.create({
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
        modalContainer: { flex: 1, backgroundColor: 'black', borderRadius: 0, paddingBottom: 24 },
        dragIndicator: { width: 40, height: 4, backgroundColor: colors.tertiary, borderRadius: 2, alignSelf: 'center', marginTop: 16, marginBottom: 16 },
        content: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos, flex: 1 },
        textContainer: { alignItems: 'center', marginBottom: 20 },
        title: { fontSize: fontSize["2.5xl"], fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 20, fontFamily: 'Geist-SemiBold', letterSpacing: -0.5 },
        explanationText: { fontSize: fontSize.sm, color: colors.tertiary, textAlign: 'center', marginBottom: 8, fontFamily: 'Inter-Regular', letterSpacing: -0.5 },
        buttonContainer: { width: '100%', gap: 12 },
        confirmButton: { backgroundColor: colors.secondary || '#191919', justifyContent: 'center', alignItems: 'center', height: 60, borderRadius: 12 },
        confirmButtonText: { color: colors.text, fontSize: fontSize['sm-18'], fontFamily: 'Inter-Semibold', letterSpacing: -0.5, textAlign: 'center' },
        cancelButton: { backgroundColor: '#F2741B', justifyContent: 'center', alignItems: 'center', height: 60, borderRadius: 12 },
        cancelButtonText: { color: 'white', fontSize: fontSize['sm-18'], fontFamily: 'Inter-Semibold', letterSpacing: -0.5, textAlign: 'center' },
        disabledButton: { opacity: 0.6 },
})

export default SubscriptionCancelModal


