import TrackPlayer, { 
  RepeatMode, 
  AppKilledPlaybackBehavior, 
  Capability,
  Event,
  State
} from "react-native-track-player";

// Registrar el servicio de notificaciones una única vez
// Esta es la forma recomendada en la documentación
let isServiceRegistered = false;

const registerPlaybackService = () => {
  if (!isServiceRegistered) {
    TrackPlayer.registerPlaybackService(() => require("./playerNotificationService"));
    isServiceRegistered = true;
  }
};

// Ejecutar inmediatamente
registerPlaybackService();

class TrackPlayerService {
  private static instance: TrackPlayerService;
  private initialized: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  
  private constructor() {}
  
  public static getInstance(): TrackPlayerService {
    if (!TrackPlayerService.instance) {
      TrackPlayerService.instance = new TrackPlayerService();
    }
    return TrackPlayerService.instance;
  }
  
  public async setupPlayer(): Promise<boolean> {
    // Si ya está inicializado, devuelve inmediatamente
    if (this.initialized) {
      return true;
    }
    
    // Si hay una inicialización en curso, devuelve esa promesa
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Crea una nueva promesa de inicialización
    this.initPromise = this.initializePlayer();
    return this.initPromise;
  }
  
  private async initializePlayer(): Promise<boolean> {
    try {
      // Verifica si ya está configurado
      try {
        const state = await TrackPlayer.getState();
        if (state !== undefined && state !== null) {
          // No logueamos aquí porque ya estaba inicializado
          this.initialized = true;
          return true;
        }
      } catch (e) {
        // Si hay un error al obtener el estado, probablemente el reproductor no esté configurado
      }
      
      await TrackPlayer.setupPlayer({
        maxCacheSize: 1024 * 10,
        autoHandleInterruptions: true,
      });
      
      await TrackPlayer.setVolume(1);
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        icon: require('../../assets/unknown_track.jpg'),
      });
      
      this.initialized = true;
      console.log('TrackPlayer loaded successfully');
      return true;
    } catch (error: any) {
      // Si el error es porque ya está inicializado, marcamos como inicializado
      if (error.message?.includes("already been initialized")) {
        // No logueamos aquí porque ya estaba inicializado por otro proceso
        this.initialized = true;
        return true;
      }
      
      console.error("Error setting up TrackPlayer:", error);
      this.initialized = false;
      this.initPromise = null;
      return false;
    }
  }
}

export default TrackPlayerService; 