import React, { useState, useEffect } from 'react';
import { Text, TextProps } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor,
  runOnJS
} from 'react-native-reanimated';

// Map global para rastrear los mensajes que ya han iniciado su animación
const animationStartedMap = new Map<number | string, {
  displayedText: string;
  currentIndex: number;
  isComplete: boolean;
}>();

interface TypingTextProps extends TextProps {
  text: string;
  messageId?: number | string; // ID único para el mensaje
  typingSpeed?: number;
  fadeInDuration?: number; // Duración del efecto fade-in
  initialColor?: string; // Color inicial (gris)
  finalColor?: string; // Color final (blanco)
  onComplete?: () => void;
}

const TypingText: React.FC<TypingTextProps> = ({
  text,
  messageId,
  style,
  typingSpeed = 30,
  fadeInDuration = 800, // 800ms por defecto para el fade
  initialColor = '#777777', // Gris por defecto
  finalColor = '#FFFFFF', // Blanco por defecto
  onComplete,
  ...restProps
}) => {
  // Verificar si este mensaje ya ha iniciado su animación
  const hasAnimationStarted = messageId !== undefined && animationStartedMap.has(messageId);
  
  // Usar estados almacenados si ya inició la animación, o valores iniciales si no
  const [displayedText, setDisplayedText] = useState(
    hasAnimationStarted ? animationStartedMap.get(messageId!)!.displayedText : ''
  );
  const [currentIndex, setCurrentIndex] = useState(
    hasAnimationStarted ? animationStartedMap.get(messageId!)!.currentIndex : 0
  );
  const [isComplete, setIsComplete] = useState(
    hasAnimationStarted ? animationStartedMap.get(messageId!)!.isComplete : false
  );
  
  // Usar useSharedValue para mejor rendimiento en animaciones
  const colorProgress = useSharedValue(hasAnimationStarted && isComplete ? 1 : 0);

  // Actualizar el mapa cuando cambian los estados
  useEffect(() => {
    if (messageId !== undefined) {
      animationStartedMap.set(messageId, {
        displayedText,
        currentIndex,
        isComplete
      });
    }
  }, [messageId, displayedText, currentIndex, isComplete]);

  // Reset cuando cambia el texto, solo si no ha comenzado la animación
  useEffect(() => {
    if (!hasAnimationStarted) {
      setDisplayedText('');
      setCurrentIndex(0);
      setIsComplete(false);
      colorProgress.value = 0; // Reinicia la animación de color
    }
  }, [text, hasAnimationStarted]);

  // Efecto de escritura
  useEffect(() => {
    // Solo continúa si no está completo
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timeout);
    } else if (!isComplete) {
      // Cuando termina de escribir, inicia el fade-in del color
      setIsComplete(true);
      
      // Función para llamar onComplete desde el hilo de UI
      const handleAnimationComplete = () => {
        if (onComplete) {
          onComplete();
        }
      };
      
      // Usando Reanimated para la animación de color
      colorProgress.value = withTiming(1, 
        { duration: fadeInDuration }, 
        (finished) => {
          if (finished) {
            // Asegurarse de que onComplete se llame en el hilo de JavaScript
            runOnJS(handleAnimationComplete)();
          }
        }
      );
    }
  }, [currentIndex, text, typingSpeed, isComplete, colorProgress, fadeInDuration, onComplete]);

  // Crear estilo animado para el color de texto
  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        colorProgress.value,
        [0, 1],
        [initialColor, finalColor]
      )
    };
  });

  // Crear un estilo combinado con el estilo pasado por props
  const combinedStyle = [
    style,
    animatedTextStyle
  ];

  return (
    <Animated.Text style={combinedStyle} {...restProps}>
      {displayedText}
    </Animated.Text>
  );
};

export default TypingText; 