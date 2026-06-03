import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { aiConversations, aiMessages } from '@/db/schema';

import { AI_MODES, type AiMode, type ChatMessage } from './index';

export type Conversation = { id: number; mode: AiMode; messages: ChatMessage[] };

function opener(mode: AiMode): string {
  return AI_MODES.find((m) => m.id === mode)?.opener ?? 'Salvē!';
}

export function appendMessage(conversationId: number, role: 'user' | 'assistant', content: string): void {
  db.insert(aiMessages)
    .values({ conversationId, role, content, createdAt: Date.now() })
    .run();
}

export function startConversation(mode: AiMode): Conversation {
  const row = db
    .insert(aiConversations)
    .values({ mode, title: AI_MODES.find((m) => m.id === mode)?.label ?? mode, createdAt: Date.now() })
    .returning({ id: aiConversations.id })
    .get();
  const first = opener(mode);
  appendMessage(row.id, 'assistant', first);
  return { id: row.id, mode, messages: [{ role: 'assistant', content: first }] };
}

/** Load the most recent conversation for a mode, or start a fresh one. */
export function loadOrStart(mode: AiMode): Conversation {
  const conv = db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.mode, mode))
    .orderBy(desc(aiConversations.id))
    .get();
  if (!conv) return startConversation(mode);
  const msgs = db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conv.id))
    .orderBy(aiMessages.id)
    .all();
  return {
    id: conv.id,
    mode,
    messages: msgs.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  };
}
