import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

type CaptureChangedPayload = { isCaptured: boolean };

const isIOS = Platform.OS === 'ios';

const Native = NativeModules.ScreenRecordingDetector
  ? NativeModules.ScreenRecordingDetector
  : null;

export const ScreenRecording = {
  isSupported: isIOS && !!Native,

  async isCaptured(): Promise<boolean> {
    if (!isIOS || !Native) return false;
    try {
      return await Native.isCaptured();
    } catch {
      return false;
    }
  },

  addListener(cb: (p: CaptureChangedPayload) => void) {
    if (!isIOS || !Native) return { remove: () => {} };
    const emitter = new NativeEventEmitter(Native);
    const sub = emitter.addListener('ScreenCaptureChanged', cb);
    return { remove: () => sub.remove() };
  }
};