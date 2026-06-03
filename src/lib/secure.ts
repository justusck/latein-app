import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ANTHROPIC_KEY = 'anthropic_api_key';
const ELEVENLABS_KEY = 'elevenlabs_api_key';

/** API key is kept in the device keychain (not in the SQLite DB). */
export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(ANTHROPIC_KEY);
}

export async function setApiKey(value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!value.trim()) {
    await SecureStore.deleteItemAsync(ANTHROPIC_KEY);
    return;
  }
  await SecureStore.setItemAsync(ANTHROPIC_KEY, value.trim());
}

export async function hasApiKey(): Promise<boolean> {
  return (await getApiKey()) != null;
}

export async function getElevenLabsKey(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(ELEVENLABS_KEY);
}

export async function setElevenLabsKey(value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!value.trim()) {
    await SecureStore.deleteItemAsync(ELEVENLABS_KEY);
    return;
  }
  await SecureStore.setItemAsync(ELEVENLABS_KEY, value.trim());
}
