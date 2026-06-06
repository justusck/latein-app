import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextInputProps = ComponentProps<typeof TextInput>;

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder: string;
  /** Forwarded to the underlying TextInput. Use for custom returnKeyType etc. */
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing' | 'placeholder' | 'placeholderTextColor' | 'style'>;
}

/**
 * Shared search bar used across tabs.
 * Card-background surface (no border), pill-shaped, with search icon and clear button.
 * Follows the Flat-Paper Rule: tonal contrast instead of borders for elevation.
 */
export function SearchBar({ value, onChangeText, onSubmit, onClear, placeholder, inputProps }: SearchBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.card }]}>
      <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: theme.text }]}
        {...inputProps}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            onClear ? onClear() : onChangeText('');
          }}
          hitSlop={10}>
          <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
});
