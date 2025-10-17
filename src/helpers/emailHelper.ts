import { Linking, Platform } from 'react-native';

/**
 * Opens the mail app with pre-filled content
 * @param options Options for the email
 * @returns Promise that resolves when the email app is opened
 */
export const openEmail = async (options: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> => {
  const { to, subject, body } = options;
  
  // URL encode the subject and body to handle spaces and special characters
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  
  const url = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
  
  // Check if the device can handle the mailto URL
  const canOpen = await Linking.canOpenURL(url);
  
  if (canOpen) {
    await Linking.openURL(url);
    return true;
  }
  
  return false;
}; 