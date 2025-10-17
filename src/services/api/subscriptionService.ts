import { User } from '@/helpers/membershipUtils'
import { useAuthStore } from '@/store/authStore'
import apiManager from './apiManager'

export class SubscriptionService {
  static async cancelSubscriptionProduction(userId: string): Promise<any> {
    try {
      // Obtener el email del usuario del authStore
      const userData = useAuthStore.getState().userData
      const userEmail = userData?.email  
      if (!userEmail) {
        throw new Error('Email del usuario no encontrado')
      }
            
      const response = await apiManager.request('/payments/cancel-subscription', {
          method: 'POST',
          data: {
            email: userEmail,
            userName: "userFinal"
          },
          useCache: false,
          headers: {
            'X-User-ID': userId
          }
        })
      
      console.log('✅ [SubscriptionService] Respuesta exitosa:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ [SubscriptionService] Error completo:', error)
      console.error('❌ [SubscriptionService] Error response:', error?.response?.data)
      throw this.handleError(error)
    }
  }

  static async getSubscriptionInfo(): Promise<any> {
    try {
      const response = await apiManager.get('/payments/memberships/latest-by-email')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  static async getUserById(userId: string): Promise<User> {
    try {
      const response = await apiManager.get(`/mmg-users/findAll/${userId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  static async reactivateSubscription(userId: string): Promise<any> {
    try {
      const response = await apiManager.request(`/subscription/reactivate/${userId}`, {
          method: 'POST',
          data: {},
          useCache: false
        })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  private static handleError(error: any) {
    if (error?.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || 'Error del servidor',
        data: error.response.data
      }
    }
    if (error?.status) {
      // Error ya formateado por ApiManager
      return error
    }
    return {
      status: 503,
      message: error?.message || 'Error de conexión'
    }
  }
}


