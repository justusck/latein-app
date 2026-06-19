import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, Spacing } from '@/constants/theme';
import { getActiveCourse } from '@/courses';
import { initDatabase } from '@/db/client';
import { seedDatabase } from '@/db/seed';
import { getDailySaying } from '@/lib/sayings';
import { useApp } from '@/store/app';

export default function RootLayout() {
  const systemScheme = useColorScheme() ?? 'light';
  const themeMode = useApp((s) => s.themeMode);
  const scheme = themeMode === 'system' ? systemScheme : themeMode;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const course = getActiveCourse();
  const [fontsLoaded] = useFonts(course.fontModules);

  useEffect(() => {
    try {
      initDatabase();
      seedDatabase();
      useApp.getState().hydrate();
      // Ensure widget has a current saying file
      getDailySaying();
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  if (status !== 'ready' || !fontsLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {status === 'loading' ? (
          <>
            <Text style={[styles.brand, { color: theme.primary }]}>{course.displayName.toLocaleUpperCase()}</Text>
            <ActivityIndicator color={theme.primary} />
          </>
        ) : (
          <Text style={[styles.error, { color: theme.danger }]}>Fehler beim Start:{'\n'}{error}</Text>
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{ presentation: 'modal', headerShown: true, title: 'Einstellungen' }}
          />
          <Stack.Screen
            name="profile"
            options={{ presentation: 'modal', headerShown: true, title: 'Profil' }}
          />
          <Stack.Screen
            name="vocab-session"
            options={{ headerShown: true, title: 'Vokabeltraining' }}
          />

          <Stack.Screen name="grammar/[id]" options={{ headerShown: true, title: 'Lektion' }} />
          <Stack.Screen name="trainer/[id]" options={{ headerShown: true, title: 'Formentrainer' }} />
          <Stack.Screen name="reader/[id]" options={{ headerShown: true, title: 'Lesen' }} />
        </Stack>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  brand: { fontSize: 40, fontWeight: '900', letterSpacing: 6 },
  error: { fontSize: 14, textAlign: 'center', paddingHorizontal: Spacing.four },
});
