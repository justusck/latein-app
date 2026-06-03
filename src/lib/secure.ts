import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_KEY = 'anthropic_api_key';

/** API key is kept in the device keychain (not in the SQLite DB). */
export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(API_KEY);
}

export async function setApiKey(value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!value.trim()) {
    await SecureStore.deleteItemAsync(API_KEY);
    return;
  }
  await SecureStore.setItemAsync(API_KEY, value.trim());
}

export async function hasApiKey(): Promise<boolean> {
  return (await getApiKey()) != null;
}
