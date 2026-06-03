import { buildKnowledgeContext } from '@/lib/knowledge';
import type { Pronunciation } from '@/store/app';

/** Direct Claude API client (key lives on-device; single-user app). */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

export type AiMode = 'chat' | 'roleplay' | 'correction';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const AI_MODES: { id: AiMode; label: string; opener: string }[] = [
  { id: 'chat', label: 'Gespräch', opener: 'Salvē! Quōmodo tē habēs?' },
  { id: 'roleplay', label: 'Rollenspiel', opener: 'Salvē! In forō sumus. Ego mercātor sum. Quid emere vīs?' },
  { id: 'correction', label: 'Korrektur', opener: 'Scrībe mihi sententiam Latīnam — eam corrigam.' },
];

const BASE_INSTRUCTIONS = [
  'Du bist „Magister", ein geduldiger, ermutigender Latein-Tutor in einer Lern-App.',
  'Schreibe deine lateinischen Sätze KURZ und EINFACH. Nutze möglichst nur Wortschatz und',
  'Grammatik, die der/die Lernende bereits beherrscht (siehe Kontext unten).',
  'Wenn du ein neues Wort einführst, schreibe die deutsche Bedeutung direkt in Klammern dahinter.',
  'Antworte in 1–3 kurzen lateinischen Sätzen. Danach gib in einer separaten Zeile eine kurze',
  'deutsche Hilfe/Übersetzung in Klammern, eingeleitet mit „DE: ".',
  'Korrigiere Fehler des Lernenden freundlich und erkläre sie knapp auf Deutsch.',
].join(' ');

const MODE_INSTRUCTIONS: Record<AiMode, string> = {
  chat: 'Führe ein einfaches Alltagsgespräch und stelle leichte Rückfragen.',
  roleplay:
    'Spiele eine Szene auf dem römischen Forum (Marktplatz). Bleibe in der Rolle des Händlers.',
  correction:
    'Der/die Lernende schreibt lateinische Sätze. Korrigiere sie, lobe Gelungenes und erkläre Fehler.',
};

function buildSystem(mode: AiMode, pronunciation: Pronunciation) {
  const knowledge = buildKnowledgeContext().summary;
  return [
    // Stable block — cached across turns.
    {
      type: 'text' as const,
      text: `${BASE_INSTRUCTIONS}\n\nAussprache-Kontext: ${pronunciation === 'classical' ? 'klassisch' : 'kirchlich'}.`,
      cache_control: { type: 'ephemeral' as const },
    },
    // Mode + knowledge (changes as the learner progresses).
    { type: 'text' as const, text: `MODUS: ${MODE_INSTRUCTIONS[mode]}\n\n${knowledge}` },
  ];
}

export async function chat(opts: {
  apiKey: string;
  mode: AiMode;
  history: ChatMessage[];
  pronunciation: Pronunciation;
}): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystem(opts.mode, opts.pronunciation),
      messages: opts.history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();
}

/** Extract just the Latin part (drop the "DE: …" helper line) for TTS. */
export function latinPart(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*(DE|de)\s*:/.test(line))
    .join(' ')
    .replace(/\([^)]*\)/g, '') // drop inline glosses
    .trim();
}
