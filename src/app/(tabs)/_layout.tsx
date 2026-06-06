import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { TabBarButton } from '@/components/ui/tab-bar-button';
import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarButton: (props) => <TabBarButton {...props} />,
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
          tabBarIcon: ({ size, focused }) => (
            <TabBarIcon baseName="bookmark" size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="grammar"
        options={{
          title: 'Grammatik',
          tabBarIcon: ({ size, focused }) => (
            <TabBarIcon baseName="school" size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Magister',
          tabBarIcon: ({ size, focused }) => (
            <TabBarIcon baseName="mic" size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Lesen',
          tabBarIcon: ({ size, focused }) => (
            <TabBarIcon baseName="book" size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
