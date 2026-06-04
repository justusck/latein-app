import { useLocalSearchParams, useNavigation } from 'expo-router';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { WordGlossPanel } from '@/components/ui/word-panel';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { Lemma } from '@/db/schema';
import { XP_READ_TEXT } from '@/lib/gamification';
import { kvGet, kvSet } from '@/lib/kv';
import {
  addLemmaToVocab,
  getBook,
  getDictFormKeys,
  getKnownFormKeys,
  glossForKey,
} from '@/lib/reading';
import { parseEpub, type EpubChapter } from '@/lib/reading/epub';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';

// ── Build HTML document from EPUB chapters ──────────────────────────────────

function buildHtml(
  chapters: EpubChapter[],
  isDark: boolean,
  knownKeys: string[],
  dictKeys: string[],
): string {
  const bg = isDark ? '#0E0A0D' : '#F4ECDA';
  const ink = isDark ? '#F5EEF3' : '#2B2218';
  const knownJson = JSON.stringify(knownKeys);
  const dictJson = JSON.stringify(dictKeys);

  const chapterSections = chapters.map((ch) => ch.html).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 20px;
    line-height: 1.7;
    background: ${bg};
    color: ${ink};
    padding: 16px;
    -webkit-text-size-adjust: 100%;
  }
  p { margin-bottom: 1em; }
  /* Word highlighting */
  .word-known { color: ${ink}; }
  .word-dict { color: #B33C2D; font-weight: 700; text-decoration: underline; }
  .word-unknown { color: ${isDark ? '#8B7D8A' : '#7A6E6A'}; }
  .word-tapped { background: rgba(179,60,45,0.12); border-radius: 3px; }
</style>
</head>
<body>
${chapterSections}
<script>
  var KNOWN = new Set(${knownJson});
  var DICT = new Set(${dictJson});

  function normalizeLatin(w) {
    return w.toLowerCase()
      .replace(/[āĀ]/g,'a').replace(/[ēĒ]/g,'e').replace(/[īĪ]/g,'i').replace(/[ōŌ]/g,'o').replace(/[ūŪ]/g,'u')
      .replace(/[âÂ]/g,'a').replace(/[êÊ]/g,'e').replace(/[îÎ]/g,'i').replace(/[ôÔ]/g,'o').replace(/[ûÛ]/g,'u')
      .replace(/[^a-zü]/g,'').replace(/v/g,'u').replace(/j/g,'i');
  }

  function wrapWords(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (var i = 0; i < texts.length; i++) {
      var node = texts[i];
      var html = node.textContent.replace(
        /([A-Za-zÀ-ʯĀ-ſḀ-ỿ]+)/g,
        function(word) {
          var key = normalizeLatin(word);
          var cls = KNOWN.has(key) ? 'word-known' : DICT.has(key) ? 'word-dict' : 'word-unknown';
          return '<span class="' + cls + '" data-word="1" data-raw="' + word + '" data-key="' + key + '">' + word + '</span>';
        }
      );
      if (html !== node.textContent) {
        var span = document.createElement('span');
        span.innerHTML = html;
        node.parentNode.replaceChild(span, node);
      }
    }
  }
  wrapWords(document.body);

  // Word tap detection
  var tappedEl = null;
  document.body.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.dataset && el.dataset.word) { break; }
      el = el.parentElement;
    }
    if (!el || !el.dataset || !el.dataset.word) return;
    if (tappedEl) tappedEl.classList.remove('word-tapped');
    tappedEl = el;
    el.classList.add('word-tapped');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'word', raw: el.dataset.raw, key: el.dataset.key }));
  });

  // Scroll position — save periodically, restore on load
  var lastSaved = 0;
  window.addEventListener('scroll', function() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (Math.abs(y - lastSaved) > 60) {
      lastSaved = y;
      try { localStorage.setItem('scrollPos', y); } catch(e) {}
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', y: y }));
    }
  }, { passive: true });

  // Restore saved position
  var saved = localStorage.getItem('scrollPos');
  if (saved) {
    setTimeout(function() { window.scrollTo(0, parseInt(saved, 10)); }, 80);
  }
  // Also listen for RN to tell us the position
  window.restoreScroll = function(y) { window.scrollTo(0, y); };

