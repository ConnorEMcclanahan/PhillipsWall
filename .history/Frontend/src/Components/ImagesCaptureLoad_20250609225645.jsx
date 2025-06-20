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
            
            console.log("Sending image data (first 100 chars):", imageData.substring(0, 100));
            
            // Don't compress the image - that might be causing issues
            // Send it as-is like the working version does
            const response = await fetch(`${API_BASE}/process-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });
            
            console.log("Response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Process image error:", errorText);
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Received result:", result);
            setModelResult(result);
            
        } catch (err) {
            console.error('Error processing image:', err);
            alert(`Error: ${err.message}. Please try again.`);
            setModelResult({
                answer: "Error processing image. Please try again.",
                question: "Processing Error",
                question_id: 1,
                color: "#FFEB3B"
            });
        } finally {
       