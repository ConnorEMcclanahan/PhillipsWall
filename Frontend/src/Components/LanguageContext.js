import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a Context for the language
const LanguageContext = createContext();

// LanguageProvider component that will wrap the application
export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(localStorage.getItem('language') || 'en');

    const setLanguage = (newLanguage) => {
        console.log("Language changing to:", newLanguage);
        setLanguageState(newLanguage);
        localStorage.setItem('language', newLanguage);
    };

    // For debugging
    useEffect(() => {
        console.log("Current language in context:", language);
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
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
