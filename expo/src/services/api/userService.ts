import { UpdateUserData } from "@/store/authStore";
  import apiManager from "./apiManager";

export class UserService {
    static async getUserData(userId: string | null): Promise<any> {
        try {
            const response = await apiManager.get(`user/${userId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async updateUserData(userId: string | null, body: UpdateUserData): Promise<any> {
        try {
            //console.log("userid", userId)
            const response = await apiManager.patch(`user/${userId}`, body);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async setProcessorData( body: any): Promise<any> {
        try {
            //console.log("userid", userId)
            const response = await apiManager.patch(`user/setProcessorData`, body);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async emailExist(email: string): Promise<any> {
        try {
            const response = await apiManager.get(`user/emailExist/${email}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async trialUser(body: any): Promise<any> {
        try {
            const response = await apiManager.post(`user/createTrialUser`, body);
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