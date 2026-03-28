import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors, fontSize } from '@/constants/tokens';
import CustomButton from './CustomButton';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';

interface SessionExpiredModalProps {
  isVisible: boolean;
  onClose: () => void;
  email?: string | null;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ 
  isVisible, 
  onClose,
  email
}) => {
  const { signOut } = useAuthStore();

  const handleLoginAgain = async () => {
    await signOut();
    onClose();
    
    // Redirigir al login con el email pre-completado si está disponible
    if (email) {
      router.push({
        pathname: '/(auth)/login',
        params: { email }
      });
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Hubo un problema</Text>
          
          <Text style={styles.message}>
          Por favor, inicia sesión nuevamente para continuar.
          </Text>
          
          <View style={styles.buttonsContainer}>
            <CustomButton
              title="Iniciar sesión"
              handlePress={handleLoginAgain}
              containerStyles={styles.button}
              textStyles={{color: 'black'}}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.screenBackground,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Geist-Semibold',
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: fontSize.base,
    fontFamily: 'Geist-Regular',

    color: colors.tertiary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  buttonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    marginVertical: 6,
    backgroundColor: 'white',

  }
});

export default SessionExpiredModal; 