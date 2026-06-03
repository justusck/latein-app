import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiKey, setApiKey } from '@/lib/secure';
import { useApp, type Pronunciation } from '@/store/app';

export default function SettingsScreen() {
  const theme = useTheme();
  const { pronunciation, setPronunciation, dailyGoalNew, setDailyGoalNew, retention, setRetention } =
    useApp();

  const [apiKey, setApiKeyState] = useState('');
  const [savedKey, setSavedKey] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => {
      if (k) {
        setApiKeyState(k);
        setSavedKey(true);
      }
    });
  }, []);

  const saveKey = async (value: string) => {
    setApiKeyState(value);
    await setApiKey(value);
    setSavedKey(value.trim().length > 0);
  };

  return (
    <Screen scroll>
      <SectionTitle theme={theme}>Anwendung (AI)</SectionTitle>
      <Card style={{ gap: Spacing.two }}>
        <Text style={[styles.label, { color: theme.text }]}>Anthropic API-Key</Text>
        <Text style={[styles.help, { color: theme.textSecondary }]}>
          Wird sicher im Schlüsselbund des Geräts gespeichert (nicht in der Datenbank). Nötig für
          den AI-Chat auf der Anwendungsseite.
        </Text>
        <TextInput
          value={apiKey}
          onChangeText={saveKey}
          placeholder="sk-ant-..."
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
        />
        {savedKey && (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <Text style={[styles.help, { color: theme.success }]}>Key gespeichert</Text>
          </View>
        )}
      </Card>

      <SectionTitle theme={theme}>Aussprache</SectionTitle>
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

      <SectionTitle theme={theme}>Tagesziel (neue Wörter)</SectionTitle>
      <Card>
        <Stepper value={dailyGoalNew} onChange={setDailyGoalNew} min={0} max={40} step={5} theme={theme} />
      </Card>

      <SectionTitle theme={theme}>Ziel-Behaltensrate (FSRS)</SectionTitle>
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
    </Screen>
  );
}

function SectionTitle({ children, theme }: { children: string; theme: ReturnType<typeof useTheme> }) {
  return <Text style={[styles.section, { color: theme.textSecondary }]}>{children}</Text>;
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
            onPress={() => onChange(o.value)}
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
        onPress={() => onChange(Math.max(min, value - step))}
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
  section: { fontSize: 14, fontWeight: '800', marginTop: Spacing.four, marginBottom: Spacing.two },
  label: { fontSize: 16, fontWeight: '700' },
  help: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Spacing.three, fontSize: 15 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: Spacing.two, borderRadius: Radius.sm, alignItems: 'center' },
  segmentText: { fontWeight: '700', fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 26, fontWeight: '900' },
});
