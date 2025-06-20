import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    Typography,
    IconButton,
    Chip,
    CircularProgress,
} from '@mui/material';
import {
    Send as SendIcon,
    Replay as RetryIcon,
    CheckCircle as CheckCircleIcon,
    Language as LanguageIcon,
    Speed as SpeedIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import styles from './ImagesCaptureLoad.module.css';
import { styled } from "@mui/material/styles";
import translations from "../Pages/translations.json";
import { useLanguage } from "./LanguageContext";

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : `http://${window.location.hostname.replace('3000', '5000')}`;

console.log("Using API base:", API_BASE); // This will help debug

const ImagesCaptureLoad = () => {
    // Add a step state to track the flow
    const [scanningStep, setScanningStep] = useState('start'); // 'start', 'scanning', 'preview', 'loading', 'results'
    const [isLoading, setIsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [modelResult, setModelResult] = useState(null);
    const [postItColors, setPostItColors] = useState({ color: '#feff9c', gradientColor: null });
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { language } = useLanguage();
    const translate = (key) => translations[language]?.[key] || key;

    const PostItNote = styled(Card)(({ bgcolor = '#feff9c', gradientColor }) => ({
        background: gradientColor || bgcolor,
        borderRadius: '2px',
        boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.15)',
        transform: 'rotate(-1deg)',
        transition: 'transform 0.2s ease',
        '&:hover': {
            transform: 'rotate(0deg) scale(1.01)',
        },
        position: 'relative',
        minHeight: '200px',
        '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: '20px',
            width: '40px',
            height: '10px',
            background: 'rgba(0,0,0,0.1)',
        }orderBottomLeftRadius: '4px',
    }));dius: '4px',

    const fetchQuestionColors = async (questionId) => {
        try {
            setIsLoading(true);Id) => {
            const response = await fetch(`${API_BASE}/question-color/${questionId}`);
            const data = await response.json();IsLoading(true);
            setPostItColors({nse = await fetch(`http://localhost:5000/question-color/${questionId}`);
                color: data.color || '#feff9c',
                gradientColor: data.gradientColor,
            });or: data.color || '#feff9c',
        } catch (err) {ata.gradientColor,
            console.error('Error fetching question colors:', err);   });
            setPostItColors({ color: '#feff9c', gradientColor: null });  } catch (err) {
        } finally {            console.error('Error fetching question colors:', err);
            setIsLoading(false);Colors({ color: '#feff9c', gradientColor: null });
        }
    };

    useEffect(() => {
        if (modelResult?.question_id) {
            fetchQuestionColors(modelResult.question_id);
        }
    }, [modelResult?.question_id]);            fetchQuestionColors(modelResult.question_id);

    const processImage = async (imageData) => {Result?.question_id]);
        if (!imageData || isProcessing) return;

        setIsProcessing(true);cessing) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {st response = await fetch('http://localhost:5000/process-image', {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });
            const result = await response.json();SON.stringify({ image: imageData }),
            setModelResult(result);
            // Now set to results after processing completeson();
            setScanningStep('results');
        } catch (err) {results after processing completes
            console.error('Error processing image:', err);ningStep('results');
            // On error, go back to scanning
            setScanningStep('scanning'); processing image:', err);
            startCamera();   // On error, go back to scanning
        } finally {      setScanningStep('scanning');
            setIsProcessing(false);            startCamera();
            setIsLoading(false);
        }
    };alse);

    useEffect(() => {    };
        if (scanningStep === 'scanning' && videoRef.current && !videoRef.current.srcObject) {
            startCamera();
        }oRef.current.srcObject) {
tartCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());        return () => {
            }
        };   stream.getTracks().forEach((track) => track.stop());
    }, [scanningStep]);

    const startCamera = async () => {gStep]);
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ {
                video: { facingMode: 'environment' },
            });            const videoStream = await navigator.mediaDevices.getUserMedia({
: 'environment' },
            setStream(videoStream);
            setPreviewImage(null);
ideoStream);
            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
            }   if (videoRef.current) {
        } catch (err) {          videoRef.current.srcObject = videoStream;
            console.error('Error accessing camera:', err);            }
            setScanningStep('start');
        }rror('Error accessing camera:', err);
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);f (stream) {
        }      stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) {            setStream(null);
            videoRef.current.srcObject = null;
        }
    }; = null;
        }
    // Update the captureImage function to show loading state
    const captureImage = () => {
        if (!videoRef.current) return;    // Update the captureImage function to show loading state

        // Show loading state
        setIsProcessing(true);

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;reateElement('canvas');
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);rent.videoWidth;
        const imageData = canvas.toDataURL('image/jpeg');canvas.height = videoRef.current.videoHeight;
        ext('2d').drawImage(videoRef.current, 0, 0);
        // Save the preview imageta = canvas.toDataURL('image/jpeg');
        setPreviewImage(imageData);
        
        // Stop camera
        stopCamera();
        
        // Switch to loading step first before processing
        setScanningStep('loading');  
                // Switch to loading step first before processing
        // Process image (which will eventually set to 'results')g');
        processImage(imageData);
    };ch will eventually set to 'results')

    const handleRetry = () => {
        setPreviewImage(null);
        setModelResult(null);    const handleRetry = () => {
        setPostItColors({ color: '#feff9c', gradientColor: null });
        setScanningStep('scanning');
    };  setPostItColors({ color: '#feff9c', gradientColor: null });
        setScanningStep('scanning');
    const handleStartScan = () => {
        setScanningStep('scanning');
    };

    const handleBack = () => {
        if (scanningStep === 'results') {
            setScanningStep('preview');
        } else if (scanningStep === 'preview') {=== 'results') {
            setScanningStep('scanning'););
            startCamera(); else if (scanningStep === 'preview') {
        } else if (scanningStep === 'scanning') {      setScanningStep('scanning');
            stopCamera();            startCamera();
            setScanningStep('start');anning') {
        }
    };start');

    const handleIncorrectScan = () => {
        setPreviewImage(null);
        setModelResult(null);    const handleIncorrectScan = () => {
        setScanningStep('scanning');
        startCamera();
    };ning');

    const handleScanNew = () => {
        setPreviewImage(null);
        setModelResult(null);nst handleScanNew = () => {
        setPostItColors({ color: '#feff9c', gradientColor: null });        setPreviewImage(null);
        setScanningStep('scanning');
        startCamera();ntColor: null });
    };

    const renderScanningInfo = () => (
        <Box className={styles.scanningContainer}>
            <Box className={styles.scanningContent}> => (
                <Box className={styles.scanningInfo}>
                    <Typography variant="h1" className={styles.scanningTitle}>
                        Scan your post-it here!tyles.scanningInfo}>
                    </Typography>ypography variant="h1" className={styles.scanningTitle}>
                    <Typography variant="h2" className={styles.scanningSubtitle}>                        Scan your post-it here!
                        Ready to share your idea with the AI wall?
                    </Typography>styles.scanningSubtitle}>
                </Box>AI wall?

                <Box className={styles.rulesContainer}>
                    {/* Left column - Positive rules */}
                    <Box className={styles.positiveRules}>={styles.rulesContainer}>
                        <Box className={styles.ruleItem}>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>Only the post-it is in the photo</Typography>
                        </Box>heckCircleIcon className={styles.checkMark} />
                        <Box className={styles.ruleItem}>is in the photo</Typography>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>The text is clearly readable</Typography>
                        </Box>heckCircleIcon className={styles.checkMark} />
                        <Box className={styles.ruleItem}>ly readable</Typography>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>Your idea will be added to the AI database</Typography>
                        </Box>heckCircleIcon className={styles.checkMark} />
                        <Box className={styles.ruleItem}>  <Typography>Your idea will be added to the AI database</Typography>
                            <CheckCircleIcon className={styles.checkMark} />    </Box>
                            <Typography>Your post-it will be shown anonymously</Typography>
                        </Box>yles.checkMark} />
                    </Box> be shown anonymously</Typography>
                    
                    {/* Right column - Negative rules */}
                    <Box className={styles.negativeRules}>
                        <Box className={styles.ruleItem}>column - Negative rules */}
                            {/* Use same structure as positive rules */}>
                            <span className={styles.crossMark}>✕</span>
                            <Typography>No personal data like names, email addresses or phone numbers</Typography>
                        </Box>pan className={styles.crossMark}>✕</span>
                        <Box className={styles.ruleItem}>like names, email addresses or phone numbers</Typography>
                            <span className={styles.crossMark}>✕</span>
                            <Typography>No hands, backgrounds, or unrelated objects</Typography>
                        </Box>pan className={styles.crossMark}>✕</span>
                        <Box className={styles.ruleItem}>  <Typography>No hands, backgrounds, or unrelated objects</Typography>
                            <span className={styles.crossMark}>✕</span>  </Box>
                            <Typography>No swear words, hate speech, or harmful content allowed</Typography>                        <Box className={styles.ruleItem}>
                        </Box>     <span className={styles.crossMark}>✕</span>
                    </Box>>No swear words, hate speech, or harmful content allowed</Typography>
                </Box>

                <Button/Box>
                    variant="contained"
                    className={styles.startButton}
                    onClick={handleStartScan}
                >
                    Start scanning
                </Button>
                <Typography variant="body2" className={styles.finePrint}>  Start scanning
                    By tapping "Start scanning", you agree that your input may be used for  </Button>
                    research and public display in the AI exhibition.          <Typography variant="body2" className={styles.finePrint}>
                </Typography>                    By tapping "Start scanning", you agree that your input may be used for
            </Box> public display in the AI exhibition.
        </Box>
    );

    const renderCamera = () => (
        <Box className={styles.scanningContainer}>
            <Box className={styles.scanningContent}>
                <Box className={styles.scanningInfo}>
                    <Typography variant="h1" className={styles.scanningTitle}>
                        Take a picturetyles.scanningInfo}>
                    </Typography>ypography variant="h1" className={styles.scanningTitle}>
                    <Typography variant="h2" className={styles.scanningSubtitle}>        Take a picture
                        Ready to share your idea with the AI wall?
                    </Typography>nningSubtitle}>
                </Box>your idea with the AI wall?
                >
                {/* Camera viewfinder with border frame */}
                <Box className={styles.cameraViewfinderContainer}>
                    {/* Back button */}amera viewfinder with border frame */}
                    <IconButton meraViewfinderContainer}>
                        className={styles.cameraBackButton}on */}
                        onClick={handleBack}<IconButton 
                    >
                        <ArrowBackIcon />k={handleBack}
                    </IconButton>
                    on />
                    <Box className={styles.cameraViewfinder}>
                        <video
                            ref={videoRef}lassName={styles.cameraViewfinder}>
                            autoPlay<video
                            playsInline
                            className={styles.cameraFeed}
                        />
                        
                        {/* Corner brackets */}
                        <div className={`${styles.cornerBracket} ${styles.topLeft}`}></div>
                        <div className={`${styles.cornerBracket} ${styles.topRight}`}></div>
                        <div className={`${styles.cornerBracket} ${styles.bottomLeft}`}></div>ssName={`${styles.cornerBracket} ${styles.topLeft}`}></div>
                        <div className={`${styles.cornerBracket} ${styles.bottomRight}`}></div>ket} ${styles.topRight}`}></div>
                        cornerBracket} ${styles.bottomLeft}`}></div>
                        {/* Camera capture button positioned inside the viewfinder */}nerBracket} ${styles.bottomRight}`}></div>
                        <Button 
                            className={styles.captureButton}inder */}
                            onClick={captureImage}
                            aria-label="Take picture"  className={styles.captureButton}
                        >      onClick={captureImage}
                            <div className={styles.innerCaptureButton}></div>          aria-label="Take picture"
                        </Button>          >
                    </Box>                      <div className={styles.innerCaptureButton}></div>
                </Box>                        </Button>
            </Box>
        </Box>
    );

    const renderPreview = () => (
        <Box className={styles.previewContainer}>
            <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>eview = () => (
                <IconButton onClick={handleBack} color="primary">
                    <ArrowBackIcon />left: 16, zIndex: 10 }}>
                </IconButton>nButton onClick={handleBack} color="primary">
            </Box>
            <Typography variant="h5" sx={{ mb: 2 }}>Preview your post-it</Typography>
            <Box sx={{ position: 'relative', mb: 3 }}>
                <imgraphy variant="h5" sx={{ mb: 2 }}>Preview your post-it</Typography>
                    src={previewImage}x={{ position: 'relative', mb: 3 }}>
                    alt="Preview"
                    className={styles.previewImage}={previewImage}
                />
            </Box>viewImage}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px' }}>
                <Button>
                    variant="outlined"play: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px' }}>
                    onClick={handleRetry}
                    startIcon={<RetryIcon />}iant="outlined"
                >y}
                    Retake
                </Button>
                <Button
                    variant="contained"/Button>
                    onClick={() => processImage(previewImage)}
                    disabled={isProcessing}nt="contained"
                    startIcon={<SendIcon />}  onClick={() => processImage(previewImage)}
                >      disabled={isProcessing}
                    Submit              startIcon={<SendIcon />}
                </Button>                >
            </Box>
        </Box>
    );

    // Fix the modelResult structure in the results page to match your backend
    const renderResults = () => {
        // Handle case where modelResult is still loading or null
        if (!modelResult) {
            return (re modelResult is still loading or null
                <Box className={styles.scanningContainer}>lt) {
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>turn (
                        <CircularProgress />       <Box className={styles.scanningContainer}>
                    </Box>            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                </Box>        <CircularProgress />
            );
        }
        
        return (
            <Box className={styles.scanningContainer}>
                <IconButton 
                    className={styles.cameraBackButton}tyles.scanningContainer}>
                    onClick={handleBack}<IconButton 
                >
                    <ArrowBackIcon />
                </IconButton>
                kIcon />
                <Box className={styles.successContainer}>
                    {/* Left side - Scanned post-it */}
                    <Box className={styles.scannedPostItContainer}>
                        <Box ide - Scanned post-it */}
                            className={styles.scannedPostIt}className={styles.scannedPostItContainer}>
                            style={{ 
                                backgroundColor: modelResult.color || postItColors.color || '#B5EAE7' 
                            }}
                        >postItColors.color || '#B5EAE7' 
                            <Typography className={styles.postItHeading}>
                                {modelResult.question || "Who should be responsible for AI?"}
                            </Typography>ypography className={styles.postItHeading}>
                            <Typography className={styles.postItText}>      {modelResult.question || "Who should be responsible for AI?"}
                                {modelResult.answer || "All the people that have designed it should be responsible for it!"}        </Typography>
                            </Typography>}>
                        </Box>le that have designed it should be responsible for it!"}
                    </Box>
                    
                    {/* Right side - Success message and buttons */}
                    <Box className={styles.successMessageContainer}>
                        <Typography variant="h1" className={styles.successHeading}>
                            Scanned successful!tyles.successMessageContainer}>
                        </Typography>sHeading}>
                        <Typography className={styles.successMessage}>
                            Now... turn around and take a look at the AI wall!
                        </Typography><Typography className={styles.successMessage}>
                        <Typography className={styles.successSubmessage}> wall!
                            Your idea will appear there shortly — and you can interact with other people's ideas too.>
                        </Typography>es.successSubmessage}>
                        you can interact with other people's ideas too.
                        <Box className={styles.successButtonsContainer}>
                            <Button 
                                variant="outlined" ccessButtonsContainer}>
                                className={styles.incorrectScanButton}
                                onClick={handleIncorrectScan}ant="outlined" 
                            >correctScanButton}
                                Incorrect scanned
                            </Button>
                            <Button    Incorrect scanned
                                variant="contained" 
                                className={styles.scanNewButton}
                                onClick={handleScanNew}  variant="contained" 
                            >      className={styles.scanNewButton}
                                Scan new post-it          onClick={handleScanNew}
                            </Button>          >
                        </Box>                      Scan new post-it
                    </Box>                      </Button>
                </Box>                        </Box>
            </Box>
        );
    };

    // Add this new function to render the loading screen
    const renderLoading = () => (
        <Box className={styles.scanningContainer}> loading screen
            <Box sx={{ 
                display: 'flex', scanningContainer}>
                flexDirection: 'column',x sx={{ 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '70vh' 
            }}>center', 
                <CircularProgress size={60} thickness={5} />
                <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                    Processing your post-it...ress size={60} thickness={5} />
                </Typography>ypography variant="h5" sx={{ mt: 4, mb: 2 }}>
                <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '80%' }}>      Processing your post-it...
                    We're analyzing the text and preparing your contribution          </Typography>
                </Typography>                <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '80%' }}>
            </Box>he text and preparing your contribution
        </Box>
    );

    const renderCurrentStep = () => {
        switch (scanningStep) {
            case 'start': = () => {
                return renderScanningInfo();
            case 'scanning':
                return renderCamera();fo();
            case 'preview'::
                return renderPreview();
            case 'loading':  // Add this new caseeview':
                return renderLoading();
            case 'results':   case 'loading':  // Add this new case
                return renderResults();          return renderLoading();
            default:            case 'results':
                return renderScanningInfo();    return renderResults();
        }
    };ningInfo();

    return (
        <Box className={styles.scanningContainer}>
            {renderCurrentStep()}    return (
        </Box>anningContainer}>




export default ImagesCaptureLoad;};    );            {renderCurrentStep()}
        </Box>
    );
};

export default ImagesCaptureLoad;