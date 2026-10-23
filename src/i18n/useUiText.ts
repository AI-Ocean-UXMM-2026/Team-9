import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
export function useUiText() {
  const { t } = useTranslation('ui');
  return useCallback(
    (message: string, values?: Record<string, string | number>) =>
      t(message, {
        ...values,
        defaultValue: message,
        keySeparator: false,
        nsSeparator: false,
      }),
    [t],
  );
}
