import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '@/constants/tokens';
import { formatUTCDate } from '@/helpers/miscellaneous';

type TrackInfoCardProps = {
  title: string;
  date: string;
};

const TrackInfoCard = ({ title, date }: TrackInfoCardProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.date}>{formatUTCDate(date, true)} hrs</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: 'Geist-SemiBold',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  date: {
    color: colors.textMuted,
    fontFamily: 'Inter-Regular',
    fontSize: fontSize.sm,
    letterSpacing: -0.5,
  },
});

export default TrackInfoCard;