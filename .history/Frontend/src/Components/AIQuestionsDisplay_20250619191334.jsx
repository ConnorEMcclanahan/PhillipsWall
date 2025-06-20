import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';
import config from '../config';

let lastSeenAnswerId = null; // Global variable to track the last seen answer ID

const { API_BASE } = config;
const createRandomShadowGrid = (gridCols, gridRows) => {
    const cells = [];
    const shadows = [
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'none','none','none','none','none',
        'drop-shadow(0 0 1.92px rgba(0,0,0,0.115))','drop-shadow(0 0 1.92px rgba(0,0,0,0.115))','drop-shadow(0 0 1.92px rgba(0,0,0,0.115))','drop-shadow(0 0 1.92px rgba(0,0,0,0.115))','drop-shadow(0 0 1.92px rgba(0,0,0,0.115))', // 5 subtle shadows
        'drop-shadow(0 0 3.2px rgba(0,0,0,0.153))','drop-shadow(0 0 3.2px rgba(0,0,0,0.153))','drop-shadow(0 0 3.2px rgba(0,0,0,0.153))', // 3 medium shadows
        'drop-shadow(0 0 4.8px rgba(0,0,0,0.192))',
        'drop-shadow(0 0 0 1px rgba(0,0,0,0.06))'
    ];

    // Generate cells for the grid
    for (let i = 0; i < gridCols * gridRows; i++) {
        const shadow = shadows[Math.floor(Math.random() * shadows.length)];
        cells.push(
            <div
                key={i}
                className={styles.randomShadowCell}
                style={{
                    filter: shadow,
                }}
            />
        );
    }
    return cells;
};


