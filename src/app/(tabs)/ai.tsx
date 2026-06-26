import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FadeInView } from '@/components/ui/fade-in';
import { LatinMarkdown } from '@/components/ui/latin-markdown';
import { CourseSwitcher } from '@/components/ui/course-switcher';
import { TabScreen } from '@/components/ui/tab-screen';
import { ThinkingBubble } from '@/components/ui/thinking-bubble';
import { WordGlossPanel } from '@/components/ui/word-panel';
import { useCourse } from '@/hooks/use-course';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAiModes, type AiMode, type ChatMessage, chatStream, speakablePart, supportsThinking } from '@/lib/ai';
import { getEngineStatus, loadModel, onStatusChange, resetDownload, type EngineStatus } from '@/lib/ai/engine';
import { appendMessage, loadOrStart, startConversation, type Conversation } from '@/lib/ai/conversations';
import { XP_AI_TURN } from '@/lib/gamification';
import { buildKnowledgeContext } from '@/lib/knowledge';
import { kvGet, kvSet } from '@/lib/kv';
import { getDictFormKeys, getKnownFormKeys, glossForKey } from '@/lib/reading';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';

type ModeState = {
  conv: Conversation | null;
  input: string;
  error: string;
};

const EMPTY_STATE: ModeState = { conv: null, input: '', error: '' };

