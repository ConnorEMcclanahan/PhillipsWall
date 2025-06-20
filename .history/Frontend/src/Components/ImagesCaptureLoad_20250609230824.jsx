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
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
        }
    }));

    const fetchQuestionColors = async (questionId) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/question-color/${questionId}`);
            const data = await response.json();
            setPostItColors({
                color: data.color || '#feff9c',
                gradientColor: data.gradientColor,
            });
        } catch (err) {
            console.error('Error fetching question colors:', err);
            setPostItColors({ color: '#feff9c', gradientColor: null });
        } finally {
            setIsLoading(false);
        }
    };

    // Extract color from image (if available) or use question color
    useEffect(() => {
        if (modelResult?.question_id) {
            fetchQuestionColors(modelResult.question_id);
        }
        
        // If modelResult has a color property, use that directly
        if (modelResult?.color) {
            setPostItColors(prev => ({
                ...prev,
                color: modelResult.color
            }));
        }
    }, [modelResult]);

    // Update processImage function to add better debugging and error handling
    const processImage = async (imageData) => {
        if (!imageData || isProcessing) return;

        setIsProcessing(true);
        try {
            setIsLoading(true);
            console.log("Processing image - API URL:", `${API_BASE}/process-image`);
            
            // Don't compress the image - use the original approach that worked
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }), // Send the image as-is
            });
            
            console.log("Response status:", response.status);
            const result = await response.json();
            console.log("Received result:", result);
            
            // Create a default result if backend returns empty
            setModelResult(result || {
                answer: "Text could not be detected. Please try again or enter text manually.",
                question: "Who should be responsible for AI?",
                question_id: 1,
                color: "#FFEB3B"
            });
            
            setScanningStep('results');
        } catch (err) {
            console.error('Error processing image:', err);
            alert(`Error: ${err.message}. Please try again.`);
            setScanningStep('results');  // Still go to results so user can see preview
            setModelResult({
                answer: "Error processing image. Please try again.",
                question: "Processing Error",
                question_id: 1,
                color: "#FFEB3B"
            });
        } finally {
            setIsProcessing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (scanningStep === 'scanning' && videoRef.current && !videoRef.current.srcObject) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [scanningStep]);

    const startCamera = async () => {
        try {
            console.log("Attempting to start camera");
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });

            console.log("Camera started successfully");
            setStream(videoStream);
            setPreviewImage(null);

            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert("Couldn't access your camera. You can use the 'Upload photo instead' option below.");
            // Stay on scanning step so they can use the upload button
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Update the captureImage function to show loading state
    const captureImage = () => {
        if (!videoRef.current) return;

        try {
            // Show loading state
            setIsProcessing(true);
            
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg');
            console.log("Image captured, size:", Math.round(imageData.length/1024), "KB");
            
            // Save the preview image
            setPreviewImage(imageData);
            
            // Stop camera
            stopCamera();
            
            // Switch to loading step first before processing
            setScanningStep('loading');
            
            // Process image (which will eventually set to 'results')
            processImage(imageData);
        } catch (error) {
            console.error("Error capturing image:", error);
            alert("Error capturing image. Please try again.");
            setScanningStep('scanning');
        }
    };

    const handleRetry = () => {
        setPreviewImage(null);
        setModelResult(null);
        setPostItColors({ color: '#feff9c', gradientColor: null });
        setScanningStep('scanning');
    };

    const handleStartScan = () => {
        setScanningStep('scanning');
    };

    const handleBack = () => {
        if (scanningStep === 'results') {
            setScanningStep('preview');
        } else if (scanningStep === 'preview') {
            setScanningStep('scanning');
            startCamera();
        } else if (scanningStep === 'scanning') {
            stopCamera();
            setScanningStep('start');
        }
    };

    const handleIncorrectScan = () => {
        setPreviewImage(null);
        setModelResult(null);
        setScanningStep('scanning');
        startCamera();
    };

    const handleScanNew = () => {
        setPreviewImage(null);
        setModelResult(null);
        setPostItColors({ color: '#feff9c', gradientColor: null });
        setScanningStep('scanning');
        startCamera();
    };

    // Add a new function for the "Scan another" button after successful save
    const handleScanAnother = () => {
        setPreviewImage(null);
        setModelResult(null);
        setPostItColors({ color: '#feff9c', gradientColor: null });
        setScanningStep('scanning');
        startCamera();
    };

    const renderScanningInfo = () => (
        <Box className={styles.scanningContainer}>
            <Box className={styles.scanningContent}>
                <Box className={styles.scanningInfo}>
                    <Typography variant="h1" className={styles.scanningTitle}>
                        Scan your post-it here!
                    </Typography>
                    <Typography variant="h2" className={styles.scanningSubtitle}>
                        Ready to share your idea with the AI wall?
                    </Typography>
                </Box>

                <Box className={styles.rulesContainer}>
                    {/* Left column - Positive rules */}
                    <Box className={styles.positiveRules}>
                        <Box className={styles.ruleItem}>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>Only the post-it is in the photo</Typography>
                        </Box>
                        <Box className={styles.ruleItem}>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>The text is clearly readable</Typography>
                        </Box>
                        <Box className={styles.ruleItem}>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>Your idea will be added to the AI database</Typography>
                        </Box>
                        <Box className={styles.ruleItem}>
                            <CheckCircleIcon className={styles.checkMark} />
                            <Typography>Your post-it will be shown anonymously</Typography>
                        </Box>
                    </Box>
                    
                    {/* Right column - Negative rules */}
                    <Box className={styles.negativeRules}>
                        <Box className={styles.ruleItem}>
                            {/* Use same structure as positive rules */}
                            <span className={styles.crossMark}>✕</span>
                            <Typography>No personal data like names, email addresses or phone numbers</Typography>
                        </Box>
                        <Box className={styles.ruleItem}>
                            <span className={styles.crossMark}>✕</span>
                            <Typography>No hands, backgrounds, or unrelated objects</Typography>
                        </Box>
                        <Box className={styles.ruleItem}>
                            <span className={styles.crossMark}>✕</span>
                            <Typography>No swear words, hate speech, or harmful content allowed</Typography>
                        </Box>
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    className={styles.startButton}
                    onClick={handleStartScan}
                >
                    Start scanning
                </Button>
                <Typography variant="body2" className={styles.finePrint}>
                    By tapping "Start scanning", you agree that your input may be used for
                    research and public display in the AI exhibition.
                </Typography>
            </Box>
        </Box>
    );

    const renderCamera = () => (
        <Box className={styles.scanningContainer}>
            <Box className={styles.scanningContent}>
                <Box className={styles.scanningInfo}>
                    <Typography variant="h1" className={styles.scanningTitle}>
                        Take a picture
                    </Typography>
                    <Typography variant="h2" className={styles.scanningSubtitle}>
                        Ready to share your idea with the AI wall?
                    </Typography>
                </Box>
                
                {/* Camera viewfinder with border frame */}
                <Box className={styles.cameraViewfinderContainer}>
                    {/* Back button */}
                    <IconButton 
                        className={styles.cameraBackButton}
                        onClick={handleBack}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    
                    <Box className={styles.cameraViewfinder}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={styles.cameraFeed}
                        />
                        
                        {/* Corner brackets */}
                        <div className={`${styles.cornerBracket} ${styles.topLeft}`}></div>
                        <div className={`${styles.cornerBracket} ${styles.topRight}`}></div>
                        <div className={`${styles.cornerBracket} ${styles.bottomLeft}`}></div>
                        <div className={`${styles.cornerBracket} ${styles.bottomRight}`}></div>
                        
                        {/* Camera capture button positioned inside the viewfinder */}
                        <Button 
                            className={styles.captureButton}
                            onClick={captureImage}
                            aria-label="Take picture"
                        >
                            <div className={styles.innerCaptureButton}></div>
                        </Button>
                    </Box>
                </Box>

                {/* File upload fallback for tablets with camera issues */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="body2" className={styles.uploadFallbackText}>
                        Camera not working?
                    </Typography>
                    <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        sx={{ mt: 1 }}
                    >
                        Upload photo instead
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        const imageData = reader.result;
                                        setPreviewImage(imageData);
                                        stopCamera();
                                        setScanningStep('loading');
                                        processImage(imageData);
                                    };
                                    reader.readAsDataURL(e.target.files[0]);
                                }
                            }}
                        />
                    </Button>
                </Box>
            </Box>
        </Box>
    );

    const renderPreview = () => (
        <Box className={styles.previewContainer}>
            <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <IconButton onClick={handleBack} color="primary">
                    <ArrowBackIcon />
                </IconButton>
            </Box>
            <Typography variant="h5" sx={{ mb: 2 }}>Preview your post-it</Typography>
            <Box sx={{ position: 'relative', mb: 3 }}>
                <img
                    src={previewImage}
                    alt="Preview"
                    className={styles.previewImage}
                />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px' }}>
                <Button
                    variant="outlined"
                    onClick={handleRetry}
                    startIcon={<RetryIcon />}
                >
                    Retake
                </Button>
                <Button
                    variant="contained"
                    onClick={() => processImage(previewImage)}
                    disabled={isProcessing}
                    startIcon={<SendIcon />}
                >
                    Submit
                </Button>
            </Box>
        </Box>
    );

    // Fix the modelResult structure in the results page to match your backend
    const renderResults = () => {
        // Handle case where modelResult is still loading or null
        if (!modelResult) {
            return (
                <Box className={styles.scanningContainer}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                        <CircularProgress />
                    </Box>
                </Box>
            );
        }
        
        return (
            <Box className={styles.scanningContainer}>
                <IconButton 
                    className={styles.cameraBackButton}
                    onClick={handleBack}
                >
                    <ArrowBackIcon />
                </IconButton>
                
                <Box className={styles.successContainer}>
                    {/* Left side - Scanned post-it */}
                    <Box className={styles.scannedPostItContainer}>
                        <Box 
                            className={styles.scannedPostIt}
                            style={{ 
                                backgroundColor: modelResult.color || postItColors.color || '#B5EAE7' 
                            }}
                        >
                            <Typography className={styles.postItHeading}>
                                {modelResult.question || "Who should be responsible for AI?"}
                            </Typography>
                            <Typography className={styles.postItText}>
                                {modelResult.answer || "All the people that have designed it should be responsible for it!"}
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* Right side - Success message and buttons */}
                    <Box className={styles.successMessageContainer}>
                        <Typography variant="h1" className={styles.successHeading}>
                            Scanned successful!
                        </Typography>
                        <Typography className={styles.successMessage}>
                            Now... turn around and take a look at the AI wall!
                        </Typography>
                        <Typography className={styles.successSubmessage}>
                            Your idea will appear there shortly — and you can interact with other people's ideas too.
                        </Typography>
                        
                        <Box className={styles.successButtonsContainer}>
                            <Button 
                                variant="outlined" 
                                className={styles.incorrectScanButton}
                                onClick={handleIncorrectScan}
                            >
                                Incorrect scan
                            </Button>
                            <Button 
                                variant="contained" 
                                className={styles.scanNewButton}
                                onClick={saveToDatabase}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <CircularProgress size={20} sx={{ mr: 1 }} />
                                        Sending...
                                    </>
                                ) : (
                                    "Send to wall"
                                )}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        );
    };

    // Add this new function to render the loading screen
    const renderLoading = () => (
        <Box className={styles.scanningContainer}>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '70vh' 
            }}>
                <CircularProgress size={60} thickness={5} />
                <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                    Processing your post-it...
                </Typography>
                <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '80%' }}>
                    We're analyzing the text and preparing your contribution
                </Typography>
            </Box>
        </Box>
    );

    // Add this new function to save to database
    const saveToDatabase = async () => {
        if (!modelResult) return;
        
        try {
            setIsLoading(true);
            console.log("Saving to database:", modelResult);
            
            const response = await fetch(`${API_BASE}/answers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    answer: modelResult.answer || "No text detected",
                    question_id: modelResult.question_id || 1,
                    scan_date: new Date().toISOString(),
                    x_axis_value: Math.random(),
                    y_axis_value: Math.random(),
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save: ${errorText}`);
            }
            
            const result = await response.json();
            console.log("Save result:", result);
            
            // Store the answer ID in localStorage
            if (result.id) {
                localStorage.setItem('yourRecentAnswerId', result.id);
            }
            
            // Show success message
            alert('Successfully added to the wall!');
            
            // Reset and go back to start
            setPreviewImage(null);
            setModelResult(null);
            setScanningStep('start');
        } catch (err) {
            console.error('Error saving to database:', err);
            alert(`Error saving to wall: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderCurrentStep = () => {
        switch (scanningStep) {
            case 'start':
                return renderScanningInfo();
            case 'scanning':
                return renderCamera();
            case 'preview':
                return renderPreview();
            case 'loading':  // Add this new case
                return renderLoading();
            case 'results':
                return renderResults();
            default:
                return renderScanningInfo();
        }
    };

    return (
        <Box className={styles.scanningContainer}>
            {renderCurrentStep()}
        </Box>
    );
};

export default ImagesCaptureLoad;