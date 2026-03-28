import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { UnifiedDeepLinkData } from 'react-native-appsflyer';

// Tipos de deeplinks que la aplicación puede manejar
export enum DeeplinkType {
  LOGIN = 'login',
  OTHER = 'other',
}

// Interfaz para los parámetros de deeplinks
export interface DeeplinkParams {
  [key: string]: string;
}


/**
 * Servicio para manejar deeplinks en la aplicación
 * Esta clase se encarga de procesar los deeplinks entrantes y dirigir al usuario
 * a la pantalla correspondiente
 */
class DeeplinkService {
  private static instance: DeeplinkService;
  private initialized: boolean = false;
  private lastDeeplinkData: { isFromDeeplink: boolean; params: DeeplinkParams; timestamp: number } | null = null;
  
  // URL base para los deeplinks de la aplicación
  private readonly oneLinkUrl: string = 'https://mental.onelink.me';
  
  // Mapa de rutas para los diferentes tipos de deeplinks
  private readonly routeMap: Record<DeeplinkType, string> = {
    [DeeplinkType.LOGIN]: '/(auth)/login',
    [DeeplinkType.OTHER]: '/(app)/(tabs)/(audios)'
  };
  
  private constructor() {}
   
  /**
   * Obtiene la instancia singleton del servicio de deeplinks
   */
  public static getInstance(): DeeplinkService {
    if (!DeeplinkService.instance) {
      DeeplinkService.instance = new DeeplinkService();
    }
    return DeeplinkService.instance;
  }
  
  /**
   * Inicializa el servicio de deeplinks
   */
  public initialize(): void {
    if (this.initialized) return;
    
    // Configurar el listener para deeplinks nativos
    this.setupNativeDeeplinkHandling();
    
    this.initialized = true;
    console.log('Deeplink service initialized');
  }
  
