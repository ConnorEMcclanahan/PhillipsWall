import React, { createContext, useContext, useState } from 'react';

// Create a Context for the language
const LanguageContext = createContext();

// LanguageProvider component that will wrap the application
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

    // Update localStorage and trigger language change
    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        localStorage.setItem('language', newLanguage);
    };

    return (
        <LanguageContext.Provider value={{ language, handleLanguageChange }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook to use language in any component
export const useLanguage = () => useContext(LanguageContext);
