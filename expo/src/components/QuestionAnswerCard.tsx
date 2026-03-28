import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, fontSize } from '@/constants/tokens';
import Markdown from 'react-native-markdown-display';

type QuestionAnswerCardProps = {
  question: string;
  answer: string;
  showAnswerByDefault?: boolean;
  index?: number;
};

type QuestionHypnosisCardProps = {
  question: string;
  answer: string;
  showAnswerByDefault?: boolean;
  index: number;
  isDivider: boolean;
};
const QuestionAnswerCard = ({ 
  question, 
  answer, 
  showAnswerByDefault = false,
  index 
}: QuestionAnswerCardProps) => {
  const [isExpanded, setIsExpanded] = useState(showAnswerByDefault);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity 
        onPress={toggleExpand}
        activeOpacity={0.7}
        style={styles.cardContent}
      >
        <Text maxFontSizeMultiplier={1.1}  style={styles.question}>{question}</Text>
        
        <View style={styles.divider} />
        
        <Text maxFontSizeMultiplier={1.1}  style={styles.answerLabel}>
          {answer}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const QuestionHypnosisCard = ({ 
  question, 
  answer, 
  showAnswerByDefault = false,
  index,
  isDivider
}: QuestionHypnosisCardProps) => {
  const [isExpanded, setIsExpanded] = useState(showAnswerByDefault);

  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <View>
      <Markdown style={markdownStylesQuestion}>
        {`${index + 1} .  ${question}`}
      </Markdown>
      <Markdown style={markdownStyles}>
        {answer}
      </Markdown>
      {isDivider && <View style={styles.dividerHypnosis} />}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  question: {
    color: colors.text,
    lineHeight: 24,
    fontSize: fontSize.base,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  questionHypnosis: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },

  dividerHypnosis: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },

  answerLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'RobotoMono-Medium',
    fontSize: fontSize.sm,
    letterSpacing: -0.5,
  },
  answerLabelHypnosis: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    lineHeight: 20,
  },
});

const markdownStyles = {
  body: {
    color: 'white',
    opacity: 0.6,
    fontSize: fontSize['sm-18'],
    fontFamily: 'Geist-Regular',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  paragraph: {
    marginBottom: 6,
  },
  strong: {
    fontFamily: 'Geist-Bold',
  },
  em: {
    fontStyle: 'italic' as const,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  listItem: {
    marginBottom: 4,
  },
  bullet: {
    color: colors.textMuted,
  },
  ordered: {
    color: colors.textMuted,
  },
};

const markdownStylesQuestion = {
  body: {
    color: colors.text,
    fontSize: fontSize['sm-18'],
    fontFamily: 'Geist-SemiBold',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  paragraph: {
    marginBottom: 6,
  },
  strong: {
    fontFamily: 'Geist-Bold',
  },
  em: {
    fontStyle: 'italic' as const,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  listItem: {
    marginBottom: 4,
  },
  bullet: {
    color: colors.text,
  },
  ordered: {
    color: colors.text,
  },
};

export { QuestionAnswerCard, QuestionHypnosisCard };