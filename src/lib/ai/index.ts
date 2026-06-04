import { buildKnowledgeContext } from '@/lib/knowledge';
import { generateResponse, loadModel, getEngineStatus, onStatusChange } from './engine';
import type { Pronunciation } from '@/store/app';

/** On-device Gemma 4 conversation (no cloud API). */

export type AiMode = 'chat' | 'roleplay' | 'correction';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const AI_MODES: { id: AiMode; label: string; opener: string }[] = [
  { id: 'chat', label: 'Gespräch', opener: 'Salvē! Quōmodo tē habēs?' },
  { id: 'roleplay', label: 'Rollenspiel', opener: 'Salvē! In forō sumus. Ego mercātor sum. Quid emere vīs?' },
  { id: 'correction', label: 'Korrektur', opener: 'Scrībe mihi sententiam Latīnam — eam corrigam.' },
];

const BASE_INSTRUCTIONS = [
  'Du bist ein KI-Assistent in einer Latein-Lern-App.',
  'Schreibe deine lateinischen Sätze KURZ und EINFACH. Nutze möglichst nur Wortschatz und',
  'Grammatik, die der/die Lernende bereits beherrscht (siehe Kontext unten).',
  'Antworte in 1–3 kurzen lateinischen Sätzen.',
].join(' ');

const MODE_INSTRUCTIONS: Record<AiMode, string> = {
  chat:
    'Führe ein natürliches, hilfreiches Gespräch auf Latein. Stelle leichte Rückfragen. ' +
    'SCHREIBE NUR AUF LATEIN — keine deutschen Übersetzungen, keine Erklärungen auf Deutsch.',
  roleplay:
    'Du verkörperst einen Charakter. Bleibe vollständig und konsequent in deiner Rolle. ' +
    'SCHREIBE NUR AUF LATEIN — keine deutschen Übersetzungen, keine Erklärungen auf Deutsch.',
  correction:
    'Der/die Lernende schreibt lateinische Sätze. Korrigiere Fehler, lobe Gelungenes und ' +
    'erkläre die Korrekturen kurz auf Deutsch.',
};

function buildSystemPrompt(
  mode: AiMode,
  pronunciation: Pronunciation,
  characterPrompt?: string,
): string {
  const knowledge = buildKnowledgeContext().summary;
  const extra =
    mode === 'roleplay' && characterPrompt
      ? `\n\nCharakterbeschreibung (deutsch):\n${characterPrompt}`
      : '';

  return [
    BASE_INSTRUCTIONS,
    `\nAussprache-Kontext: ${pronunciation === 'classical' ? 'klassisch' : 'kirchlich'}.`,
    `\n\nMODUS: ${MODE_INSTRUCTIONS[mode]}`,
    `\n\n${knowledge}`,
    extra,
  ].join('');
}

export async function chat(opts: {
  mode: AiMode;
  history: ChatMessage[];
  pronunciation: Pronunciation;
  characterPrompt?: string;
}): Promise<string> {
  // Ensure model is loaded (no-op if already ready).
  // loadModel handles download + init, idempotent.
  const status = getEngineStatus();
  if (status.state === 'unloaded' || status.state === 'error') {
    await loadModel();
  } else if (status.state === 'downloading' || status.state === 'loading') {
    // Wait for ongoing load to finish — poll status changes
    await new Promise<void>((resolve, reject) => {
      const unsub = onStatusChange((s) => {
        if (s.state === 'ready') { unsub(); resolve(); }
        if (s.state === 'error') { unsub(); reject(new Error(s.error ?? 'Modell-Fehler')); }
      });
    });
  }

  const systemPrompt = buildSystemPrompt(opts.mode, opts.pronunciation, opts.characterPrompt);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...opts.history.map((m) => ({ role: m.role, content: m.content })),
  ];

  return generateResponse(messages);
}

// Re-export engine lifecycle functions so the UI can subscribe.
export { loadModel, getEngineStatus, onStatusChange, unloadModel } from './engine';

/** Extract just the Latin part (drop the "DE: …" helper line) for TTS. */
export function latinPart(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*(DE|de)\s*:/.test(line))
    .join(' ')
    .replace(/\([^)]*\)/g, '') // drop inline glosses
    .trim();
}
