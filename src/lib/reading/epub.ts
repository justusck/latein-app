import { unzipSync } from 'fflate';

// ── Types ───────────────────────────────────────────────────────────────────

export type EpubChapter = {
  title: string;
  body: string; // plain text (for coverage computation)
  html: string; // original XHTML body content (for WebView rendering)
};

export type EpubData = {
  title: string;
  author: string;
  chapters: EpubChapter[];
  /** Convenience: all chapters concatenated with double-newline separators. */
  body: string;
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse an EPUB file (ZIP-compressed) into structured chapter data.
 *
 * Accepts a Uint8Array of the raw file bytes — read via expo-file-system's
 * `readAsStringAsync(uri, { encoding: 'base64' })` and decoded with `atob`.
 */
export function parseEpub(bytes: Uint8Array): EpubData {
  const archive = unzipToMap(bytes);

  // 1. Locate the rootfile path via META-INF/container.xml
  const containerXml = archive.get('META-INF/container.xml');
  if (!containerXml) throw new Error('Kein container.xml — keine gültige EPUB-Datei');

  const rootfilePath = extractRootfile(new TextDecoder().decode(containerXml));
  if (!rootfilePath) throw new Error('rootfile nicht gefunden in container.xml');

  // 2. Parse the OPF file for metadata + spine
  const opfXml = archive.get(rootfilePath);
  if (!opfXml) throw new Error(`OPF-Datei „${rootfilePath}“ fehlt im Archiv`);

  const opfText = new TextDecoder().decode(opfXml);
  const { title, author, spine } = parseOpf(opfText);

  // The OPF lives in a subdirectory; resolve relative spine paths against it.
  const opfDir = rootfilePath.includes('/') ? rootfilePath.replace(/\/[^/]+$/, '') + '/' : '';

  // 3. Extract plain text + XHTML from each spine item
  const chapters: EpubChapter[] = [];
  for (const href of spine) {
    const cleanHref = href.replace(/#.*$/, '');
    const fullPath = resolvePath(opfDir, cleanHref);
    const xhtmlBytes = archive.get(fullPath);
    if (!xhtmlBytes) continue;

    const xhtml = new TextDecoder().decode(xhtmlBytes);
    const body = xhtmlToPlainText(xhtml);
    if (!body.trim()) continue;

    const title = extractChapterTitle(xhtml) || `Kapitel ${chapters.length + 1}`;
    const html = extractBodyHtml(xhtml);
    chapters.push({ title, body, html });
  }

  // Fallback: scan all .xhtml/.html files
  if (chapters.length === 0) {
    for (const [path, data] of archive) {
      if (/\.(x?html|htm)$/i.test(path)) {
        const xhtml = new TextDecoder().decode(data);
        const body = xhtmlToPlainText(xhtml);
        if (!body.trim()) continue;
        const title = extractChapterTitle(xhtml) || path.replace(/^.*[/\\]/, '').replace(/\.\w+$/, '');
        const html = extractBodyHtml(xhtml);
        chapters.push({ title, body, html });
      }
    }
  }

  if (chapters.length === 0) {
    throw new Error('Keine lesbaren Kapitel in der EPUB-Datei gefunden.');
  }

  const fullBody = chapters.map((c) => c.body).join('\n\n');
  return { title: title || 'Ohne Titel', author: author || 'Unbekannt', chapters, body: fullBody };
}

// ── Archive helpers ─────────────────────────────────────────────────────────

function unzipToMap(bytes: Uint8Array): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>();
  const unzipped = unzipSync(bytes);
  for (const [path, file] of Object.entries(unzipped)) {
    // fflate represents directories as empty objects; skip them.
    if (file instanceof Uint8Array && file.length > 0) {
      map.set(path, file);
    }
  }
  return map;
}

/** Resolve a relative path against the OPF directory. Handles `..` segments. */
function resolvePath(baseDir: string, href: string): string {
  // Absolute paths inside EPUBs are relative to the archive root.
  if (href.startsWith('/')) return href.slice(1);
  const parts = baseDir.split('/').filter(Boolean);
  for (const seg of href.split('/')) {
    if (seg === '..') { parts.pop(); } else if (seg !== '.') { parts.push(seg); }
  }
  return parts.join('/');
}

// ── XML helpers (no DOM parser available in RN) ─────────────────────────────

function extractRootfile(xml: string): string | null {
  // Match <rootfile full-path="..." media-type="application/oebps-package+xml"/>
  const m = xml.match(/<rootfile[^>]*full-path\s*=\s*["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function parseOpf(xml: string): { title: string; author: string; spine: string[] } {
  // Strip namespace prefixes for simpler matching
  const clean = xml.replace(/<\w+:/g, '<').replace(/<\/\w+:/g, '</');

  // Title
  let title = '';
  const titleM = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleM) title = decodeEntities(titleM[1].trim());

  // Author — try dc:creator first, then various author patterns
  let author = '';
  const creatorM = clean.match(/<creator[^>]*>([\s\S]*?)<\/creator>/i);
  if (creatorM) author = decodeEntities(creatorM[1].trim());

  // Spine — collect itemref idrefs in order
  const spine: string[] = [];
  const spineM = clean.match(/<spine[^>]*>([\s\S]*?)<\/spine>/i);
  if (spineM) {
    const idrefs = spineM[1].matchAll(/<itemref[^>]*idref\s*=\s*["']([^"']+)["']/gi);
    for (const m of idrefs) {
      const idref = m[1];
      // Look up the corresponding item href in the manifest
      const itemRe = new RegExp(`<item[^>]*id\\s*=\\s*["']${escapeRe(idref)}["'][^>]*href\\s*=\\s*["']([^"']+)["']`, 'i');
      const itemM = clean.match(itemRe);
      if (itemM) {
        spine.push(decodeEntities(itemM[1]));
      }
    }
  }

  return { title, author, spine };
}

/** Extract a heading from XHTML for use as a chapter title. */
function extractChapterTitle(xhtml: string): string | null {
  // Try <h1>–<h3> first (actual chapter headings), then fall back to <title>
  // (which often contains the book title, not the chapter title).
  for (const tag of ['h1', 'h2', 'h3']) {
    const m = xhtml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (m) {
      const t = decodeEntities(stripTags(m[1].trim()));
      if (t) return t;
    }
  }
  const titleM = xhtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleM) {
    const t = decodeEntities(stripTags(titleM[1].trim()));
    if (t) return t;
  }
  return null;
}

// ── HTML extraction ────────────────────────────────────────────────────────

/** Extract the inner content of <body>…</body>, preserving HTML formatting. */
function extractBodyHtml(html: string): string {
  const bodyM = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyM) return bodyM[1].trim();
  // Fallback: strip <head> and return the rest
  return html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '').replace(/<html[^>]*>|<\/html>/gi, '').trim();
}

