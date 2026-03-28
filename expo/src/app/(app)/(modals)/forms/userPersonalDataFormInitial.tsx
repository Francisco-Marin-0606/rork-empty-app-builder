import SimpleForm from '@/components/SimpleForm';
import { FormField } from '@/helpers/types';
import { useAuthStore } from '@/store/authStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { ErrorScreen } from '@/components/ErrorScreen';
import { UserService } from '@/services/api/userService';

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

const UserPersonalDataForm = () => {
    const router = useRouter();
    const { userData, fetchUserData, userId } = useAuthStore();
    const [initialFormData, setInitialFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<{ title?: string; message?: string } | null>(null);
    
    const personalInfoFormFields: FormField[] = [
        {
            name: 'alias',
            label: '¿Cómo quieres que te llamen?',
            type: 'onlytextrestricted',
            required: true,
            minLength: 2,
            maxLength: 50,
            placeholder: 'Ingresa tu apodo',
            description: "Escríbelo como se lee, y si tiene algún acento raro, márcalo. (Que no es lo mismo Julián, que Julian, o Yulian)."
        },
       
        {
            name: 'gender',
            label: 'Eres...',
            type: 'segmentedRadio',
            required: true,
            options: [
                { label: 'Hombre', value: 'Hombre' },
                { label: 'Mujer', value: 'Mujer' }
            ]
        },
        {
            name: 'birthday',
            label: 'Fecha de nacimiento',
            type: 'date',
            required: true,
            placeholder: 'DD/MM/YYYY'
        }
    ];

    useEffect(() => {
        if (userData) {
            const formData = {
                names: userData.names,
                lastnames: userData.lastnames,
                alias: userData.wantToBeCalled,
                birthday: userData.birthdate,
                gender: userData.gender
            };
            setInitialFormData(formData);
        }
    }, [userData]);

    const handleSubmit = async (data: Record<string, any>) => {
        try {
            if (!userData?._id) {
                throw new Error('Usuario no encontrado');
            }

            const updatedUserData = {
                wantToBeCalled: data.alias,
                birthdate: data.birthday,
                gender: data.gender,
            };

            const response = await UserService.updateUserData(userId, updatedUserData);
            
            if (response.status >= 400) {
                throw new Error(response.message);
            }

            // Ejecutar fetchUserData en segundo plano sin bloquear la navegación
            fetchUserData();
            
            // Cerrar el modal y navegar al carrusel de hipnosis
            router.dismissAll();
            setTimeout(() => {
                router.push('/(app)/(tabs)/(audios)');
            }, 200);
        } catch (error: any) {
            //console.log("asdads",error)
            setError({
                title: 'Error al actualizar datos',
                message:'Ha ocurrido un error al actualizar tus datos. Por favor intenta nuevamente.'
            });
        }
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
        <SafeAreaView style={{flex: 1, backgroundColor: darkColors.background}}>  
            <View style={{flex: 1, backgroundColor: darkColors.background}}>  
                <SimpleForm
                    title="Completa tus datos antes de pedir tu hipnosis"
                    description="Antes de pedir tu primera hipnosis personalizada, y para que sea de verdad personalizada, deja aquí tus datos."
                    fields={personalInfoFormFields}
                    onSubmit={handleSubmit}
                    initialData={initialFormData}
                    customErrorStyles={{
                        errorText: {
                            marginTop: 8,
                            bottom: 2, // Remover el bottom que causa problemas
                            position: 'relative'
                        }
                    }}
                    themeColors={darkColors}
                /> 
            </View>
        </SafeAreaView>
    );
}

export default UserPersonalDataForm;