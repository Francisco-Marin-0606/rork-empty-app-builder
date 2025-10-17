import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Dimensions, 
  Easing, 
  Modal, 
  PanResponder, 
  Pressable, 
  StyleSheet, 
  Text, 
  TouchableWithoutFeedback, 
  View 
} from 'react-native';
import { colors, fontSize } from '@/constants/tokens';

const { height } = Dimensions.get('window');

type BottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const BottomSheet = ({ isVisible, onClose, title, children }: BottomSheetProps) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const handleCloseMenu = () => {
    // Animate closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) { // Only allow downward drag
          slideAnim.setValue(gestureState.dy);
          // Calculate backdrop opacity based on drag position
          const newOpacity = Math.max(0, 1 - (gestureState.dy / (height * 0.4)));
          backdropOpacity.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) { // Threshold to close
          // Close the menu if dragged down far enough
          handleCloseMenu();
        } else {
          // Otherwise snap back to open position
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isVisible) {
      // Animate opening
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.20, 0.64, 1),
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        }),
      ]).start();
    } else {
      // Reset animations when not visible
      slideAnim.setValue(height);
      backdropOpacity.setValue(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="none"
      onRequestClose={handleCloseMenu}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity }
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }] }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragIndicator} />

          <View style={styles.bottomSheetContent}>
            {title && <Text style={styles.bottomSheetTitle}>{title}</Text>}
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: colors.screenBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 320,
    paddingBottom: 50,
  },
  bottomSheetContent: {
    padding: 15,
  },
  bottomSheetTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  dragIndicator: {
    width: 80,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
});

export default BottomSheet;