import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getActiveCourse } from '@/courses';
import { getElevenLabsKey } from '@/lib/secure';
import type { Pronunciation } from '@/store/app';

let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

/** Speak the given text using the active course's TTS voice + preprocessing. */
export async function speak(text: string, pronunciation: Pronunciation): Promise<void> {
  const key = await getElevenLabsKey();
  if (!key) return;

  const { tts } = getActiveCourse();
  const body = tts.preprocess(text, pronunciation).trim();
  if (!body) return;

  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.remove();
    currentPlayer = null;
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${tts.voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: body,
      model_id: tts.model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const file = new File(Paths.cache, 'tts.mp3');
  file.write(new Uint8Array(buffer));

  if (Platform.OS === 'ios') {
    await setAudioModeAsync({ playsInSilentMode: true });
  }

  currentPlayer = createAudioPlayer({ uri: file.uri });
  currentPlayer.play();
}

export function stopSpeaking(): void {
  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.remove();
    currentPlayer = null;
  }
}

/** Backwards-compat alias used by a few callers still importing the old name. */
export { speak as speakLatin };
