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

const API_BASE = `http://${window.location.hostname}:5000`;

const ImagesCaptureLoad = () => {
    // Add a step state to track the flow
    const [scanningStep, setScanningStep] = useState('start'); // 'start', 'scanning', 'preview', 'results'
    const [isLoading, setIsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [modelResult, setModelResult] = useState(null);
    const [postItColors, setPostItColors] = useState({ color: '#feff9c', gradientColor: null });
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [validationStatus, setValidationStatus] = useState(null); // 'valid', 'invalid', null

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

    useEffect(() => {
        if (modelResult?.question_id) {
            fetchQuestionColors(modelResult.question_id);
        }
    }, [modelResult?.question_id]);

    const processImage = async (imageData) => {
        if (!imageData || isProcessing) return;

        setIsProcessing(true);
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });
            
            const result = await response.json();
            
            // Check if the scan was successful
            if (result && (result.answer || result.text)) {
                setModelResult(result);
                setValidationStatus('valid');
                setScanningStep('results');
            } else {
                // Invalid scan - no text detected
                setValidationStatus('invalid');
                setScanningStep('results');
            }
        } catch (err) {
            console.error('Error processing image:', err);
            setValidationStatus('invalid');
            setScanningStep('results');
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

    // Updated startCamera function - instead of showing errors, redirect to upload flow
    const startCamera = async () => {
        console.log("Starting camera...");
        
        try {
            // Try to access camera
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log("Using modern mediaDevices API");
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                setStream(videoStream);
                setPreviewImage(null);

                if (videoRef.current) {
                    videoRef.current.srcObject = videoStream;
                }
            } else {
                // If camera API not available, go to upload flow instead of error
                console.log("Camera API not available, switching to upload flow");
                setScanningStep('upload');
            }
        } catch (err) {
            // On any camera error, go to upload flow instead of showing error
            console.log("Camera access failed, switching to upload flow");
            setScanningStep('upload');
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

    // Modify the captureImage function to skip preview
    const captureImage = () => {
        if (!videoRef.current) return;

        // Show loading state
        setIsProcessing(true);

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Save the preview image
        setPreviewImage(imageData);
        
        // Stop camera
        stopCamera();
        
        // Process image directly - will set scanningStep to 'results' when done
        processImage(imageData);
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

    const saveToDatabase = async () => {
        if (!modelResult) return;
        
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE}/save-answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    answer: modelResult.answer || modelResult.text,
                    question_id: modelResult.question_id,
                    scan_date: new Date().toISOString(), // Add current timestamp
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success message
                console.log('Successfully added to the AI wall!');
                // Reset the form after successful submission
                handleScanNew();
            }
        } catch (err) {
            console.error('Error saving to database:', err);
        } finally {
            setIsLoading(false);
        }
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

                {/* Add this section for upload option */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography sx={{ mb: 2 }}>
                        Camera not working?
                    </Typography>
                    <Button
                        variant="outlined"
                        component="label"
                    >
                        Upload Photo Instead
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            hidden
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        setPreviewImage(event.target.result);
                                        stopCamera();
                                        setScanningStep('preview');
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
        // Handle case where we're still loading
        if (isLoading) {
            return (
                <Box className={styles.scanningContainer}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Processing your post-it...</Typography>
                    </Box>
                </Box>
            );
        }
        
        // Invalid scan case
        if (validationStatus === 'invalid' || !modelResult) {
            return (
                <Box className={styles.scanningContainer}>
                    <IconButton className={styles.cameraBackButton} onClick={handleBack}>
                        <ArrowBackIcon />
                    </IconButton>
                    
                    <Box className={styles.errorContainer} 
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 3 }}>
                        <Typography variant="h5" sx={{ color: 'error.main', mb: 2 }}>
                            Scan failed
                        </Typography>
                        <Typography sx={{ mb: 3, textAlign: 'center' }}>
                            We couldn't read your post-it. Make sure it's well-lit and the text is clear.
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={handleIncorrectScan}
                            sx={{ mt: 2 }}
                        >
                            Try again
                        </Button>
                    </Box>
                </Box>
            );
        }
        
        // Valid scan case
        return (
            <Box className={styles.scanningContainer}>
                <IconButton className={styles.cameraBackButton} onClick={handleBack}>
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
                                {modelResult.question || "Does this look correct?"}
                            </Typography>
                            <Typography className={styles.postItText}>
                                {modelResult.answer || modelResult.text || "We couldn't detect text clearly"}
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* Right side - Confirmation message and buttons */}
                    <Box className={styles.successMessageContainer}>
                        <Typography variant="h1" className={styles.successHeading}>
                            Is this correct?
                        </Typography>
                        <Typography className={styles.successMessage}>
                            Please confirm that we've scanned your post-it correctly.
                        </Typography>
                        
                        <Box className={styles.successButtonsContainer}>
                            <Button 
                                variant="outlined" 
                                className={styles.incorrectScanButton}
                                onClick={handleIncorrectScan}
                            >
                                No, rescan
                            </Button>
                            <Button 
                                variant="contained" 
                                className={styles.scanNewButton}
                                onClick={saveToDatabase}
                                disabled={isLoading}
                            >
                                Yes, add to wall
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        );
    };

    // Add this function to render the upload option
    const renderUpload = () => (
        <Box className={styles.scanningContainer}>
            <Box className={styles.scanningContent}>
                <Box className={styles.scanningInfo}>
                    <Typography variant="h1" className={styles.scanningTitle}>
                        Upload your post-it photo
                    </Typography>
                    <Typography variant="h2" className={styles.scanningSubtitle}>
                        Take a photo with your camera app first
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3 }}>
                    <Box className={styles.uploadInstructions} sx={{ mb: 4, px: 2 }}>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
                            Follow these steps:
                        </Typography>
                        <ol style={{ textAlign: 'left' }}>
                            <li>Exit this app</li>
                            <li>Open your device's camera app</li>
                            <li>Take a clear photo of your post-it note</li>
                            <li>Return here and tap "Upload Photo"</li>
                        </ol>
                    </Box>
                    
                    <Button
                        variant="contained"
                        component="label"
                        sx={{ mt: 2, mb: 2, px: 4, py: 1.5 }}
                    >
                        Upload Photo
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        setPreviewImage(event.target.result);
                                        // Process image immediately instead of going to preview
                                        processImage(event.target.result);
                                    };
                                    reader.readAsDataURL(e.target.files[0]);
                                }
                            }}
                        />
                    </Button>
                    
                    <Button
                        variant="outlined"
                        onClick={() => setScanningStep('start')}
                        sx={{ mt: 2 }}
                    >
                        Back to Start
                    </Button>
                </Box>
            </Box>
        </Box>
    );

    // Update renderCurrentStep to include the new upload option
    const renderCurrentStep = () => {
        switch (scanningStep) {
            case 'start':
                return renderScanningInfo();
            case 'scanning':
                return renderCamera();
            case 'preview':
                return renderPreview();
            case 'results':
                return renderResults();
            case 'upload':  // Add this case
                return renderUpload();
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