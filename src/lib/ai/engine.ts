import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, type LlamaContext, type JinjaFormattedChatResult } from 'llama.rn';

/** Gemma 4 E2B in GGUF format (Q4_K_M quantized, ~2.6 GB).
 *  Source: HuggingFace — switch repo/filename to use a different model. */
const MODEL_REPO = 'unsloth/gemma-4-E2B-it-GGUF';
const MODEL_FILENAME = 'gemma-4-E2B-it-Q4_K_M.gguf';
const MODEL_URL = `https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILENAME}`;

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODELS_DIR}${MODEL_FILENAME}`;
const RESUME_PATH = `${MODELS_DIR}.resume.json`;

/** Context window size — keep conservative for mobile. */
const N_CTX = 4096;
const N_PREDICT = 1024;

export type EngineState = 'unloaded' | 'downloading' | 'loading' | 'ready' | 'error';

export type EngineStatus = {
  state: EngineState;
  downloadProgress: number;   // 0..1
  downloadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  error?: string;
};

const EMPTY_STATUS: EngineStatus = {
  state: 'unloaded',
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  bytesPerSecond: 0,
};

type StatusListener = (status: EngineStatus) => void;

let status: EngineStatus = { ...EMPTY_STATUS };
const listeners = new Set<StatusListener>();
let ctx: LlamaContext | null = null;
let downloadTask: FileSystem.DownloadResumable | null = null;

function emit() {
  const snap = { ...status };
  listeners.forEach((cb) => cb(snap));
}

export function getEngineStatus(): EngineStatus {
  return { ...status };
}

export function onStatusChange(cb: StatusListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setState(update: Partial<EngineStatus>) {
  status = { ...status, ...update };
  emit();
}

/** Ensure the models directory exists. */
async function ensureModelsDir() {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

/** Save download pause state so we can resume later. */
async function savePauseState(state: { resumeData?: string; url: string }) {
  await ensureModelsDir();
  await FileSystem.writeAsStringAsync(
    RESUME_PATH,
    JSON.stringify({ resumeData: state.resumeData, url: state.url, savedAt: Date.now() }),
  );
}

/** Load saved resume data if it exists and is not stale (>7 days). */
async function loadResumeData(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(RESUME_PATH);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(RESUME_PATH);
    const parsed = JSON.parse(raw) as { resumeData: string; savedAt: number };
    if (Date.now() - parsed.savedAt > 7 * 86400_000) {
      await FileSystem.deleteAsync(RESUME_PATH, { idempotent: true });
      return null;
    }
    return parsed.resumeData || null;
  } catch {
    return null;
  }
}

async function clearResumeData() {
  await FileSystem.deleteAsync(RESUME_PATH, { idempotent: true });
}

/** Download the GGUF model from HuggingFace with resume support and speed tracking. */
async function downloadModel(): Promise<string> {
  await ensureModelsDir();

  // Already fully downloaded?
  const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
  if (fileInfo.exists && fileInfo.size && fileInfo.size > 1_000_000_000) {
    return MODEL_PATH;
  }

  setState({ state: 'downloading', downloadProgress: 0, downloadedBytes: 0, totalBytes: 0, bytesPerSecond: 0 });

  // Try to resume a previous partial download.
  const resumeData = await loadResumeData();
  let lastBytes = fileInfo.exists ? fileInfo.size ?? 0 : 0;
  let lastTime = Date.now();

  downloadTask = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_PATH,
    {},
    (progress) => {
      const now = Date.now();
      const dt = Math.max((now - lastTime) / 1000, 0.5);
      const db = progress.totalBytesWritten - lastBytes;
      const bps = db / dt;
      lastBytes = progress.totalBytesWritten;
      lastTime = now;

      const pct = progress.totalBytesExpectedToWrite > 0
        ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
        : 0;

      setState({
        downloadProgress: pct,
        downloadedBytes: progress.totalBytesWritten,
        totalBytes: progress.totalBytesExpectedToWrite,
        bytesPerSecond: Math.max(0, bps),
      });
    },
    resumeData ?? undefined,
  );

  try {
    const result = await downloadTask.downloadAsync();
    downloadTask = null;

    if (!result || result.status !== 200) {
      throw new Error(`Download fehlgeschlagen (Status ${result?.status ?? 'unbekannt'})`);
    }

    await clearResumeData();
    setState({ downloadProgress: 1, bytesPerSecond: 0 });
    return MODEL_PATH;
  } catch (e) {
    // Save pause state so we can resume the download later.
    const pstate = downloadTask?.savable();
    downloadTask = null;

    if (pstate) {
      await savePauseState(pstate);
    }

    // Don't delete partial file — we'll resume next time.
    throw e;
  }
}

/** Load the Gemma 4 model into memory and initialize llama.rn. */
export async function loadModel(): Promise<void> {
  if (status.state === 'ready') return;
  if (status.state === 'downloading' || status.state === 'loading') return;

  try {
    const modelPath = await downloadModel();

    setState({ state: 'loading', downloadProgress: 1 });

    ctx = await initLlama(
      {
        model: modelPath,
        n_ctx: N_CTX,
        n_gpu_layers: 99,
        use_mlock: true,
        use_mmap: true,
      },
      (_progress: number) => {
        // Progress callback — intentionally does NOT set state to 'ready'.
        // Native callbacks can fire before the Promise resolves, which would
        // create a window where status.state === 'ready' but ctx is still null.
        // The 'ready' transition happens after ctx is assigned below.
      },
    );

    setState({ state: 'ready' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    setState({ state: 'error', error: message });
    throw e;
  }
}

/** Delete partial download and start fresh. */
export async function resetDownload(): Promise<void> {
  await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
  await clearResumeData();
  setState({ ...EMPTY_STATUS, state: 'unloaded' });
}

// ── Chat formatting ──────────────────────────────────────────────────────────

/**
 * Format messages through the model's Jinja chat template and return the
 * prepared prompt + parser metadata. This MUST be called before completion
 * so llama.cpp knows how to separate thinking (reasoning_content) from the
 * visible reply (content).
 */
async function formatChat(
  messages: Array<{ role: string; content: string }>,
  enableThinking: boolean,
): Promise<JinjaFormattedChatResult> {
  if (!ctx) throw new Error('Modell nicht bereit');

  const result = await ctx.getFormattedChat(messages, null, {
    jinja: true,
    enable_thinking: enableThinking,
    reasoning_format: enableThinking ? 'auto' : 'none',
  });

  if (result.type !== 'jinja') {
    // Fallback: wrap in a Jinja-shaped result so the caller doesn't branch.
    return {
      type: 'jinja',
      prompt: result.prompt,
    } as JinjaFormattedChatResult;
  }

  return result;
}

// ── Completion ───────────────────────────────────────────────────────────────

/** Run a single-turn chat completion (non-streaming, backward-compatible). */
export async function generateResponse(
  messages: Array<{ role: string; content: string }>,
  opts?: { enableThinking?: boolean },
): Promise<{ content: string; reasoning: string }> {
  if (!ctx || status.state !== 'ready') {
    throw new Error('Modell nicht bereit');
  }

  const enableThinking = opts?.enableThinking ?? true;
  const formatted = await formatChat(messages, enableThinking);

  const result = await ctx.completion({
    prompt: formatted.prompt,
    n_predict: N_PREDICT,
    temperature: 0.7,
    top_p: 0.9,
    stop: ['<end_of_turn>', '<eos>'],
    jinja: true,
    enable_thinking: enableThinking,
    reasoning_format: enableThinking ? 'auto' : 'none',
    chat_parser: formatted.chat_parser,
    grammar: formatted.grammar,
    grammar_lazy: formatted.grammar_lazy,
    grammar_triggers: formatted.grammar_triggers,
    generation_prompt: formatted.generation_prompt,
  });

  return {
    content: (result.content || result.text || '').trim(),
    reasoning: (result.reasoning_content || '').trim(),
  };
}

/** Stream a chat completion token-by-token. Calls `onToken` for each
 *  token with separated reasoning_content and content. Returns the full
 *  result when the stream finishes. */
export async function generateResponseStream(
  messages: Array<{ role: string; content: string }>,
  onToken: (data: { reasoning_content?: string; content?: string; token: string }) => void,
  opts?: { enableThinking?: boolean },
): Promise<{ content: string; reasoning: string }> {
  if (!ctx || status.state !== 'ready') {
    throw new Error('Modell nicht bereit');
  }

  const enableThinking = opts?.enableThinking ?? true;
  const formatted = await formatChat(messages, enableThinking);

  const result = await ctx.completion(
    {
      prompt: formatted.prompt,
      n_predict: N_PREDICT,
      temperature: 0.7,
      top_p: 0.9,
      stop: ['<end_of_turn>', '<eos>'],
      jinja: true,
      enable_thinking: enableThinking,
      reasoning_format: enableThinking ? 'auto' : 'none',
      chat_parser: formatted.chat_parser,
      grammar: formatted.grammar,
      grammar_lazy: formatted.grammar_lazy,
      grammar_triggers: formatted.grammar_triggers,
      generation_prompt: formatted.generation_prompt,
    },
    (data) => {
      onToken({
        reasoning_content: data.reasoning_content,
        content: data.content,
        token: data.token,
      });
    },
  );

  return {
    content: (result.content || result.text || '').trim(),
    reasoning: (result.reasoning_content || '').trim(),
  };
}

/** Release the model from memory. */
export async function unloadModel(): Promise<void> {
  if (ctx) {
    await ctx.release();
    ctx = null;
  }
  setState({ ...EMPTY_STATUS, state: 'unloaded' });
}
