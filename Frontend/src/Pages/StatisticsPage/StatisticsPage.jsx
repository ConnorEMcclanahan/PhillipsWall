import React from "react";
import StatisticsDisplay from "../../Components/StatisticsDisplay";
import { LanguageProvider } from "../../LanguageContext";
import LanguageSelector from "../../Components/LanguageSelector";

export const StatisticsPage = () => {
    return (
        <LanguageProvider>
            <div>
                <LanguageSelector/>
                <StatisticsDisplay/>
            </div>
        </LanguageProvider>
    );
};

export default StatisticsPage;
