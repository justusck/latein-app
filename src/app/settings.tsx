import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getElevenLabsKey, setElevenLabsKey } from '@/lib/secure';
import { useStrings } from '@/hooks/use-strings';
import { kvGet, kvSet } from '@/lib/kv';
import { useApp, type Pronunciation, type UiLang } from '@/store/app';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useStrings();
  const { pronunciation, setPronunciation, dailyGoalNew, setDailyGoalNew, retention, setRetention, uiLang, setUiLang } =
    useApp();

  const [elevenKey, setElevenKeyState] = useState('');
  const [savedElevenKey, setSavedElevenKey] = useState(false);
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  useEffect(() => {
    getElevenLabsKey().then((k) => {
      if (k) { setElevenKeyState(k); setSavedElevenKey(true); }
    });
    setCustomAiPrompt(kvGet('ai_custom_prompt') ?? '');
  }, []);

  const saveElevenKey = async (value: string) => {
    setElevenKeyState(value);
    await setElevenLabsKey(value);
    setSavedElevenKey(value.trim().length > 0);
  };

  const saveCustomAiPrompt = (value: string) => {
    setCustomAiPrompt(value);
    kvSet('ai_custom_prompt', value);
  };

  return (
    <Screen scroll>
      {/* ── Language & Learning ──────────────────────────────────────── */}
      <SettingsGroup title={t.settingsLangLabel} theme={theme}>
        <Card>
          <Segmented<UiLang>
            value={uiLang}
            onChange={setUiLang}
            options={[
              { value: 'de', label: 'Deutsch' },
              { value: 'la', label: 'Latina' },
            ]}
            theme={theme}
          />
        </Card>
      </SettingsGroup>

      <SettingsGroup title="Tagesziel (neue Wörter)" theme={theme}>
        <Card>
          <Stepper value={dailyGoalNew} onChange={setDailyGoalNew} min={0} max={40} step={5} theme={theme} />
        </Card>
      </SettingsGroup>

      <SettingsGroup title="Ziel-Behaltensrate (FSRS)" theme={theme}>
        <Card>
          <Segmented<number>
            value={retention}
            onChange={setRetention}
            options={[
              { value: 0.85, label: '85%' },
              { value: 0.9, label: '90%' },
              { value: 0.95, label: '95%' },
            ]}
            theme={theme}
          />
          <Text style={[styles.help, { color: theme.textSecondary, marginTop: Spacing.two }]}>
            Höher = häufigere Wiederholungen, bessere Erinnerung. 90% ist der empfohlene Standard.
          </Text>
        </Card>
      </SettingsGroup>

      {/* ── AI & Speech ──────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <SettingsGroup title="Text-to-Speech (ElevenLabs)" theme={theme}>
        <Card style={{ gap: Spacing.two }}>
          <Text style={[styles.label, { color: theme.text }]}>ElevenLabs API-Key</Text>
          <Text style={[styles.help, { color: theme.textSecondary }]}>
            Wird sicher im Schlüsselbund gespeichert. Nötig für KI-Sprachausgabe im Magister und Reader.
          </Text>
          <TextInput
            value={elevenKey}
            onChangeText={saveElevenKey}
            placeholder="sk_..."
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />
          {savedElevenKey && (
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-circle" size={16} color={theme.success} />
              <Text style={[styles.help, { color: theme.success }]}>Key gespeichert</Text>
            </View>
          )}
        </Card>
      </SettingsGroup>

      <SettingsGroup title="Magister (KI) — Anweisungen" theme={theme}>
        <Card style={{ gap: Spacing.two }}>
          <Text style={[styles.help, { color: theme.textSecondary }]}>
            Zusätzliche Anweisungen, die bei jeder Anfrage an die lokale KI gesendet werden.
            Auf Deutsch formuliert. Z. B.: „Sprich immer im Plural", „Verwende nur Vokabeln aus Lektion 1–5".
          </Text>
          <TextInput
            value={customAiPrompt}
            onChangeText={saveCustomAiPrompt}
            placeholder="Zusätzliche Anweisungen an die KI…"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.promptInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          />
        </Card>
      </SettingsGroup>

      <SettingsGroup title="Aussprache" theme={theme}>
        <Card>
          <Segmented<Pronunciation>
            value={pronunciation}
            onChange={setPronunciation}
            options={[
              { value: 'classical', label: 'Klassisch' },
              { value: 'ecclesiastical', label: 'Kirchlich' },
            ]}
            theme={theme}
          />
        </Card>
      </SettingsGroup>
    </Screen>
  );
}

function SettingsGroup({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.section, { color: theme.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  theme,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.segmented, { backgroundColor: theme.muted }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }
              onChange(o.value);
            }}
            style={[styles.segment, active && { backgroundColor: theme.primary }]}>
            <Text style={[styles.segmentText, { color: active ? '#fff' : theme.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step,
  theme,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onChange(Math.max(min, value - step));
        }}
        style={[styles.stepBtn, { backgroundColor: theme.muted }]}>
        <Ionicons name="remove" size={22} color={theme.text} />
      </Pressable>
      <Text style={[styles.stepValue, { color: theme.text }]}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepBtn, { backgroundColor: theme.muted }]}>
        <Ionicons name="add" size={22} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.four },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: Spacing.four },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: Spacing.two },
  label: { fontSize: 16, fontWeight: '700' },
  help: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Spacing.three, fontSize: 15 },
  promptInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 14,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.sm, alignItems: 'center' },
  segmentText: { fontWeight: '700', fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 26, fontWeight: '900' },
});
