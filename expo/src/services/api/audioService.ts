import apiManager from "./apiManager";

export class AudioService {
    static async getAudios(userId: string | null): Promise<any> {
        try {
            const response = await apiManager.get(`audio/getAllAudiosByUserId/${userId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async updateAudioCustomData(userId: string  | null , audioRequestId: string, customData: any): Promise<any> {
        try {
            const response = await apiManager.patch(`audio/updateAudioElement/customData/${userId}/${audioRequestId}`, customData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private static handleError(error: any) {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.data.message || 'Error del servidor',
            };
        }
        return {
            status: 503,
            message: 'Error de conexión',
        };
    }
}