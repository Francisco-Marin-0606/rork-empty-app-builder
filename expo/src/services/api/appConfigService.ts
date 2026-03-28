// AudioService.ts
import apiManager from "./apiManager";
import { apiClient } from "./config";

export class AppConfigService {
    static async getConfigs(): Promise<any> {
        try {
            console.log('[AppConfigService] Obteniendo configuraciones del servidor...');
            const response = await apiClient.get(`appSettings/findAll`);
            
            // Log detallado de la respuesta
           // console.log('[AppConfigService] Respuesta del servidor:', JSON.stringify(response.data, null, 2));
            
            // Verificamos la estructura de los datos
            if (Array.isArray(response.data)) {
                console.log('[AppConfigService] La respuesta es un array, procesando...');
                
                // Verificar si solo hay un objeto en el array (caso más común)
                if (response.data.length === 1) {
                    console.log('[AppConfigService] Devolviendo el primer elemento del array');
                    return response.data[0];
                }
                
                // Si hay múltiples objetos, devolvemos el array completo
                return response.data;
            }
            
            // Si no es un array, devolvemos directamente los datos
            console.log('[AppConfigService] Devolviendo respuesta directamente');
            return response.data;
        } catch (error) {
            console.error('[AppConfigService] Error obteniendo configuraciones:', error);
            throw this.handleError(error);
        }
    }

    private static handleError(error: any) {
        if (error.response) {
            console.error('[AppConfigService] Error de respuesta:', error.response.status, error.response.data);
            return {
                status: error.response.status,
                message: error.response.data.message || 'Error del servidor',
            };
        }
        console.error('[AppConfigService] Error de conexión');
        return {
            status: 503,
            message: 'Error de conexión',
        };
    }
}