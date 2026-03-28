// FormQuestionService.ts
import {  RequestSettings } from "../models/requestSettings";
import apiManager from "./apiManager";

export class FormQuestionsService {
    static async getFormQuestions(userId: string | null): Promise<any> {
        try {
            const response = await apiManager.get(`formQuestions/findByUserId/${userId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async getFormQuestionsFromSettings(userId: string | null): Promise<any> {
        try {
            const response = await apiManager.get(`requestSettings/findByUserId/${userId}`);
            return response.data.appSettings;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async getFirstUserLevel(userId: string | null): Promise<any> {
        try {
            const response = await apiManager.get(`requestSettings/getFirstUserLevel`);
            return response.data.appSettings;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async getAllRequestSettings(): Promise<RequestSettings[]> {
        try {
            const response = await apiManager.get<RequestSettings[]>(`requestSettings/getAllLevelRequestSettings`);
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