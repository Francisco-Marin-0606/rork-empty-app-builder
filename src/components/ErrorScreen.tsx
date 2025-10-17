import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import CustomButton from './CustomButton';
import { FontAwesome } from '@expo/vector-icons';

interface ErrorScreenProps {
  onClose: () => void;
  errorTitle?: string;
  errorMessage?: string;
  buttonTitle?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ 
  onClose,
  errorTitle = 'Oops, Algo salió mal',
  errorMessage = 'Ha ocurrido un error al procesar tu solicitud. Por favor intenta nuevamente más tarde.',
  buttonTitle = 'Regresar'
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="white" />
        </View>
        
        <Text style={styles.title}>
          {errorTitle}
        </Text>
        
        <Text style={styles.description}>
          {errorMessage}
        </Text>

        <CustomButton
          title={buttonTitle}
          handlePress={onClose}
          containerStyles={styles.button}
          textStyles={{color: 'white'}}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBackground, // Usando un color rojo para error
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenPadding.horizontal,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    fontSize: fontSize.lg,

    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontFamily: 'Inter-regular',
    letterSpacing: -0.5,
    fontSize: fontSize.sm,
    color: colors.tertiary,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: colors.primary, // Botón blanco para contraste
    width: '92%',
    borderRadius: 12,
    minHeight: 55,
    padding: 0,
    alignSelf: 'center',
  },
});