import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { fontSize, screenPadding } from '@/constants/tokens';
import CustomButton from './CustomButton';
import {  IconChevronLeft } from '@tabler/icons-react-native';
import Constants from 'expo-constants';

interface HypnosisInstructionsScreenProps {
  onStart: () => void;
  onBack: () => void;
}

const { height } = Dimensions.get('window');

const HypnosisInstructionsScreen: React.FC<HypnosisInstructionsScreenProps> = ({
  onStart,
  onBack
}) => {
  // Animaciones para cada instrucción
  const instruction1Opacity = useRef(new Animated.Value(0)).current;
  const instruction1TranslateY = useRef(new Animated.Value(30)).current;
  
  const instruction2Opacity = useRef(new Animated.Value(0)).current;
  const instruction2TranslateY = useRef(new Animated.Value(30)).current;
  
  const instruction3Opacity = useRef(new Animated.Value(0)).current;
  const instruction3TranslateY = useRef(new Animated.Value(30)).current;
  
  const instruction4Opacity = useRef(new Animated.Value(0)).current;
  const instruction4TranslateY = useRef(new Animated.Value(30)).current;
  
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;

  // Función para animar una instrucción
  const animateInstruction = (opacity: Animated.Value, translateY: Animated.Value, delay: number = 0) => {
    return Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      })
    ]);
  };

  // Iniciar animaciones secuenciales cuando el componente se monta
  useEffect(() => {
    const sequence = Animated.sequence([
      animateInstruction(instruction1Opacity, instruction1TranslateY, 50),
      animateInstruction(instruction2Opacity, instruction2TranslateY, 100),
      animateInstruction(instruction3Opacity, instruction3TranslateY, 100),
      animateInstruction(instruction4Opacity, instruction4TranslateY, 100),
      animateInstruction(buttonOpacity, buttonTranslateY, 100),
    ]);

    sequence.start();
  }, []);

  return (
    <View style={styles.content}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            onPress={onBack}
          >
           <View style={{
            width: 40,
            height: 40,
            borderRadius: 40,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}  
          >
            <IconChevronLeft size={36} color="white" />
          </View>
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsContainer}>
          <Animated.View style={{
            opacity: instruction1Opacity,
            transform: [{ translateY: instruction1TranslateY }]
          }}>
            <Text style={styles.instruction}>
              Apaga tus{'\n'}
              notificaciones.
            </Text>
          </Animated.View>
          
          <Animated.View style={{
            opacity: instruction2Opacity,
            transform: [{ translateY: instruction2TranslateY }]
          }}>
            <Text style={styles.instruction}>
              Escucha con{'\n'}
              audífonos.
            </Text>
          </Animated.View>
          
          <Animated.View style={{
            opacity: instruction3Opacity,
            transform: [{ translateY: instruction3TranslateY }]
          }}>
            <Text style={styles.instruction}>
              Siéntate con{'\n'}
              tu espalda recta.
            </Text>
          </Animated.View>
          
          <Animated.View style={{
            opacity: instruction4Opacity,
            transform: [{ translateY: instruction4TranslateY }]
          }}>
            <Text style={styles.instruction}>
              y cierra los ojos.
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={{
          opacity: buttonOpacity,
          transform: [{ translateY: buttonTranslateY }]
        }}>
          <CustomButton 
            title="Comenzar"
            handlePress={() => onStart()} 
            containerStyles={styles.startButton}
            textStyles={styles.startButtonText}
          />
        </Animated.View>
      </View>
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
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: height * 0.1,
  },
  instructionsContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    gap: 40,
  },
  instruction: {
    color: 'white',
    fontSize: fontSize['2.5xl'],
    fontFamily: 'Geist-SemiBold',
    textAlign: 'center',
    lineHeight: fontSize['2.5xl'] * 1,
  },
  startButton: {
    marginTop: 40,
    width: '100%',
    height: 50,
    backgroundColor: '#F2741B',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontFamily: 'Geist-SemiBold',
  },
  backButtonContainer: {
    position: 'absolute',
    top: Constants.statusBarHeight,
    left:Platform.OS === 'ios' ? screenPadding.horizontalIos - 10 : screenPadding.horizontalAndroid - 10,

  },
});

export default HypnosisInstructionsScreen; 