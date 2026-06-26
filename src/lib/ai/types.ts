/** Shared AI types — kept separate so course config can reference `AiMode`
 *  without pulling in the runtime engine. */

export type AiMode = 'chat' | 'roleplay' | 'correction';
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  /** Chain-of-thought reasoning produced by the model (collapsed by default). */
  reasoning?: string;
};

/** Token-by-token streaming data from llama.rn. */
export type TokenData = {
  /** Incremental reasoning content (parsed from thinking tags). */
  reasoning_content?: string;
  /** Incremental visible content. */
  content?: string;
  /** Raw token text. */
  token: string;
  /** Accumulated text so far. */
  accumulated_text?: string;
};
