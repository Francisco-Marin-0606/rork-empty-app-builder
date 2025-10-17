import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { WizardFormData } from '@/helpers/types';

interface HypnosisReadyScreenProps {
  onContinue: () => void;
  onComplete?: (formData: WizardFormData) => Promise<boolean>;
  formData?: WizardFormData;
}



const HypnosisReadyScreen: React.FC<HypnosisReadyScreenProps> = ({
  onContinue,
  onComplete,
  formData = {}
}) => {

  const [videoStatus, setVideoStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (onComplete && formData) {
      setIsSubmitting(true);
      try {
        const result = await onComplete(formData);
        setIsSubmitting(false);
        if (result) {
          onContinue();
        }
      } catch (error) {
        console.error('Error completing registration:', error);
        setIsSubmitting(false);
      }
    } else {
      // Si no hay onComplete, simplemente continuar
      onContinue();
    }
  };

  // Detectar cuando el video ha terminado y ejecutar handleContinue automáticamente
  useEffect(() => {
    if (videoStatus && 'didJustFinish' in videoStatus && videoStatus.didJustFinish) {
      handleContinue();
    }
  }, [videoStatus, handleContinue, onComplete, formData]);

  return (
    <SafeAreaView style={styles.container}>
      <Video
        source={require('@/assets/Images/enviar_respuestas.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
        isLooping={false}
        isMuted={false}
        onPlaybackStatusUpdate={status => setVideoStatus(status)}
        onError={(e) => console.warn('[HypnosisReadyScreen] Video error:', e)}
      />
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },


});

export default HypnosisReadyScreen;