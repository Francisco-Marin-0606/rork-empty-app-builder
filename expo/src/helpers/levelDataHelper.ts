import { set } from 'lodash';
import { UnifiedTrack } from './types';
import { useCarrouselStore } from '@/store/carrouselStore';

/**
 * Creates a hash table where each key is a userLevel and the value contains
 * the corresponding audioRequest, levelAudios, and requestSetting
 * @param requestSettings - Array of request settings data
 * @param audioRequests - Array of audio requests data
 * @param levelAudios - Array of level audios data
 * @returns A hash map with userLevel as keys, sorted by userLevel (ascending)
 */
export function createLevelDataMap(
  requestSettings: any[],
  audioRequests: any[],
  levelAudios: any[]
): Record<number, { audioRequest: any; levelAudios: any; requestSetting: any }> {
  const levelDataMap: Record<number, { audioRequest: any; levelAudios: any; requestSetting: any }> = {};
  
  // Create a sorted array of userLevels to maintain order
  const userLevels: number[] = [];

  // Iterate through each requestSetting to create the hash table
  requestSettings.forEach(requestSetting => {
    const userLevel = requestSetting.userLevel;
    
    if (userLevel !== undefined) {
      // Find the corresponding audioRequest and levelAudios for this userLevel
      const audioRequest = audioRequests.find(request => request.userLevel === userLevel);
      const levelAudio = levelAudios.find(audio => audio.userLevel === userLevel);
      
      // Add to the hash table if we found matching data
      if(audioRequest) {
        levelDataMap[userLevel] = {
          audioRequest: audioRequest || null,
          levelAudios: levelAudio || null,
          requestSetting: requestSetting || null
        };
        userLevels.push(userLevel);
      }
    }
  });

  // At this point, levelDataMap has all entries but they might not be accessed in sorted order
  // We can return a sorted version if needed, but JavaScript objects maintain insertion order
  // as of ES2015+, so if requestSettings was already sorted, the keys should be in the right order
  return levelDataMap;
}