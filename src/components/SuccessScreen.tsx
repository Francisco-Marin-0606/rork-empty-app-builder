import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import CustomButton from './CustomButton';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import { StatusBar } from 'expo-status-bar';

interface SuccessScreenProps {
  onClose: () => void;
}

export const FormSuccessScreen: React.FC<SuccessScreenProps> = ({ onClose }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Tu hipnosis{'\n'}
            está siendo{'\n'}
            creada
          </Text>
        </View>

        <View style={styles.containerBottom}>
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              <Text style={{ fontFamily: 'Geist-SemiBold' }}>En menos de 1140 minutos</Text> (24h)
              te enviaré tu hipnosis.
            </Text>
          </View>

          <View style={styles.startButtonContainer}>
            <CustomButton
              title="Volver"
              handlePress={onClose}
              textStyles={{ color: 'white' }}
              containerStyles={{ backgroundColor: '#F2741B' }}
            />
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: "100%",
    height: '100%',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,

  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 0,
    zIndex: 10,
    padding: 0,

  },
  containerBottom: {
    position: 'absolute',
    flexDirection: 'column',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  titleContainer: {
    width: '100%',
    position: 'absolute',
    top: 60,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',

  },
  title: {
    color: 'white',

    fontFamily: Platform.OS === 'ios' ? 'Geist-Semibold' : 'Geist-Bold',
    textAlign: 'left',
    letterSpacing: -3.5,

    fontSize: 60,
    lineHeight: 60 * 0.9,
    paddingTop: 60 - (60 * 0.75),
  },
  messageContainer: {
    width: '100%',
  },
  message: {
    color: 'white',
    letterSpacing: -1.7,
    fontSize: fontSize.xl,
    fontFamily: 'Geist-Regular',
    textAlign: 'left',
    marginBottom: 20,
    lineHeight: fontSize.xl * 1.5,
  },
  startButton: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'black',
    fontFamily: 'Geist-SemiBold',
  },
  startButtonContainer: {
    width: '100%',
  }
});