import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';

const AIQuestionsDisplay = () => {
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const { language } = useLanguage(); // Using the up-to-date version (no setLanguage destructuring)
    const [questionsData, setQuestionsData] = useState([]);
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [activeQuestionData, setActiveQuestionData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentAnswers, setCurrentAnswers] = useState([]);
    const [answersData, setAnswersData] = useState([]);
    
    // Adding clustering state from your feature branch
    const [clusteredAnswers, setClusteredAnswers] = useState([]);
    const [expandedCluster, setExpandedCluster] = useState(null);

    const [isZooming, setIsZooming] = useState(false);
    const [clickedQuestionPosition, setClickedQuestionPosition] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [activeMonth, setActiveMonth] = useState(null);

    const ITEMS_PER_PAGE = 20;
    const TRANSITION_DURATION = 500;
    
    // Adding clustering threshold from your feature branch
    const CLUSTER_THRESHOLD = 15; // Distance threshold for clustering (in percentage points)

    const MONTHS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Fetch questions - keeping the up-to-date version
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await fetch('http://localhost:5000/questions');
                const data = await response.json();
                setQuestionsData(data);
                console.log("Questions data fetched:", data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        };

        fetchQuestions();
    }, []);

    // Fetch answers - keeping the up-to-date endpoint but using 'answers' for clustering
    useEffect(() => {
        const fetchAnswers = async () => {
            try {
                // Using the up-to-date endpoint but adapting for clustering
                const response = await fetch('http://localhost:5000/answers'); // Changed back to 'answers' for clustering
                const data = await response.json();
                setAnswersData(data);
                console.log("Answers data fetched:", data);
            } catch (error) {
                console.error("Error fetching answers:", error);
            }
        };

        fetchAnswers();
    }, []);

    // Extract colors from questionsData and create a map for quick access
    const questionColorMap = useMemo(() => {
        const map = {};
        for (const q of questionsData) {
            map[q.question_id] = q.color;
        }
        return map;
    }, [questionsData]);
    
    // Update the color function with exact hex values
    const getQuestionColor = useCallback((questionId) => {
        return questionColorMap[questionId] || '#7EDDDE';
    }, [questionColorMap]);

    // Adding clustering functions from your feature branch
    // Function to calculate distance between two points
    const calculateDistance = (point1, point2) => {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // Function to cluster nearby answers from the same question
    const clusterAnswers = useCallback(() => {
        if (!answersData.length) return [];

        const clusters = [];
        const processed = new Set();

        answersData.forEach((answer, index) => {
            if (processed.has(index)) return;

            const cluster = {
                id: `cluster-${clusters.length}`,
                questionId: answer.question_id,
                answers: [answer],
                centerX: answer.x_axis_value,
                centerY: answer.y_axis_value,
                size: 1
            };

            // Find nearby answers with the same question_id
            answersData.forEach((otherAnswer, otherIndex) => {
                if (
                    otherIndex !== index &&
                    !processed.has(otherIndex) &&
                    otherAnswer.question_id === answer.question_id
                ) {
                    const distance = calculateDistance(
                        { x: answer.x_axis_value, y: answer.y_axis_value },
                        { x: otherAnswer.x_axis_value, y: otherAnswer.y_axis_value }
                    );

                    if (distance * 100 <= CLUSTER_THRESHOLD) {
                        cluster.answers.push(otherAnswer);
                        processed.add(otherIndex);
                    }
                }
            });

            cluster.size = cluster.answers.length;
            clusters.push(cluster);
            processed.add(index);
        });

        return clusters;
    }, [answersData]);

    // Update clustered answers when answersData changes
    useEffect(() => {
        const clusters = clusterAnswers();
        setClusteredAnswers(clusters);
    }, [answersData, clusterAnswers]);

    // Modified bubble positioning to work with clusters
    useEffect(() => {
        if (!clusteredAnswers.length) return;

        const styles = clusteredAnswers.map((cluster) => {
            const firstAnswer = cluster.answers[0];
            const normalizedX = firstAnswer.x_axis_value * 50 + 50;
            const normalizedY = firstAnswer.y_axis_value * 50 + 50;

            console.log(`Cluster ID: ${cluster.id}, X: ${normalizedX}, Y: ${normalizedY}`);
            console.log(`coordinates: (${firstAnswer.x_axis_value}, ${firstAnswer.y_axis_value})`);

            // Use consistent sizing for all clusters
            const baseSize = 10;
            const maxSize = 150;
            const size = Math.min(maxSize, baseSize + (cluster.size - 1) * 8);
            const zIndex = 1000 - (cluster.size * 100);

            return {
                bottom: `${normalizedY}%`,
                left: `${normalizedX}%`,
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                backgroundColor: getQuestionColor(cluster.questionId),
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: zIndex
            };
        });

        setBubbleStyles(styles);

        // Keeping the interval from the existing version
        const interval = setInterval(() => setBubbleStyles(styles), 8000);
        return () => clearInterval(interval);
    }, [clusteredAnswers, getQuestionColor]);

    // Keeping the up-to-date handleQuestionClick
    const handleQuestionClick = async (questionId, event) => {
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();

        setClickedQuestionPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        });

        setIsZooming(true);

        // Add class to questionsGrid for zoom effect
        const gridElement = document.querySelector(`.${styles.questionsGrid}`);
        gridElement?.classList.add(styles.zooming);

        try {
            const response = await fetch(`http://localhost:5000/question/${questionId}`);
            const data = await response.json();

            // Stagger the transitions
            setTimeout(() => {
                gridElement?.classList.add(styles.zoomed);
                setActiveQuestion(questionId);
                setActiveQuestionData(data);
                setCurrentPage(1);
            }, TRANSITION_DURATION / 2);
        } catch (error) {
            console.error("Error fetching question details:", error);
        }
    };

    // Add a new state variable to store the previous expanded cluster
    const [previousExpandedCluster, setPreviousExpandedCluster] = useState(null);

    // Modified handleBubbleClick to preserve the cluster state
    const handleBubbleClick = async (answerId, questionId, event) => {
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();

        setClickedQuestionPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        });

        setIsZooming(true);

        // Store the current expanded cluster so we can restore it when going back
        if (expandedCluster) {
            setPreviousExpandedCluster(expandedCluster);
        }

        // Add class to answersGrid for zoom effect
        const gridElement = document.querySelector(`.${styles.answersGrid}`);
        gridElement?.classList.add(styles.zooming);

        try {
            const response = await fetch(`http://localhost:5000/question/${questionId}`);
            const data = await response.json();

            // Stagger the transitions
            setTimeout(() => {
                gridElement?.classList.add(styles.zoomed);
                setActiveQuestion(questionId);
                setActiveQuestionData(data);
                setCurrentPage(1);
                // Don't clear the expanded cluster state here
            }, TRANSITION_DURATION / 2);
        } catch (error) {
            console.error("Error fetching question details:", error);
        }
    };

    // Adding cluster click handler from your feature branch
    const handleClusterClick = async (cluster, event) => {
        if (cluster.size === 1) {
            // Single answer - behave like a regular bubble click
            return handleBubbleClick(cluster.answers[0].answer_id, cluster.questionId, event);
        }

        // Multiple answers - show cluster expansion
        if (expandedCluster?.id === cluster.id) {
            setExpandedCluster(null);
            return;
        }

        setExpandedCluster(cluster);

        // Also fetch question data if needed
        try {
            const response = await fetch(`http://localhost:5000/question/${cluster.questionId}`);
            const data = await response.json();
            setActiveQuestionData(data);
        } catch (error) {
            console.error("Error fetching question details:", error);
        }
    };

    // Keeping the up-to-date handleBack
    const handleBack = () => {
        setIsZooming(false);

        const gridElement = document.querySelector(`.${styles.answersGrid}`);
        gridElement?.classList.remove(styles.zoomed);

        setTimeout(() => {
            gridElement?.classList.remove(styles.zooming);
            setActiveQuestion(null);
            setActiveQuestionData(null);
            setCurrentPage(1);
            setClickedQuestionPosition(null);
            
            // Restore the previous expanded cluster if it exists
            if (previousExpandedCluster) {
                setExpandedCluster(previousExpandedCluster);
                setPreviousExpandedCluster(null);
            }
        }, TRANSITION_DURATION);
    };

    // Keeping the up-to-date answer pagination
    useEffect(() => {
        if (!activeQuestionData?.answers[language]) return;

        const answers = activeQuestionData.answers[language]
            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        setCurrentAnswers(answers);

        const interval = setInterval(() => {
            setCurrentPage(prev => {
                const maxPage = Math.ceil(activeQuestionData.answers[language].length / ITEMS_PER_PAGE);
                return prev === maxPage ? 1 : prev + 1;
            });
        }, 8000);

        return () => clearInterval(interval);
    }, [activeQuestionData, currentPage, language]);

    // Keeping the up-to-date month initialization
    useEffect(() => {
        // Get current date
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-based (January is 0)
        
        // Set initial active month
        setActiveMonth(currentMonth);
    }, []);

    // Keeping the up-to-date timeline handler
    const handleTimelinePointClick = (monthIndex) => {
        setActiveMonth(monthIndex);
       
        const monthName = MONTHS[monthIndex];
        console.log(`Showing data for ${monthName}`);
        
        // You can filter your answersData here based on the selected month
        // setFilteredAnswers(answersData.filter(answer => {
        //     const answerDate = new Date(answer.created_at);
        //     return answerDate.getMonth() === monthIndex;
        // }));
    };

    // Update the renderExpandedCluster function to remove the redundant circle

    const renderExpandedCluster = () => {
        if (!expandedCluster) return null;

        const clusterAnswers = expandedCluster.answers;
        const radius = 300; // Increased radius to spread cards out more
        
        return (
            <>
                {/* Overlay */}
                <div 
                    className={styles.clusterOverlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setExpandedCluster(null);
                        }
                    }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 15,
                    }}
                />

                {/* Central question - centered on page instead of at cluster position */}
                <div
                    className={styles.centralQuestion}
                    style={{
                        position: 'fixed', // Changed to fixed positioning
                        top: '50%',        // Center vertically
                        left: '50%',       // Center horizontally
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: getQuestionColor(expandedCluster.questionId),
                        color: 'white',
                        width: '280px',
                        height: '280px',
                        borderRadius: '50%',
                        padding: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        zIndex: 25,
                        boxShadow: `0 0 40px ${getQuestionColor(expandedCluster.questionId)}, inset 0 0 80px ${getQuestionColor(expandedCluster.questionId)}`,
                        fontSize: '20px',
                        fontWeight: 'bold'
                    }}
                >
                    {activeQuestionData?.question[language] || 'Loading question...'}
                </div>
                
                {/* Answer cards with actual text content */}
                <div className={styles.expandedCluster}>
                    {clusterAnswers.map((answer, index) => {
                        const angle = (index / clusterAnswers.length) * 2 * Math.PI;
                        const rotation = Math.random() * 10 - 5; // Random rotation -5 to +5 degrees
                        
                        // Calculate position based on center of screen
                        const offsetX = Math.cos(angle) * radius;
                        const offsetY = Math.sin(angle) * radius;
                        
                        // Get the actual answer text - try different properties
                        const answerText = (() => {
                            if