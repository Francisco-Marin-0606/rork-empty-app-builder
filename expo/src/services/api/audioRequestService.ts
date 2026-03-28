// audio request service.ts
import apiManager from "./apiManager";


export interface QuestionsAnswer {
    question: string
    answer : string
}

export interface AudioMotive{
    export?: string
    voice?: string
    questions: QuestionsAnswer[]
    generatedText?: string[]
}

export interface AudioRequest {
    userId: string
    email: string
    requestDate: string
    membershipDate?: string
    status?: string,
    audioMotive: AudioMotive
}

export interface AuxAudioRequest {
    email: string
    requestDate: string
    audioMotive: AudioMotive
}

export class AudioRequestService {
    static async sendAudioRequest(audioRequest: AudioRequest): Promise<any> {
        try {
            const response = await apiManager.post(`audioRequest/createAudioRequest`, audioRequest);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async getAudioRequests(userId: string): Promise<any> {
        try {
            const response = await apiManager.get(`audioRequest/findAudioRequestByUserId/${userId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async updateIsAvailable(audioRequestId: string): Promise<any> {
        let body = {
            isAvailable: false
        }
        try {
            const response = await apiManager.patch(`audioRequest/updateIsAvailable/${audioRequestId}`, body);
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