import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from "./Pages/MainBubblePage/MainPage";
import ImageScanPage from "./Pages/ImageScan/ImageScanPage";
import { LanguageProvider } from './Components/LanguageContext';
import StatisticsPage from "./Pages/StatisticsPage/StatisticsPage";

const App = () => {
  return (
      <LanguageProvider>
          <Router>
              <Routes>
                  <Route path="/" element={<MainPage/>}/>
                  <Route path="/imageScan" element={<ImageScanPage/>}/>
                  <Route path="/statistics" element={<StatisticsPage/>}/>
              </Routes>
          </Router>
      </LanguageProvider>
  );
};

export default App;
