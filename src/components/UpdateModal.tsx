import React from 'react';
import { Modal, View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { useUpdateStore } from '../store/updateStore';
import Constants from 'expo-constants';
import CustomButton from './CustomButton';
import { colors, fontSize } from '@/constants/tokens';

export const UpdateModal = () => {
  const { 
    hasRequiredUpdate,
    updateType,
    versionInfo 
  } = useUpdateStore();

  const STORE_URLS = {
    ios: 'itms-apps://itunes.apple.com/app/id6740008581', 
    android: 'market://details?id=com.mentalmagnet.mentalMagnetApp',
    webFallback: 'https://play.google.com/store/apps/details?id=com.mentalmagnet.mentalMagnetApp'
  } as const;

  const handleUpdate = async () => {
    const storeUrl = Platform.select({
      ios: STORE_URLS.ios,
      android: STORE_URLS.android,
      default: STORE_URLS.webFallback
    });
  
    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      try {
        const webUrl = Platform.select({
          ios: 'https://apps.apple.com/cl/app/mental-hipnosis-personalizada/id6740008581',
          android: STORE_URLS.webFallback,
          default: STORE_URLS.webFallback
        });
        await Linking.openURL(webUrl);
      } catch (secondaryError) {
        console.error('Failed to open store in both attempts:', { error, secondaryError });
      }
    }
  };
  return (
    <Modal
      visible={hasRequiredUpdate}
      transparent
      animationType="fade"
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text maxFontSizeMultiplier={1.1} style={styles.title}>
          Te estás perdiendo una mejor versión de esta app.
          </Text>
          <Text maxFontSizeMultiplier={1.1} style={styles.message}>
            (No, perdón, MUCHO mejor){"\n"}{"\n"}
            Dale a "actualizar" para seguir usando Mental. {"\n"}

            {/* {versionInfo && ` Nueva versión: ${versionInfo.latestVersion}`} */}
          </Text>
          <CustomButton
            title="Actualizar"
            textStyles={{color: 'black'}} 
            handlePress={handleUpdate}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: colors.screenBackground,
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  title: {
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.5,
    fontSize: fontSize.sm,
    color: colors.tertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
});