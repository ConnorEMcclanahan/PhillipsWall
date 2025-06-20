import React, {useState, useRef, useEffect} from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    IconButton,
    Chip, CircularProgress,
} from '@mui/material';
import {
    Send as SendIcon,
    CameraAlt as CameraIcon,
    Upload as UploadIcon,
    Replay as RetryIcon,
    CheckCircle as CheckCircleIcon,
    Language as LanguageIcon,
    Speed as SpeedIcon,
} from '@mui/icons-material';
import styles from './ImagesCaptureLoad.module.css';
import {styled} from "@mui/material/styles";
import translations from "../Pages/translations.json";
import {useLanguage} from "./LanguageContext";

const ImagesCaptureLoad = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [captureMode, setCaptureMode] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [modelResult, setModelResult] = useState(null);
    const [postItColors, setPostItColors] = useState({color: '#feff9c', gradientColor: null});
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const translate = (key) => translations[language]?.[key] || key;
    const { language } = useLanguage();

    const PostItNote = styled(Card)(({bgcolor = '#feff9c', gradientColor}) => ({
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
            setIsLoading(true); // Start loading
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
            setIsLoading(false); // Stop loading
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
            setIsLoading(true); // Start loading
            const response = await fetch('http://localhost:5000/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });
            const result = await response.json();
            setModelResult(result);
        } catch (err) {
            console.error('Error processing image:', err);
        } finally {
            setIsProcessing(false);
            setIsLoading(false); // Stop loading
        }
    };

    useEffect(() => {
        if (captureMode && videoRef.current && !videoRef.current.srcObject) {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [captureMode]);

    const startCamera = async () => {
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: {facingMode: 'environment'},
            });

            setStream(videoStream);
            setPreviewImage(null);

            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setCaptureMode(false);
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
        setCaptureMode(false);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                setCaptureMode(false);
            };
            reader.readAsDataURL(file);
        }
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
    };

    const handleRetry = () => {
        setPreviewImage(null);
        setModelResult(null);
        setPostItColors({color: '#feff9c', gradientColor: null});
        setCaptureMode(true);
    };

    const AIModelEvaluation = ({modelResult, colors}) => {
        const getLanguageLabel = (lang) => {
            const languages = {
                'en': 'English',
                'nl': 'Dutch'
            };
            return languages[lang] || lang;
        };

        const formatAccuracy = (accuracy) => {
            return `${(accuracy * 100).toFixed(1)}%`;
        };

        return (
            <Box sx={{p: 2}}>
                {modelResult ? (
                    <Box className={styles.resultArea}>
                        <Box sx={{mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center'}}>
                            <Chip
                                icon={<LanguageIcon/>}
                                label={getLanguageLabel(modelResult.language)}
                                color="primary"
                                variant="outlined"
                                className={styles.chipArea}
                            />
                            <Chip
                                icon={<SpeedIcon/>}
                                label={`Accuracy: ${formatAccuracy(modelResult.accuracy)}`}
                                color="primary"
                                variant="outlined"
                                className={styles.chipArea}
                            />
                            <Chip
                                icon={<CheckCircleIcon/>}
                                label={`Match: ${modelResult.match_score}%`}
                                color="primary"
                                variant="outlined"
                                className={styles.chipArea}
                            />
                        </Box>
                        <PostItNote bgcolor={colors.color} gradientColor={colors.gradientColor}>
                            <CardContent>
                                <Box className={styles.postNote}>
                                    <Box className={styles.questionArea}>
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight="medium"
                                            sx={{mb: 1, fontFamily: '"Segoe Print", "Bradley Hand", cursive'}}
                                            className={styles.titleTranscriptionLabel}
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
                                            className={styles.titleTranscription}
                                        >
                                            {modelResult.question}
                                        </Typography>
                                    </Box>
                                    <Box className={styles.answerArea}>
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight="medium"
                                            sx={{mb: 1, fontFamily: '"Segoe Print", "Bradley Hand", cursive'}}
                                            className={styles.titleTranscriptionLabel}
                                        >
                                            Answer Transcription:
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontFamily: '"Segoe Print", "Bradley Hand", cursive',
                                                fontSize: '1.1rem'
                                            }}
                                            className={styles.titleTranscription}
                                        >
                                            {modelResult.answer}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </PostItNote>
                    </Box>
                ) : (
                    <PostItNote>
                        <CardContent sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '200px'
                        }}>
                            <Typography
                                color="text.secondary"
                                sx={{
                                    fontFamily: '"Segoe Print", "Bradley Hand", cursive',
                                    fontSize: '1.1rem',
                                    textAlign: 'center'
                                }}
                            >
                                Capture or upload an image to see AI evaluation
                            </Typography>
                        </CardContent>
                    </PostItNote>
                )}
            </Box>
        );
    };

    return (
        <Box className={styles.mainContainer}>
            <Box className={styles.infoBox}>
                <Typography className={styles.infoText}>
                    {translate('disclaimerText')}
                </Typography>
                <Typography className={styles.infoText}>
                    {translate('disclaimerText2')}
                </Typography>
            </Box>
            <Box container spacing={2} className={styles.container}>
                <Box item xs={12} md={6} className={styles.panel}>
                    <Card className={styles.card}>
                        <CardContent>
                            <Typography variant="h6" className={styles.imageScanImportText}>
                                {translate('importImage')}
                            </Typography>
                            <Box className={styles.emptyState}>
                                <Box className={styles.controls}>
                                    <Button
                                        variant="contained"
                                        startIcon={<UploadIcon/>}
                                        onClick={() => fileInputRef.current.click()}
                                        className={styles.uploadButton}
                                    >
                                        {translate('uploadImage')}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<CameraIcon/>}
                                        onClick={() => setCaptureMode(true)}
                                        disabled={captureMode}
                                        className={styles.takePictureButton}
                                    >
                                        {translate('takePicture')}
                                    </Button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                </Box>
                                <Box className={styles.preview}>
                                    {captureMode ? (
                                        <Box className={styles.cameraFeed}>
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className={styles.video}
                                            />
                                            <Box className={styles.overlay}/>
                                            <Box className={styles.cameraButtons}>
                                                <Button
                                                    variant="contained"
                                                    onClick={captureImage}
                                                    color="success"
                                                >
                                                    {translate('capture')}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={stopCamera}
                                                    color="error"
                                                >
                                                    {translate('cancel')}
                                                </Button>
                                            </Box>
                                        </Box>
                                    ) : (
                                        previewImage && (
                                            <Box className={styles.capturedImage}>
                                                <img
                                                    src={previewImage}
                                                    alt="Preview"
                                                    className={styles.image}
                                                />
                                                <Box className={styles.retryBox}>
                                                    <IconButton
                                                        onClick={() => processImage(previewImage)}
                                                        disabled={isProcessing}
                                                        className={styles.submitButton}
                                                    >
                                                        <SendIcon/>
                                                    </IconButton>
                                                    <IconButton
                                                        className={styles.retryButton}
                                                        onClick={handleRetry}
                                                    >
                                                        <RetryIcon/>
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        )
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
                <Box item xs={12} md={6} className={styles.panel}>
                    <Card className={styles.card}>
                        <CardContent>
                            <Typography variant="h6" className={styles.imageScanImportText}>
                                {translate('aiModelEvaluation')}
                            </Typography>
                            {isLoading ? (
                                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <AIModelEvaluation modelResult={modelResult} colors={postItColors} />
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>


    );
};

export default ImagesCaptureLoad;