export default function AiScreen() {
  const theme = useTheme();
  const course = useCourse();
  const { pronunciation, awardXp, registerActivity } = useApp();

  const [engineStatus, setEngineStatus] = useState<EngineStatus>(() => getEngineStatus());
  const [activeIndex, setActiveIndex] = useState(0);
  const [states, setStates] = useState<Record<AiMode, ModeState>>({
    chat: { ...EMPTY_STATE },
    roleplay: { ...EMPTY_STATE },
    correction: { ...EMPTY_STATE },
  });
  const [sending, setSending] = useState(false);
  const [knowledge, setKnowledge] = useState({ words: 0, grammar: 0 });
  const [pageWidth, setPageWidth] = useState(0);

  // Streaming state — token-by-token output during generation
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingContent, setStreamingContent] = useState('');

  // Word gloss state
  const [knownKeys] = useState(() => getKnownFormKeys());
  const [dictKeys] = useState(() => getDictFormKeys());
  const [selectedWord, setSelectedWord] = useState<{ raw: string; lemma: ReturnType<typeof glossForKey> } | null>(null);

  const pagerRef = useRef<ScrollView>(null);
  const scrollRefs = useRef<Record<AiMode, ScrollView | null>>({ chat: null, roleplay: null, correction: null });

  // Roleplay character prompt — persisted via kv store
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [showCharEditor, setShowCharEditor] = useState(false);

  const activeMode = getAiModes()[activeIndex].id;

  // Subscribe to engine status + load model on first visit
  useFocusEffect(
    useCallback(() => {
      const unsub = onStatusChange(setEngineStatus);
      const kn = buildKnowledgeContext();
      setKnowledge({ words: kn.knownWords.length, grammar: kn.masteredGrammar.length });

      // Auto-start model download if not yet loaded
      const s = getEngineStatus();
      if (s.state === 'unloaded') {
        loadModel().catch(() => { /* error surfaced via onStatusChange */ });
      }
      return unsub;
    }, []),
  );

  // Load conversations for all modes on mount
  useEffect(() => {
    setStates({
      chat: { conv: loadOrStart('chat'), input: '', error: '' },
      roleplay: { conv: loadOrStart('roleplay'), input: '', error: '' },
      correction: { conv: loadOrStart('correction'), input: '', error: '' },
    });
  }, []);

  // Auto-scroll to bottom when messages change in active mode
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRefs.current[activeMode]?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [states[activeMode]?.conv?.messages.length, sending, activeMode]);

  // Load persisted character prompt on mount
  useEffect(() => {
    setCharacterPrompt(kvGet('roleplay_character') ?? '');
  }, []);

  // Android keyboard handling — translate only the input bar (not the whole view)
  const inputTranslateY = useRef(new Animated.Value(0)).current;
  const [messagesPadBottom, setMessagesPadBottom] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbH = e.endCoordinates.height;
      const offset = Math.max(0, kbH);
      Animated.timing(inputTranslateY, {
        toValue: -offset,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      setMessagesPadBottom(offset);
      setTimeout(() => {
        scrollRefs.current[activeMode]?.scrollToEnd({ animated: false });
      }, 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      setMessagesPadBottom(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, [activeMode]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveCharacterPrompt = (text: string) => {
    setCharacterPrompt(text);
    kvSet('roleplay_character', text);
  };

  const scrollToIndex = (i: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    pagerRef.current?.scrollTo({ x: i * pageWidth, animated: true });
    setActiveIndex(i);
  };

  const onPageChanged = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (!pageWidth) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (i !== activeIndex && i >= 0 && i < getAiModes().length) {
      setActiveIndex(i);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    setPageWidth(e.nativeEvent.layout.width);
  };

  const updateMode = (mode: AiMode, patch: Partial<ModeState>) => {
    setStates((prev) => ({ ...prev, [mode]: { ...prev[mode], ...patch } }));
  };

  const send = async () => {
    const mode = activeMode;
    const st = states[mode];
    if (!st.conv || !st.input.trim() || sending) return;

    const userText = st.input.trim();
    updateMode(mode, { input: '', error: '' });

    const userMsg: ChatMessage = { role: 'user', content: userText };
    const history = [...st.conv.messages, userMsg];
    setStates((prev) => ({
      ...prev,
      [mode]: { ...prev[mode], conv: { ...st.conv!, messages: history } },
    }));
    appendMessage(st.conv.id, 'user', userText);

    setSending(true);
    setStreamingReasoning('');
    setStreamingContent('');

    try {
      const result = await chatStream(
        {
          mode,
          history,
          pronunciation,
          characterPrompt: mode === 'roleplay' ? characterPrompt : undefined,
          customPrompt: kvGet('ai_custom_prompt') ?? undefined,
        },
        (data) => {
          if (data.reasoning_content) {
            setStreamingReasoning((prev) => prev + data.reasoning_content);
          }
          if (data.content) {
            setStreamingContent((prev) => prev + data.content);
          }
        },
      );

      appendMessage(st.conv.id, 'assistant', result.content, result.reasoning || undefined);
      setStates((prev) => {
        const c = prev[mode].conv;
        if (!c) return prev;
        return {
          ...prev,
          [mode]: {
            ...prev[mode],
            conv: {
              ...c,
              messages: [
                ...c.messages,
                {
                  role: 'assistant' as const,
                  content: result.content,
                  reasoning: result.reasoning || undefined,
                },
              ],
            },
          },
        };
      });
      awardXp(XP_AI_TURN);
      registerActivity();
    } catch (e) {
      updateMode(mode, { error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
      setStreamingReasoning('');
      setStreamingContent('');
    }
  };

  const newChat = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const mode = activeMode;
    setStates((prev) => ({
      ...prev,
      [mode]: { conv: startConversation(mode), input: '', error: '' },
    }));
  };

  const onWordPress = useCallback(
    (raw: string, key: string) => {
      const lemma = glossForKey(key);
      setSelectedWord({ raw, lemma });
      speakLatin(raw, pronunciation);
    },
    [pronunciation],
  );

  // ── Model loading / error states ──────────────────────────────────────────
  if (engineStatus.state === 'unloaded' || engineStatus.state === 'downloading' || engineStatus.state === 'loading') {
    const pct = Math.round(engineStatus.downloadProgress * 100);
    const mbDown = (engineStatus.downloadedBytes / 1_048_576).toFixed(0);
    const mbTotal = (engineStatus.totalBytes / 1_048_576).toFixed(0);
    const mbps = (engineStatus.bytesPerSecond / 1_048_576).toFixed(1);
    const hasSpeed = engineStatus.bytesPerSecond > 100_000; // >100 KB/s
    return (
      <TabScreen title={course.tabLabels.ai} titleExtra={<CourseSwitcher />}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.muted }]}>
            <Ionicons
              name={engineStatus.state === 'downloading' ? 'cloud-download-outline' : 'hourglass-outline'}
              size={28}
              color={theme.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {engineStatus.state === 'downloading'
              ? 'Modell wird geladen…'
              : 'Modell wird initialisiert…'}
          </Text>
          {engineStatus.state === 'downloading' && (
            <>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${Math.max(pct, 2)}%` }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                {pct} % · {mbDown} / {mbTotal} MB
                {hasSpeed ? ` · ${mbps} MB/s` : ''}
              </Text>
            </>
          )}
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            {engineStatus.state === 'downloading'
              ? 'Gemma 4 wird einmalig heruntergeladen. Der Download läuft im Hintergrund weiter und wird bei Abbruch automatisch fortgesetzt.'
              : 'Das Modell wird in den Speicher geladen. Dies dauert nur einen Moment.'}
          </Text>
          {engineStatus.state === 'downloading' && (
            <Button
              title="Download abbrechen & neu starten"
              variant="ghost"
              onPress={async () => {
                await resetDownload();
                loadModel().catch(() => {});
              }}
            />
          )}
        </View>
      </TabScreen>
    );
  }

  if (engineStatus.state === 'error') {
    return (
      <TabScreen title={course.tabLabels.ai} titleExtra={<CourseSwitcher />}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.muted }]}>
            <Ionicons name="warning-outline" size={28} color={theme.danger} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Modell-Fehler</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            {engineStatus.error || 'Das Modell konnte nicht geladen werden. Überprüfe deine Internetverbindung und versuche es erneut.'}
          </Text>
          <Button title="Erneut versuchen" onPress={() => loadModel().catch(() => {})} />
        </View>
      </TabScreen>
    );
  }

  const mainContent = (
    <TabScreen title={course.tabLabels.ai} titleExtra={<CourseSwitcher />} scroll={false} noBottomPadding>
        {/* Action bar */}
        <View style={styles.actionBar}>
          <View style={styles.actionBarLeft}>
            <Text style={[styles.knowledgePill, { backgroundColor: theme.muted, color: theme.textSecondary }]}>
              {knowledge.words} Wörter · {knowledge.grammar} Grammatik
            </Text>
            {activeMode === 'roleplay' && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }
                  setShowCharEditor((v) => !v);
                }}
                style={({ pressed }) => [
                  styles.charBtn,
                  {
                    backgroundColor: showCharEditor ? theme.primary : theme.muted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={13}
                  color={showCharEditor ? '#fff' : theme.primary}
                />
                <Text
                  style={[
                    styles.charBtnText,
                    { color: showCharEditor ? '#fff' : theme.primary },
                  ]}
                >
                  Charakter
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={newChat} hitSlop={8} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Ionicons name="create-outline" size={18} color={theme.primary} />
          </Pressable>
        </View>

        {/* Mode tabs — tap to switch, synced with swipe */}
        <View style={[styles.tabBar, { backgroundColor: theme.muted }]}>
          {getAiModes().map((m, i) => {
            const active = i === activeIndex;
            return (
              <Pressable
                key={m.id}
                onPress={() => scrollToIndex(i)}
                style={[styles.tabBtn, active && { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : theme.textSecondary }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Swipeable pages */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPageChanged}
          onLayout={onLayout}
          scrollEventThrottle={16}
          directionalLockEnabled
          style={styles.flex}
          contentContainerStyle={styles.pagerContent}
        >
          {getAiModes().map((m) => {
            const st = states[m.id];
            const isActive = m.id === activeMode;
            return (
              <View key={m.id} style={[styles.page, pageWidth > 0 && { width: pageWidth }]}>
                {/* Character editor (roleplay only) */}
                {m.id === 'roleplay' && showCharEditor && (
                  <Card
                    style={[styles.charEditor, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Text style={[styles.charEditorLabel, { color: theme.textSecondary }]}>
                      Charakterbeschreibung (auf Deutsch) — die KI verkörpert diesen Charakter und schreibt Latein:
                    </Text>
                    <TextInput
                      value={characterPrompt}
                      onChangeText={saveCharacterPrompt}
                      placeholder="z. B. „Du bist ein römischer Händler auf dem Forum. Du verkaufst Gewürze und Olivenöl. Du bist freundlich, aber geschäftstüchtig…“"
                      placeholderTextColor={theme.textSecondary}
                      multiline
                      style={[styles.charInput, { color: theme.text, backgroundColor: theme.muted }]}
                    />
                  </Card>
                )}

                {/* Messages */}
                <ScrollView
                  ref={(r) => {
                    scrollRefs.current[m.id] = r;
                  }}
                  style={styles.flex}
                  contentContainerStyle={[styles.messages, { paddingBottom: messagesPadBottom + Spacing.four }]}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {st.conv?.messages.length === 0 && !sending && (
                    <View style={styles.conversationEmpty}>
                      <Ionicons name="mic-outline" size={24} color={theme.border} />
                      <Text style={[styles.conversationEmptyText, { color: theme.textSecondary }]}>
                        Scrībe Latīnē — der Magister antwortet.
                      </Text>
                    </View>
                  )}

                  {st.conv?.messages.map((msg, idx) => {
                    const total = st.conv!.messages.length;
                    const recent = total - idx <= 3;
                    const bubble = (
                      <Bubble
                        key={idx}
                        message={msg}
                        theme={theme}
                        knownKeys={knownKeys}
                        dictKeys={dictKeys}
                        onWordPress={onWordPress}
                        onSpeak={() => speakLatin(speakablePart(msg.content) || msg.content, pronunciation)}
                      />
                    );
                    if (!recent) return bubble;
                    return (
                      <FadeInView key={idx} delay={(total - idx - 1) * 50} duration={200}>
                        {bubble}
                      </FadeInView>
                    );
                  })}

                  {sending && isActive && (
                    <View
                      style={[
                        styles.bubble,
                        styles.assistantBubble,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      {supportsThinking() && (
                        <ThinkingBubble
                          reasoning={streamingReasoning}
                          streaming={true}
                          style={{ marginBottom: streamingContent ? Spacing.two : 0 }}
                        />
                      )}
                      {streamingContent ? (
                        <LatinMarkdown
                          knownKeys={knownKeys}
                          dictKeys={dictKeys}
                          onWordPress={onWordPress}
                          theme={theme}
                        >
                          {streamingContent}
                        </LatinMarkdown>
                      ) : !supportsThinking() ? (
                        <ActivityIndicator color={theme.primary} size="small" />
                      ) : (
                        <Text style={[styles.streamingHint, { color: theme.textSecondary }]}>
                          …
                        </Text>
                      )}
                    </View>
                  )}

                  {st.error ? (
                    <Text style={[styles.errorText, { color: theme.danger }]}>{st.error}</Text>
                  ) : null}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        {/* Shared input bar — outside the pager so it doesn't swipe with pages.
             On Android, translateY lifts it above the keyboard so only the bar moves. */}
        <Animated.View
          style={[
            styles.inputBar,
            { borderTopColor: theme.border, backgroundColor: theme.background },
            Platform.OS === 'android' && { transform: [{ translateY: inputTranslateY }] },
          ]}
        >
          <TextInput
            value={states[activeMode].input}
            onChangeText={(t) => updateMode(activeMode, { input: t })}
            onSubmitEditing={send}
            placeholder="Scrībe Latīnē…"
            placeholderTextColor={theme.textSecondary}
            multiline
            blurOnSubmit={false}
            style={[styles.input, { color: theme.text, backgroundColor: theme.muted }]}
          />
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }
              send();
            }}
            disabled={!states[activeMode].input.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: theme.primary,
                opacity: !states[activeMode].input.trim() || sending ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </Animated.View>
      </TabScreen>
  );

  // Word gloss panel — outside TabScreen so it overlays the full screen
  const glossPanel = selectedWord && (
    <WordGlossPanel
      raw={selectedWord.raw}
      lemma={selectedWord.lemma}
      theme={theme}
      onClose={() => setSelectedWord(null)}
      onSpeak={(w) => speakLatin(w, pronunciation)}
      containerStyle={styles.glossPanel}
    />
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={90}>
        {mainContent}
        {glossPanel}
      </KeyboardAvoidingView>
    );
  }
  return (
    <View style={styles.flex}>
      {mainContent}
      {glossPanel}
    </View>
  );
}

// ── Bubble ─────────────────────────────────────────────────────────────────

function Bubble({
  message,
  theme,
  knownKeys,
  dictKeys,
  onWordPress,
  onSpeak,
}: {
  message: ChatMessage;
  theme: ReturnType<typeof useTheme>;
  knownKeys: Set<string>;
  dictKeys: Set<string>;
  onWordPress: (raw: string, key: string) => void;
  onSpeak: () => void;
}) {
  const isUser = message.role === 'user';
  const hasReasoning = !!message.reasoning;

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.userBubble, { backgroundColor: theme.primary }]}>
        <Text style={[styles.bubbleText, { color: '#fff' }]}>{message.content}</Text>
      </View>
    );
  }

  const handleSpeak = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onSpeak();
  };

  return (
    <Pressable
      onPress={handleSpeak}
      style={({ pressed }) => [
        styles.bubble,
        styles.assistantBubble,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {hasReasoning && (
        <ThinkingBubble
          reasoning={message.reasoning!}
          streaming={false}
          style={{ marginBottom: Spacing.two }}
        />
      )}
      <LatinMarkdown
        knownKeys={knownKeys}
        dictKeys={dictKeys}
        onWordPress={onWordPress}
        theme={theme}
      >
        {message.content}
      </LatinMarkdown>
      <View style={styles.speakRow}>
        <Ionicons name="mic-outline" size={13} color={theme.primary} />
        <Text style={[styles.speakHint, { color: theme.primary }]}>Antippen zum Anhören</Text>
      </View>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  actionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  knowledgePill: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  charBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  charBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Character editor
  charEditor: {
    marginBottom: Spacing.two,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  charEditorLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  charInput: {
    minHeight: 80,
    maxHeight: 160,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    lineHeight: 20,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    borderRadius: Radius.pill,
    padding: 3,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  tabText: { fontWeight: '700', fontSize: 12 },

  // Pager
  pagerContent: {},
  page: {
    flex: 1,
  },

  // Messages
  messages: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.four },
  conversationEmpty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    opacity: 0.6,
  },
  conversationEmptyText: { fontSize: 13, fontStyle: 'italic' },

  // Bubbles
  bubble: {
    maxWidth: '86%',
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: Radius.sm },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleText: { fontSize: 16, lineHeight: 24 },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two },
  speakHint: { fontSize: 11, fontWeight: '700' },

  // Error
  errorText: { fontSize: 13, textAlign: 'center', padding: Spacing.two },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty states
  emptyState: {
    paddingTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  glossPanel: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.four,
  },
  progressBar: {
    width: 200,
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  streamingHint: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: Spacing.one,
  },
});
