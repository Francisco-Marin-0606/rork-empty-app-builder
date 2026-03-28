import { useRef, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

// Store global para la rotación del vinilo
let globalRotation = 0;
let globalAnimation: Animated.CompositeAnimation | null = null;
const globalSpinValue = new Animated.Value(0);
let isPlaying = false;

// Función para actualizar la rotación global
const updateGlobalRotation = (value: number) => {
  globalRotation = value % 1;
};

// Función para iniciar la animación global
const startGlobalAnimation = () => {
  if (globalAnimation) {
    globalAnimation.stop();
  }
  
  isPlaying = true;
  // Asegurar que el valor actual esté sincronizado
  globalSpinValue.setValue(globalRotation);
  
  globalAnimation = Animated.loop(
    Animated.timing(globalSpinValue, {
      toValue: globalRotation + 1,
      duration: 6000,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
  
  // Forzar el inicio de la animación
  globalAnimation.start(() => {
    // Callback para asegurar que la animación continúe
    if (isPlaying) {
      globalRotation = (globalRotation + 1) % 1;
      globalSpinValue.setValue(globalRotation);
    }
  });
};

// Función para pausar la animación global
const pauseGlobalAnimation = () => {
  if (globalAnimation) {
    globalAnimation.stop();
    // Obtener el valor actual del spin y actualizar la rotación global
    globalSpinValue.stopAnimation((value: number) => {
      updateGlobalRotation(value);
      globalSpinValue.setValue(globalRotation);
    });
  }
  isPlaying = false;
};

// Hook personalizado para usar la rotación global (para GlobalPlayerOverlay)
export const useVinylRotation = (spinActive: boolean, trackId?: string) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const [lastTrackId, setLastTrackId] = useState<string | undefined>();
  
  useEffect(() => {
    if (spinActive) {
      // Solo iniciar animación si no está ya corriendo
      if (!animation.current) {
        animation.current = Animated.loop(
          Animated.timing(spinValue, {
            toValue: currentRotation.current + 1,
            duration: 6000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        animation.current.start();
      }
      
      // Actualizar lastTrackId si cambió
      if (trackId && trackId !== lastTrackId) {
        setLastTrackId(trackId);
      }
    } else {
      // Solo pausar, NO resetear posición
      if (animation.current) {
        animation.current.stop();
        spinValue.stopAnimation((value: number) => {
          currentRotation.current = value % 1;
          spinValue.setValue(currentRotation.current);
        });
        animation.current = null; // Limpiar referencia
      }
    }
  }, [spinActive, trackId, lastTrackId, spinValue]);
  
  // Crear interpolación individual
  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return rotate;
};

// Hook personalizado para rotación individual de discos (para Aura)
export const useIndividualVinylRotation = (spinActive: boolean, albumId: string) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  
  useEffect(() => {
    if (spinActive) {
      // Iniciar animación individual
      if (animation.current) {
        animation.current.stop();
      }
      
      animation.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: currentRotation.current + 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      
      animation.current.start();
    } else {
      // Pausar animación individual
      if (animation.current) {
        animation.current.stop();
        spinValue.stopAnimation((value: number) => {
          currentRotation.current = value % 1;
          spinValue.setValue(currentRotation.current);
        });
      }
    }
  }, [spinActive, albumId, spinValue]);
  
  // Crear interpolación individual
  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return rotate;
};

export default useVinylRotation;
