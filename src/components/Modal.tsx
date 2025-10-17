import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar, Platform } from 'react-native';
import { IconArrowLeft } from '@tabler/icons-react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { useRouter } from 'expo-router';
import { defaultStyles } from '@/styles';

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  headerRight?: React.ReactNode;
  headerBackgroundColor?: string;
  showBackButton?: boolean;
  showTitle?: boolean;
  showHeader?: boolean;
  backButtonIconColor?: string;
  headerTextColor?: string;
};

const Modal = ({ 
  title, 
  children, 
  onClose, 
  headerRight,
  headerBackgroundColor = 'transparent',
  showBackButton = true,
  showTitle = true,
  showHeader = true,
  backButtonIconColor = colors.text,
  headerTextColor = colors.text
}: ModalProps) => {
  const router = useRouter();
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back(); 
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content"/>
      
      {showHeader && (
        <View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
          {showBackButton && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <IconArrowLeft size={24} color={backButtonIconColor} />
            </TouchableOpacity>
          )}
          
          {showTitle && <Text style={[styles.title, { color: headerTextColor }]}>{title}</Text>}
          
          {headerRight ? (
            <View style={styles.headerRightContainer}>{headerRight}</View>
          ) : (
            <View style={styles.headerRightPlaceholder} />
          )}
        </View>
      )}
      
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding.horizontal,
    height: Platform.OS === 'ios' ? 60 : 120,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: fontSize.base,
    fontFamily: 'Geist-SemiBold',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 48, // Same width as back button to keep title centered
  },
  headerRightContainer: {
    width: 48,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    // paddingHorizontal: 16,
  },
});

export default Modal;