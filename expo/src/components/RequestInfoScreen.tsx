import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import Modal from '@/components/Modal';
import TrackInfoCard from '@/components/TrackInfoCard';
import { QuestionAnswerCard } from '@/components/QuestionAnswerCard';
import { colors, screenPadding } from '@/constants/tokens';

type Question = {
  id: string;
  question: string;
  answer: string;
};

type RequestInfoScreenProps = {
  trackTitle: string;
  trackDate: string;
  questions: Question[];
  onClose?: () => void;
};

const RequestInfoScreen = ({ 
  trackTitle, 
  trackDate, 
  questions, 
  onClose 
}: RequestInfoScreenProps) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
<Modal title="Preguntas y respuestas" onClose={onClose}>

<ScrollView 
  style={styles.scrollView}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.scrollViewContent}
>
  <View style={{marginTop: 16, }}>
  <TrackInfoCard 
    title={trackTitle} 
    date={trackDate} 
  />
  </View>

  
  {questions.map((item, index) => (
    <QuestionAnswerCard
      key={index}
      question={item.question}
      answer={item.answer}
      index={index}
    />
  ))}
</ScrollView>

</Modal>
    </SafeAreaView>
    
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30, 
    paddingHorizontal: screenPadding.horizontal,
  }
});

export default RequestInfoScreen;