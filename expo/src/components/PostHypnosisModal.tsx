import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, ScrollView, Platform } from 'react-native';
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { defaultStyles } from '@/styles';
import CustomButton from './CustomButton';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';

interface PostHypnosisModalProps {
  onClose: () => void;
  postHypnosisText?: string;
  userName?: string;
  imageUrl?: string;
}

const PostHypnosisModal = ({
  onClose,
  postHypnosisText,
  userName = 'Test',
  imageUrl
}: PostHypnosisModalProps) => {

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.contentContainer}>
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        bounces={false}
      >
        {imageUrl && (
          <View style={styles.imageContainer}>
            <FastImage
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {`${userName}, acabas de atravesar el portal.`}
          </Text>
        </View>
        <View style={styles.textContainer}>
          <View style={styles.textWrapper}>
            <Text 
              style={styles.description}
              numberOfLines={0}
              allowFontScaling={true}
              textBreakStrategy="highQuality"
            >
              {postHypnosisText}
            </Text>
          </View>
        </View>
      </ScrollView>

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,1)']}
        style={styles.gradientOverlay}
        pointerEvents='none'
      />
    </View>

    <View style={styles.buttonContainer}>
      <CustomButton
        title="Volver"
        handlePress={onClose}
        containerStyles={styles.backButton}
        textStyles={styles.backButtonText}
      />
    </View>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    paddingBottom: 10,
  },
  imageContainer: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    marginTop: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginBottom: 40,
    width: '100%',
    flex: 1,
  },
  textWrapper: {
    width: '100%',
    flex: 1,
  },
  title: {
    fontFamily: 'Geist-Semibold',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'left',
    marginBottom: 10,
    letterSpacing: -2,
    fontSize: 34,
    lineHeight: 34 * 1,
    paddingTop: 34 - (34 * 0.75), 
  },
  titleContainer: {
    marginTop: 20,
    marginBottom: 15,
    width: '100%',
    alignItems: 'flex-start',
    textAlign: 'right',
    justifyContent: 'flex-start',
  },
  description: {
    color: 'white',
    opacity: 0.6,
    fontSize: fontSize['sm-18'],
    fontFamily: 'Geist-Regular',
    lineHeight: 24,
    letterSpacing: -0.5,
    textAlign: 'left',
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: 'white',
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    ...defaultStyles.text,
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: 'black',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
    flexGrow: 1,
    width: '100%',
  },
  backButton: {
    backgroundColor: '#2f2f31',
    borderRadius: 8,
    minHeight: 50,
  },
  backButtonText: {
    ...defaultStyles.text,
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: 'white',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  buttonContainer: {
    paddingHorizontal: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
    paddingVertical: 20,
    backgroundColor: 'black',

  },
});

export default PostHypnosisModal; 