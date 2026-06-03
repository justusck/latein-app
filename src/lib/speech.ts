import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { getElevenLabsKey } from '@/lib/secure';
import type { Pronunciation } from '@/store/app';

// ElevenLabs "Adam" — deep, clear, works well for Latin
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
const MODEL = 'eleven_multilingual_v2';

let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

function stripMacrons(s: string): string {
  return s
    .replace(/[āăâ]/g, 'a')
    .replace(/[ēĕê]/g, 'e')
    .replace(/[īĭî]/g, 'i')
    .replace(/[ōŏô]/g, 'o')
    .replace(/[ūŭû]/g, 'u')
    .replace(/[ĀĂÂ]/g, 'A')
    .replace(/[ĒĔÊ]/g, 'E')
    .replace(/[ĪĬÎ]/g, 'I')
    .replace(/[ŌŎÔ]/g, 'O')
    .replace(/[ŪŬÛ]/g, 'U');
}

function classicalPhonetic(s: string): string {
  return stripMacrons(s)
    .replace(/ae/gi, 'ai')
    .replace(/oe/gi, 'oi')
    .replace(/c/g, 'k')
    .replace(/C/g, 'K')
    .replace(/v/g, 'w')
    .replace(/V/g, 'W')
    .replace(/gn/gi, 'ngn');
}

export async function speakLatin(text: string, pronunciation: Pronunciation): Promise<void> {
  const key = await getElevenLabsKey();
  if (!key) return;

  const body = (pronunciation === 'classical' ? classicalPhonetic(text) : stripMacrons(text)).trim();
  if (!body) return;

  if (currentPlayer) {
    currentPlayer.pause();
    currentPlayer.remove();
    currentPlayer = null;
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: body,
      model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const file = new File(Paths.cache, 'latein_tts.mp3');
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
