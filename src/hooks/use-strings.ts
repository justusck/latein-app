import { STRINGS } from '@/constants/strings';
import { useApp } from '@/store/app';

export function useStrings() {
  const uiLang = useApp((s) => s.uiLang);
  return STRINGS[uiLang];
}
