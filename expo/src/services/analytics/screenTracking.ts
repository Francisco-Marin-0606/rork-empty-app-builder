import { AnalyticsEventType, analyticsService } from '@/services/analytics/AnalyticsService';
import { deeplinkService } from '@/helpers/DeeplinkService';



export const PAYMENT_SCREEN_VIEW = async () => {
   var { isFromDeeplink, deeplinkParams } = await DATA_DEEPLINK_SCREEN_VIEW();
  // Prepare event parameters
  const eventParams = {
    ...deeplinkParams,
    screen_name: AnalyticsEventType.PURCHASE_INITIATED,
    user_flow: 'payment'
  };
  // Send screen view event
  analyticsService.trackScreenView(AnalyticsEventType.PURCHASE_INITIATED, eventParams);
  // Send specific event

  analyticsService.trackEvent(AnalyticsEventType.PURCHASE_INITIATED, {
    origin: isFromDeeplink ? 'deeplink' : 'app',
    deeplink_params: deeplinkParams ? JSON.stringify(deeplinkParams) : null
  });
}

export const PAYMENT_SCREEN_VIEW_COMPLETED = async () => {
  var { isFromDeeplink, deeplinkParams } = await DATA_DEEPLINK_SCREEN_VIEW();
  // Prepare event parameters
  const eventParams = {
    ...deeplinkParams,
    screen_name: AnalyticsEventType.PURCHASE_COMPLETED,
    user_flow: 'payment'
  };
  // Send screen view event
  analyticsService.trackScreenView(AnalyticsEventType.PURCHASE_COMPLETED, eventParams);
  // Send specific event

  analyticsService.trackEvent(AnalyticsEventType.PURCHASE_COMPLETED, {
    origin: isFromDeeplink ? 'deeplink' : 'app',
    deeplink_params: deeplinkParams ? JSON.stringify(deeplinkParams) : null
  });
}

export const PAYMENT_SCREEN_VIEW_CANCELLED = async () => {
  var { isFromDeeplink, deeplinkParams } = await DATA_DEEPLINK_SCREEN_VIEW();
  // Prepare event parameters
  const eventParams = {
    ...deeplinkParams,
    screen_name: AnalyticsEventType.PURCHASE_CANCELLED,
    user_flow: 'payment'
  };
  // Send screen view event
  analyticsService.trackScreenView(AnalyticsEventType.PURCHASE_CANCELLED, eventParams);
  // Send specific event

  analyticsService.trackEvent(AnalyticsEventType.PURCHASE_CANCELLED, {
    origin: isFromDeeplink ? 'deeplink' : 'app',
    deeplink_params: deeplinkParams ? JSON.stringify(deeplinkParams) : null
  });
}

export const FORM_WIZARD_ONBOARDING_SCREEN_VIEW = async () => {
  var { isFromDeeplink, deeplinkParams } = await DATA_DEEPLINK_SCREEN_VIEW();
  // Prepare event parameters
  const eventParams = {
    ...deeplinkParams,
    screen_name: AnalyticsEventType.FORM_WIZARD_ONBOARDING,
    user_flow: 'onboarding'
  };
  // Send screen view event
  analyticsService.trackScreenView(AnalyticsEventType.FORM_WIZARD_ONBOARDING, eventParams);
  // Send specific event

  analyticsService.trackEvent(AnalyticsEventType.FORM_WIZARD_ONBOARDING, {
    origin: isFromDeeplink ? 'deeplink' : 'app',
    deeplink_params: deeplinkParams ? JSON.stringify(deeplinkParams) : null
  });
}
 
export const LOGIN_SCREEN_VIEW = async () => {
  var { isFromDeeplink, deeplinkParams } = await DATA_DEEPLINK_SCREEN_VIEW();
  // Prepare event parameters
  const eventParams = {
    ...deeplinkParams,
    screen_name: AnalyticsEventType.LOGIN,
    user_flow: 'login'
  };
  // Send screen view event
  analyticsService.trackScreenView(AnalyticsEventType.LOGIN, eventParams);
  // Send specific event

  analyticsService.trackEvent(AnalyticsEventType.LOGIN, {
    origin: isFromDeeplink ? 'deeplink' : 'app',
    deeplink_params: deeplinkParams ? JSON.stringify(deeplinkParams) : null
  });
}


// Function to get deeplink data
const DATA_DEEPLINK_SCREEN_VIEW = async () => {
  const isFromDeeplink = await deeplinkService.checkIfFromDeeplink();
  const deeplinkParams = deeplinkService.getLastDeeplinkParams();

  return {
    isFromDeeplink,
    deeplinkParams
  };
}