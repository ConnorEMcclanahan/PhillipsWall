import React from "react";
import AIQuestionsDisplay from "../../Components/AIQuestionsDisplay";
import { LanguageProvider } from "../../LanguageContext";
import LanguageSelector from "../../Components/LanguageSelector";

export const MainPage = () => {
    return (
        <LanguageProvider>
            <div>
                <LanguageSelector/>
                <AIQuestionsDisplay/>
            </div>
        </LanguageProvider>    
    );
};

export default MainPage;