function xhtmlToPlainText(html: string): string {
  // Remove <head>…</head>
  let text = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // Collapse <p>, <br>, <div>, <li>, <h1>-<h6> into newlines
  text = text.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, ''); // remaining opening tags

  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode entities
  text = decodeEntities(text);

  // Normalise whitespace: collapse runs of spaces/tabs into single space,
  // collapse 3+ newlines into 2, trim leading/trailing whitespace per line.
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ''));
}

// ── Entity decoding ─────────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', shy: '', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»',
  Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü',
  auml: 'ä', ouml: 'ö', uuml: 'ü',
  szlig: 'ß', // ß
  Aelig: 'Æ', aelig: 'æ',
  OElig: 'Œ', oelig: 'œ',
  // Latin macrons (common in EPUBs with Latin text)
  Amacr: 'Ā', amacr: 'ā',
  Emacr: 'Ē', emacr: 'ē',
  Imacr: 'Ī', imacr: 'ī',
  Omacr: 'Ō', omacr: 'ō',
  Umacr: 'Ū', umacr: 'ū',
  // Acute accents
  Aacute: 'Á', aacute: 'á',
  Eacute: 'É', eacute: 'é',
  Iacute: 'Í', iacute: 'í',
  Oacute: 'Ó', oacute: 'ó',
  Uacute: 'Ú', uacute: 'ú',
  // Grave accents
  Agrave: 'À', agrave: 'à',
  Egrave: 'È', egrave: 'è',
  Igrave: 'Ì', igrave: 'ì',
  Ograve: 'Ò', ograve: 'ò',
  Ugrave: 'Ù', ugrave: 'ù',
  // Circumflex
  Acirc: 'Â', acirc: 'â',
  Ecirc: 'Ê', ecirc: 'ê',
  Icirc: 'Î', icirc: 'î',
  Ocirc: 'Ô', ocirc: 'ô',
  Ucirc: 'Û', ucirc: 'û',
};

function decodeEntities(text: string): string {
  // Hex numeric: &#xNNN;
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  // Decimal numeric: &#NNN;
  text = text.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  // Named entities
  text = text.replace(/&([a-zA-Z]+);/g, (m, name) => {
    const c = ENTITY_MAP[name];
    return c !== undefined ? c : m;
  });
  return text;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
