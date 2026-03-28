import React, { useEffect, useState } from 'react';
import { View, TouchableHighlight, StyleSheet, ImageURISource } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import FastImage from 'react-native-fast-image';
import { useAppConfig } from '@/hooks/useAppConfig';

interface HipnosisHeaderProps {
  url?: string;
  imageSource?: number | ImageURISource;
}

// Definir los valores por defecto como constantes
const DEFAULT_BANNER_DATA = {
  url: "https://julianealborna.wistia.com/medias/99yqifa2r0",
  imageUri: require('../../assets/Images/intro-hipnosis-app.jpg') as number 
};

interface BannerItem {
  url: string;
  imageUri: number | string;
}

const HipnosisHeader: React.FC<HipnosisHeaderProps> = ({
  url,
  imageSource,
}) => {
  const [aspectRatio, setAspectRatio] = useState(2.24);
  const { configs, isLoading, error, isOffline, getConfig } = useAppConfig();
  const [bannerData, setBannerData] = useState<BannerItem[]>([DEFAULT_BANNER_DATA]); 
  
  useEffect(() => {
    try {
      // Obtener la configuración del banner usando el método getConfig
      const bannerConfig = getConfig('tabs.audios.components.banner.data', []);
      
      // Añadimos verificación de null para bannerConfig
      if (!bannerConfig) {
        console.log('[HipnosisBanner] Banner config is null, using default');
        setBannerData([DEFAULT_BANNER_DATA]);
        return;
      }
      
      // Verificamos que bannerConfig sea un array y tenga elementos
      if (Array.isArray(bannerConfig) && bannerConfig.length > 0) {
        const newBannerData = bannerConfig.map((item) => {
          // Verificar si el item es null o undefined
          if (!item) {
            return DEFAULT_BANNER_DATA;
          }
          
          // Verificar si el item es un array con dos elementos
          if (Array.isArray(item) && item.length >= 2) {
            const [url, imageUri] = item;
            // Validamos que tanto url como imageUri existan
            if (!url || !imageUri) {
              return DEFAULT_BANNER_DATA;
            }
            return { url, imageUri };
          }
          
          // Si el formato no es el esperado, devolver valor por defecto
          return DEFAULT_BANNER_DATA;
        });
        
        // Solo actualizamos si tenemos datos válidos
        if (newBannerData.some(item => item.url && item.imageUri)) {
          setBannerData(newBannerData);
        }
      }
    } catch (error) {
      console.error('[HipnosisBanner] Error processing banner config:', error);
      // En caso de error, mantenemos los datos por defecto
      setBannerData([DEFAULT_BANNER_DATA]);
    }
  }, [configs, getConfig]);

  const handlePress = async () => {
    // Validamos que tengamos datos válidos antes de intentar abrir el navegador
    const currentBanner = bannerData && bannerData.length > 0 ? bannerData[0] : DEFAULT_BANNER_DATA;
    if (!currentBanner?.url) return;
    
    try {
      // Si estamos offline, podríamos mostrar un mensaje al usuario
      if (isOffline) {
        console.log('[HipnosisBanner] No se puede abrir el enlace, el dispositivo está sin conexión.');
        // Aquí podrías mostrar un Toast o alguna notificación al usuario
        return;
      }
      
      await WebBrowser.openBrowserAsync(currentBanner.url);
    } catch (error) {
      console.error("[HipnosisBanner] Error opening browser:", error);
    }
  };

  const getImageSource = () => {
    const currentBanner = bannerData && bannerData.length > 0 ? bannerData[0] : DEFAULT_BANNER_DATA;
    // Si no hay banner o está incompleto, usamos el valor por defecto
    if (!currentBanner?.imageUri) return DEFAULT_BANNER_DATA.imageUri;

    if (typeof currentBanner.imageUri === 'number') {
      return currentBanner.imageUri;
    }

    return {
      uri: currentBanner.imageUri,
      priority: FastImage.priority.high,
      cache: FastImage.cacheControl.immutable,
    };
  };

  // Solo renderizamos si tenemos datos válidos y no hay error
  if (!bannerData || !bannerData.length || (error && !configs)) {
    return null;
  }

  return (
    <View style={[styles.container, { aspectRatio }]}>
      <TouchableHighlight
        onPress={handlePress}
        underlayColor="transparent"
        style={styles.touchable}
      >
        <FastImage
          source={getImageSource()}
          style={styles.headerImage}
          resizeMode={FastImage.resizeMode.cover}
        />
      </TouchableHighlight>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  touchable: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  }
});

export default HipnosisHeader;