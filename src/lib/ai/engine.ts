import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, type LlamaContext } from 'llama.rn';

/** Gemma 4 E2B in GGUF format (Q4_K_M quantized, ~2.6 GB).
 *  Source: HuggingFace — switch repo/filename to use a different model. */
const MODEL_REPO = 'unsloth/gemma-4-E2B-it-GGUF';
const MODEL_FILENAME = 'gemma-4-E2B-it-Q4_K_M.gguf';
const MODEL_URL = `https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILENAME}`;

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODELS_DIR}${MODEL_FILENAME}`;

/** Context window size — keep conservative for mobile. */
const N_CTX = 4096;
const N_PREDICT = 1024;

export type EngineState = 'unloaded' | 'downloading' | 'loading' | 'ready' | 'error';

export type EngineStatus = {
  state: EngineState;
  downloadProgress: number; // 0..1
  error?: string;
};

type StatusListener = (status: EngineStatus) => void;

let status: EngineStatus = { state: 'unloaded', downloadProgress: 0 };
const listeners = new Set<StatusListener>();
let ctx: LlamaContext | null = null;

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

/** Download the GGUF model from HuggingFace with progress tracking. */
async function downloadModel(): Promise<string> {
  await ensureModelsDir();

  const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
  if (fileInfo.exists && fileInfo.size && fileInfo.size > 1_000_000_000) {
    // Model already downloaded — skip re-download.
    return MODEL_PATH;
  }

  setState({ state: 'downloading', downloadProgress: 0 });

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_PATH,
    {},
    (progress) => {
      const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
      setState({ downloadProgress: pct });
    },
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      throw new Error(`Download fehlgeschlagen (Status ${result?.status ?? 'unbekannt'})`);
    }
    setState({ downloadProgress: 1 });
    return MODEL_PATH;
  } catch (e) {
    // Clean up partial download
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
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
        n_gpu_layers: 99,               // offload all layers to GPU if available
        use_mlock: true,
        use_mmap: true,
      },
      (progress: number) => {
        // Loading progress from llama.rn (0-100).
        if (progress >= 100) {
          setState({ state: 'ready' });
        }
      },
    );

    setState({ state: 'ready' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    setState({ state: 'error', error: message });
    throw e;
  }
}

/** Run a single-turn chat completion.
 *  `messages` follows OpenAI format: [{ role: 'system'|'user'|'assistant', content }]. */
export async function generateResponse(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  if (!ctx || status.state !== 'ready') {
    throw new Error('Modell nicht bereit');
  }

  const result = await ctx.completion({
    messages,
    n_predict: N_PREDICT,
    temperature: 0.7,
    top_p: 0.9,
    stop: ['<end_of_turn>', '<eos>'],
  });

  // result.content contains the parsed content (excluding reasoning/tool calls).
  return (result.content || result.text || '').trim();
}

/** Release the model from memory. Call when the app goes to background. */
export async function unloadModel(): Promise<void> {
  if (ctx) {
    await ctx.release();
    ctx = null;
  }
  setState({ state: 'unloaded', downloadProgress: 0 });
}
