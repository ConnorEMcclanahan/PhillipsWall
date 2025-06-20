import React, { useState, useRef, useEffect } from 'react';
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

const { API_BASE } = config;

const ImagesCaptureLoad = () => {
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

    const { language } = useLanguage();
    const translate = (key) => translations[language]?.[key] || key;

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

    // Improved process image function with better error handling and debugging
    const processImage = async (imageData) => {
        try {
            setIsProcessing(true);
            setScanError(null);
            
            console.log("Sending image data to backend...");
            
            // Make sure we're sending the data with the correct 'image' key
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData  // Make sure the key is 'image' to match backend expectations
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Processing result:", result);
            
            // Ensure result has required fields
            const normalizedResult = {
                answer: result.answer || result.answer_text || "",
                question: result.question || result.question_text || "What are your thoughts on AI?",
                question_id: parseInt(result.question_id) || 1,
                
                // Extract post-it color from the OpenAI response
                color: result.post_it_color || result.color || '#feff9c',
                
                // Extract language from the OpenAI response
                language: result.language || result.answer_language || "en",
                
                // Extract positioning
                x_axis_value: parseFloat(result.x) || parseFloat(result.x_axis_value) || null,
                y_axis_value: parseFloat(result.y) || parseFloat(result.y_axis_value) || null
            };
            
            console.log("Extracted from image:", {
                color: normalizedResult.color,
                language: normalizedResult.language,
                x: normalizedResult.x_axis_value,
                y: normalizedResult.y_axis_value
            });
            
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

    // Render functions
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
                    onClick={() => setScanningStep('scanning')}
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
        <Box className={`${styles.scanningContainer} ${isLandscape ? styles.landscape : ''}`}>
            <Box className={styles.scanningContent}>
                {isLandscape ? (
                    // Landscape layout
                    <>
                        <Box className={styles.scanningInfo}>
                            <Typography variant="h1" className={styles.scanningTitle}>
                                Take a picture
                            </Typography>
                            <Typography variant="h2" className={styles.scanningSubtitle}>
                                Ready to share your idea with the AI wall?
                            </Typography>
                        </Box>
                        
                        <Box className={styles.cameraViewfinderContainer}>
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
                                
                                <Button 
                                    className={styles.captureButton}
                                    onClick={captureImage}
                                    aria-label="Take picture"
                                >
                                    <div className={styles.innerCaptureButton}></div>
                                </Button>
                            </Box>
                        </Box>
                    </>
                ) : (
                    // Your existing portrait layout
                    <>
                        <Box className={styles.scanningInfo}>
                            <Typography variant="h1" className={styles.scanningTitle}>
                                Take a picture
                            </Typography>
                            <Typography variant="h2" className={styles.scanningSubtitle}>
                                Ready to share your idea with the AI wall?
                            </Typography>
                        </Box>
                        
                        <Box className={styles.cameraViewfinderContainer}>
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
                                
                                <Button 
                                    className={styles.captureButton}
                                    onClick={captureImage}
                                    aria-label="Take picture"
                                >
                                    <div className={styles.innerCaptureButton}></div>
                                </Button>
                            </Box>
                        </Box>

                        {/* File upload fallback */}
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
                    onClick={() => resetScanState('scanning', true)}
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
                                backgroundColor: modelResult.color || postItColors.color || '#B5EAE7' 
                            }}
                        >
                            <Typography className={styles.postItHeading}>
                                {modelResult.question || "[No question detected]"}
                            </Typography>
                            <Typography className={styles.postItText}>
                                {modelResult.answer || "[No text detected]"}
                            </Typography>
                            
                            {/* Status indicator */}
                            <Box sx={{ 
                                position: 'absolute', 
                                top: 10, 
                                right: 10, 
                                background: hasValidText ? 'green' : 'red',
                                color: 'white',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                fontSize: '14px',
                                zIndex: 1000
                            }}>
                                {hasValidText ? '✓ Valid' : '⚠️ No text detected'}
                            </Box>
                        </Box>
                    </Box>
                    
                    {/* Right side - Success message and buttons */}
                    <Box className={styles.successMessageContainer}>
                        <Typography variant="h1" className={styles.successHeading}>
                            {hasValidText ? 'Scan successful!' : 'Scan incomplete'}
                        </Typography>
                        <Typography className={styles.successMessage}>
                            {hasValidText 
                                ? 'Now... turn around and take a look at the AI wall!' 
                                : 'No text was detected in your image.'}
                        </Typography>
                        <Typography className={styles.successSubmessage}>
                            {hasValidText 
                                ? 'Your idea will appear there shortly — and you can interact with other people\'s ideas too.'
                                : 'Please ensure your writing is clear and the post-it is fully visible.'}
                        </Typography>
                        
                        {/* Add manual text entry option when OCR fails */}
                        {!hasValidText && (
                            <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    Add text manually:
                                </Typography>
                                <textarea
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '8px',
                                        fontFamily: 'inherit',
                                        marginBottom: '10px'
                                    }}
                                    placeholder="Type your post-it text here..."
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
                                Rescan
                            </Button>
                            <Button 
                                variant="contained" 
                                className={styles.scanNewButton}
                                onClick={saveToDatabase}
                                disabled={isLoading || (!hasValidText && !modelResult.answer)}
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
                    We're analyzing the text with AI vision
                </Typography>
                
                {scanError && (
                    <Typography variant="body2" sx={{ 
                        color: 'error.main', 
                        mt: 2, 
                        textAlign: 'center', 
                        maxWidth: '80%' 
                    }}>
                        Error: {scanError}
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