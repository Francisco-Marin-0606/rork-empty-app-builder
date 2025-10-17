import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import FormWizard from '../../../components/FormWizard';
import { useOnboardingStore } from '@/store/onBoardingStore';
import { FormStep, WizardFormData } from '@/helpers/types';
import { View, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { FORM_WIZARD_ONBOARDING_SCREEN_VIEW } from '@/services/analytics/screenTracking';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

// Dark mode colors (scoped to this onboarding form)
const darkColors = {
	background: '#0A0A0A',
	text: '#FFFFFF',
	textMuted: 'rgba(255, 255, 255, 0.3)',
	border: 'rgba(255, 255, 255, 0.3)',
	inputBackground: '#0A0A0A',
	inputText: '#FFFFFF',
	inputBorder: '#333333',
	buttonBackground: '#F2741B',
	buttonText: '#FFFFFF',
};

interface FormQuestions {
  _id: string;
  month: string;
  year: string;
  questions: Question[];
}

interface Question {
  question: string;
  description: string;
  referenceQuestion: string;
  type?: 'input' | 'radio-button';
  options?: {
    id: string;
    label: string;
    value: string;
  }[];
  customizable?: boolean;
  templateHandler?: boolean;
  optional?: boolean;
  header?: string;
}

export default function FormWizardPage() {
  const router = useRouter();
  const { firstLevel, getFirstLevel } = useOnboardingStore();
  const [formattedQuestions, setFormattedQuestions] = useState<FormStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [hasTrackedScreenView, setHasTrackedScreenView] = useState(false);

  // Speech-to-Text state
  const [formData, setFormData] = useState<WizardFormData>({});
  const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null);
  const { text, partialText, isListening, startListening, stopListening, resetText } = useSpeechRecognition({ registerListeners: false });
  const speechBaseRef = useRef<string>('');
  const appliedFinalOnceRef = useRef<boolean>(false);
  const lastAppliedValueRef = useRef<string>('');

  const dedupeConsecutiveWords = (s: string): string => {
    if (!s) return s;
    return s
      .replace(/\s+/g, ' ') // normalizar espacios
      .replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1') // eliminar palabras consecutivas duplicadas
      .trim();
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected);
    });
    NetInfo.fetch().then(state => {
      setIsConnected(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Efecto para tracking de analytics al cargar la pantalla
  useEffect(() => {
    const trackScreenView = async () => {
      if (!hasTrackedScreenView && !isLoading) {
        await FORM_WIZARD_ONBOARDING_SCREEN_VIEW();
        setHasTrackedScreenView(true);
      }
    };
    trackScreenView();
  }, [isLoading, hasTrackedScreenView]);

  useEffect(() => {
    if (firstLevel) {
      const formatted = formatQuestions(firstLevel);
      setFormattedQuestions(formatted);
      setIsLoading(false);
    } else {
      if (isConnected && isLoading) {
        getFirstLevel();
      }
    }
  }, [firstLevel, isConnected, isLoading]);

  // Vincular Speech-To-Text con el formulario: render en tiempo real con parcial (sin concatenar duplicado)
  useEffect(() => {
    if (activeSpeechField) {
      if (isListening && partialText) {
        setFormData(prev => ({
          ...prev,
          [activeSpeechField]: dedupeConsecutiveWords(partialText.trim()),
        }));
        lastAppliedValueRef.current = dedupeConsecutiveWords(partialText.trim());
      }
      if (!isListening && text && !appliedFinalOnceRef.current) {
        const merged = dedupeConsecutiveWords(text.trim());
        if (merged === lastAppliedValueRef.current) {
          appliedFinalOnceRef.current = true;
          setActiveSpeechField(null);
          speechBaseRef.current = '';
          resetText();
          return;
        }
        setFormData(prev => ({
          ...prev,
          [activeSpeechField]: merged,
        }));
        appliedFinalOnceRef.current = true;
        setActiveSpeechField(null);
        speechBaseRef.current = '';
        resetText();
      }
    }
  }, [isListening, text, partialText, activeSpeechField, resetText]);

  const formatQuestions = (questions: FormQuestions): FormStep[] => {
    return questions.questions.map((el, index) => {
      const baseQuestion = {
        title: el.question,
        description: el.description,
        header: el.header || ''
      };

      if (el.type === 'radio-button' && el.options) {
        return {
          ...baseQuestion,
          fields: [{
            name: `${index}`,
            label: 'Respuesta',
            type: 'radio',
            options: el.options
          }]
        };
      } else {
        return {
          ...baseQuestion,
          fields: [{
            name: `${index}`,
            label: 'Respuesta',
            type: 'textAndNumber',
            placeholder: 'Escríbelo aquí',
            minLength: 10,
            optional: el.optional || false,
          }]
        };
      }
    });
  };

  const handleFormData = async (data: WizardFormData): Promise<boolean> => {
    console.log('Form data received:', data);
    // Aquí irían las llamadas a la API
    return true;
  };

  const handleFormCancel = () => {
    router.back();
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSpeechStart = async (fieldName: string) => {
    speechBaseRef.current = (formData[fieldName] ? String(formData[fieldName]) : '').trim();
    appliedFinalOnceRef.current = false;
    setActiveSpeechField(fieldName);
    await startListening();
  };

  const handleSpeechStop = async () => {
    if (isListening) {
      await stopListening();
    }
  };

  const handleSpeechCancel = async () => {
    if (isListening) {
      await stopListening();
    }
    setActiveSpeechField(null);
    speechBaseRef.current = '';
    resetText();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  return (
    <FormWizard
      steps={formattedQuestions}
      onComplete={handleFormData}
      onCancel={handleFormCancel}
      formId='onboarding_form'
      themeColors={darkColors}
      onboardingMode={true}
      appendUserProfileStep={true}
      validateEmail={true}
      showConfirmation={true}
      formData={formData}
      onFieldChange={handleFieldChange}
      onSpeechStart={handleSpeechStart}
      onSpeechStop={handleSpeechStop}
      onSpeechCancel={handleSpeechCancel}
      isListening={isListening}
      activeSpeechField={activeSpeechField}
    />
  );
}