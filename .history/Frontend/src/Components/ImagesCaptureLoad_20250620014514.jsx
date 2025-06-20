import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box, Button, Card, Typography, IconButton, CircularProgress,
} from '@mui/material';
import {
    Send as SendIcon,
    Replay as RetryIcon,
    CheckCircle as CheckCircleIcon,
    ArrowBack as ArrowBackIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import styles from './ImagesCaptureLoad.module.css';
import { styled } from "@mui/material/styles";
import translations from "../Pages/translations.json";
import { useLanguage } from "./LanguageContext";
import config from '../config';
import Webcam from 'react-webcam';

const { API_BASE } = config;

const ImagesCaptureLoad = () => {
    // Get language and setLanguage from context
    const { language, setLanguage } = useLanguage();
    
    // Create translate function
    const translate = (key) => {
        return translations[language]?.[key] || key;
    };

    // Core state
    const [scanningStep, setScanningStep] = useState('start'); 
    const [isLoading, setIsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [modelResult, setModelResult] = useState(null);
    const [postItColors, setPostItColors] = useState({ color: '#feff9c', gradientColor: null });
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanError, setScanError] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [userExitedFullscreen, setUserExitedFullscreen] = useState(false);
    const captureContainerRef = useRef(null);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

    // New state for questions data
    const [questionsData, setQuestionsData] = useState([]);
    const [questionColorMap, setQuestionColorMap] = useState({}); // New state for color map

    // Styled Post-it component 
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

    // Reset all scanning states - consolidated from multiple redundant functions
    const resetScanState = (targetStep = 'scanning', startCam = true) => {
        setPreviewImage(null);
        setModelResult(null);
        setPostItColors({ color: '#feff9c', gradientColor: null });
        setScanError(null);
        setScanningStep(targetStep);
        
        if (startCam && targetStep === 'scanning') {
            startCamera();
        }
    };

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

    // Apply colors when model result changes
    useEffect(() => {
        if (modelResult?.question_id) {
            fetchQuestionColors(modelResult.question_id);
        }
        
        if (modelResult?.color) {
            setPostItColors(prev => ({
                ...prev,
                color: modelResult.color
            }));
        }
    }, [modelResult]);

    // Update the processImage function to not worry about extracting color
    const processImage = async (imageData) => {
        try {
            setIsProcessing(true);
            setScanError(null);
            
            console.log("Sending image data to backend...");
            
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Processing result:", result);
            
            // Create normalized result with question ID but don't use color from image
            const normalizedResult = {
                answer: result.answer || result.answer_text || "",
                question: result.question || result.question_text || "What are your thoughts on AI?",
                question_id: parseInt(result.question_id) || 1,
                
                // Don't extract color from the image/AI response
                // color: result.post_it_color || result.color || '#feff9c',
                
                language: result.language || result.answer_language || "en",
                x_axis_value: parseFloat(result.x) || parseFloat(result.x_axis_value) || null,
                y_axis_value: parseFloat(result.y) || parseFloat(result.y_axis_value) || null
            };
            
            setModelResult(normalizedResult);
            setScanningStep('results');
        } catch (err) {
            console.error('Error processing image:', err);
            setScanError(err.message);
            
            // Create fallback result for manual entry
            setModelResult({
                answer: "",
                question: "What are your thoughts on AI?",
                question_id: 1,
                color: '#feff9c'
            });
            setScanningStep('results');
        } finally {
            setIsProcessing(false);
            setIsLoading(false);
        }
    };

    // Camera management
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

    // Update the startCamera function to include zoom constraints
    const startCamera = async () => {
        try {
            console.log("Starting camera");
            
            // Try to get camera with advanced constraints including zoom
            const constraints = {
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    // Add advanced constraints for zoom where supported
                    advanced: [
                        { zoom: 5 }  // Request 2.2x zoom level
                    ]
                },
            };

            const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(videoStream);
            setPreviewImage(null);

            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
                
                // Try to set zoom using the MediaTrackCapabilities API
                const videoTrack = videoStream.getVideoTracks()[0];
                if (videoTrack) {
                    try {
                        const capabilities = videoTrack.getCapabilities();
                        // Check if zoom is supported by the device
                        if (capabilities.zoom) {
                            await videoTrack.applyConstraints({ advanced: [{ zoom: 2.2 }] });
                            console.log("Applied 2.2x zoom via camera API");
                        } else {
                            // If hardware zoom isn't available, we'll use CSS scale instead
                            console.log("Hardware zoom not supported, using CSS zoom");
                            if (videoRef.current) {
                                videoRef.current.style.transform = "scale(2.2)";
                                videoRef.current.style.transformOrigin = "center";
                            }
                        }
                    } catch (e) {
                        console.log("Zoom constraints error, using CSS fallback:", e);
                        if (videoRef.current) {
                            videoRef.current.style.transform = "scale(2.2)";
                            videoRef.current.style.transformOrigin = "center";
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Camera access error:', err);
            alert("Couldn't access your camera. You can use the 'Upload photo instead' option below.");
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

    // Enhanced image capture with better quality and processing
    const captureImage = () => {
        if (!videoRef.current) return;

        try {
            setIsProcessing(true);
            
            const canvas = document.createElement('canvas');
            const width = videoRef.current.videoWidth;
            const height = videoRef.current.videoHeight;
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            
            // Enhance contrast and brightness for better OCR
            ctx.filter = 'contrast(1.4) brightness(1.1)';
            ctx.drawImage(videoRef.current, 0, 0, width, height);
            
            // Use high quality to preserve text details
            const imageData = canvas.toDataURL('image/jpeg', 0.92);
            
            setPreviewImage(imageData);
            stopCamera();
            setScanningStep('loading');
            processImage(imageData);
        } catch (error) {
            console.error("Capture error:", error);
            setScanError(error.message);
        }
    };

    // Save to database with proper error handling and format
    const saveToDatabase = async () => {
        if (!modelResult) return;
        
        try {
            setIsLoading(true);
            
            const payload = {
                // Include the original answer fields
                answer_text: modelResult.answer || "No text detected",
                question_id: parseInt(modelResult.question_id) || 1,
                
                // Include the detected values from AI
                color: modelResult.color || '#feff9c',
                
                // Add positioning if available
                x_axis_value: modelResult.x_axis_value || Math.random() * 0.8 + 0.1, // Random position if none available
                y_axis_value: modelResult.y_axis_value || Math.random() * 0.8 + 0.1,

                // Include a save flag to indicate this should be saved to database
                save_to_database: true,
                
                // Add an empty placeholder image to satisfy the backend
                image: "" // This is a workaround to prevent the KeyError
            };
            
            console.log("Saving via process-image endpoint:", payload);
            
            // Use process-image endpoint instead of answers
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${errorText}`);
            }
            
            try {
                const result = await response.json();
                console.log("Save result:", result);
                
                if (result && (result.id || result.answer_id)) {
                    const answerId = result.id || result.answer_id;
                    localStorage.setItem('yourRecentAnswerId', answerId);
                    
                    // Fix: Dispatch the correct event with answer_id included
                    const newPostEvent = new CustomEvent('newAnswerSubmitted', {
                        detail: { answer_id: answerId }
                    });
                    window.dispatchEvent(newPostEvent);
                    console.log("Dispatched newAnswerSubmitted event with ID:", answerId);
                }
                
            } catch (parseErr) {
                // Response may not be JSON but could still be successful
                if (response.ok) {
                    console.log("Non-JSON successful response");
                } else {
                    throw parseErr;
                }
            }
            
            alert('Successfully added to the wall!');
            resetScanState('start', false);
        } catch (err) {
            console.error('Save error:', err);
            alert(`Error saving: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Navigation handling simplified
    const handleBack = () => {
        // Prevent potential browser fullscreen exit during navigation
        event?.preventDefault?.();
        
        // Keep track of current fullscreen state
        const wasFullscreen = !!document.fullscreenElement;
        
        // Navigate between steps
        if (scanningStep === 'results') {
            setScanningStep('preview');
        } else if (scanningStep === 'preview') {
            setScanningStep('scanning');
        } else if (scanningStep === 'scanning') {
            stopCamera();
            setScanningStep('start');
        }
        
        // If we were in fullscreen, make sure we restore it after navigation
        if (wasFullscreen && !userExitedFullscreen) {
            // Short delay to allow the DOM to update
            setTimeout(() => {
                if (!document.fullscreenElement) {
                    toggleFullScreen(false);
                }
            }, 100);
        }
    };

    // Fullscreen handling
    const isPWA = () => {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    };

    // Create a ref to track fullscreen transition state
    const fullscreenTransitionRef = useRef(false);
    const fullscreenTimerRef = useRef(null);

    // Single consolidated fullscreen management
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
            fullscreenTransitionRef.current = false;
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        
        // Controlled entrance to fullscreen mode with debouncing
        const ensureFullscreen = (debounceTime = 300) => {
            // Don't try to re-enter fullscreen if we're already in transition
            if (fullscreenTransitionRef.current || document.fullscreenElement || userExitedFullscreen) {
                return;
            }
            
            // Clear any pending fullscreen attempts
            if (fullscreenTimerRef.current) {
                clearTimeout(fullscreenTimerRef.current);
            }
            
            fullscreenTimerRef.current = setTimeout(() => {
                if (!document.fullscreenElement && !userExitedFullscreen) {
                    console.log("Ensuring fullscreen mode...");
                    fullscreenTransitionRef.current = true;
                    
                    const element = captureContainerRef.current || document.documentElement;
                    
                    if (element.requestFullscreen) {
                        element.requestFullscreen().catch(err => {
                            fullscreenTransitionRef.current = false;
                            console.log("Fullscreen error:", err);
                        });
                    } else if (element.webkitRequestFullscreen) {
                        element.webkitRequestFullscreen().catch(err => {
                            fullscreenTransitionRef.current = false;
                            console.log("Fullscreen error:", err);
                        });
                    } else if (element.mozRequestFullScreen) {
                        element.mozRequestFullScreen().catch(err => {
                            fullscreenTransitionRef.current = false;
                            console.log("Fullscreen error:", err);
                        });
                    } else if (element.msRequestFullscreen) {
                        element.msRequestFullscreen().catch(err => {
                            fullscreenTransitionRef.current = false;
                            console.log("Fullscreen error:", err);
                        });
                    }
                }
            }, debounceTime);
        };
        
        // Initial attempt to go fullscreen (longer delay to ensure UI is ready)
        ensureFullscreen(800);
        
        // Check fullscreen status after scanning step changes (with debouncing)
        if (scanningStep && !userExitedFullscreen) {
            ensureFullscreen(500);
        }
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            
            if (fullscreenTimerRef.current) {
                clearTimeout(fullscreenTimerRef.current);
            }
        };
    }, [scanningStep, userExitedFullscreen]);

    // Update the toggleFullScreen function to respect the transition state
    const toggleFullScreen = async (isUserAction = true) => {
        try {
            if (fullscreenTransitionRef.current) {
                return; // Don't toggle during transition
            }
            
            fullscreenTransitionRef.current = true;
            
            if (!document.fullscreenElement) {
                if (!isUserAction && userExitedFullscreen) {
                    fullscreenTransitionRef.current = false;
                    return;
                }
                
                const element = captureContainerRef.current || document.documentElement;
                await element.requestFullscreen();
                setUserExitedFullscreen(false);
            } else {
                await document.exitFullscreen();
                
                if (isUserAction) {
                    setUserExitedFullscreen(true);
                }
            }
            
            setIsFullScreen(!isFullScreen);
        } catch (err) {
            console.error('Fullscreen API error:', err);
        } finally {
            fullscreenTransitionRef.current = false;
        }
    };

    // Detect orientation changes
    useEffect(() => {
        const handleResize = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch questions data on component mount
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await fetch(`${API_BASE}/questions`);
                const data = await response.json();
                setQuestionsData(data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        };
        
        fetchQuestions();
    }, []);

    // Modify your code that creates the color map
    useEffect(() => {
        const map = {};
        for (const q of questionsData) {
            // Force string keys for consistent lookup
            map[String(q.question_id)] = q.color;
            // Also add numeric key for safety
            map[q.question_id] = q.color;
        }
        
        console.log("Created color map:", map);
        setQuestionColorMap(map);
    }, [questionsData]);

    // Then update your getQuestionColor to handle both string and number types
    const getQuestionColor = useCallback((questionId) => {
        // Add debugging
        console.log("Color mapping debug:", {
            questionId: questionId,
            availableMaps: Object.keys(questionColorMap),
            requestedColor: questionColorMap[questionId],
            fallbackUsed: !questionColorMap[questionId]
        });
        
        return questionColorMap[questionId] || '#7EDDDE';
    }, [questionColorMap]);

    // Add this in your component
    useEffect(() => {
        console.log("Current language:", language);
        
        // This will force all text to update when language changes
        if (scanningStep) {
            // Force re-render by setting state
            setScanningStep(scanningStep);
        }
    }, [language]);

    // Add this custom component for the language toggle
    const LanguageToggle = ({ onToggle, currentLang }) => {
        return (
            <Box 
                className={styles.languageToggle}
                sx={{
                    display: 'flex',
                    position: 'absolute',
                    right: '0', // Changed from 20px
                    top: '22px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.2)',
                    width: '80px', // Fixed width
                    height: '30px', // Fixed height
                }}
            >
                <Box
                    onClick={() => onToggle('en')}
                    sx={{
                        padding: '4px 0',
                        cursor: 'pointer',
                        backgroundColor: currentLang === 'en' ? '#000' : '#fff',
                        color: currentLang === 'en' ? '#fff' : '#000',
                        fontWeight: 500,
                        fontSize: '14px',
                        transition: 'all 0.3s ease',
                        width: '50%',
                        textAlign: 'center',
                    }}
                >
                    EN
                </Box>
                <Box
                    onClick={() => onToggle('nl')}
                    sx={{
                        padding: '4px 0',
                        cursor: 'pointer',
                        backgroundColor: currentLang === 'nl' ? '#000' : '#fff',
                        color: currentLang === 'nl' ? '#fff' : '#000',
                        fontWeight: 500,
                        fontSize: '14px',
                        transition: 'all 0.3s ease',
                        width: '50%',
                        textAlign: 'center',
                    }}
                >
                    NL
                </Box>
            </Box>
        );
    };

    // Render functions
    const renderScanningInfo = () => {
        // Add language toggle handler
        const handleLanguageToggle = (newLang) => {
            console.log("Language toggled to:", newLang);
            if (setLanguage) {
                setLanguage(newLang);
            }
        };
        
        return (
            <Box className={styles.scanningContainer}>
                <Box className={styles.scanningContent}>
                    <Box className={styles.scanningInfo} sx={{ position: 'relative' }}>
                        <Typography variant="h1" className={styles.scanningTitle}>
                            {translate('scanYourPostItHere')}
                        </Typography>
                        
                        <LanguageToggle 
                            onToggle={handleLanguageToggle} 
                            currentLang={language} 
                        />
                        
                        <Typography variant="h2" className={styles.scanningSubtitle}>
                            {translate('readyToShareYourIdea')}
                        </Typography>
                    </Box>

                    <Box className={styles.rulesContainer}>
                        {/* Left column - Positive rules */}
                        <Box className={styles.positiveRules}>
                            <Box className={styles.ruleItem}>
                                <CheckCircleIcon className={styles.checkMark} />
                                <Typography>{translate('onlyPostItInPhoto')}</Typography>
                            </Box>
                            <Box className={styles.ruleItem}>
                                <CheckCircleIcon className={styles.checkMark} />
                                <Typography>{translate('textClearlyReadable')}</Typography>
                            </Box>
                            <Box className={styles.ruleItem}>
                                <CheckCircleIcon className={styles.checkMark} />
                                <Typography>{translate('ideaAddedToDatabase')}</Typography>
                            </Box>
                            <Box className={styles.ruleItem}>
                                <CheckCircleIcon className={styles.checkMark} />
                                <Typography>{translate('postItShownAnonymously')}</Typography>
                            </Box>
                        </Box>
                        
                        {/* Right column - Negative rules */}
                        <Box className={styles.negativeRules}>
                            <Box className={styles.ruleItem}>
                                <span className={styles.crossMark}>✕</span>
                                <Typography>{translate('noPersonalData')}</Typography>
                            </Box>
                            <Box className={styles.ruleItem}>
                                <span className={styles.crossMark}>✕</span>
                                <Typography>{translate('noHandsOrBackground')}</Typography>
                            </Box>
                            <Box className={styles.ruleItem}>
                                <span className={styles.crossMark}>✕</span>
                                <Typography>{translate('noInappropriateContent')}</Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Button
                        variant="contained"
                        className={styles.startButton}
                        onClick={() => setScanningStep('scanning')}
                    >
                        {translate('startScanning')}
                    </Button>
                    <Typography variant="body2" className={styles.finePrint}>
                        {translate('privacyConsent')}
                    </Typography>
                    <Typography 
                        variant="body2" 
                        className={styles.finePrint}
                        dangerouslySetInnerHTML={{ __html: translate('termsNotice') }}
                    />
                </Box>
            </Box>
        );
    };

    const videoConstraints = {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
    };

    const webcamRef = useRef(null);

    const capture = React.useCallback(
        () => {
            const imageSrc = webcamRef.current.getScreenshot();
            setPreviewImage(imageSrc);
            setScanningStep('loading');
            processImage(imageSrc);
        },
        [webcamRef]
    );

    const renderCamera = () => (
        <Box className={`${styles.scanningContainer} ${isLandscape ? styles.landscape : ''}`}>
            <Box className={styles.scanningContent}>
                {isLandscape ? (
                    <>
                        <Box className={styles.scanningInfo}>
                            <Typography variant="h1" className={styles.scanningTitle}>
                                {translate('takeAPicture')}
                            </Typography>
                        </Box>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={videoConstraints}
                            className={styles.webcam}
                        />
                        <Button
                            variant="contained"
                            onClick={capture}
                            className={styles.captureButton}
                        >
                            {translate('takeAPicture')}
                        </Button>
                    </>
                ) : (
                    <>
                        <Box className={styles.scanningInfo}>
                            <Typography variant="h1" className={styles.scanningTitle}>
                                {translate('takeAPicture')}
                            </Typography>
                        </Box>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={videoConstraints}
                            className={styles.webcam}
                        />
                        <Button
                            variant="contained"
                            onClick={capture}
                            className={styles.captureButton}
                        >
                            {translate('takeAPicture')}
                        </Button>
                    </>
                )}
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
            <Typography variant="h5" sx={{ mb: 2 }}>{translate('previewYourPostIt')}</Typography>
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
                    onClick={() => resetScanState('scanning', true)}
                    startIcon={<RetryIcon />}
                >
                    {translate('retake')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => processImage(previewImage)}
                    disabled={isProcessing}
                    startIcon={<SendIcon />}
                >
                    {translate('submit')}
                </Button>
            </Box>
        </Box>
    );

    // Update the renderResults function to remove the green check mark and change button behavior
    const renderResults = () => {
        if (!modelResult) {
            return (
                <Box className={styles.scanningContainer}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                        <CircularProgress />
                    </Box>
                </Box>
            );
        }
        
        const hasValidText = !!modelResult.answer && modelResult.answer.trim().length > 0;
        
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
                                backgroundColor: questionColorMap[modelResult.question_id] || '#FFA500'
                            }}
                        >
                            <Typography className={styles.postItHeading}>
                                {modelResult.question || "[No question detected]"}
                            </Typography>
                            <Typography className={styles.postItText}>
                                {modelResult.answer || "[No text detected]"}
                            </Typography>
                        </Box>
                    </Box>
                    
                    {/* Right side - Success message and buttons */}
                    <Box className={styles.successMessageContainer}>
                        <Typography variant="h1" className={styles.successHeading}>
                            {hasValidText ? translate('scanSuccessful') : translate('scanIncomplete')}
                        </Typography>
                        <Typography className={styles.successMessage}>
                            {hasValidText 
                                ? translate('turnAroundAndLook')
                                : translate('noTextDetected')
                            }
                        </Typography>
                        <Typography className={styles.successSubmessage}>
                            {hasValidText 
                                ? translate('noteSuccessfullyScanned')
                                : translate('typeMessageForWall')
                            }
                        </Typography>

                        {!hasValidText && (
                            <Box sx={{ width: '100%', mt: 2 }}>
                                <textarea
                                    value={modelResult.answer || ''}
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '10px',
                                        marginBottom: '10px'
                                    }}
                                    placeholder={translate('typePostItText')}
                                    onChange={(e) => {
                                        setModelResult({
                                            ...modelResult,
                                            answer: e.target.value
                                        });
                                    }}
                                />
                            </Box>
                        )}
                        
                        <Box className={styles.successButtonsContainer}>
                            <Button 
                                variant="outlined" 
                                className={styles.incorrectScanButton}
                                onClick={() => resetScanState('scanning', true)}
                            >
                                {translate('rescan')}
                            </Button>
                            <Button 
                                variant="contained" 
                                className={styles.scanNewButton}
                                onClick={() => {
                                    resetScanState('start', false);
                                }}
                                disabled={isLoading || (!hasValidText && !modelResult.answer)}
                            >
                                {isLoading ? (
                                    <>
                                        <CircularProgress size={20} sx={{ mr: 1 }} />
                                        {translate('sending')}
                                    </>
                                ) : (
                                    translate('finish')
                                )}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        );
    };

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
                    {translate('processingYourPostIt')}
                </Typography>
                <Typography variant="body1" sx={{ textAlign: 'center', maxWidth: '80%' }}>
                    {translate('analyzingWithAI')}
                </Typography>
                
                {scanError && (
                    <Typography variant="body2" sx={{ 
                        color: 'error.main', 
                        mt: 2, 
                        textAlign: 'center', 
                        maxWidth: '80%' 
                    }}>
                        {translate('error')} {scanError}
                    </Typography>
                )}
            </Box>
        </Box>
    );

    const renderCurrentStep = () => {
        switch (scanningStep) {
            case 'start': return renderScanningInfo();
            case 'scanning': return renderCamera();
            case 'preview': return renderPreview();
            case 'loading': return renderLoading();
            case 'results': return renderResults();
            default: return renderScanningInfo();
        }
    };

    return (
        <Box className={styles.scanningContainer}>
            {renderCurrentStep()}
            
            {/* Fullscreen toggle button - always visible */}
            <IconButton 
                className={styles.fullscreenToggleButton}
                onClick={() => toggleFullScreen(true)}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 100,
                    color: 'white',
                    background: 'rgba(0,0,0,0.3)',
                }}
            >
                {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
        </Box>
    );
};

export default ImagesCaptureLoad;