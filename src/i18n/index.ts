import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import my from './my.json';
import myUi from './my-ui.json';
const LANGUAGE_KEY = 'shwe-ui-language';
function savedLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'my' ? 'my' : 'en';
  } catch {
    return 'en';
  }
}
i18n.on('languageChanged', (language) => {
  const selected = language.startsWith('my') ? 'my' : 'en';
  document.documentElement.lang = selected;
  try {
    localStorage.setItem(LANGUAGE_KEY, selected);
  } catch {
    /* Optional persistence. */
  }
});
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en, ui: {} },
    my: { translation: my, ui: myUi },
  },
  lng: savedLanguage(),
  supportedLngs: ['en', 'my'],
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
