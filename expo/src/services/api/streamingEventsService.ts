// streamingEventsService.ts
import apiManager  from "./apiManager";


export interface StreamingEvent {
    _id: string,
    streamUrl: string
    streamImgUrl: string
    title: string
    description: string
    publicationDate: string
    streamHourStart: string
    streamHourEnd: string
    tags: string[],
    views: number,
    isVisible: boolean
    isLive: boolean
    executed: boolean
}


export class StreamingEventsService {
    static async getStreamingEvents(): Promise<any> {
        try {
            const response = await apiManager.get(`streamingEvents/findAll`);
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