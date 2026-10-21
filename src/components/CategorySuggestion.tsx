import { useTranslation } from 'react-i18next';
import { suggestCategory } from '../domain/readiness';
import type { AppData } from '../domain/types';

export function CategorySuggestion({
  description,
  type,
  categories,
  selectedCategoryId,
  onApply,
}: {
  description: string;
  type: 'income' | 'expense';
  categories: AppData['categories'];
  selectedCategoryId: string;
  onApply: (categoryId: string) => void;
}) {
  const { t } = useTranslation();
  const suggestion = suggestCategory(description, type, categories);
  if (!suggestion || suggestion === selectedCategoryId) return null;
  return (
    <p className="text-sm text-muted" role="status">
      {t('categorySuggestion.label', {
        category: t(`category.${suggestion}`),
      })}{' '}
      <button
        className="min-h-11 rounded px-2 font-semibold text-accent underline"
        type="button"
        onClick={() => onApply(suggestion)}
      >
        {t('categorySuggestion.apply')}
      </button>
    </p>
  );
}
