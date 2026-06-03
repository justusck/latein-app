import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({ progress, color, trackColor, height = 10 }: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor ?? theme.muted, height, borderRadius: height },
      ]}>
      <View
        style={{
          width: `${pct}%`,
          height,
          borderRadius: height,
          backgroundColor: color ?? theme.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: Radius.pill },
});
