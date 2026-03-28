import React from 'react';
import { useRouter } from 'expo-router';
import PostHypnosisModal from '@/components/PostHypnosisModal';
import { useAudioTrackEnd } from '@/hooks/useAudioTrackEnd';
import { useAuthStore } from '@/store/authStore';
import { useNewLibraryStore } from '@/store/newLibrary';

export default function PostHypnosis() {
  const router = useRouter();
  const { closeModal, postHypnosisText, imageUrl, userName } = useAudioTrackEnd();
  const { userData } = useAuthStore();
  const { fetchUserAudios } = useNewLibraryStore();

  const handleClose = async () => {
    try {
      await closeModal();
      
      router.back();
      
      if (userData?.userId) {
        setTimeout(() => {
          fetchUserAudios(userData.userId);
        }, 500);
      }
    } catch (error) {
      console.error('Error al cerrar modal post-hipnosis:', error);
      router.back();
    }
  };
 
  return (
    <PostHypnosisModal
      onClose={handleClose}
      postHypnosisText={postHypnosisText}
      userName={userName}
      imageUrl={imageUrl}
    />
  );
}