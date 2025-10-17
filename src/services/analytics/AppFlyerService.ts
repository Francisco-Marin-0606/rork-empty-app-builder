import { Platform } from 'react-native';
import { AnalyticsEventParams, AnalyticsEventType } from './AnalyticsService';
import appsFlyer from 'react-native-appsflyer';


/**
 * Service to integrate AppFlyer in the application
 * This class handles initialization and sending events to AppFlyer
 */
class AppFlyerService {
  private static instance: AppFlyerService;
  private initialized: boolean = false;
  
  // API keys for AppFlyer
  private readonly devKey: string = '4Drh83vs9bpEu2rPWiNmR4'; // Replace with real key
  private readonly appId: string = Platform.OS === 'ios' 
    ? 'id6740008581' // iOS app ID
    : ''; // Android app ID
  
  private constructor() {}
  
  /**
   * Gets the singleton instance of the AppFlyer service
   */
  public static getInstance(): AppFlyerService {
    if (!AppFlyerService.instance) {
      AppFlyerService.instance = new AppFlyerService();
    }
    return AppFlyerService.instance;
  }
  
  /**
   * Initializes the AppFlyer SDK
   * @param userId User ID (optional)
   */
  public async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    try {
      // AppFlyer SDK will be initialized here when integrated
      // Example code for when dependency is added:
      const appsFlyerOptions = {
        devKey: this.devKey,
        isDebug: __DEV__, // Enable logs in development
        appId: this.appId,
        onInstallConversionDataListener: true, // To get attribution data
        onDeepLinkListener: true, // To handle deeplinks
        timeToWaitForATTUserAuthorization: 10 // For iOS 14+
      };
      
      await appsFlyer.initSdk(appsFlyerOptions);
      
      if (userId) {
        appsFlyer.setCustomerUserId(userId);
      }

      this.initialized = true;
      console.log('AppFlyer service initialized');
    } catch (error) {
      console.error('Error initializing AppFlyer:', error);
    }
  }
  
  /**
   * Sets the user ID in AppFlyer
   * @param userId User ID
   */
  public setUserId(userId: string): void {
    if (!this.initialized) {
      console.warn('AppFlyer not initialized. Call initialize() first.');
      return;
    }
    
    try {
      appsFlyer.setCustomerUserId(userId);
      console.log(`AppFlyer user ID set: ${userId}`);
    } catch (error) {
      console.error('Error setting AppFlyer user ID:', error);
    }
  }
  
  /**
   * Sends an event to AppFlyer
   * @param eventName Event name
   * @param params Event parameters
   */
  public logEvent(eventName: string, params?: AnalyticsEventParams): void {
    if (!this.initialized) {
      console.warn('AppFlyer not initialized. Call initialize() first.');
      return;
    }
     
    if(__DEV__) {
      console.log('AppFlyer event:', eventName, params);
      return;
    }
    
    try {
      appsFlyer.logEvent(eventName, params || {});
    } catch (error) {
      console.error('Error logging AppFlyer event:', error);
    }
  }
  
  /**
   * Sets up AppFlyer deeplink handling
   * @param callback Function to call when a deeplink is received
   */
  public setupDeepLinkHandling(callback: (deepLink: any) => void): void {
    if (!this.initialized) {
      console.warn('AppFlyer not initialized. Call initialize() first.');
      return;
    }
    
    try {
      // Configure deeplink listener
      appsFlyer.onDeepLink(deepLinkResult => {
       // console.log('AppFlyer DeepLink:', deepLinkResult);
        
        if (deepLinkResult?.deepLinkStatus && deepLinkResult?.status === 'success') {
          callback(deepLinkResult);
        }
      });
      
      console.log('AppFlyer deep link handling configured');
    } catch (error) {
      console.error('Error setting up AppFlyer deep link handling:', error);
    }
  }
}

// Export the singleton instance
export const appFlyerService = AppFlyerService.getInstance();