import * as Speech from 'expo-speech';

import type { Pronunciation } from '@/store/app';

/**
 * Latin has no native system TTS voice. We approximate:
 *  - ecclesiastical ≈ Italian voice (it-IT), text mostly as-is.
 *  - classical ≈ apply a light phonetic transform (c→k, v→w, ae→ai, …) and
 *    read with an Italian/Spanish voice for clean vowels.
 * This is a documented approximation, not a true Latin synthesiser.
 */
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

export function speakLatin(text: string, pronunciation: Pronunciation): void {
  const body = (pronunciation === 'classical' ? classicalPhonetic(text) : stripMacrons(text)).trim();
  if (!body) return;
  Speech.stop();
  // Prefer an Italian voice for clean Latin vowels; if it isn't installed on
  // the device, retry once with the system default so there is always audio.
  Speech.speak(body, {
    language: 'it-IT',
    rate: pronunciation === 'classical' ? 0.92 : 0.95,
    pitch: 1.0,
    onError: () => {
      Speech.speak(body, { rate: 0.92, pitch: 1.0 });
    },
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
