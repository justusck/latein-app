/** Shared AI types — kept separate so course config can reference `AiMode`
 *  without pulling in the runtime engine. */

export type AiMode = 'chat' | 'roleplay' | 'correction';
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
