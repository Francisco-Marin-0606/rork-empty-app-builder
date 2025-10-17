import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { IconX } from '@tabler/icons-react-native';
import { colors } from '@/constants/tokens';
import { SelectedImage } from '@/hooks/useImagePicker';

interface ImagePreviewProps {
    selectedImage: SelectedImage | null;
    onRemove: () => void;
}

const ImagePreview = ({ selectedImage, onRemove }: ImagePreviewProps) => {
    if (!selectedImage) return null;

    return (
        <View style={styles.previewContainer}>
            <View style={styles.imageContainer}>
                <FastImage
                    source={{
                        uri: selectedImage.uri,
                        priority: FastImage.priority.high,
                        cache: FastImage.cacheControl.immutable,
                    }}
                    style={styles.previewImage}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={onRemove}
                >
                    <IconX size={20} color={colors.icon} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    previewContainer: {
        width: '100%',

        paddingTop: 10,
        flexDirection: 'column',
        alignItems: 'flex-start',
        // backgroundColor: 'yellow'
    },
    imageContainer: {
        width: 100,
        height: 100,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    removeButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: colors.secondary,
        borderRadius: 999,
        padding: 1,
        zIndex: 2,
    }
});

export default React.memo(ImagePreview); 