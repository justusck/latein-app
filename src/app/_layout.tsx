import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  LibreCaslonText_400Regular,
  LibreCaslonText_700Bold,
  useFonts,
} from '@expo-google-fonts/libre-caslon-text';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, Spacing } from '@/constants/theme';
import { initDatabase } from '@/db/client';
import { seedDatabase } from '@/db/seed';
import { useApp } from '@/store/app';

export default function RootLayout() {
  const scheme = useColorScheme() ?? 'light';
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [fontsLoaded] = useFonts({ LibreCaslonText_400Regular, LibreCaslonText_700Bold });

  useEffect(() => {
    try {
      initDatabase();
      seedDatabase();
      useApp.getState().hydrate();
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
            <Text style={[styles.brand, { color: theme.primary }]}>LATĪNA</Text>
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
            name="vocab-session"
            options={{ headerShown: true, title: 'Vokabeltraining' }}
          />
          <Stack.Screen name="grammar/[id]" options={{ headerShown: true, title: 'Lektion' }} />
          <Stack.Screen name="trainer/[id]" options={{ headerShown: true, title: 'Formentrainer' }} />
          <Stack.Screen name="reader/[id]" options={{ headerShown: true, title: 'Lesen' }} />
        </Stack>
        <StatusBar style="auto" />
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
