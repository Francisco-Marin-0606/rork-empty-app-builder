import { CacheService } from './cacheService';
import { AppConfigService } from '../api/appConfigService';
import NetInfo from '@react-native-community/netinfo';

interface AppConfig {
  tabs?: {
    audios?: {
      components?: {
        banner?: {
          data?: any;
        };
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Servicio para manejar el caché de configuraciones de la aplicación
 */
export class AppConfigCacheService {
  private static instance: AppConfigCacheService;
  private cacheService: CacheService;
  private readonly CACHE_KEY = 'app_configs';
  private readonly CACHE_VERSION = '1.0.0'; // Incrementado para forzar refresco
  // 12 horas de caché por defecto, ajustar según necesidades
  private readonly CACHE_EXPIRATION = 12 * 60 * 60 * 1000; 
  private networkAvailable: boolean = true;
  private debugMode: boolean = true; // Activar para ver más información

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.setupNetworkListener();
  }

  /**
   * Obtiene la instancia singleton del servicio
   */
  public static getInstance(): AppConfigCacheService {
    if (!AppConfigCacheService.instance) {
      AppConfigCacheService.instance = new AppConfigCacheService();
    }
    return AppConfigCacheService.instance;
  }

  /**
   * Configura un listener para detectar cambios en la conectividad
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.networkAvailable = state.isConnected === true;
    });
  }

  /**
   * Verifica y transforma los datos recibidos del servidor si es necesario
   */
  private processServerData(data: any): AppConfig {
    if (this.debugMode) {
      console.log('[AppConfigCacheService] Procesando datos del servidor:', 
        typeof data, Array.isArray(data), data ? Object.keys(data).length : 0);
    }
    
    // Si no hay datos, devolver un objeto vacío
    if (!data) {
      console.warn('[AppConfigCacheService] No se recibieron datos del servidor');
      return { tabs: { audios: { components: { banner: { data: [] } } } } };
    }
    
    // Verificar si la estructura es la correcta
    if (data.tabs && 
        typeof data.tabs === 'object' && 
        data.tabs.audios && 
        typeof data.tabs.audios === 'object' && 
        data.tabs.audios.components &&
        typeof data.tabs.audios.components === 'object') {
      // La estructura ya es correcta, devolver directamente
      if (this.debugMode) {
        console.log('[AppConfigCacheService] Estructura de datos correcta:',
          Object.keys(data.tabs.audios.components));
      }
      
      // Asegurarnos que banner.data existe y es un array
      if (!data.tabs.audios.components.banner) {
        data.tabs.audios.components.banner = { data: [] };
      } else if (!data.tabs.audios.components.banner.data) {
        data.tabs.audios.components.banner.data = [];
      }
      
      return data as AppConfig;
    }
    
    // Adaptar la estructura si es necesario
    if (data.appSettings && typeof data.appSettings === 'object') {
      console.log('[AppConfigCacheService] Restructurando datos del formato "appSettings"');
      // Verificar y asegurar la estructura correcta
      const appSettings = data.appSettings;
      if (!appSettings.tabs) appSettings.tabs = {};
      if (!appSettings.tabs.audios) appSettings.tabs.audios = {};
      if (!appSettings.tabs.audios.components) appSettings.tabs.audios.components = {};
      if (!appSettings.tabs.audios.components.banner) appSettings.tabs.audios.components.banner = { data: [] };
      
      // Preservar redirectStripe y otras propiedades de la raíz
      const result = {
        ...data, // Mantener todas las propiedades de la raíz (incluyendo redirectStripe)
        ...appSettings // Sobrescribir con appSettings
      };
      
      return result as AppConfig;
    }
    
    if (data.config && typeof data.config === 'object') {
      console.log('[AppConfigCacheService] Restructurando datos del formato "config"');
      // Verificar y asegurar la estructura correcta
      const config = data.config;
      if (!config.tabs) config.tabs = {};
      if (!config.tabs.audios) config.tabs.audios = {};
      if (!config.tabs.audios.components) config.tabs.audios.components = {};
      if (!config.tabs.audios.components.banner) config.tabs.audios.components.banner = { data: [] };
      
      // Preservar redirectStripe y otras propiedades de la raíz
      const result = {
        ...data, // Mantener todas las propiedades de la raíz (incluyendo redirectStripe)
        ...config // Sobrescribir con config
      };
      
      return result as AppConfig;
    }
    
    // Si llegamos aquí, intentar construir la estructura esperada
    const result: AppConfig = { tabs: { audios: { components: { banner: { data: [] } } } } };
    
    // Verificar si los datos tienen una estructura plana con claves que contienen "."
    const flatKeys = Object.keys(data).filter(key => key.includes('.'));
    
    if (flatKeys.length > 0) {
      console.log('[AppConfigCacheService] Estructura plana detectada, reconstruyendo objeto anidado');
      
      flatKeys.forEach(key => {
        const parts = key.split('.');
        let current: any = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) current[part] = {};
          current = current[part];
        }
        
        current[parts[parts.length - 1]] = data[key];
      });
      
      // Asegurarnos que la estructura mínima está presente
      if (!result.tabs) result.tabs = {};
      if (!result.tabs.audios) result.tabs.audios = {};
      if (!result.tabs.audios.components) result.tabs.audios.components = {};
      if (!result.tabs.audios.components.banner) result.tabs.audios.components.banner = { data: [] };
      
      return result;
    }
    
    // En caso contrario, devolver una estructura segura
    console.log('[AppConfigCacheService] No se pudo determinar la estructura, devolviendo estructura segura');
    return { 
      ...data,
      tabs: { 
        audios: { 
          components: { 
            banner: { 
              data: [] 
            } 
          } 
        } 
      } 
    } as AppConfig;
  }

  /**
   * Obtiene las configuraciones de la app, ya sea desde caché o desde el servidor
   */
  async getConfigs(forceRefresh: boolean = false): Promise<AppConfig> {
    try {
      // Si no hay conectividad, intentar obtener de caché
      if (!this.networkAvailable) {
        console.log('[AppConfigCacheService] Sin conexión, intentando obtener configuraciones de caché');
        const cachedConfigs = await this.cacheService.get<AppConfig>(this.CACHE_KEY, {
          version: this.CACHE_VERSION
          // Sin pasar expirationTime para ignorar la expiración
        });
        
        if (cachedConfigs) {
          console.log('[AppConfigCacheService] Usando configuraciones en caché debido a falta de conectividad');
          return cachedConfigs;
        }
        
        throw new Error('No hay conexión a internet ni configuraciones en caché');
      }

      // Intentar obtener del servidor primero
      try {
        console.log('[AppConfigCacheService] Obteniendo configuraciones del servidor');
        const rawConfigs = await AppConfigService.getConfigs();
        
        // Procesar y transformar los datos si es necesario
        const processedConfigs = this.processServerData(rawConfigs);
        
        // Guardar en caché
        await this.cacheService.set(this.CACHE_KEY, processedConfigs, {
          version: this.CACHE_VERSION,
          expirationTime: this.CACHE_EXPIRATION
        });
        
        console.log('[AppConfigCacheService] Configuraciones actualizadas desde servidor y guardadas en caché');
        
        if (this.debugMode) {
          // Verificar específicamente la configuración del banner después de procesar
          const bannerData = processedConfigs.tabs?.audios?.components?.banner?.data;
          console.log('[AppConfigCacheService] Banner data después de procesar:', 
            bannerData ? 'Presente' : 'Ausente',
            bannerData ? (Array.isArray(bannerData) ? `Array[${bannerData.length}]` : typeof bannerData) : '');
        }
        
        return processedConfigs;
      } catch (serverError) {
        // Si falla la petición al servidor pero no es por falta de conexión, 
        // intentar usar el caché si no se forzó la actualización
        if (!forceRefresh) {
          console.log('[AppConfigCacheService] Error al obtener del servidor, intentando usar caché:', serverError);
          
          const cachedConfigs = await this.cacheService.get<AppConfig>(this.CACHE_KEY, {
            version: this.CACHE_VERSION,
            expirationTime: this.CACHE_EXPIRATION
          });

          if (cachedConfigs) {
            console.log('[AppConfigCacheService] Usando configuraciones de caché debido a error en servidor');
            
            if (this.debugMode) {
              console.log('[AppConfigCacheService] Estructura de la caché:', 
                cachedConfigs.tabs ? 'Con tabs' : 'Sin tabs',
                cachedConfigs.tabs?.audios ? 'Con audios' : 'Sin audios',
                cachedConfigs.tabs?.audios?.components ? 'Con components' : 'Sin components');
            }
            
            return cachedConfigs;
          }
        }
        
        // Si no hay caché o se forzó actualización, propagar el error
        throw serverError;
      }
    } catch (error) {
      console.error('[AppConfigCacheService] Error obteniendo configuraciones:', error);
      throw error;
    }
  }

  /**
   * Fuerza una actualización de las configuraciones desde el servidor
   */
  async refreshConfigs(): Promise<AppConfig> {
    return this.getConfigs(true);
  }

  /**
   * Limpia el caché de configuraciones
   */
  async clearCache(): Promise<void> {
    await this.cacheService.remove(this.CACHE_KEY);
    console.log('[AppConfigCacheService] Caché de configuraciones limpiado');
  }
  
  /**
   * Activa o desactiva el modo de depuración
   */
  setDebugMode(enable: boolean): void {
    this.debugMode = enable;
    console.log(`[AppConfigCacheService] Modo debug ${enable ? 'activado' : 'desactivado'}`);
  }
  
  /**
   * Agrega datos de prueba del banner para situaciones de contingencia
   * @returns Configuración actualizada
   */
  async addTestBannerData(): Promise<AppConfig> {
    try {
      // Obtener configuración actual
      let config = await this.getConfigs();
      
      // Si no hay configuración, crear estructura base
      if (!config) {
        config = { tabs: { audios: { components: {} } } };
      }
      
      // Asegurar que la estructura esté completa
      if (!config.tabs) config.tabs = {};
      if (!config.tabs.audios) config.tabs.audios = {};
      if (!config.tabs.audios.components) config.tabs.audios.components = {};
      if (!config.tabs.audios.components.banner) config.tabs.audios.components.banner = {};
      
      // Agregar datos de prueba para el banner
      config.tabs.audios.components.banner.data = [
        ["https://julianealborna.wistia.com/medias/99yqifa2r0", "https://bit.ly/hipnosis-banner-test"]
      ];
      
      console.log('[AppConfigCacheService] Datos de prueba agregados al banner');
      
      // Guardar en caché
      await this.cacheService.set(this.CACHE_KEY, config, {
        version: this.CACHE_VERSION,
        expirationTime: this.CACHE_EXPIRATION
      });
      
      return config;
    } catch (error) {
      console.error('[AppConfigCacheService] Error agregando datos de prueba:', error);
      throw error;
    }
  }
} 