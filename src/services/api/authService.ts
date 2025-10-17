// authService.ts
import apiManager from "./apiManager";

export interface LoginCredentials {
    email: string;
    loginCode: string;
  }

  export interface GetCodeCrendentials {
    email: string;
  }
  
  export interface RegisterData extends LoginCredentials {
    username: string;
  }
  
 export  interface AuthResponse {
    token: string;
    userId: string
  }
  
  export class AuthService {

    static async getCode(credentials: GetCodeCrendentials): Promise<boolean> {
      try {
        const response = await apiManager.post(`auth/loginCode`, credentials);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    }

    static async login(credentials: LoginCredentials): Promise<AuthResponse> {
      try {
        const response = await apiManager.post(`auth/login`, credentials);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    }
  
    static async register(data: RegisterData): Promise<AuthResponse> {
      try {
        const response = await apiManager.post(`auth/register`, data);
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