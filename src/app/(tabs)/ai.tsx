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

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
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

  // ── No API key ──
  if (checkedKey && !apiKey) {
    return (
      <Screen scroll>
        <ThemedText type="title">Anwendung</ThemedText>
        <Card style={{ gap: Spacing.three, marginTop: Spacing.two }}>
          <Ionicons name="key-outline" size={32} color={theme.primary} />
          <ThemedText type="subtitle">AI-Key benötigt</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Hinterlege deinen Anthropic API-Key in den Einstellungen, um mit dem Magister auf Latein
            zu schreiben und zu sprechen.
          </ThemedText>
          <Button title="Zu den Einstellungen" onPress={() => router.push('/settings')} />
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Screen padded={false}>
        <View style={styles.header}>
          <ThemedText type="title">Magister</ThemedText>
          <View style={styles.headerActions}>
            <Pressable onPress={newChat} hitSlop={8}>
              <Ionicons name="create-outline" size={22} color={theme.textSecondary} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
              <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.knowledge, { color: theme.textSecondary }]}>
          Magister kennt deinen Stand: {knowledge.words} Wörter · {knowledge.grammar} Grammatik-Themen
        </Text>

        <View style={[styles.modes, { backgroundColor: theme.muted }]}>
          {AI_MODES.map((m) => {
            const active = m.id === mode;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMode(m.id)}
                style={[styles.modeBtn, active && { backgroundColor: theme.primary }]}>
                <Text style={[styles.modeText, { color: active ? '#fff' : theme.text }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled">
          {conv?.messages.map((m, i) => (
            <Bubble
              key={i}
              message={m}
              theme={theme}
              onSpeak={() => speakLatin(latinPart(m.content) || m.content, pronunciation)}
            />
          ))}
          {sending && (
            <View style={[styles.bubble, styles.assistant, { backgroundColor: theme.card }]}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )}
          {error ? (
            <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Scrībe Latīnē…"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.muted }]}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: !input.trim() || sending ? 0.5 : 1 }]}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

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
      <View style={[styles.bubble, styles.user, { backgroundColor: theme.primary, borderColor: theme.border }]}>
        <Text style={[styles.bubbleText, { color: '#fff' }]}>{message.content}</Text>
      </View>
    );
  }
  // Tapping anywhere on the assistant bubble reads the Latin aloud.
  return (
    <Pressable
      onPress={onSpeak}
      style={({ pressed }) => [
        styles.bubble,
        styles.assistant,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Text style={[styles.bubbleText, { color: theme.text }]}>{message.content}</Text>
      <View style={styles.speakRow}>
        <Ionicons name="volume-medium" size={16} color={theme.primary} />
        <Text style={[styles.speakHint, { color: theme.primary }]}>Antippen zum Anhören</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  headerActions: { flexDirection: 'row', gap: Spacing.three },
  knowledge: { fontSize: 12, paddingHorizontal: Spacing.three, marginTop: 2 },
  modes: {
    flexDirection: 'row',
    margin: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
  },
  modeBtn: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.sm, alignItems: 'center' },
  modeText: { fontWeight: '700', fontSize: 13 },
  messages: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.four },
  bubble: {
    maxWidth: '88%',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  user: { alignSelf: 'flex-end', borderBottomRightRadius: Radius.sm },
  assistant: { alignSelf: 'flex-start', borderBottomLeftRadius: Radius.sm },
  bubbleText: { fontSize: 16, lineHeight: 23 },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.two },
  speakHint: { fontSize: 12, fontWeight: '700' },
  error: { fontSize: 13, padding: Spacing.two, textAlign: 'center' },
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
  sendBtn: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
