import { Directory, File, Paths } from 'expo-file-system';

import { kvGetNum, kvSet } from '@/lib/kv';
import { normalizeLatin } from '@/lib/latin/normalize';
import { getDictFormKeys } from '@/lib/reading';
import type { EpubChapter } from '@/lib/reading/epub';

/**
 * Pre-built reader HTML cache.
 *
 * Opening a book used to mean: read the EPUB as base64, decode it byte by
 * byte, unzip + parse it, serialize the ENTIRE dictionary (~7k forms) as JSON
 * into the HTML, then walk every text node of the whole book inside the
 * WebView to wrap each word in a classified <span> — on every single open.
 *
 * Now the wrapping + dictionary classification happens ONCE in RN (pure
 * string processing, no DOM), the finished document is written to a cache
 * file, and the WebView loads that file directly. Only the small set of
 * *known* word forms is applied at runtime; dictionary membership only
 * changes on import/delete, which bumps `dictRev` and thereby invalidates
 * the cache.
 *
 * The document is a SCROLLABLE reader. Word taps report back to RN.
 * Scroll progress is tracked and restored on re-open.
 */

const DICT_REV_KEY = 'dictRev';

export function getDictRev(): number {
  return kvGetNum(DICT_REV_KEY, 0);
}

/** Call whenever word_forms membership changes (imports, deletions, re-seed). */
export function bumpDictRev(): void {
  kvSet(DICT_REV_KEY, String(getDictRev() + 1));
  try {
    const dir = cacheDir();
    if (dir.exists) dir.delete(); // stale classification → drop every cached book
  } catch {
    /* best effort */
  }
}

function cacheDir(): Directory {
  return new Directory(Paths.cache, 'reader-html');
}

function sanitizeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

/** Bump when the document shell (CSS/scroll JS) changes shape. */
const SHELL_VERSION = 10;

/**
 * dictRev + shell version are both part of the filename, so stale files
 * are never hit — no manual invalidation needed.
 */
function cacheFile(bookId: string): File {
  return new File(cacheDir(), `${sanitizeId(bookId)}-d${getDictRev()}-s${SHELL_VERSION}.html`);
}

/** file:// URI of the prepared document, or null when not built yet. */
export function getCachedReaderHtmlUri(bookId: string): string | null {
  try {
    const f = cacheFile(bookId);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

export function dropCachedReaderHtml(bookId: string): void {
  try {
    const f = cacheFile(bookId);
    if (f.exists) f.delete();
  } catch {
    /* best effort */
  }
}

// ── Word wrapping (string-based — no DOM, no WebView round trip) ────────────

const WORD_RE = /[A-Za-zÀ-ʯĀ-ſḀ-ỿ]+/g;

/**
 * Wrap every word of an HTML fragment in a span carrying its normalized key
 * and dictionary class: `w d` (in dictionary, tap to learn) or `w u`
 * (unknown). Known words get re-classed `w k` at runtime via __applyKnown.
 */
function wrapHtmlFragment(html: string, dict: Set<string>): string {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const parts = clean.split(/(<[^>]*>)/g);
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg || seg.charCodeAt(0) === 60 /* '<' — tag, leave untouched */) continue;
    parts[i] = seg.replace(WORD_RE, (word) => {
      const key = normalizeLatin(word);
      if (!key) return word;
      const cls = dict.has(key) ? 'w d' : 'w u';
      return `<span class="${cls}" data-k="${key}">${word}</span>`;
    });
  }
  return parts.join('');
}

// ── Document shell (scrollable reader) ────────────────────────────────────────

/**
 * Scrollable reader layout.
 *
 * The entire book is a single scrollable document. No pagination, no tap
 * zones — just native vertical scrolling. Word taps are recognised via
 * delegated click on #book. Scroll progress is reported back to RN via
 * postMessage and restored on re-open via __restoreScroll.
 */
