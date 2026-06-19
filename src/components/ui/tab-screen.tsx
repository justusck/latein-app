import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FadeInView } from '@/components/ui/fade-in';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';

type TabScreenProps = {
  title: string;
  children: ReactNode;
  /** Custom right-side actions in the header. Replaces default streak + profile. */
  headerRight?: ReactNode;
  /** Extra element between the title and the default right actions. */
  titleExtra?: ReactNode;
  /** Remove bottom padding for screens that manage their own (e.g. chat input). */
  noBottomPadding?: boolean;
  /** Set false for screens that manage their own scroll container (e.g. chat with ref). */
  scroll?: boolean;
};

/**
 * Shared tab-screen skeleton used by all four tabs.
 * Every tab gets the same bones: safe area → header → content, with consistent spacing.
 * Content fades in subtly (150ms) on mount, making tab switches feel smooth.
 */
export function TabScreen({ title, children, headerRight, titleExtra, noBottomPadding, scroll = true }: TabScreenProps) {
  return (
    <Screen scroll={scroll} padded={false} edges={['top']}>
      <PageHeader title={title} right={headerRight} titleExtra={titleExtra} />
      <View
        style={[
          styles.content,
          !scroll && styles.contentFlex,
          !noBottomPadding && styles.contentBottom,
        ]}>
        <FadeInView duration={150} slide="none" style={!scroll ? styles.contentFlex : undefined}>
          {children}
        </FadeInView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
  },
  contentFlex: {
    flex: 1,
  },
  contentBottom: {
    paddingBottom: Spacing.six,
  },
});