</script>
</body>
</html>`;
}

// ── Reader Component ────────────────────────────────────────────────────────

export default function Reader() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pronunciation, awardXp, registerActivity } = useApp();

  const book = useMemo(() => (id ? getBook(id) : null), [id]);
  const savedScroll = useMemo(() => (id ? kvGet(`scroll:${id}`) : null), [id]);

  // ── EPUB: parse file → build HTML with injected word spans ───────────────
  const isEpub = !!book?.filePath;
  const [chapters, setChapters] = useState<EpubChapter[] | null>(null);
  const [htmlDoc, setHtmlDoc] = useState('');
  const [loading, setLoading] = useState(isEpub);
  const [knownKeys] = useState(() => ({
    known: getKnownFormKeys(),
    dict: getDictFormKeys(),
  }));

  useEffect(() => {
    if (!isEpub || !book?.filePath) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const b64 = await readAsStringAsync(book.filePath!, { encoding: 'base64' });
        if (cancelled) return;
        const bytes = base64ToUint8Array(b64);
        const epub = parseEpub(bytes);
        if (cancelled) return;
        setChapters(epub.chapters);
        const html = buildHtml(
          epub.chapters,
          isDark,
          [...knownKeys.known],
          [...knownKeys.dict],
        );
        if (!cancelled) {
          setHtmlDoc(html);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setChapters([]); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isEpub, book?.filePath]);

  const hasChapters = chapters && chapters.length > 0;
  const webViewRef = useRef<WebView>(null);
  const txtScrollRef = useRef<ScrollView>(null);

  // ── TXT scroll tracking ─────────────────────────────────────────────────
  const txtScrollY = useRef(0);
  const onTxtScroll = useCallback((e: any) => {
    txtScrollY.current = e.nativeEvent.contentOffset.y;
  }, []);
  const onTxtScrollEnd = useCallback(() => {
    if (id) kvSet(`scroll:${id}`, String(txtScrollY.current));
  }, [id]);

  // Restore TXT scroll position
  useEffect(() => {
    if (!isEpub && savedScroll && txtScrollRef.current) {
      const t = setTimeout(() => {
        txtScrollRef.current?.scrollTo({ y: Number(savedScroll), animated: false });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isEpub, savedScroll]);

  // ── Word gloss ───────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<{ raw: string; key: string; lemma: Lemma | null } | null>(null);
  const [added, setAdded] = useState(false);
  const [read, setRead] = useState(() => (id ? kvGet(`read:${id}`) === '1' : false));

  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(30)).current;
  const prevSelected = useRef<typeof selected>(null);

  useEffect(() => {
    if (selected && !prevSelected.current) {
      Animated.parallel([
        Animated.timing(panelOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(panelTranslateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (!selected && prevSelected.current) {
      Animated.parallel([
        Animated.timing(panelOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(panelTranslateY, { toValue: 30, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    prevSelected.current = selected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useLayoutEffect(() => {
    if (book) navigation.setOptions({ title: book.title });
  }, [navigation, book]);

  const onWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'word' && data.key) {
        const lemma = glossForKey(data.key);
        setSelected({ raw: data.raw, key: data.key, lemma });
        setAdded(false);
        speakLatin(data.raw, pronunciation);
      } else if (data.type === 'scroll' && id) {
        kvSet(`scroll:${id}`, String(data.y));
      }
    } catch { /* ignore malformed messages */ }
  }, [pronunciation, id]);

  // Restore scroll position once the WebView is loaded
  const onWebViewLoad = useCallback(() => {
    if (savedScroll && webViewRef.current) {
      webViewRef.current.injectJavaScript(`restoreScroll(${savedScroll}); true;`);
    }
  }, [savedScroll]);

  // ── Theme ────────────────────────────────────────────────────────────────
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? theme.background : '#F4ECDA';
  const ink = isDark ? theme.text : '#2B2218';
  const serif = 'Georgia';

  if (!book) {
    return (
      <View style={[styles.fill, { backgroundColor: bg }]}>
        <Text style={{ color: ink, padding: Spacing.three }}>Text nicht gefunden.</Text>
      </View>
    );
  }

  const markRead = () => {
    if (read) return;
    awardXp(XP_READ_TEXT);
    registerActivity();
    kvSet(`read:${id}`, '1');
    setRead(true);
  };

  // Dark mode: inject CSS variables into WebView without reload
  useEffect(() => {
    if (!hasChapters || !webViewRef.current) return;
    const bg = isDark ? '#0E0A0D' : '#F4ECDA';
    const ink = isDark ? '#F5EEF3' : '#2B2218';
    webViewRef.current.injectJavaScript(`
      document.body.style.background = '${bg}';
      document.body.style.color = '${ink}';
      var hrs = document.querySelectorAll('hr');
      for (var i = 0; i < hrs.length; i++) {
        hrs[i].style.borderColor = '${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(43,34,24,0.15)'}';
      }
      true;
    `);
  }, [isDark, hasChapters]);

  return (
    <View style={[styles.fill, { backgroundColor: bg }]}>

      {/* ── EPUB: WebView ── */}
      {isEpub && htmlDoc ? (
        <WebView
          ref={webViewRef}
          source={{ html: htmlDoc }}
          onMessage={onWebViewMessage}
          onLoad={onWebViewLoad}
          style={styles.fill}
          scrollEnabled
          javaScriptEnabled
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
        />
      ) : isEpub && loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: serif }]}>
            Text wird geladen…
          </Text>
        </View>
      ) : null}

      {/* ── TXT: plain text (fallback for non-EPUB books) ── */}
      {!isEpub && (
        <ScrollView
          ref={txtScrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={onTxtScroll}
          scrollEventThrottle={100}
          onScrollEndDrag={onTxtScrollEnd}
          onMomentumScrollEnd={onTxtScrollEnd}
        >
          <Text style={[styles.bodyText, { color: ink, fontFamily: serif }]}>{book.body}</Text>

          <View style={styles.legend}>
            <Legend color={ink} label="gelernt" labelColor={ink} />
            <Legend color={theme.primary} label="antippen zum Lernen" labelColor={ink} />
            <Legend color={theme.textSecondary} label="nicht im Wörterbuch" labelColor={ink} />
          </View>

          <Button title={read ? 'Gelesen ✓' : 'Als gelesen markieren'} onPress={markRead} disabled={read} />
        </ScrollView>
      )}

      {/* ── Word gloss panel ── */}
      {selected && (
        <Animated.View style={[styles.panel, { opacity: panelOpacity, transform: [{ translateY: panelTranslateY }] }]}>
          <WordGlossPanel
            raw={selected.raw}
            lemma={selected.lemma}
            theme={theme}
            onClose={() => setSelected(null)}
            onSpeak={(w) => speakLatin(w, pronunciation)}
            onAddToVocab={selected.lemma ? () => { addLemmaToVocab(selected.lemma!.id); setAdded(true); } : undefined}
            added={added}
            containerStyle={styles.panelCard}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Legend({ color, label, labelColor }: { color: string; label: string; labelColor: string }) {
  return (
    <View style={styles.legItem}>
      <View style={[styles.legDot, { backgroundColor: color }]} />
      <Text style={[styles.legLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>{title}</Text>
    </Pressable>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { padding: Spacing.three, paddingBottom: 80 },
  bodyText: { fontSize: 22, lineHeight: 38 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  loadingText: { fontSize: 16, fontStyle: 'italic' },

  legend: { gap: 6, marginTop: Spacing.three },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legDot: { width: 12, height: 12, borderRadius: 6 },
  legLabel: { fontSize: 13 },

  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: Radius.pill, backgroundColor: '#B33C2D', alignItems: 'center' },
  btnDisabled: { backgroundColor: 'rgba(179,60,45,0.3)' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextDisabled: { opacity: 0.5 },

  panel: { position: 'absolute', left: Spacing.three, right: Spacing.three, bottom: Spacing.four, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  panelCard: { borderRadius: Radius.lg },
});
