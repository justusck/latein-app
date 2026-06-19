/**
 * Latin pronunciation pre-processing for TTS. Lifted out of speech.ts so the
 * course config can reference it without a circular import (speech.ts now reads
 * the active course's `tts.preprocess`).
 */
import type { Pronunciation } from '@/store/app';

export function stripMacrons(s: string): string {
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

export function classicalPhonetic(s: string): string {
  return stripMacrons(s)
    .replace(/ae/gi, 'ai')
    .replace(/oe/gi, 'oi')
    .replace(/c/g, 'k')
    .replace(/C/g, 'K')
    .replace(/v/g, 'w')
    .replace(/V/g, 'W')
    .replace(/gn/gi, 'ngn');
}

/** Map Latin text to a phonetic hint depending on the pronunciation scheme. */
export function latinPreprocess(text: string, pronunciation: Pronunciation): string {
  return pronunciation === 'classical' ? classicalPhonetic(text) : stripMacrons(text);
}
