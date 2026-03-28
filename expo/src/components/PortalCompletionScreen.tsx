import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView
} from 'react-native';
import { fontSize } from '@/constants/tokens';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
interface PortalCompletionScreenProps {
  onBack: () => void;
  data: any;
}

const { width, height } = Dimensions.get('window');

const question = (name: string, gender: string) => {
  if (gender === 'male') {
    return `¿Cómo lee esto una nuevo ${name}?`
  }
  return `¿Cómo lee esto una nueva ${name}?`
}

const PortalCompletionScreen: React.FC<PortalCompletionScreenProps> = ({
  onBack,
  data
}) => {
  const [name, setName] = useState('Abraham');
  const [gender, setGender] = useState('male');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState([]);
  const [image, setImage] = useState('');

  useEffect(() => {
    setTitle(data?.appSettings.formSettings.genderTitle.base.replace("${name}", name));
    setDescription(data?.appSettings.formSettings.genderAudioDescription.base.replace("${name}", name).split("\n"));
    setImage(data?.appSettings.formSettings.genderImage.base);
    setGender("male");
    setName("Abraham");
  }, [data]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            {/* Nota: Crear una imagen específica para esta pantalla */}
            <FastImage
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.titleWhite}>{title}</Text>
            <Text style={styles.description}>{question(name, gender)}</Text>
            {description.map((item: any, index: any) => (
              <Text key={index} style={styles.description}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
      <LinearGradient colors={['rgba(0, 0, 0, 0.21)', 'rgb(0, 0, 0)']} start={{ x: 0.5, y: 0.7 }} end={{ x: 0.5, y: 0.9 }} style={styles.backButtonContainer} >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: "100%",
    padding: 24,
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: height * 0.05,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    tintColor: '#FF5A5A',
    resizeMode: 'cover',
    opacity: 0.8,
  },
  blueCircleOverlay: {
    position: 'absolute',
    bottom: 20,
    width: width * 0.7,
    height: 20,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    opacity: 0.6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  textContainer: {
    width: '100%',
    gap: 16,
    marginTop: 20,
    marginBottom: 100,
  },
  titleWhite: {
    color: 'white',
    fontSize: 40,
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
    lineHeight: 46,
  },
  question: {
    color: 'white',
    fontSize: fontSize.base,
    fontFamily: 'Geist-SemiBold',
    marginTop: 20,
  },
  description: {
    color: 'white',
    fontSize: fontSize['sm-18'],
    fontFamily: 'Geist-Regular',
    lineHeight: fontSize.base * 1.2,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: fontSize.base,
    fontFamily: 'Geist-Regular',
    marginTop: 20,
  },
  backButton: {
    width: '100%',
    backgroundColor: 'white',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: fontSize.lg,
    fontFamily: 'Geist-SemiBold',
  },
  backButtonContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  scrollView: {
    paddingBottom: 10,
  }
});

export default PortalCompletionScreen; 