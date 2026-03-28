import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { ScreenRecording } from '../native/ScreenRecordingDetector';

export function useAutoPauseOnCapture(pauseFn: () => Promise<void> | void) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ScreenRecording.isSupported) return;

    const handle = async (isCaptured: boolean) => {
      if (isCaptured) {
        try { 
          await pauseFn(); 
        } catch {}
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    // Verificar estado inicial
    ScreenRecording.isCaptured().then(handle);
    
    // Escuchar cambios
    const sub = ScreenRecording.addListener(({ isCaptured }) => handle(isCaptured));
    
    return () => sub.remove();
  }, [pauseFn]);

  // Solo iOS muestra el modal en tiempo real; Android no detecta
  const shouldShow = Platform.OS === 'ios' ? visible : false;
  
  const showIfCaptured = async (): Promise<boolean> => {
    if (!ScreenRecording.isSupported) return false;
    
    const isCaptured = await ScreenRecording.isCaptured();
    if (isCaptured) {
      setVisible(true);
    }
    return isCaptured;
  };
  
  return { 
    isVisible: shouldShow, 
    hide: () => setVisible(false),
    showIfCaptured
  };
}