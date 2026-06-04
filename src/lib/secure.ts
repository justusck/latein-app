import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ELEVENLABS_KEY = 'elevenlabs_api_key';

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