  /**
   * Configura el manejo de deeplinks nativos
   */
  private setupNativeDeeplinkHandling(): void {
    // Listener para deeplinks cuando la app ya está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      this.processDeeplink(url);
    });
    
    // Verificar si la app fue abierta con un deeplink
    Linking.getInitialURL().then(url => {
      if (url) {
        this.processDeeplink(url);
      }
    });
  }
  
  /**
   * Procesa un deeplink y navega a la pantalla correspondiente
   * @param url URL del deeplink
   */
  public processDeeplink(url: string): void {
    try {
      //console.log('Processing deeplink:', url);
      
      // Verificar si es una URL de OneLink
      if (!this.isOneLinkUrl(url)) {
        this.processOneLinkUrl(url);
        return;
      }
      
      // Parsear la URL del deeplink
      const parsedUrl = Linking.parse(url);
      
      // Determinar el tipo de deeplink y los parámetros
      const queryParams = parsedUrl.queryParams || {};
      const stringQueryParams: Record<string, string> = {};
      
      // Convertir todos los parámetros a strings
      Object.entries(queryParams).forEach(([key, value]) => {
        if (typeof value === 'string') {
          stringQueryParams[key] = value;
        } else if (Array.isArray(value)) {
          stringQueryParams[key] = value[0] || '';
        } else {
          stringQueryParams[key] = String(value || '');
        }
      });
      
      const { type, params } = this.parseDeeplinkPath(parsedUrl.path || '', stringQueryParams);
      
      // Guardar información del deeplink para tracking
      this.lastDeeplinkData = {
        isFromDeeplink: true,
        params: stringQueryParams,
        timestamp: Date.now()
      };
      
      // Navegar a la ruta correspondiente
      this.navigateToRoute(type, params);
    } catch (error) {
      console.error('Error processing deeplink:', error);
    }
  }
  
  /**
   * Parsea la ruta del deeplink para determinar el tipo y los parámetros
   * @param path Ruta del deeplink
   * @param queryParams Parámetros de consulta del deeplink
   * @returns Tipo de deeplink y parámetros
   */
  private parseDeeplinkPath(path: string, queryParams: Record<string, string>): {
    type: DeeplinkType;
    params: DeeplinkParams;
  } {
    // Eliminar la barra inicial si existe
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Dividir la ruta en segmentos
    const segments = normalizedPath.split('/');
    
    // El primer segmento determina el tipo de deeplink
    let type: DeeplinkType = DeeplinkType.OTHER;
    
    if (segments.length > 0) {
      const firstSegment = segments[0].toLowerCase();
      
      // Mapear el primer segmento a un tipo de deeplink
      switch (firstSegment) {
        case 'login':
          type = DeeplinkType.LOGIN;
          break;
        default:
          type = DeeplinkType.OTHER;
      }
    }
    
    // Construir los parámetros combinando los segmentos de la ruta y los parámetros de consulta
    const params: DeeplinkParams = { ...queryParams };
    
    // Agregar parámetros basados en los segmentos de la ruta
    if (segments.length > 1) {
      // El segundo segmento suele ser un identificador
      params.id = segments[1];
      
      // Agregar segmentos adicionales como parámetros
      for (let i = 2; i < segments.length; i++) {
        params[`param${i-1}`] = segments[i];
      }
    }
    
    return { type, params };
  }
  
  /**
   * Navega a la ruta correspondiente según el tipo de deeplink y los parámetros
   * @param type Tipo de deeplink
   * @param params Parámetros del deeplink
   */
  private navigateToRoute(type: DeeplinkType, params: DeeplinkParams): void {
    // Obtener la ruta base para el tipo de deeplink
    const baseRoute = this.routeMap[type] || this.routeMap[DeeplinkType.OTHER];
    
    // Construir la ruta completa con los parámetros
    let route = baseRoute;
    
    // Manejar casos especiales según el tipo de deeplink
    switch (type) {
      case DeeplinkType.LOGIN:
        // Navegar a la pantalla de login
        route = this.routeMap[DeeplinkType.LOGIN];
        break;
      
      default:
        // Para otros casos, navegar a la pantalla principal
        route = this.routeMap[DeeplinkType.OTHER];
        break;
    }
    
    // Navegar a la ruta
    console.log(`Navigating to route: ${route}`);
    router.replace(route as any); 
  }
  
  /**
   * Verifica si una URL es una URL de OneLink
   * @param url URL a verificar
   * @returns true si es una URL de OneLink
   */
  private isOneLinkUrl(url: string): boolean {
    return url.includes('mental.onelink.me');
  }
  
  /**
   * Procesa una URL de OneLink
   * @param url URL de OneLink
   */
  private processOneLinkUrl(url: string): void {
    try {
      // Extraer parámetros de la URL de OneLink
      const urlObj = new URL(url);
      const params: DeeplinkParams = {};
      
      // Convertir todos los parámetros de consulta
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      // Guardar información del deeplink para tracking
      this.lastDeeplinkData = {
        isFromDeeplink: true,
        params,
        timestamp: Date.now()
      };
      
      // Determinar el tipo de deeplink basado en los parámetros o la ruta
      let type: DeeplinkType = DeeplinkType.OTHER;
      
      // Verificar si hay parámetros específicos que indiquen el tipo
      if (params.type) {
        switch (params.type.toLowerCase()) {
          case 'login':
            type = DeeplinkType.LOGIN;
            break;
          default:
            type = DeeplinkType.OTHER;
        }
      }
      
      // Navegar a la ruta correspondiente
      this.navigateToRoute(type, params);
    } catch (error) {
      console.error('Error processing OneLink URL:', error);
      // En caso de error, navegar a la pantalla principal
      router.replace('/(app)/(tabs)/(audios)');
    }
  }
  
  /**
   * Crea una URL de deeplink para compartir
   * @param type Tipo de deeplink
   * @param params Parámetros del deeplink
   * @returns URL del deeplink
   */
  public createDeeplinkUrl(type: DeeplinkType, params: DeeplinkParams = {}): string {
    // Construir la ruta según el tipo
    let path = type.toLowerCase();
    
    // Agregar el ID como parte de la ruta si existe
    if (params.id) {
      path += `/${params.id}`;
      // Eliminar el ID de los parámetros para no duplicarlo
      const { id, ...restParams } = params;
      params = restParams;
    }
    
    // Crear la URL con los parámetros restantes
    return Linking.createURL(path, { queryParams: params });
  }
  
  /**
   * Crea una URL de OneLink para compartir
   * @param type Tipo de deeplink
   * @param params Parámetros del deeplink
   * @returns URL de OneLink
   */
  public createOneLinkUrl(type: DeeplinkType, params: DeeplinkParams = {}): string {
    // Agregar el tipo como parámetro
    const oneLinkParams = {
      ...params,
      type: type.toLowerCase()
    };
    
    // Construir la URL de OneLink con parámetros
    const urlObj = new URL(this.oneLinkUrl);
    Object.entries(oneLinkParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
    
    return urlObj.toString();
  }
  
  /**
   * Verifica si el usuario llegó desde un deeplink recientemente
   * @param timeWindowMs Ventana de tiempo en milisegundos para considerar "reciente" (por defecto 30 segundos)
   * @returns true si el usuario llegó desde un deeplink
   */
  public async checkIfFromDeeplink(timeWindowMs: number = 30000): Promise<boolean> {
    try {
      // Verificar si hay datos de deeplink recientes
      if (this.lastDeeplinkData && 
          (Date.now() - this.lastDeeplinkData.timestamp) <= timeWindowMs) {
        return this.lastDeeplinkData.isFromDeeplink;
      }
      
      // Verificar si la app fue abierta con un deeplink inicial
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        // Verificar si es una URL de OneLink o deeplink personalizado
        const isDeeplink = initialUrl.includes('mentalmagnetapp://') ||
                          initialUrl.includes('com.mentalmagnet.mentalMagnetApp://');
        
        if (isDeeplink) {
          // Parsear parámetros del deeplink inicial
          const parsedUrl = Linking.parse(initialUrl);
          const params: DeeplinkParams = {};
          
          if (parsedUrl.queryParams) {
            Object.entries(parsedUrl.queryParams).forEach(([key, value]) => {
              if (typeof value === 'string') {
                params[key] = value;
              } else if (Array.isArray(value)) {
                params[key] = value[0] || '';
              } else {
                params[key] = String(value || '');
              }
            });
          }
          
          // Guardar información del deeplink
          this.lastDeeplinkData = {
            isFromDeeplink: true,
            params,
            timestamp: Date.now()
          };
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking deeplink source:', error);
      return false;
    }
  }
  
  /**
   * Obtiene los parámetros del último deeplink procesado
   * @returns Parámetros del deeplink o null si no hay ninguno
   */
  public getLastDeeplinkParams(): DeeplinkParams | null {
    return this.lastDeeplinkData?.params || null;
  }
  
  /**
   * Limpia los datos del último deeplink
   */
  public clearDeeplinkData(): void {
    this.lastDeeplinkData = null;
  }
  
   handleDeepLink(result: UnifiedDeepLinkData) {
      this.lastDeeplinkData = {
        isFromDeeplink: true,
        params: result.data,
        timestamp: Date.now()
      } 
  }

}

// Exportar la instancia singleton
export const deeplinkService = DeeplinkService.getInstance();