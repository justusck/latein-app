import { getActiveCourse } from '@/courses';
import { buildKnowledgeContext } from '@/lib/knowledge';
import { generateResponse, loadModel, getEngineStatus, onStatusChange } from './engine';
import type { Pronunciation } from '@/store/app';

/** On-device AI conversation (Gemma 4 via llama.rn, or cloud API). */

export type { AiMode, ChatMessage } from './types';
import type { AiMode, ChatMessage } from './types';

function buildSystemPrompt(
  mode: AiMode,
  pronunciation: Pronunciation,
  characterPrompt?: string,
  customPrompt?: string,
): string {
  const { ai } = getActiveCourse();
  const knowledge = buildKnowledgeContext().summary;
  const extraParts: string[] = [];

  if (mode === 'roleplay' && characterPrompt) {
    extraParts.push(`Charakterbeschreibung (deutsch):\n${characterPrompt}`);
  }

  if (customPrompt && customPrompt.trim()) {
    extraParts.push(`Zusätzliche Anweisungen des Nutzers:\n${customPrompt.trim()}`);
  }

  return [
    ai.baseInstructions,
    `\n\nAussprache-Kontext: ${pronunciation === 'classical' ? 'klassisch' : 'kirchlich'}.`,
    `\n\nMODUS: ${ai.modeInstructions[mode]}`,
    `\n\n${knowledge}`,
    extraParts.length ? `\n\n${extraParts.join('\n\n')}` : '',
  ].join('');
}

export async function chat(opts: {
  mode: AiMode;
  history: ChatMessage[];
  pronunciation: Pronunciation;
  characterPrompt?: string;
  customPrompt?: string;
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

  const systemPrompt = buildSystemPrompt(opts.mode, opts.pronunciation, opts.characterPrompt, opts.customPrompt);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...opts.history.map((m) => ({ role: m.role, content: m.content })),
  ];

  return generateResponse(messages);
}

// Re-export engine lifecycle functions so the UI can subscribe.
export { loadModel, getEngineStatus, onStatusChange, unloadModel } from './engine';

/**
 * Course-aware AI mode descriptors (used by the chat tab for the mode picker).
 * Previously exported as static `AI_MODES` — now a getter.
 */
export function getAiModes(): { id: AiMode; label: string; opener: string }[] {
  const { ai } = getActiveCourse();
  return [
    { id: 'chat', label: 'Gespräch', opener: ai.openers.chat },
    { id: 'roleplay', label: 'Rollenspiel', opener: ai.openers.roleplay },
    { id: 'correction', label: 'Korrektur', opener: ai.openers.correction },
  ];
}

/**
 * Extract the target-language part of an AI reply for TTS (drop helper lines,
 * strip Markdown formatting). Previously `latinPart` — now course-aware.
 */
export function speakablePart(text: string): string {
  return getActiveCourse().ai.speakablePart(text);
}

/** Backwards-compat alias — still used by some callers. */
export { speakablePart as latinPart };
