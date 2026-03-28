import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import CustomButton from './CustomButton';
import { fontSize, screenPadding, colors } from '@/constants/tokens';

interface RequestHipnosisProps {
    onRequestHipnosis: () => void;
    onBack: () => void;
}

const RequestHipnosisScreen = ({ onRequestHipnosis, onBack }: RequestHipnosisProps) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.mainContent}>
      <View style = {styles.titleContainer}>
      <Text maxFontSizeMultiplier={1.1} style={styles.stepTitle}>
        {`Ya puedes\npedir tu\nsiguiente\nhipnosis`}
      </Text>
      </View>
      <View style={styles.descriptionContainer}>
        <Text maxFontSizeMultiplier={1.1} style={styles.descriptionText}>
          <Text maxFontSizeMultiplier={1.1} style={styles.bold}>Vuelvo otra vez:</Text>
          {` para preguntarte en quién te quieres convertir.\n\n`}
          {`No hay forma de hacerlo mal.\n\n`}
          {`Mira muy adentro y llega a lo que realmente quieres.`}
          {/* <Text maxFontSizeMultiplier={1.1} style={styles.bold}>este es un gran momento.</Text> */}
        </Text>
      </View>
    </View>
    <View style={styles.buttonContainer}>
      <CustomButton
        title="Pedir mi hipnosis ahora"
        handlePress={onRequestHipnosis}
        containerStyles={styles.button}
        textStyles={{ color: 'white' }}
      />
      <CustomButton
        title="Pedir más tarde"
        handlePress={onBack}
        containerStyles={[styles.button, styles.backButton]}
        textStyles={{ color: 'white' }}
      />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  titleContainer: {
    width: '100%',
    height: '50%',
    paddingBottom: 50,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
  },
  stepTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
    fontSize: 60,
    marginTop: Platform.OS === 'ios' ? 20 : 60,
    color: 'white',
    lineHeight: 60 * 0.95,
    letterSpacing: -3.5,
  },
  image: {
    marginTop: -10,
    marginLeft: -20,
    height: "40%",
    width: '80%',
  },
  descriptionContainer: {
    width: '100%',
  },
  descriptionText: {
    letterSpacing: -1.7,
    fontSize: fontSize.xl,
    fontFamily: 'Geist-Regular',
    textAlign: 'left',
    lineHeight: fontSize.xl * 1.1,
    color: 'white',
  },
  bold: {
    fontFamily: 'Geist-SemiBold',
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'column',
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    backgroundColor: 'black',
    width: '100%',
  },
  button: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: 'black'
  },
});

export default RequestHipnosisScreen;

