// chatService.ts
import { apiClient, secondaryApiClient } from "./config";

interface MessageData {
    chatId?: string;
    message: string;
    userId: string;
    email: string;
    file?: {
        uri: string;
        name: string;
        type: string;
    };
    threadId?: string;
}

export class ChatService {

    static async getChatByUserId(userId: string ): Promise<any> {
        try {
            console.log('fetching chat by userId:', userId);
            
            const body = {userId: userId}
            const response = await secondaryApiClient.post(
                `chat/getChatByUserId/`, 
                body
            );
            ///console.log("response fetch chat by userId", response.data);
            
            // Si hay datos de chat y mensajes, invertir el orden de los mensajes
            // para que los más recientes aparezcan primero (para FlatList invertido)
            if (response.data && response.data.chat && response.data.chat.messages) {
                response.data.chat.messages = response.data.chat.messages.reverse();
            }
            
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async startConversation(userId: string | null, email: string | null,data: MessageData): Promise<any> {
        try {
            console.log('Starting conversation with data:', data);

            const formData = this.createFormData(data);
            console.log('Starting conversation with formData:', formData);
            
            const response = await secondaryApiClient.post(
                `chat/startConversation/`, 
                formData
            );
            console.log("response starting conversation", response.data)
            return response.data;
        } catch (error) {

            console.log("error starting conversation", error)
            throw this.handleError(error);
        }
    }

    static async sendMessageToAssistant(userId: string | null, email: string | null, data: MessageData): Promise<any> {
        try {
            console.log('Sending message with data:', data);

            const formData = this.createFormData(data);
            console.log('Sending message with formData:', formData);
            
            const response = await secondaryApiClient.post(
                `chat/sendMessageToAssistant/`, 
                formData
            );
            console.log("response sending message to assistant", response)
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private static createFormData(data: MessageData): FormData {

        console.log("createFormData", data)
        const formData = new FormData();
        
        // Agregar mensaje
        formData.append('message', data.message);
        formData.append('userId', data.userId);
        formData.append('email', data.email);
        formData.append('chatId', data.chatId?.toString() || '');
        
        // Agregar archivo si existe
        if (data.file) {
            // Mejorar la forma de adjuntar el archivo para React Native
            const fileObj = {
                uri: data.file.uri,
                type: data.file.type || 'image/jpeg',
                name: data.file.name || 'image.jpg'
            };
            
            // En React Native, necesitamos usar "as any" para evitar errores de tipado
            // ya que React Native maneja FormData de manera diferente
            formData.append('file', fileObj as any);
            
            console.log("Adjuntando archivo:", fileObj);
        }
        
        // Agregar threadid si existe
        if (data.threadId) {
            formData.append('threadId', data.threadId);
        }
        
        console.log("FormData creado con éxito");
        return formData;
    }

    private static handleError(error: any) {
        console.log("handleError: " , error)
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