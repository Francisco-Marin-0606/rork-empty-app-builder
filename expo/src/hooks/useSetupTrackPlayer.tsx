import { useEffect, useRef } from "react"
import TrackPlayer, { 
  RepeatMode, 
  AppKilledPlaybackBehavior, 
  Capability,
  Event 
} from "react-native-track-player"
import TrackPlayerService from "../services/trackPlayerService";

// Ya no necesitamos esta función, será manejada por el TrackPlayerService
// const setupPlayer = async () => {
//    await TrackPlayer.setupPlayer({
//        maxCacheSize: 1024 * 10,
//        autoHandleInterruptions: true,
//    })
//
//    await TrackPlayer.setVolume(1)
//    await TrackPlayer.setRepeatMode(RepeatMode.Queue)
//
//    await TrackPlayer.updateOptions({
//      android: {
//        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
//      },
//      capabilities: [
//        Capability.Play,
//        Capability.Pause,
//        Capability.SkipToNext,
//        Capability.SkipToPrevious,
//        Capability.Stop,
//      ],
//      compactCapabilities: [
//        Capability.Play,
//        Capability.Pause,
//        Capability.SkipToNext,
//        Capability.SkipToPrevious,
//      ],
//      notificationCapabilities: [
//        Capability.Play,
//        Capability.Pause,
//        Capability.SkipToNext,
//        Capability.SkipToPrevious,
//      ],
//
//      icon: require('../../assets/unknown_track.jpg'), 
//    });
//}

interface SetupTrackPlayerProps {
  onNotificationTapped?: () => void;
}

export const useSetupTrackPlayer = ({ 
  onNotificationTapped 
}: SetupTrackPlayerProps) => {
    const isInitialized = useRef(false);

    useEffect(() => {
      // Usamos RemoteJumpForward como un evento personalizado para manejar
      // el toque en la notificación
      const notificationSubscription = TrackPlayer.addEventListener(
        Event.RemoteJumpForward,
        () => {
          onNotificationTapped?.();
        }
      );

      // Utilizamos el servicio singleton en lugar de la función local
      if (!isInitialized.current) {
        TrackPlayerService.getInstance()
          .setupPlayer()
          .then((success) => {
            isInitialized.current = true;
          })
          .catch(e => {
            isInitialized.current = false;
            console.error("Player setup error:", e);
          });
      }

      return () => {
        notificationSubscription.remove();
      };
    }, [onNotificationTapped]);
}