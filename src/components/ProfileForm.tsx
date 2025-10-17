import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import FormInput from './FormInput';
import CustomButton from './CustomButton'
import { colors, fontSize, screenPadding } from '@/constants/tokens';
import { FormField } from '@/helpers/types';
import { validateField, formatBirthdate } from '@/helpers/miscellaneous';
import { useAuthStore } from '@/store/authStore';

interface SimpleFormProps {
    fields: FormField[];
    onSubmit: (formData: Record<string, any>) => Promise<void>;
    onCancel: () => void;
    title?: string;
    initialData?: Record<string, any>; 
}

const ProfileForm: React.FC<SimpleFormProps> = ({
    fields,
    onSubmit,
    onCancel,
    title,
    initialData = {}
}) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
    const [isInitialRender, setIsInitialRender] = useState(true);
    const {userData} = useAuthStore();

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};
        let hasErrors = false;
        let allRequiredFieldsFilled = true;

        fields.forEach(field => {
            const value = formData[field.name];
            
            // Always validate if we have initialData, otherwise skip validation on initial render
            const shouldValidate = Object.keys(initialData).length > 0 || 
                                 touchedFields[field.name] || 
                                 !isInitialRender;

            if (shouldValidate) {
                // Si el campo no es requerido y está vacío, no lo validamos
                if (!field.required && (!value || value.toString().trim() === '')) {
                    return;
                }

                const error = validateField(field, value);
                
                if (error) {
                    newErrors[field.name] = error;
                    hasErrors = true;
                }

                // Solo verificar campos requeridos vacíos
                if (field.required && (!value || value.toString().trim() === '')) {
                    newErrors[field.name] = 'Este campo es requerido';
                    hasErrors = true;
                    allRequiredFieldsFilled = false;
                }
            }
        });

        setErrors(newErrors);
        const formIsValid = !hasErrors && allRequiredFieldsFilled;
        setIsValid(formIsValid);
        return formIsValid;
    }, [fields, formData, touchedFields, isInitialRender, initialData]);

    useEffect(() => {
        // Reset all form states when initialData changes
        setFormData(initialData);
        setErrors({});
        setTouchedFields({});
        setIsInitialRender(true);
        setIsValid(false);
    }, [initialData]);

    // Validate form after initialData is set
    useEffect(() => {
        if (Object.keys(initialData).length > 0) {
            // Small delay to ensure state updates are complete
            const timer = setTimeout(() => {
                validateForm();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [initialData, validateForm]);

    useEffect(() => {
        if (!isInitialRender || Object.keys(touchedFields).length > 0) {
            validateForm();
        }
    }, [formData, validateForm, touchedFields, isInitialRender]);

    const handleInputChange = useCallback((fieldName: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
        
        setTouchedFields(prev => ({
            ...prev,
            [fieldName]: true
        }));
        
        setIsInitialRender(false);
    }, []);

    const handleSubmit = async () => {
        setIsInitialRender(false);
        const allFieldsTouched = fields.reduce((acc, field) => ({
            ...acc,
            [field.name]: true
        }), {});
        setTouchedFields(allFieldsTouched);

        if (!validateForm()) {
            return;
        }

        try {
            setIsSubmitting(true);
            // Filtrar campos vacíos antes de enviar
            const filteredFormData = Object.entries(formData).reduce((acc, [key, value]) => {
                // Convertir a string y verificar si está vacío
                const stringValue = value?.toString().trim();
                if (stringValue !== '' && stringValue !== undefined && stringValue !== null) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, any>);

            await onSubmit(filteredFormData);
        } catch (error) {
            console.error('Error al enviar el formulario:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
        >
            {title && (
                <Text maxFontSizeMultiplier={1} style={styles.title}>{title}</Text>
            )}

            <View style={styles.fieldsContainer}>
                {fields.map((field) => (
                    <View key={field.name} style={styles.fieldWrapper}>
                        <FormInput
                            {...field}
                            value={formData[field.name] || ''}
                            onChange={(value) => handleInputChange(field.name, value)}
                            error={errors[field.name]}
                            showLabel={true}
                            inputTextColor={'white'}
                            maxFontSizeMultiplier={1} 
                            labelColor={'white'}
                            inputBorderColor={'white'}
                        />
                    </View>
                ))}
            </View>

            {/* Information labels container */}
            <View style={styles.infoLabelsContainer}>
                <View style={styles.infoLabelItem}>
                    <Text maxFontSizeMultiplier={1}  style={styles.infoLabelTitle}>Fecha de nacimiento</Text>
                    <Text maxFontSizeMultiplier={1}  style={styles.infoLabelValue}>
                        {formatBirthdate(userData?.birthdate)}
                    </Text>
                </View>
                <View style={styles.infoLabelItem}>
                    <Text maxFontSizeMultiplier={1}  style={styles.infoLabelTitle}>Género</Text>
                    <Text maxFontSizeMultiplier={1}  style={styles.infoLabelValue}>{userData?.gender}</Text>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <CustomButton
                    title="Listo"
                    handlePress={handleSubmit}
                    containerStyles={[styles.button, styles.submitButton]}
                    textStyles={{color: 'white'}}
                    indicatorColor={'white'}
                    disabled={!isValid}
                    isLoading={isSubmitting}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.screenBackground,
    },
    contentContainer: {
        padding: Platform.OS === 'ios' ? screenPadding.horizontalIos : screenPadding.horizontalAndroid,
        paddingBottom: 24,
    },
    title: {
        fontFamily: 'Inter',
        letterSpacing: -0.5,
        fontSize: fontSize['2xl'],
        fontWeight: '700',
        color: colors.text,
        marginBottom: 24,
        textAlign: 'center',
    },
    fieldsContainer: {
        gap: 4,
    },
    fieldWrapper: {
        width: '100%',
    },
    infoLabelsContainer: {
        marginBottom: 24,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',   
    },
    infoLabelItem: {
        backgroundColor: '#000',
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 0,
        paddingRight: 16,
        
    },
    infoLabelTitle: {
        fontFamily: 'Geist-Bold',
        fontSize: fontSize.base,
        color: colors.text,
        marginBottom: 4,
    },
    infoLabelValue: {
        fontFamily: 'Geist-Regular',
        fontSize: fontSize.sm,
        color: colors.tertiary,
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'column',
        gap: 8,
        marginBottom: 100
    },
    button: {
        flex: 1
    },
    cancelButton: {
        backgroundColor: colors.screenBackground,
    },
    submitButton: {
        backgroundColor: '#F2741B',
    },
});

export default ProfileForm;