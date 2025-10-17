import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import CustomButton from './CustomButton';
import { FontAwesome } from '@expo/vector-icons';

export const NoInternetScreen: React.FC = ({ }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* <View style={styles.iconContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="white" />
        </View> */}
        
        <Text style={styles.title}>
          ¡Feliz 1998!
        </Text>
        
        <Text style={styles.description}>
        No tienes conexión a Internet. 
        </Text>

        {/* <CustomButton
          title={buttonTitle}
          handlePress={onClose}
          containerStyles={styles.button}
        /> */}
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
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.5,
    fontSize: fontSize.sm,
    color: colors.tertiary,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: colors.primary, // Botón blanco para contraste
    width: '100%',
    borderRadius: 12,
  },
});