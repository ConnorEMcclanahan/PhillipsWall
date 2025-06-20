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
            const response = await fetch(`http://localhost:5000/question-color/${questionId}`);
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
            const response = await fetch('http://localhost:5000/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });
            const result = await response.json();
            setModelResult(result);
            setScanningStep('results'); // Move to results after processing
        } catch (err) {
            console.error('Error processing image:', err);
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
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });

            setStream(videoStream);
            setPreviewImage(null);

            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setScanningStep('start');
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
        setScanningStep('start');
    };

    const captureImage = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setPreviewImage(imageData);
        stopCamera();
        setScanningStep('preview');
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
                
                {/* Camera viewfinder with corner brackets */}
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
                </Box>
                
                {/* Camera capture button */}
                <Box className={styles.captureButtonContainer}>
                    <Button 
                        className={styles.captureButton}
                        onClick={captureImage}
                        aria-label="Take picture"
                    >
                        <div className={styles.innerCaptureButton}></div>
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

    const renderResults = () => (
        <Box className={styles.resultsContainer}>
            <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <IconButton onClick={handleBack} color="primary">
                    <ArrowBackIcon />
                </IconButton>
            </Box>
            <Typography variant="h5" sx={{ mb: 4 }}>AI Evaluation Results</Typography>

            {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                    <CircularProgress />
                </Box>
            ) : modelResult ? (
                <Box className={styles.resultContent}>
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Chip
                            icon={<LanguageIcon />}
                            label={modelResult.language === 'en' ? 'English' : 'Dutch'}
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            icon={<SpeedIcon />}
                            label={`Accuracy: ${(modelResult.accuracy * 100).toFixed(1)}%`}
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            icon={<CheckCircleIcon />}
                            label={`Match: ${modelResult.match_score}%`}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    <PostItNote bgcolor={postItColors.color} gradientColor={postItColors.gradientColor}>
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ mb: 3 }}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="medium"
                                    sx={{ mb: 1, fontFamily: '"Segoe Print", "Bradley Hand", cursive' }}
                                >
                                    Question Transcription:
                                </Typography>
                                <Typography
                                    paragraph
                                    sx={{
                                        mb: 3,
                                        fontFamily: '"Segoe Print", "Bradley Hand", cursive',
                                        fontSize: '1.1rem'
                                    }}
                                >
                                    {modelResult.question}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="medium"
                                    sx={{ mb: 1, fontFamily: '"Segoe Print", "Bradley Hand", cursive' }}
                                >
                                    Answer Transcription:
                                </Typography>
                                <Typography
                                    sx={{
                                        fontFamily: '"Segoe Print", "Bradley Hand", cursive',
                                        fontSize: '1.1rem'
                                    }}
                                >
                                    {modelResult.answer}
                                </Typography>
                            </Box>
                        </Box>
                    </PostItNote>

                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setPreviewImage(null);
                                setModelResult(null);
                                setPostItColors({ color: '#feff9c', gradientColor: null });
                                setScanningStep('start');
                            }}
                        >
                            Scan another post-it
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Typography>No results available. Please try scanning again.</Typography>
            )}
        </Box>
    );

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