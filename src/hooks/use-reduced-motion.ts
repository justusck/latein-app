import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Returns true when the user has requested reduced motion at the system level.
 * All animations must check this and degrade to instant transitions when true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) =>
      setReduced(enabled),
    );
    return () => sub?.remove();
  }, []);

  return reduced;
}
