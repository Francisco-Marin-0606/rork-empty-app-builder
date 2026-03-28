import React from 'react';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors, fontSize, screenPadding } from './tokens'
import { Platform, Image, View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import GradientText from '@/components/GradientText';
import { useHeaderStore } from '@/store/headerStore';
import { router } from 'expo-router';

// Componente para el ícono de configuración (como se muestra en la imagen)
export function SettingsButton({ onPress, isConnected }: { onPress?: () => void, isConnected?: boolean }) {
  const defaultOnPress = () => router.push('/(app)/profile');
  
  return (
    <View style={{flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end',  height: 40, marginTop: 30}}>
    <TouchableOpacity onPress={onPress || defaultOnPress}>
   {/* <FontAwesome6
     name="gear"
     size={24}
     color="white"
     style={{ marginRight: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos }}
   /> */}
  <View style={{ width: 70, height: 60, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginLeft: !isConnected ? -50 : 0, borderRadius: 10 }}>
  <Image source={require('../../assets/Images/icono_config.png')} style={{ width: 40, height: 40}} resizeMode="contain"  />
  </View>
 </TouchableOpacity>
 </View>
  );
}


function LogoTitle() {
    return (
      <Image
        style={{ width: 24, height: 24,marginLeft: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos }}
        source={require('../../assets/IsoLogo.png')}
      />
    );
  }

// Componente para el ícono de configuración (como se muestra en la imagen)
export function AuraSettingsButton({ onPress }: { onPress?: () => void }) {
  const defaultOnPress = () => router.push('/(app)/profile');
  
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',  height: 40}}>
       <TouchableOpacity onPress={onPress || defaultOnPress}>
      {/* <FontAwesome6
        name="gear"
        size={24}
        color="white"
        style={{ marginRight: Platform.OS === 'android' ? screenPadding.horizontalAndroid : screenPadding.horizontalIos }}
      /> */}
      <View style={{ width: 70, height: 60,justifyContent: 'center', alignItems: 'center', marginRight: 10, borderRadius: 10 }}>
      <Image source={require('../../assets/Images/icono_config.png')} style={{   width: 40, height: 40 }} resizeMode="contain"  />
      </View>
    </TouchableOpacity>
    </View>
  );
}



  function ChatLogoTitle() {
const showHeader = useHeaderStore((state) => state.showHeader);
const headerOpacity = useHeaderStore((state) => state.headerOpacity);

    if (!showHeader) return  <LogoTitle />;
    
    return (
      <Animated.View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        opacity: headerOpacity 
      }}>
        <Text maxFontSizeMultiplier={1.1}  style={{ 
          fontSize: fontSize.lg, 
          fontWeight: 'bold', 
          color: 'white',
          fontFamily: 'Geist-SemiBold',
          letterSpacing: -0.5 
        }}>psi</Text>
        <GradientText colors={["#ffcba4", "#c96820"]} style={{ 
          fontSize: fontSize.lg, 
          fontWeight: 'bold', 
          fontFamily: 'Geist-SemiBold'
        }}>loco</GradientText>
        <Text maxFontSizeMultiplier={1.1}  style={{ 
          fontSize: fontSize.lg, 
          fontWeight: 'bold', 
          color: 'white',
          fontFamily: 'Geist-SemiBold',
          letterSpacing: -0.5
        }}>go</Text>
      </Animated.View>
    );
  }

export const StackScreenTopBar: NativeStackNavigationOptions = {
    headerLeft: () => null,
    headerRight: () => <SettingsButton isConnected={true} />,
    headerTitle: () => null,
    headerStyle: {
        backgroundColor: colors.screenBackground,
    },
    headerTitleAlign: 'center',
    headerTintColor: colors.text,
    headerShadowVisible: false,

    ...(Platform.OS === 'android' && {
        // Ajustes específicos para Android
    }),
};


export const StackScreenChat: NativeStackNavigationOptions = {
  headerTitle:  () => <ChatLogoTitle />,
  headerStyle: {
      backgroundColor: 'transparent',
  },
  headerTitleAlign: 'center',
  // headerTitleStyle: {
  //     fontFamily: 'tan-kindred',
  //     fontSize: 18,
  //     color: colors.text,
  // },
  headerTintColor: colors.text,
  headerShadowVisible: false,

  ...(Platform.OS === 'android' && {
      // Ajustes específicos para Android
  }),
};


