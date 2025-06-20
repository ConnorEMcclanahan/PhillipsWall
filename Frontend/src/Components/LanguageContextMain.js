import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from '../Pages/translationsMain.json';

// Create Context with default values
const LanguageContext = createContext({
    language: 'en',
    setLanguage: () => {},
    translate: (key) => key
});

// LanguageProvider component that will wrap the application
export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(localStorage.getItem('language') || 'en');

    const setLanguage = (newLanguage) => {
        console.log("Language changing to:", newLanguage);
        setLanguageState(newLanguage);
        localStorage.setItem('language', newLanguage);
    };
    
    // Add a standardized translate function
    const translate = (key) => {
        return translations[language]?.[key] || key;
    };

    // For debugging
    useEffect(() => {
        console.log("Current language in context:", language);
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, translate }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook to use language in any component
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        console.error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};