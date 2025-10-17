// videoCommentsService.ts
import { CommentsResponse, Comment } from "@/types/video";
import apiManager from "./apiManager";

export class VideoCommentsService {
    /**
     * Obtiene los comentarios de un video específico basado en el portal/level
     */
    static async getVideoComments(
        portal: number = 6001, 
        page: number = 1, 
        userId?: string,
        limit: number = 100
    ): Promise<CommentsResponse> {
        try {
            const response = await apiManager.get<CommentsResponse>(`/users-feedback/comments?state=APPROVED&page=${page}&portal=${portal}&limit=${limit}&userId=${userId}`);     
            return response.data
        } catch (error) {
            console.error('❌ [VideoCommentsService] Error obteniendo comentarios:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Envía un nuevo comentario a un video
     */
    static async postVideoComment(
        portal: number,
        content: string,
        author: string,
        userId: string
    ): Promise<Comment> {
        try {     
            const response = await apiManager.post<Comment>(`/users-feedback/comments`, {
                content,
                author,
                portal,
                userId,
                likeCount: 0,
                state: "PENDING"
            });
            return response.data;
        } catch (error) {
            console.error('❌ [VideoCommentsService] Error enviando comentario:', error);
            throw this.handleError(error);
        }
    }

    private static handleError(error: any) {
        if (error.response) {
            return {
                status: error.response.status,
                message: error.response.data?.message || 'Error del servidor',
            };
        }
        return {
            status: 503,
            message: 'Error de conexión',
        };
    }
}
