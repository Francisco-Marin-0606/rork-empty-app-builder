import { FormField } from '@/helpers/types';
import { useAuthStore } from '@/store/authStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ErrorScreen } from '@/components/ErrorScreen';
import { UserService } from '@/services/api/userService';
import ProfileForm from '@/components/ProfileForm';

const UserPersonalDataForm = () => {
    const router = useRouter();
    const { userData, fetchUserData, userId } = useAuthStore();
    const [initialFormData, setInitialFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<{ title?: string; message?: string } | null>(null);
    const [hasLocalUpdate, setHasLocalUpdate] = useState(false);
    
    const personalInfoFormFields: FormField[] = [
        {
            name: 'names',
            label: 'Nombre',
            type: 'onlytextrestricted',
            required: false,
            minLength: 2,
            maxLength: 50,
            placeholder: 'Ingresa tu nombre'
        },
        {
            name: 'lastnames',
            label: 'Apellido',
            type: 'onlytextrestricted',
            required: false,
            minLength: 2,
            maxLength: 50,
            placeholder: 'Ingresa tus apellidos'
        },
        {
            name: 'alias',
            label: '¿Cómo quieres que te llamen?',
            type: 'onlytextrestricted',
            required: true,
            minLength: 2,
            maxLength: 15,
            placeholder: 'Ingresa tu apodo',
            description: "Escríbelo como se lee, y si tiene algún acento raro, márcalo. (Que no es lo mismo Julián, que Julian, o Yulian)."
        },
        {
            name: 'email',
            label: 'Tu correo electrónico',
            type: 'onlytextrestricted',
            required: true,
            minLength: 2,
            maxLength: 50,
            placeholder: 'Ingresa tu apodo',
            disabled: true,

        }
    ];

    useEffect(() => {
        // Solo actualizar si no hay una actualización local pendiente
        if (userData && !hasLocalUpdate) {
            const formData = {
                names: userData.names,
                lastnames: userData.lastnames,
                alias: userData.wantToBeCalled,
                birthday: userData.birthdate,
                gender: userData.gender,
                email: userData.email
            };
            setInitialFormData(formData);
        }
    }, [userData, hasLocalUpdate]);

    const handleSubmit = async (data: Record<string, any>) => {
        try {
            if (!userData?._id) {
                throw new Error('Usuario no encontrado');
            }

            // Marcar que tenemos una actualización local pendiente
            setHasLocalUpdate(true);

            // Actualizar inmediatamente el estado local con los nuevos datos
            // para evitar el flash de datos anteriores
            const updatedFormData = {
                names: data.names,
                lastnames: data.lastnames,
                alias: data.alias,
                birthday: userData.birthdate, // mantener los datos que no se editan
                gender: userData.gender, // mantener los datos que no se editan
                email: data.email || userData.email
            };
            setInitialFormData(updatedFormData);

            const updatedUserData = {
                names: data.names,
                lastnames: data.lastnames,
                wantToBeCalled: data.alias,
                birthdate: data.birthday,
                gender: data.gender,
            };

            const response = await UserService.updateUserData(userId, updatedUserData);
            
            if (response.status >= 400) {
                throw new Error(response.message);
            }

            // Actualizar el estado global con los nuevos datos
            await fetchUserData();
            
            // Resetear la bandera después de que todo se complete
            setHasLocalUpdate(false);
            
            // Navegar hacia atrás después de una actualización exitosa
            router.back();
        } catch (error: any) {
            // En caso de error, restaurar el estado anterior y resetear la bandera
            setHasLocalUpdate(false);
            if (userData) {
                const originalFormData = {
                    names: userData.names,
                    lastnames: userData.lastnames,
                    alias: userData.wantToBeCalled,
                    birthday: userData.birthdate,
                    gender: userData.gender,
                    email: userData.email
                };
                setInitialFormData(originalFormData);
            }
            
            setError({
                title: 'Error al actualizar datos',
                message:'Ha ocurrido un error al actualizar tus datos. Por favor intenta nuevamente.'
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
        <ProfileForm
            title=""
            fields={personalInfoFormFields}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={initialFormData}
        />
    );
}

export default UserPersonalDataForm;