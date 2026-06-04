import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 0,
          ...Platform.select({
            ios: {
              shadowColor: theme.text,
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        tabBarLabelStyle: {
          fontWeight: '800',
          fontSize: 10,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vokabeln',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="grammar"
        options={{
          title: 'Grammatik',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'school' : 'school-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Magister',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'mic' : 'mic-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Lesen',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