function docShell(sections: string): string {
  return `<!DOCTYPE html>
<html class="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; min-height: 100%;
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
  }
  html.light body { background: #F4ECDA; }
  html.dark  body { background: #0E0A0D; }

  #book {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(17px, 2.3vw, 22px);
    line-height: 1.55;
    padding: 4.5vh 4vw 12vh 4vw;
    width: 100%;
    overflow-wrap: break-word;
    overflow-x: hidden;
  }
  html.light #book { color: #2B2218; }
  html.dark  #book { color: #F5EEF3; }

  #book p  { margin-bottom: 0.65em; orphans: 2; widows: 2; }
  #book section.ch + section.ch { margin-top: 1.3em; }

  section.ch + section.ch::before {
    content: '⁘'; display: block; text-align: center;
    margin-bottom: 1.2em; letter-spacing: .4em;
  }
  html.light section.ch + section.ch::before { color: rgba(43,34,24,.3); }
  html.dark  section.ch + section.ch::before { color: rgba(245,238,243,.25); }

  hr { border: none; border-top: 1px solid rgba(128,128,128,.18); margin: .8em 0; }
  img { max-width: 100%; height: auto; }

  .w.d { color: #B33C2D; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
  html.dark .w.d { color: #E0705B; }
  html.light .w.u { color: #7A6E6A; }
  html.dark  .w.u { color: #8B7D8A; }
  .w.k { color: inherit; font-weight: inherit; text-decoration: none; }
  .w.tapped { background: rgba(179,60,45,.15); border-radius: 2px; }
</style>
</head>
<body>
<div id="book">${sections}</div>

<script>
(function () {
  var tapped = null;

  // ── scroll progress ────────────────────────────────────────────
  function reportProgress() {
    var docH = document.body.scrollHeight;
    var winH = window.innerHeight;
    var pct = docH > winH ? Math.round((window.scrollY / (docH - winH)) * 100) : 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    var api = window.ReactNativeWebView;
    api && api.postMessage(JSON.stringify({ type: 'scroll', pct: pct }));
  }

  var rt;
  window.addEventListener('scroll', function () {
    clearTimeout(rt);
    rt = setTimeout(reportProgress, 150);
  }, { passive: true });

  // ── word tap ──────────────────────────────────────────────────
  document.getElementById('book').addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document.body) { if (el.dataset && el.dataset.k !== void 0) break; el = el.parentElement; }
    if (!el || !el.dataset || el.dataset.k === void 0) return;
    if (tapped) tapped.classList.remove('tapped');
    tapped = el; el.classList.add('tapped');
    var api = window.ReactNativeWebView;
    api && api.postMessage(JSON.stringify({ type: 'word', raw: el.textContent, key: el.dataset.k }));
  });

  // ── resize ─────────────────────────────────────────────────────
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(reportProgress, 150); });

  // ── runtime API ────────────────────────────────────────────────
  window.__setTheme   = function (t) { document.documentElement.className = t; };
  window.__applyKnown = function (keys) {
    var s = new Set(keys);
    var els = document.querySelectorAll('.w.d');
    for (var i = 0; i < els.length; i++) { if (s.has(els[i].dataset.k)) { els[i].classList.remove('d'); els[i].classList.add('k'); } }
  };
  window.__restoreScroll = function (pct) {
    requestAnimationFrame(function () {
      var docH = document.body.scrollHeight;
      var winH = window.innerHeight;
      if (docH > winH) {
        window.scrollTo(0, (pct / 100) * (docH - winH));
      }
    });
  };

  // ── init ───────────────────────────────────────────────────────
  reportProgress();
})();
</script>
</body>
</html>`;
}

// ── Build + persist ─────────────────────────────────────────────────────────

export type BuiltReaderHtml = {
  /** file:// URI when the cache write succeeded, else null. */
  uri: string | null;
  /** Always set — inline fallback if the file could not be written. */
  html: string;
};

/**
 * Build the fully wrapped + classified document for a book and persist it.
 * Yields to the event loop between chapters so progress UI keeps painting.
 */
export async function buildReaderHtml(
  bookId: string,
  chapters: EpubChapter[],
  onProgress?: (done: number, total: number) => void,
): Promise<BuiltReaderHtml> {
  const dict = getDictFormKeys();
  const sections: string[] = [];
  for (let i = 0; i < chapters.length; i++) {
    sections.push(`<section class="ch">\n${wrapHtmlFragment(chapters[i].html, dict)}\n</section>`);
    onProgress?.(i + 1, chapters.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  const html = docShell(sections.join('\n'));

  let uri: string | null = null;
  try {
    const dir = cacheDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const f = cacheFile(bookId);
    f.write(html);
    uri = f.uri;
  } catch {
    uri = null; // fall back to inline html
  }
  return { uri, html };
}
