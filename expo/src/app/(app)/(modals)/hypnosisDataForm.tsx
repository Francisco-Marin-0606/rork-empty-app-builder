import SimpleForm from '@/components/SimpleForm';
import { FormField } from '@/helpers/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ErrorScreen } from '@/components/ErrorScreen';
import { AudioService } from '@/services/api/audioService';
import { useAuthStore } from '@/store/authStore';
import { useNewLibraryStore } from '@/store/newLibrary';
import { View, StyleSheet } from 'react-native';

// Dark mode colors (scoped to this form)
const darkColors = {
	background: '#0A0A0A',
	text: '#FFFFFF',
	textMuted: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para subtítulos y líneas laterales
	border: 'rgba(255, 255, 255, 0.3)', // Blanco con 30% opacidad para líneas laterales
	inputBackground: '#191919',
	inputText: '#FFFFFF',
	inputBorder: '#333333',
	buttonBackground: '#F2741B',
	buttonText: '#FFFFFF',
}

const HypnosisCustomDataForm = () => {
    const router = useRouter();
    const { audioRequestId } = useLocalSearchParams<{ audioRequestId: string }>();
    const { userId } = useAuthStore();
    const [initialFormData, setInitialFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<{ title?: string; message?: string } | null>(null);
    const { audios , fetchUserAudios} = useNewLibraryStore();
    
    const customDataFormFields: FormField[] = [
        {
            name: 'name',
            label: 'Nombre de la hipnosis',
            type: 'text',
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: 'Ingresa el nombre del audio',
            description: ' ', // Agregar espacio entre título e input
            inputPaddingHorizontal: 12
        }
    ];

    useEffect(() => {
        console.log("HypnosisDataForm rendered!");
        if (audioRequestId && audios) {
            const audioData = audios.find((item: any) => item._id === audioRequestId || item.audioRequestId === audioRequestId);
            
            if (audioData) {
                // Set the initial form data from the audio's customData
                const formData = {
                    name: audioData.title || ''
                };
                setInitialFormData(formData);
            } else {
                setError({
                    title: 'Fallo en la matrix.',
                    message: 'No se pudo encontrar la información del audio solicitado.'
                });
            }
        }
    }, [audioRequestId, audios]);

    const handleSubmit = async (data: Record<string, any>) => {
        try {
            if (!audioRequestId) {
                throw new Error('ID de audio no encontrado');
            }

            // Create the customData object to update
            const customData = {
                name: data.name
            };

            // Call the API to update the audio's customData
            const response = await AudioService.updateAudioCustomData(userId, audioRequestId, customData);
            
            if (response.status >= 400) {
                throw new Error(response.message);
            }

            // Reload tracks to update the state
            if (userId) {
                await fetchUserAudios(userId);
            }
            
            // Navigate back after successful update
            router.back();
        } catch (err: any) {
            setError({
                title: 'Fallo en la matrix.',
                message: 'Ha ocurrido un error al intentar cambiar el nombre de tu hipnosis. Intenta otra vez.'
            });
        }
    };

    const handleCancel = () => {
        router.back();
    };

    const handleErrorClose = () => {
        setError(null);
    };

    if (error) {
        return (
            <ErrorScreen 
                onClose={handleErrorClose}
                errorTitle={error.title}
                errorMessage={error.message}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <View style={styles.inputWrapper}>
                    <SimpleForm
                        title=""
                        fields={customDataFormFields}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        initialData={initialFormData}
                        themeColors={darkColors}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    formContainer: {
        flex: 1,
        marginBottom: 50, // Espacio para subir los botones
        marginTop: 30, // Bajar el título y el input
    },
    inputWrapper: {
        flex: 1,
    },
});

export default HypnosisCustomDataForm;