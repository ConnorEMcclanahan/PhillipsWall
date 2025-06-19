import React from "react";
import AIQuestionsDisplay from "../../Components/AIQuestionsDisplay";
import { LanguageProvider } from "../../LanguageContext";

export const MainPage = () => {
    return (
        <LanguageProvider>
            <div>
                <AIQuestionsDisplay/>
            </div>
        </LanguageProvider>    
    );
};

export default MainPage;
