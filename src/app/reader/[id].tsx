import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { WordGlossPanel } from '@/components/ui/word-panel';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { Lemma } from '@/db/schema';
import { XP_READ_TEXT } from '@/lib/gamification';
import { kvGet, kvSet } from '@/lib/kv';
import {
  addLemmaToVocab,
  getBook,
  getKnownFormKeys,
  glossForKey,
} from '@/lib/reading';
import { parseEpub } from '@/lib/reading/epub';
import {
  buildReaderHtml,
  getCachedReaderHtmlUri,
} from '@/lib/reading/html-cache';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';

/**
 * EPUB scrollable reader (v3).
 *
 * The HTML document is a single scrollable page. Word taps are recognised
 * via delegated click. Scroll progress is stored in KV and restored on
 * re-open. A thin progress bar at the bottom shows reading progress.
 */

const PROGRESS_KV_PREFIX = 'reader-progress:';

export default function Reader() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pronunciation, awardXp, registerActivity, bumpVocabRev } = useApp();

  const book = useMemo(() => (id ? getBook(id) : null), [id]);

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // ── EPUB source ────────────────────────────────────────────────────────────
  const isEpub = !!book?.filePath;
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [inlineHtml, setInlineHtml] = useState('');
  const [loading, setLoading] = useState(isEpub);
  const [prepProgress, setPrepProgress] = useState<{ done: number; total: number } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isEpub || !book?.filePath || !id) return;
    let cancelled = false;

    const cached = getCachedReaderHtmlUri(id);
    if (cached) {
      setSourceUri(cached);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const bytes = await new File(book.filePath!).bytes();
        if (cancelled) return;
        const epub = parseEpub(bytes);
        if (cancelled) return;
        const built = await buildReaderHtml(id, epub.chapters, (done, total) => {
          if (!cancelled) setPrepProgress({ done, total });
        });
        if (cancelled) return;
        if (built.uri) setSourceUri(built.uri);
        else setInlineHtml(built.html);
        setLoading(false);
      } catch {
        if (!cancelled) { setLoadError(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [isEpub, book?.filePath, id]);

  const webViewRef = useRef<WebView>(null);

  // ── Scroll progress state ──────────────────────────────────────────────────
  const [scrollPct, setScrollPct] = useState<number | null>(null);
  const savedProgress = useMemo(() => {
    if (!id) return null;
    const v = kvGet(PROGRESS_KV_PREFIX + id);
    return v ? Number(v) : null;
  }, [id]);

  // ── Runtime injection: theme, known words, saved scroll position ──────────
  const applyRuntimeState = useCallback(() => {
    if (!webViewRef.current) return;
    const known = JSON.stringify([...getKnownFormKeys()]);
    const progress = savedProgress ?? 0;
    webViewRef.current.injectJavaScript(`
      try {
        window.__setTheme(${JSON.stringify(isDark ? 'dark' : 'light')});
        window.__applyKnown(${known});
        ${progress > 0 ? `window.__restoreScroll(${progress});` : ''}
      } catch (e) {}
      true;
    `);
  }, [isDark, savedProgress]);

  // Theme switch without reload
  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `try { window.__setTheme(${JSON.stringify(isDark ? 'dark' : 'light')}); } catch (e) {} true;`,
    );
  }, [isDark]);

  // ── Plain text fallback (builtin seed books) ───────────────────────────────
  const txtScrollRef = useRef<ScrollView>(null);
  const txtSavedScroll = useMemo(() => (id ? kvGet(`scroll:${id}`) : null), [id]);
  const txtScrollY = useRef(0);
  const onTxtScroll = useCallback((e: any) => { txtScrollY.current = e.nativeEvent.contentOffset.y; }, []);
  const onTxtScrollEnd = useCallback(() => {
    if (id) kvSet(`scroll:${id}`, String(txtScrollY.current));
  }, [id]);

  useEffect(() => {
    if (!isEpub && txtSavedScroll && txtScrollRef.current) {
      const t = setTimeout(() => {
        txtScrollRef.current?.scrollTo({ y: Number(txtSavedScroll), animated: false });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isEpub, txtSavedScroll]);

  // ── Word gloss ─────────────────────────────────────────────────────────────
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

  // ── WebView message handler ────────────────────────────────────────────────
  const onWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'word' && data.key) {
        const lemma = glossForKey(data.key);
        setSelected({ raw: data.raw, key: data.key, lemma });
        setAdded(false);
        speakLatin(data.raw, pronunciation);
      } else if (data.type === 'scroll' && id) {
        const pct = Number(data.pct);
        setScrollPct(pct);
        kvSet(PROGRESS_KV_PREFIX + id, String(pct));
        // Mark as read when scrolled near the bottom
        if (pct >= 95 && !read) {
          awardXp(XP_READ_TEXT);
          registerActivity();
          kvSet(`read:${id}`, '1');
          setRead(true);
        }
      }
    } catch { /* ignore */ }
  }, [pronunciation, id, read, awardXp, registerActivity]);

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

  const webViewSource = sourceUri ? { uri: sourceUri } : inlineHtml ? { html: inlineHtml } : null;
  const progressPct = scrollPct !== null ? scrollPct / 100 : 0;

  const markRead = () => {
    if (read) return;
    awardXp(XP_READ_TEXT);
    registerActivity();
    kvSet(`read:${id}`, '1');
    setRead(true);
  };

  return (
    <View style={[styles.fill, { backgroundColor: bg }]}>

      {/* ── EPUB: scrollable WebView ── */}
      {isEpub && webViewSource ? (
        <View style={styles.fill}>
          <WebView
            ref={webViewRef}
            source={webViewSource}
            onMessage={onWebViewMessage}
            onLoadEnd={applyRuntimeState}
            style={[styles.fill, { backgroundColor: bg }]}
            scrollEnabled={true}
            javaScriptEnabled
            allowFileAccess
            allowingReadAccessToURL={sourceUri ?? undefined}
            showsVerticalScrollIndicator={false}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            overScrollMode="never"
            bounces={false}
          />

          {/* ── Scroll progress bar ────────────────────────────────────── */}
          {scrollPct !== null && (
            <View style={styles.pageBar}>
              <View style={[styles.pageTrack, { backgroundColor: theme.border + '44' }]}>
                <View style={[styles.pageFill, { width: `${progressPct * 100}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.pageLabel, { color: theme.textSecondary }]}>
                {scrollPct} %
              </Text>
            </View>
          )}
        </View>
      ) : isEpub && loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: serif }]}>
            {prepProgress
              ? `Text wird vorbereitet … ${prepProgress.done}/${prepProgress.total}`
              : 'Text wird geladen…'}
          </Text>
          {prepProgress && (
            <Text style={[styles.loadingHint, { color: theme.textSecondary }]}>
              Nur beim ersten Öffnen — danach startet das Buch sofort.
            </Text>
          )}
        </View>
      ) : isEpub && loadError ? (
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: serif }]}>
            Die EPUB-Datei konnte nicht gelesen werden.
          </Text>
        </View>
      ) : null}

      {/* ── Plain text (builtin seed books without EPUB file) ── */}
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
            onAddToVocab={
              selected.lemma
                ? () => {
                    addLemmaToVocab(selected.lemma!.id);
                    setAdded(true);
                    bumpVocabRev();
                  }
                : undefined
            }
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
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
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

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { padding: Spacing.three, paddingBottom: 80 },
  bodyText: { fontSize: 22, lineHeight: 38 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  loadingText: { fontSize: 16, fontStyle: 'italic', textAlign: 'center' },
  loadingHint: { fontSize: 12, textAlign: 'center', opacity: 0.8 },

  // Scroll progress bar
  pageBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pageTrack: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  pageFill: { height: 3, borderRadius: 2 },
  pageLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'right',
  },

  legend: { gap: 6, marginTop: Spacing.three },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legDot: { width: 12, height: 12, borderRadius: 6 },
  legLabel: { fontSize: 13 },

  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: Radius.pill, backgroundColor: '#B33C2D', alignItems: 'center', marginTop: Spacing.three },
  btnDisabled: { backgroundColor: 'rgba(179,60,45,0.3)' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextDisabled: { opacity: 0.5 },

  panel: { position: 'absolute', left: Spacing.three, right: Spacing.three, bottom: Spacing.four, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  panelCard: { borderRadius: Radius.lg },
});
