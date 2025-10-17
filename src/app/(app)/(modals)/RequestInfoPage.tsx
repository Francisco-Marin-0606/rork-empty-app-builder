import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QuestionsScreen from '@/components/RequestInfoScreen';
import { colors } from '@/constants/tokens';
import { useAuthStore } from '@/store/authStore';
import RequestInfoScreen from '@/components/RequestInfoScreen';
import { useAudioRequests, useLibraryStore } from '@/store/library';
import { ErrorScreen } from '@/components/ErrorScreen';
import { useNewLibraryStore } from '@/store/newLibrary';

// Tipo para las preguntas
type Question = {
    id: string;
    question: string;
    answer: string;
};

export default function RequestInfoPage() {
    const params = useLocalSearchParams();
    const trackId = params.trackId as string;
    const trackRequestId = params.trackRequestId as string;
    const trackTitle = params.trackTitle as string;
    const trackDate = params.trackDate as string;


    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [trackData, setTrackData] = useState({
        title: trackTitle || 'Hipnosis',
        date: trackDate || '',
    });
    const [error, setError] = useState<string | null>(null);


    const { audioRequests } = useNewLibraryStore();

    // Obtener el token del store de autenticación
    const { session } = useAuthStore();

    useEffect(() => {
        // Función para cargar los datos
        const loadQuestions = async () => {
            console.log(audioRequests)

            if (!trackRequestId) {
                setError("No se encontró el ID de la solicitud de audio");
                setIsLoading(false);
                return;
            }

            const audioRequest = audioRequests.find((request: any) => request._id === trackRequestId);
            
            if (!audioRequest) {
                setError("No se encontró información de esta hipnosis");
                setIsLoading(false);
                return;
            }

            console.log("asdasdasdas", audioRequest)

            const {questions} = audioRequest.audioMotive;

            try {
                // ... existing code ...

                setQuestions(questions);
                setTrackData(trackData);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading questions:', error);
                setError("Error al cargar las preguntas");
                setIsLoading(false);
            }
        };

        loadQuestions();
    }, [trackId, trackTitle, session, trackRequestId, audioRequests]);

    const handleClose = () => {
        router.back();
    };
    
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <ErrorScreen 
                onClose={handleClose}
                errorTitle="Oops!"
                errorMessage={error}
                buttonTitle="Regresar"
            />
        );
    }

    return (   <RequestInfoScreen
            trackTitle={trackData.title}
            trackDate={trackData.date}
            questions={questions}
        />
    );
}