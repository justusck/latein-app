import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AI_MODES, type AiMode, type ChatMessage, chat, latinPart } from '@/lib/ai';
import { appendMessage, loadOrStart, startConversation, type Conversation } from '@/lib/ai/conversations';
import { XP_AI_TURN } from '@/lib/gamification';
import { buildKnowledgeContext } from '@/lib/knowledge';
import { getApiKey } from '@/lib/secure';
import { speakLatin } from '@/lib/speech';
import { useApp } from '@/store/app';

export default function AiScreen() {
  const theme = useTheme();
  const { pronunciation, awardXp, registerActivity } = useApp();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [checkedKey, setCheckedKey] = useState(false);
  const [mode, setMode] = useState<AiMode>('chat');
  const [conv, setConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [knowledge, setKnowledge] = useState({ words: 0, grammar: 0 });
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then((k) => {
        setApiKey(k);
        setCheckedKey(true);
      });
      const kn = buildKnowledgeContext();
      setKnowledge({ words: kn.knownWords.length, grammar: kn.masteredGrammar.length });
    }, []),
  );

  useEffect(() => {
    setConv(loadOrStart(mode));
    setError('');
  }, [mode]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [conv?.messages.length, sending]);

  const send = async () => {
    if (!conv || !apiKey || !input.trim() || sending) return;
    const userText = input.trim();
    setInput('');
    setError('');
    const userMsg: ChatMessage = { role: 'user', content: userText };
    const history = [...conv.messages, userMsg];
    setConv({ ...conv, messages: history });
    appendMessage(conv.id, 'user', userText);
    setSending(true);
    try {
      const reply = await chat({ apiKey, mode, history, pronunciation });
      appendMessage(conv.id, 'assistant', reply);
      setConv((c) => (c ? { ...c, messages: [...c.messages, { role: 'assistant', content: reply }] } : c));
      awardXp(XP_AI_TURN);
      registerActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const newChat = () => {
    if (!conv) return;
    setConv(startConversation(mode));
    setError('');
  };

  // ── No API key: empty state ──────────────────────────────────────────────
  if (checkedKey && !apiKey) {
    return (
      <Screen scroll padded={false}>
        <PageHeader title="Magister" />

        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.muted }]}>
            <Ionicons name="key-outline" size={28} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>API-Key benötigt</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Hinterlege deinen Anthropic API-Key in den Einstellungen, um mit dem Magister auf Latein
            zu schreiben und zu sprechen.
          </Text>
          <Button title="Zu den Einstellungen" onPress={() => router.push('/settings')} />
        </View>
      </Screen>
    );
  }

  // ── Chat UI ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Screen padded={false}>

        {/* Header */}
        <PageHeader
          title="Magister"
          right={
            <View style={styles.headerActions}>
              <Text style={[styles.knowledgePill, { backgroundColor: theme.muted, color: theme.textSecondary }]}>
                {knowledge.words} W · {knowledge.grammar} G
              </Text>
              <Pressable onPress={newChat} hitSlop={8}>
                <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
                <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          }
        />

        {/* Mode selector */}
        <View style={[styles.modes, { backgroundColor: theme.muted }]}>
          {AI_MODES.map((m) => {
            const active = m.id === mode;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m.id)}
                style={[styles.modeBtn, active && { backgroundColor: theme.primary }]}>
                <Text style={[styles.modeText, { color: active ? '#fff' : theme.textSecondary }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled">
          {conv?.messages.length === 0 && !sending && (
            <View style={styles.conversationEmpty}>
              <Ionicons name="mic-outline" size={24} color={theme.border} />
              <Text style={[styles.conversationEmptyText, { color: theme.textSecondary }]}>
                Scrībe Latīnē — der Magister antwortet.
              </Text>
            </View>
          )}
          {conv?.messages.map((m, i) => (
            <Bubble
              key={i}
              message={m}
              theme={theme}
              onSpeak={() => speakLatin(latinPart(m.content) || m.content, pronunciation)}
            />
          ))}
          {sending && (
            <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ActivityIndicator color={theme.primary} size="small" />
            </View>
          )}
          {error ? (
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          ) : null}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            placeholder="Scrībe Latīnē…"
            placeholderTextColor={theme.textSecondary}
            multiline
            blurOnSubmit={false}
            style={[styles.input, { color: theme.text, backgroundColor: theme.muted }]}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: theme.primary,
                opacity: !input.trim() || sending ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>

      </Screen>
    </KeyboardAvoidingView>
  );
}

// ── Bubble ─────────────────────────────────────────────────────────────────

function Bubble({
  message,
  theme,
  onSpeak,
}: {
  message: ChatMessage;
  theme: ReturnType<typeof useTheme>;
  onSpeak: () => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.userBubble, { backgroundColor: theme.primary }]}>
        <Text style={[styles.bubbleText, { color: '#fff' }]}>{message.content}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onSpeak}
      style={({ pressed }) => [
        styles.bubble,
        styles.assistantBubble,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Text style={[styles.bubbleText, { color: theme.text }]}>{message.content}</Text>
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

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  knowledgePill: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },

  // Mode selector
  modes: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    borderRadius: Radius.pill,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  modeText: { fontWeight: '700', fontSize: 12 },

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
});
