import React from "react";
import ImageCaptureLoad from "../../Components/ImagesCaptureLoad";
import { LanguageProvider } from '../../LanguageContext';
import LanguageSelector from "../../Components/LanguageSelector";

export const ImageScanPage = () => {
    return (
        <LanguageProvider>
            <div>
                <LanguageSelector/>
                <ImageCaptureLoad/>
            </div>
        </LanguageProvider>
    );
};

export default ImageScanPage;
