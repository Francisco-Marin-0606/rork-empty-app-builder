import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize } from '@/constants/tokens';
import { IconChevronRight } from '@tabler/icons-react-native';

type BottomSheetOptionProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  subText?: string;
  disabled?: boolean;
  showBottomBorder?: boolean;
};

const BottomSheetOption = ({ 
  icon, 
  label, 
  onPress, 
  subText, 
  disabled, 
  showBottomBorder = true 
}: BottomSheetOptionProps) => {
  return (
    <Pressable
      style={[
        styles.menuOption, 
        !showBottomBorder && styles.noBorder,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <View style={styles.optionRow}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        
        <View style={styles.labelContainer}>
          <Text style={styles.menuOptionText}>{label}</Text>
          {subText && <Text style={styles.subText}>{subText}</Text>}
        </View>
        
        <IconChevronRight color={colors.text} strokeWidth={3} size={20} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  menuOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.fourth,
    padding: 5,
  },
  labelContainer: {
    flex: 1,
    marginLeft: 8,
  },
  menuOptionText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  subText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
    letterSpacing: -0.5,

  },
  disabled: {
    opacity: 0.5,
  },
});

export default BottomSheetOption;