import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accent?: boolean;
};

export function Card({ children, onPress, style, disabled, accent }: CardProps) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderColor: accent ? theme.primary : theme.border,
    borderWidth: accent ? 1.5 : StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    opacity: disabled ? 0.55 : 1,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [base, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
});