const AIQuestionsDisplay = () => {
    // Core state
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const { language } = useLanguage();
    const [questionsData, setQuestionsData] = useState([]);
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [activeQuestionData, setActiveQuestionData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentAnswers, setCurrentAnswers] = useState([]);
    const [answersData, setAnswersData] = useState([]);
    const [clickedQuestionPosition, setClickedQuestionPosition] = useState(null);
    
    // Clustering state
    const [clusteredAnswers, setClusteredAnswers] = useState([]);
    const [expandedCluster, setExpandedCluster] = useState(null);
    const [previousExpandedCluster, setPreviousExpandedCluster] = useState(null);
    const [filteredClusters, setFilteredClusters] = useState([]);

    // UI state
    const [isZooming, setIsZooming] = useState(false);
    const [newestAnswerId, setNewestAnswerId] = useState(null);
    const [youLabelDismissed, setYouLabelDismissed] = useState(false);
    
    // Timeline state
    const [activeSeason, setActiveSeason] = useState(5); // Default to Spring 2025

    // Card animation state
    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const [animationDirection, setAnimationDirection] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Constants
    const ITEMS_PER_PAGE = 20;
    const TRANSITION_DURATION = 500;
    const CLUSTER_THRESHOLD = 15; // Distance threshold for clustering (in percentage points)
    const SEASONS = [
        'Winter 2024', 'Spring 2024', 'Summer 2024', 'Fall 2024',
        'Winter 2025', 'Spring 2025'
    ];

    // Grid dimensions
    const gridCols = 55; 
    const gridRows = 30; 

    // Fetch questions
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

    // Fetch answers with polling
    useEffect(() => {
        const fetchAnswers = async () => {
            try {
                const response = await fetch(`${API_BASE}/answers`);
                const data = await response.json();
                setAnswersData(data);
            } catch (error) {
                console.error("Error fetching answers:", error);
            }
        };
        
        // Set up polling every 5 seconds
        fetchAnswers(); // Initial fetch
        const refreshInterval = setInterval(fetchAnswers, 5000);
        
        return () => clearInterval(refreshInterval);
    }, []);

    // Extract colors from questionsData
    const questionColorMap = useMemo(() => {
        const map = {};
        for (const q of questionsData) {
            map[q.question_id] = q.color;
        }
        return map;
    }, [questionsData]);
    
    const getQuestionColor = useCallback((questionId) => {
        return questionColorMap[questionId] || '#7EDDDE';
    }, [questionColorMap]);

    // Clustering functions
    const calculateDistance = (point1, point2) => {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

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

    // Update clustered answers when data changes
    useEffect(() => {
        const clusters = clusterAnswers();
        setClusteredAnswers(clusters);
    }, [answersData, clusterAnswers]);

    // Create visual styles for clusters
    useEffect(() => {
        if (!clusteredAnswers.length) return;

        const styles = clusteredAnswers.map((cluster) => {
            const firstAnswer = cluster.answers[0];
            
            // Add padding to keep bubbles away from edges (15% padding on each side)
            const normalizedX = firstAnswer.x_axis_value * 70 + 50;
            const normalizedY = firstAnswer.y_axis_value * 70 + 50;
            
            // Constrain values to stay within the safe area
            const constrainedX = Math.max(15, Math.min(85, normalizedX));
            const constrainedY = Math.max(15, Math.min(85, normalizedY));
            
            // Use consistent sizing for all clusters
            const baseSize = 10;
            const maxSize = 150;
            const size = Math.min(maxSize, baseSize + (cluster.size - 1) * 8);
            const zIndex = 1000 - (cluster.size * 100);

            return {
                bottom: `${constrainedY}%`,
                left: `${constrainedX}%`,
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
    }, [clusteredAnswers, getQuestionColor]);


    // Handle clicking on a cluster
    const handleClusterClick = async (cluster, event) => {
        // Check if this is "your" cluster and hide the "YOU" label
        const isYourCluster = newestAnswerId && 
            cluster.answers.some(answer => answer.answer_id === newestAnswerId);
        
        if (isYourCluster) {
            setNewestAnswerId(null);
            setYouLabelDismissed(true); // Mark as dismissed
        }
        
        // Toggle cluster expansion
        if (expandedCluster?.id === cluster.id) {
            setExpandedCluster(null);
            return;
        }

        setExpandedCluster(cluster);

        // Fetch question data
        try {
            const response = await fetch(`${API_BASE}/question/${cluster.questionId}`);
            const data = await response.json();
            setActiveQuestionData(data);
        } catch (error) {
            console.error("Error fetching question details:", error);
        }

        // Reset card index when viewing a new cluster
        setActiveCardIndex(0);
        setAnimationDirection(null);
        setIsAnimating(false);
    };

    // Handle going back from detail view
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

    // Handle answer pagination
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

    // Handle timeline point clicks
    const handleTimelinePointClick = (seasonIndex) => {
        setActiveSeason(seasonIndex);
        filterClustersBySeason(seasonIndex);
    };

    // Filter clusters when data or season changes
    useEffect(() => {
        if (clusteredAnswers.length > 0) {
            filterClustersBySeason(activeSeason);
        }
    }, [clusteredAnswers, activeSeason]);

    // Update this function to ensure proper date handling
    const getSeasonIndex = (dateString) => {
        if (!dateString) return 5; // Default to Spring 2025
        
        // Try to parse the date
        let date;
        try {
            date = new Date(dateString);
            
            if (isNaN(date.getTime())) {
                // If date parsing failed, default to Spring 2025
                console.log(`Invalid date format: ${dateString}, defaulting to Spring 2025`);
                return 5;
            }
        } catch (e) {
            console.log(`Error parsing date: ${dateString}, defaulting to Spring 2025`);
            return 5; // Default to Spring 2025
        }
        
        const month = date.getMonth(); // 0-indexed
        const year = date.getFullYear();
        
        // Map dates to seasons
        if (month <= 2) {
            return year >= 2025 ? 4 : 0; // Winter (Jan-Mar)
        } else if (month <= 5) {
            return year >= 2025 ? 5 : 1; // Spring (Apr-Jun)
        } else if (month <= 8) {
            return 2; // Summer (Jul-Sep) - only in 2024 now
        } else {
            return 3; // Fall (Oct-Dec) - only in 2024
        }
    };

    // Filter clusters by season
    const filterClustersBySeason = (seasonIndex) => {
        if (!clusteredAnswers.length) return;
        
        // Filter ONLY by real dates - no simulation fallback
        const realDateFiltered = clusteredAnswers.filter(cluster => {
            // Track if we found a date in any answer in this cluster
            let foundDate = false;
            let matchesSeason = false;
            
            for (const answer of cluster.answers) {
                // Use any available date field
                const dateField = answer.created_at || answer.scan_date || 
                     answer.answer_date || answer.createdAt || 
                     answer.date || answer.timestamp;
                
                if (dateField) {
                    foundDate = true;
                    const parsed = getSeasonIndex(dateField);
                    if (parsed === seasonIndex) {
                        matchesSeason = true;
                        break;  // We found a match, no need to check more answers
                    }
                }
            }
            
            // If we found a date and it matches the season, include this cluster
            if (foundDate && matchesSeason) {
                return true;
            }
            
            // If no date is found, show in current season (Spring 2025) if that's selected
            return !foundDate && seasonIndex === 5;
        });
        
        // Always use the real date filtered results, never simulate
        setFilteredClusters(realDateFiltered);
    };

    // Initial filtering 
    useEffect(() => {
        if (answersData.length > 0) {
            filterClustersBySeason(activeSeason);
        }
    }, [answersData, activeSeason]);

    // Render expanded cluster view
    const renderExpandedCluster = () => {
        if (!expandedCluster) return null;

        const clusterAnswers = expandedCluster.answers;
        const questionColor = getQuestionColor(expandedCluster.questionId);

        const goToNextCard = () => {
            if (isAnimating || clusterAnswers.length <= 1) return;
            setIsAnimating(true);
            setAnimationDirection('next');
            setTimeout(() => {
                setActiveCardIndex((prevIndex) => (prevIndex + 1) % clusterAnswers.length);
                setTimeout(() => {
                    setAnimationDirection(null);
                    setIsAnimating(false);
                }, 300);
            }, 300);
        };

        const goToPrevCard = () => {
            if (isAnimating || clusterAnswers.length <= 1) return;
            setIsAnimating(true);
            setAnimationDirection('prev');
            setTimeout(() => {
                setActiveCardIndex((prevIndex) => (prevIndex - 1 + clusterAnswers.length) % clusterAnswers.length);
                setTimeout(() => {
                    setAnimationDirection(null);
                    setIsAnimating(false);
                }, 300);
            }, 300);
        };

        // Get the active answer
        const activeAnswer = clusterAnswers[activeCardIndex];
        
        // Get the answer text
        const answerText = (() => {
            if (!activeAnswer) return "";
            if (activeAnswer.en) return activeAnswer.en;
            if (activeAnswer.english) return activeAnswer.english;
            if (activeAnswer.body) return activeAnswer.body;
            if (typeof activeAnswer.answer === 'string') return activeAnswer.answer;
            if (activeAnswer.content) return activeAnswer.content;
            if (activeAnswer.text) return activeAnswer.text;
            if (activeAnswer.answer_text) return activeAnswer.answer_text;
            if (activeAnswer[language] && language === 'en') return activeAnswer[language];
            return "That despite all technology, in 2044 we still answer these questions on paper with a pencil...";
        })();

        return (
            <>
                {/* Dark overlay background */}
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
                        backgroundColor: 'rgba(25, 25, 35, 0.85)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 1500,
                        opacity: 1,
                        transition: 'opacity 0.4s ease-in-out',
                    }}
                />
                
                {/* Card stack container */}
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90vw',
                    maxWidth: '600px',
                    height: '80vh',
                    maxHeight: '700px',
                    zIndex: 1600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    perspective: '1000px',
                }}>
                    {/* Count indicator and navigation */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        width: '100%',
                        color: 'white',
                    }}>
                        <button
                            onClick={goToPrevCard}
                            disabled={clusterAnswers.length <= 1 || isAnimating}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: clusterAnswers.length <= 1 ? 'default' : 'pointer',
                                opacity: clusterAnswers.length <= 1 ? 0.5 : 1,
                                marginRight: '15px',
                                color: 'white',
                                fontSize: '20px',
                            }}
                        >
                            ←
                        </button>
                        
                        <div style={{ 
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: 'white',
                        }}>
                            {activeCardIndex + 1} / {clusterAnswers.length}
                        </div>
                        
                        <button
                            onClick={goToNextCard}
                            disabled={clusterAnswers.length <= 1 || isAnimating}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: clusterAnswers.length <= 1 ? 'default' : 'pointer',
                                opacity: clusterAnswers.length <= 1 ? 0.5 : 1,
                                marginLeft: '15px',
                                color: 'white',
                                fontSize: '20px',
                            }}
                        >
                            →
                        </button>
                    </div>
                    
                    {/* Stack of cards */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '80%',
                        transformStyle: 'preserve-3d',
                    }}>
                        {/* Create the stack effect with multiple cards */}
                        {[-2, -1, 0, 1, 2].map(offset => {
                            // Calculate the index for each card in the stack
                            const index = (activeCardIndex + offset + clusterAnswers.length) % clusterAnswers.length;
                            const isActive = offset === 0;
                            
                            // Only render if we have enough cards
                            if (index >= clusterAnswers.length || index < 0) return null;

                            // Animation classes
                            let animClass = '';
                            if (isActive && animationDirection === 'next') animClass = styles.cardFlipOutNext;
                            if (isActive && animationDirection === 'prev') animClass = styles.cardFlipOutPrev;
                            if (offset === 1 && animationDirection === 'next') animClass = styles.cardFlipInNext;
                            if (offset === -1 && animationDirection === 'prev') animClass = styles.cardFlipInPrev;
                            
                            return (
                                <div
                                    key={`card-${index}`}
                                    className={`${styles.stackedCard} ${animClass}`}
                                    style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: questionColor,
                                        borderRadius: '4px',
                                        boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                                        transform: isActive 
                                            ? 'translateX(0) translateY(0) rotateZ(0deg) scale(1)'
                                            : `translateX(${offset * 10}px) translateY(${Math.abs(offset) * -5}px) rotateZ(${offset * 2}deg) scale(${1 - Math.abs(offset) * 0.05})`,
                                        zIndex: isActive ? 10 : (10 - Math.abs(offset)),
                                        opacity: isActive ? 1 : Math.max(0, 1 - Math.abs(offset) * 0.3),
                                        transition: isAnimating ? 'none' : 'all 0.3s ease-out',
                                        display: Math.abs(offset) > 2 ? 'none' : 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Thumbtack */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0,0,0,0.4)',
                                        boxShadow: 'inset 0 0 5px rgba(0,0,0,0.5)',
                                        zIndex: 3,
                                    }}></div>
                                    
                                    {/* Card Content */}
                                    {isActive && (
                                        <>
                                            {/* Question header */}
                                            <div style={{
                                                padding: '25px 20px 15px',
                                                borderBottom: '1px solid rgba(0,0,0,0.1)',
                                                fontWeight: 'bold',
                                                fontSize: '18px',
                                                color: '#000',
                                                textAlign: 'center',
                                                fontFamily: "'Arial', sans-serif",
                                            }}>
                                                {activeQuestionData?.question[language] || 'Loading question...'}
                                            </div>
                                            
                                            {/* Answer content area */}
                                            <div style={{
                                                padding: '15px 25px',
                                                overflow: 'auto',
                                                flex: 1,
                                                fontSize: '16px',
                                                lineHeight: '1.5',
                                                color: '#000',
                                                fontFamily: "'Arial', sans-serif",
                                            }}>
                                                {answerText.split('\n').map((line, i) => (
                                                    <div key={i} style={{ 
                                                        marginBottom: '10px',
                                                        wordBreak: 'break-word',
                                                    }}>
                                                        {line || '\u00A0'}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </>
        );
    };

    // Fix the randomShadowGrid to not use useMemo incorrectly
    const randomShadowGrid = useMemo(() => {
        return createRandomShadowGrid(gridCols, gridRows);
    }, [gridCols, gridRows]);
    
    // Replace the event listener useEffect (around line 587)
    useEffect(() => {
        // Handle custom event for new submissions
        const handleNewSubmission = (event) => {
            if (event.detail && event.detail.answer_id) {
                const newId = event.detail.answer_id;
                console.log("New submission detected via event:", newId);
                
                // If this is a different ID than the last one we saw
                if (newId !== lastSeenAnswerId) {
                    console.log("New answer ID differs from last seen:", newId, "vs", lastSeenAnswerId);
                    lastSeenAnswerId = newId;
                    setNewestAnswerId(newId);
                    setYouLabelDismissed(false); // Always reset for new answers
                }
            }
        };

        // Set up event listener for direct submissions
        window.addEventListener('newAnswerSubmitted', handleNewSubmission);
        
        // Function to check for newest answer via API
        const fetchNewestAnswer = async () => {
            try {
                const response = await fetch(`${API_BASE}/get_newest_answer`);
                if (response.ok) {
                    const data = await response.json();
                    const fetchedId = typeof data === 'number' ? data : (data?.answer_id);
                    
                    if (fetchedId && !youLabelDismissed && fetchedId !== lastSeenAnswerId) {
                        console.log("Polling found new answer ID:", fetchedId, "previous:", lastSeenAnswerId);
                        lastSeenAnswerId = fetchedId;
                        setNewestAnswerId(fetchedId);
                        setYouLabelDismissed(false);
                    }
                }
            } catch (error) {
                console.error("Error fetching newest answer:", error);
            }
        };
        
        // Initial fetch
        fetchNewestAnswer();
        
        // Set up polling every 3 seconds
        const pollingInterval = setInterval(fetchNewestAnswer, 3000);
        
        // Cleanup
        return () => {
            window.removeEventListener('newAnswerSubmitted', handleNewSubmission);
            clearInterval(pollingInterval);
        };
    }, []); // Empty dependency array = only run once on mount

    // Keep the 20-second timer effect
    useEffect(() => {
        if (newestAnswerId) {
            console.log("Setting 20s timer for newest answer ID:", newestAnswerId);
            const hideYouLabelTimer = setTimeout(() => {
                console.log("Timer expired - hiding YOU label");
                setNewestAnswerId(null);
                setYouLabelDismissed(true);
            }, 20000);
            
            return () => clearTimeout(hideYouLabelTimer);
        }
    }, [newestAnswerId]);

    return (
        <div className={styles.container}>
            {/* Add the background grid */}
            <div className={styles.axisLines}></div>
            <div className={styles.randomShadowGrid} aria-hidden="true">
                {randomShadowGrid}
            </div>
            
            <div className={styles.answersLayer}>
                <div className={styles.answersGrid}>
                    {(filteredClusters.length > 0 ? filteredClusters : []).map((cluster, index) => {
                        // Check if this cluster contains the newest answer
                        const isYourCluster = newestAnswerId && 
                            cluster.answers.some(answer => answer.answer_id === newestAnswerId);
                        
                        // Get style for this cluster
                        const styleIndex = clusteredAnswers.findIndex(c => c.id === cluster.id);
                        const style = styleIndex >= 0 ? bubbleStyles[styleIndex] : {
                            bottom: `${Math.max(15, Math.min(85, cluster.answers[0].y_axis_value * 70 + 15))}%`,
                            left: `${Math.max(15, Math.min(85, cluster.answers[0].x_axis_value * 70 + 15))}%`,
                            position: 'absolute',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: getQuestionColor(cluster.questionId),
                            width: `${Math.min(150, 10 + (cluster.size - 1) * 8)}px`,
                            height: `${Math.min(150, 10 + (cluster.size - 1) * 8)}px`,
                            borderRadius: '50%',
                        };
                        
                        return (
                            <div
                                key={cluster.id}
                                className={`${styles.answerItem} ${cluster.size > 1 ? styles.cluster : ''} ${isYourCluster ? styles.yourCluster : ''}`}
                                data-color={getQuestionColor(cluster.questionId)}
                                data-cluster-size={cluster.size}
                                style={{
                                    ...style,
                                    opacity: expandedCluster ? 0.3 : 1, // Hide when any cluster is expanded
                                    pointerEvents: expandedCluster ? 'none' : 'auto', // Disable clicks when a cluster is expanded
                                    cursor: 'pointer',
                                    // Set z-index based on inverse of size (smaller bubbles get higher z-index)
                                    zIndex: isYourCluster ? 1000 : (200 - Math.min(cluster.size * 5, 150)),
                                    border: isYourCluster ? '3px solid black' : 'none',
                                }}
                                onClick={(e) => handleClusterClick(cluster, e)}
                                title={isYourCluster ? 'Your answer' : (cluster.size > 1 ? `${cluster.size} answers` : 'Single answer')}
                            >
                                {isYourCluster && (
                                    <div 
                                        className={styles.youIndicator}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent triggering the parent cluster's click
                                            setNewestAnswerId(null);
                                            setYouLabelDismissed(true); // Mark as dismissed
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '-30px', 
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            backgroundColor: 'black',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '14px',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            zIndex: 100,
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                            cursor: 'pointer', // Add cursor to indicate it's clickable
                                            pointerEvents: 'auto', // Enable pointer events
                                        }}
                                    >
                                        <span>YOU</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {filteredClusters.length === 0 && (
                        <div className={styles.noDataMessage} style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#888',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            padding: '20px',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            borderRadius: '8px',
                            zIndex: 5
                        }}>
                            No answers available for {SEASONS[activeSeason]}
                        </div>
                    )}
                </div>
                
                {renderExpandedCluster()}
            </div>

            <div className={styles.gridLines} style={{ 
                opacity: expandedCluster ? 0 : 1,
                transition: 'opacity 0.3s ease',
                pointerEvents: expandedCluster ? 'none' : 'auto'
            }}>
                <div className={`${styles.axisLabel} ${styles.labelTop}`}>AI enthusiast</div>
                <div className={`${styles.axisLabel} ${styles.labelBottom}`}>AI skeptic</div>
                <div className={`${styles.axisLabel} ${styles.labelLeft}`}>Little scared
                of the
                future</div>
                <div className={`${styles.axisLabel} ${styles.labelRight}`}>Looking bright
                to the
                future</div>
            </div>

            <div className={styles.timeline} style={{
                opacity: expandedCluster ? 0 : 1,
                transition: 'opacity 0.3s ease',
                pointerEvents: expandedCluster ? 'none' : 'auto',
                transform: 'scale(0.85)',
            }}>
                {SEASONS.map((season, index) => (
                    <div
                        key={season}
                        className={styles.timelineItem}
                        onClick={() => handleTimelinePointClick(index)}
                    >
                        <div 
                            className={`
                                ${styles.timelinePoint} 
                                ${activeSeason === index ? styles.active : ''}
                            `}
                        />
                        <div className={`
                            ${styles.timelineMonth}
                            ${activeSeason === index ? styles.current : ''}
                        `}>
                            {season}
                        </div>
                    </div>
                ))}
            </div>

            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="texture">
                        <feTurbulence 
                            type="fractalNoise" 
                            baseFrequency="0.65" 
                            numOctaves="3" 
                            seed="1"
                            stitchTiles="stitch"
                        />
                        <feDisplacementMap 
                            in="SourceGraphic" 
                            scale="5"
                        />
                    </filter>
                </defs>
            </svg>

            {activeQuestionData && (
                <div className={`${styles.overlay} ${isZooming ? styles.visible : ''}`}>
                    <div className={`${styles.contentWrapper} ${isZooming ? styles.entering : styles.leaving}`}>
                        <button
                            className={styles.backButton}
                            onClick={handleBack}
                        >
                            <ArrowLeftIcon className="mr-2" size={20} />
                            <span>Back to Questions</span>
                        </button>

                        <div
                            className={styles.activeQuestion}
                            style={{
                                backgroundColor: activeQuestionData.color,
                                boxShadow: `0 0 100px ${activeQuestionData.color}, inset 0 0 165px ${activeQuestionData.color}`
                            }}
                        >
                            <div className={styles.questionText}>
                                {activeQuestionData.question[language]}
                            </div>
                        </div>

                        <div className={styles.answersContainer}>
                            {currentAnswers.map((answer, index) => (
                                <div
                                    key={`answer-${index}-${currentPage}`}
                                    className={styles.answerBox}
                                    style={{
                                        backgroundColor: activeQuestionData.color,
                                        '--hover-color': activeQuestionData.color,
                                    }}
                                >
                                    {answer}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIQuestionsDisplay;