import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

const mapStyle = (style: ImpactStyle) => {
  switch (style) {
    case 'light':
      return Haptics.ImpactFeedbackStyle.Light;
    case 'medium':
      return Haptics.ImpactFeedbackStyle.Medium;
    case 'heavy':
      return Haptics.ImpactFeedbackStyle.Heavy;
    case 'rigid':
      return Haptics.ImpactFeedbackStyle.Rigid;
    case 'soft':
      return Haptics.ImpactFeedbackStyle.Soft;
    default:
      return Haptics.ImpactFeedbackStyle.Light;
  }
};

export async function hapticSelection() {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    } else {
      console.log('[haptics] selection (web noop)');
    }
  } catch (e) {
    console.log('[haptics] selection error', e);
  }
}

export async function hapticImpact(style: ImpactStyle = 'light') {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(mapStyle(style));
    } else {
      console.log('[haptics] impact', style, '(web noop)');
    }
  } catch (e) {
    console.log('[haptics] impact error', e);
  }
}

export async function hapticSuccess() {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      console.log('[haptics] success (web noop)');
    }
  } catch (e) {
    console.log('[haptics] success error', e);
  }
}

export async function hapticWarning() {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      console.log('[haptics] warning (web noop)');
    }
  } catch (e) {
    console.log('[haptics] warning error', e);
  }
}

export async function hapticError() {
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      console.log('[haptics] error (web noop)');
    }
  } catch (e) {
    console.log('[haptics] error error', e);
  }
}
