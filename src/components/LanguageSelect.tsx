import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSelect } from './AppSelect';
export function LanguageSelect() {
  const { i18n } = useTranslation();
  return (
    <div className="language-select">
      <Languages size={17} aria-hidden="true" />
      <AppSelect
        value={i18n.resolvedLanguage === 'my' ? 'my' : 'en'}
        onValueChange={(language) => void i18n.changeLanguage(language)}
        aria-label="Language / ဘာသာစကား"
        className="language-select-trigger"
      >
        <option value="en">English</option>
        <option value="my">မြန်မာ</option>
      </AppSelect>
    </div>
  );
}
