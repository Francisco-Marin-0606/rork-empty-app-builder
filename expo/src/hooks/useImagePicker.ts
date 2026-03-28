import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface SelectedImage {
    uri: string;
    name: string;
    size: number;
}

export const useImagePicker = (maxSizeMB: number = 15) => {
    const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

    const pickImage = async () => {
        try {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        "Permisos",
                        "Mental requiere acceso a tus fotos para enviar imágenes al Psilocogo, un chatbot que interpreta numerología, señales del universo y más.",
                        [{ text: "Cerrar", style: "cancel" }]
                    );
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                aspect: [4, 3],
                quality: 1,
                exif: true,
            });

            if (!result.canceled) {
                // Obtener información del archivo
                const { uri, fileSize } = result.assets[0];
                
                // Verificar el tamaño máximo permitido
                const maxSizeBytes = maxSizeMB * 1024 * 1024;
                if (fileSize && fileSize > maxSizeBytes) {
                    Alert.alert(
                        "Tamaño excedido",
                        `La imagen es demasiado grande. El tamaño máximo permitido es ${maxSizeMB}MB.`,
                        [{ text: "Cerrar", style: "cancel" }]
                    );
                    return;
                }

                const newImage: SelectedImage = {
                    uri: uri,
                    name: uri.split('/').pop() || 'image.jpg',
                    size: fileSize || 0
                };
                
                setSelectedImage(newImage);
               // console.log("newImage", newImage)
                return newImage;
            }
            //console.log("no image selected")
            return null;
        } catch (err) {
            Alert.alert(
                "Error",
                "Error al seleccionar la imagen.",
                [{ text: "Cerrar", style: "cancel" }]
            );
            return null;
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        return null;
    };

    return {
        selectedImage,
        pickImage,
        removeImage,
        setSelectedImage
    };
}; 