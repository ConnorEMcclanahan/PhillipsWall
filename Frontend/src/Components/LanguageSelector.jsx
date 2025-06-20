// src/components/LanguageSelector.jsx
import { useLanguage } from '../LanguageContext';
import './LanguageSelector.css';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  const flags = {
  en: '/flags/gb.png',
  nl: '/flags/nl.png',
  };

  return (
    <div className="language-float">
      {Object.keys(flags).map((lang) => (
        <img
          key={lang}
          src={flags[lang]}
          alt={lang}
          onClick={() => changeLanguage(lang)}
          className={`flag-icon ${language === lang ? 'active' : ''}`}
        />
      ))}
    </div>
  );
};

export default LanguageSelector;
