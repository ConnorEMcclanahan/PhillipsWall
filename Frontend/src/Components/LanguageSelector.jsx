// src/components/LanguageSelector.jsx
import { useLanguage } from '../LanguageContext';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="nl">Dutch</option>
      
    </select>
  );
};

export default LanguageSelector;
