import { Platform } from 'react-native';
import { appFlyerService } from './AppFlyerService';

interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  deviceType: string;
  osVersion: string;
  appVersion: string;
}

// Interface that defines the events we can track in the application
export enum AnalyticsEventType {
  // Authentication events
  LOGIN = 'login',
  
  // Purchase events
  PURCHASE_INITIATED = 'purchase_initiated',
  PURCHASE_COMPLETED = 'purchase_completed',
  PURCHASE_CANCELLED = 'purchase_cancelled',
  
  // Form events
  FORM_WIZARD_ONBOARDING = 'form_wizard_onboarding',
}

// Interface for event parameters
export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Singleton class to handle analytics event tracking
 * This class acts as a facade for different analytics services
 * like AppFlyer, Firebase, etc.
 */
class AnalyticsService {
  private static instance: AnalyticsService;
  private initialized: boolean = false;
  private userId: string | null = null;
  private deviceInfo?: DeviceInfo;
  
  // Flag to enable/disable tracking
  private trackingEnabled: boolean = true;
  
  private constructor() {}
  
  /**
   * Gets the singleton instance of the analytics service
   */
  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  /**
   * Initializes the analytics service with necessary configurations
   * @param userId Current user ID (optional)
   */
  public initialize(userId?: string): void {
    if (this.initialized) return;
    
    // Analytics services like AppFlyer will be initialized here
    // when integrated into the project
    
    if (userId) {
      this.setUserId(userId);
    }
    
    this.initialized = true;
    console.log('Analytics service initialized');
  }
  
  /**
   * Sets the user ID for tracking
   * @param userId User ID
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    // User ID would be updated in analytics services here
    console.log(`Analytics user ID set: ${userId}`);
     appFlyerService.setUserId(userId);
  }

  /**
   * Sets device information for tracking
   * @param deviceInfo Device information
   */
  public setDeviceInfo(deviceInfo: DeviceInfo): void {
    this.deviceInfo = deviceInfo;
    console.log('Analytics device info updated');
  }
  
  /**
   * Enables or disables event tracking
   * @param enabled Enabled state
   */
  public setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
    console.log(`Analytics tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Tracks an event with optional parameters
   * @param eventType Type of event to track
   * @param params Additional event parameters
   */
  public trackEvent(eventType: AnalyticsEventType | string,params?: AnalyticsEventParams): void {
    if (!this.trackingEnabled) return;
    
    // Enrich parameters with user and device information
    const enrichedParams = this.enrichEventParams(params || {});
     appFlyerService.logEvent(eventType, enrichedParams);
  }
  
  /**
   * Tracks a screen view
   * @param screenName Screen name
   * @param params Additional parameters
   */
  public trackScreenView(screenName: AnalyticsEventType, params?: AnalyticsEventParams): void {
    this.trackEvent(screenName, params);
  }
  
  /**
   * Enriches event parameters with user and device information
   * @param params Original parameters
   * @returns Enriched parameters
   */
  private enrichEventParams(params: AnalyticsEventParams): AnalyticsEventParams {
    return {
      ...params,
      user_id: this.userId,
      platform: Platform.OS,
      os_version: this.deviceInfo?.osVersion || Platform.Version.toString(),
      device_type: this.deviceInfo?.deviceType || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

// Export the singleton instance
export const analyticsService = AnalyticsService.getInstance();