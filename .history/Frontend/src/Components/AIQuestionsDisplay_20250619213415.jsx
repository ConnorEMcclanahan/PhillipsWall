import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';
import config from '../config';

let lastSeenAnswerId = null; 

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
    const ITEMS_PER_PAGE = 50;
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
        // Check if this is "your" cluster, but DON'T hide the "YOU" label
        const isYourCluster = newestAnswerId && 
            cluster.answers.some(answer => answer.answer_id === newestAnswerId);
        
        // Toggle cluster expansion
        if (expandedCluster?.id === cluster.id) {
            setExpandedCluster(null);
            setFocusedCard(null);
            setHoveredCard(null);
            
            // Only dismiss the "YOU" highlighting when closing the cluster
            if (isYourCluster) {
                setNewestAnswerId(null);
                setYouLabelDismissed(true);
            }
            return;
        }

        // Reset card states when opening a new cluster
        setFocusedCard(null);
        setHoveredCard(null);
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
        const questionText = activeQuestionData?.question[language] || 'Loading question...';

        return (
            <>
                {/* Overlay background */}
                <div 
                    className={styles.clusterOverlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            // Check if this is "your" cluster
                            const isYourCluster = newestAnswerId && 
                                expandedCluster.answers.some(answer => answer.answer_id === newestAnswerId);
                            
                            // Close the expanded view
                            setExpandedCluster(null);
                            setFocusedCard(null);
                            
                            // Also dismiss the "YOU" label when closing via background click
                            if (isYourCluster) {
                                setNewestAnswerId(null);
                                setYouLabelDismissed(true);
                            }
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
                        transition: 'opacity 0.4s ease-in-out',
                    }}
                />
                
                {/* Card hand layout - much larger cards */}
                <div style={{
                    position: 'fixed',
                    bottom: '2%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '98%', // INCREASED from 95% to 98%
                    height: '500px',
                    zIndex: 1600,
                    display: 'flex',
                    justifyContent: 'center',
                    perspective: '1200px',
                }}>
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        transformStyle: 'preserve-3d',
                    }}>
                        {clusterAnswers.map((answer, index) => {
                            // Calculate card positioning in an arc
                            const totalCards = clusterAnswers.length;
                            const maxAngle = Math.min(35, totalCards * 2.5); 
                            const angle = (index - (totalCards - 1) / 2) * (maxAngle / totalCards);
                            const isHovered = hoveredCard === index;
                            const isFocused = focusedCard === index;
                            
                            // Check if this is the user's answer
                            const isYourAnswer = newestAnswerId && answer.answer_id === newestAnswerId && !youLabelDismissed;
                            
                            // Get answer text
                            const answerText = getAnswerText(answer, language);
                            
                            return (
                                <div
                                    key={`card-hand-${index}`}
                                    onClick={() => {
                                        // Remove the auto-dismissal when clicking your own card
                                        // Instead, only handle card focus/unfocus regardless of card type
                                        handleCardClick(index);
                                        
                                        // Note: Don't clear the "YOU" status when clicking the card
                                        // The previous code was dismissing it immediately:
                                        // if (isYourAnswer) {
                                        //     setNewestAnswerId(null);
                                        //     setYouLabelDismissed(true);
                                        // } 
                                    }}
                                    onMouseEnter={() => setHoveredCard(index)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        position: 'absolute',
                                        width: isFocused ? '600px' : '450px',
                                        height: isFocused ? '550px' : '450px',
                                        backgroundColor: questionColor,
                                        borderRadius: '12px',
                                        boxShadow: isFocused
                                            ? '0 25px 50px rgba(0,0,0,0.5)'
                                            : (isHovered 
                                                ? '0 15px 30px rgba(0,0,0,0.4)'
                                                : '0 5px 15px rgba(0,0,0,0.3)'),
                                        transform: isFocused
                                            ? 'translateY(-150px) translateX(0) rotate(0deg) scale(1.1)'
                                            : `translateX(${angle * 35}px) translateY(${isHovered ? -40 : 0}px) rotate(${angle}deg)`,
                                        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        transformOrigin: 'bottom center',
                                        zIndex: isFocused ? 100 : (isHovered ? 50 + index : index),
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        opacity: isFocused ? 1 : (isHovered ? 1 : 0.95),
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: isYourAnswer ? '3px solid black' : 'none', // Black border for user's card
                                    }}
                                >
                                    {/* Fixed card content with better text centering */}
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '50px 30px 20px',
                                        boxSizing: 'border-box',
                                    }}>
                                        {/* Thumbtack */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '15px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(0,0,0,0.4)',
                                            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
                                            zIndex: 3,
                                        }}></div>
                                        
                                        {/* Card number/close button - now shows "YOU" for user's card */}
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isFocused) {
                                                    setFocusedCard(null);
                                                }
                                                // RESTORE this code to dismiss the YOU label when clicking it
                                                if (isYourAnswer) {
                                                    setNewestAnswerId(null);
                                                    setYouLabelDismissed(true);
                                                }
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '15px',
                                                right: '15px',
                                                width: isYourAnswer ? 'auto' : '32px',
                                                height: '32px',
                                                borderRadius: isYourAnswer ? '16px' : '50%',
                                                backgroundColor: isYourAnswer ? 'black' : 'rgba(0,0,0,0.2)',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                zIndex: 2,
                                                cursor: 'pointer',
                                                padding: isYourAnswer ? '0 12px' : '0',
                                            }}
                                        >
                                            {isYourAnswer ? 'YOU' : (isFocused ? '✕' : index + 1)}
                                        </div>
                                        
                                        {/* Question - IMPROVED CENTERING WITHOUT HYPHENATION */}
                                        <div style={{
                                            fontSize: isFocused ? '22px' : '18px',
                                            fontWeight: 'bold',
                                            color: '#000',
                                            textAlign: 'center',
                                            marginBottom: '20px',
                                            paddingLeft: '20px',
                                            paddingRight: '20px',
                                            wordWrap: 'break-word',
                                            width: '100%',
                                            maxWidth: '100%',
                                            margin: '0 auto 20px',
                                            boxSizing: 'border-box',
                                            overflowWrap: 'break-word',
                                            hyphens: 'none', // CHANGED from 'auto' to 'none' to prevent hyphenation
                                        }}>
                                            {questionText}
                                        </div>
                                        
                                        {/* Answer text - WITHOUT HYPHENATION */}
                                        <div style={{
                                            color: '#000',
                                            fontSize: isFocused ? '18px' : '16px',
                                            lineHeight: '1.5',
                                            textAlign: 'left',
                                            overflow: 'hidden',
                                            flex: 1,
                                            wordWrap: 'break-word',
                                            paddingLeft: '20px',
                                            paddingRight: '20px',
                                            boxSizing: 'border-box',
                                            width: '100%',
                                            maxWidth: '100%',
                                            hyphens: 'none', // ADDED to explicitly prevent hyphenation
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Card count indicator */}
                <div style={{
                    position: 'fixed',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '16px', // Slightly bigger
                    zIndex: 1601,
                    backgroundColor: 'rgba(0,0,0,0.3)', // Slightly darker
                    padding: '6px 18px',
                    borderRadius: '20px',
                }}>
                    {clusterAnswers.length} {clusterAnswers.length === 1 ? 'card' : 'cards'}
                </div>

                {/* Close button in top right corner */}
                <button
                    onClick={() => {
                        // Check if this is "your" cluster
                        const isYourCluster = newestAnswerId && 
                            expandedCluster.answers.some(answer => answer.answer_id === newestAnswerId);
                        
                        // Close the expanded view
                        setExpandedCluster(null);
                        setFocusedCard(null);
                        
                        // Also dismiss the "YOU" label when closing via button click
                        if (isYourCluster) {
                            setNewestAnswerId(null);
                            setYouLabelDismissed(true);
                        }
                    }}
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        backgroundColor: 'rgba(0,0,0,0.2)', // Matches card X's background
                        color: '#fff',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',      // Ensures vertical centering
                        justifyContent: 'center',  // Ensures horizontal centering
                        fontSize: '16px',          // Same size as card X
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        zIndex: 1600,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)', // Lighter shadow like cards
                        lineHeight: 1,             // This helps with vertical alignment of the X
                        padding: 0,                // Remove any padding that might affect centering
                        textAlign: 'center',       // Additional centering help
                    }}
                    aria-label="Close expanded view"
                >
                    ✕
                </button>
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
            }, 60000); // CHANGED from 100000 to 20000 for 20 seconds
            
            return () => clearTimeout(hideYouLabelTimer);
        }
    }, [newestAnswerId]);

    // Add these missing state declarations
    const [focusedCard, setFocusedCard] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);

    // Add this handler function near the other handlers in your component (around line 350-400)
    // Just before or after handleClusterClick

    const handleCardClick = (index) => {
        if (focusedCard === index) {
            setFocusedCard(null); // Unfocus if clicking the same card
        } else {
            setFocusedCard(index); // Focus the clicked card
        }
    };

    // Helper function to get answer text consistently
    const getAnswerText = (answer, language) => {
        if (!answer) return "";
        if (answer.en) return answer.en;
        if (answer.english) return answer.english;
        if (answer.body) return answer.body;
        if (typeof answer.answer === 'string') return answer.answer;
        if (answer.content) return answer.content;
        if (answer.text) return answer.text;
        if (answer.answer_text) return answer.answer_text;
        if (answer[language] && language === 'en') return answer[language];
        return "";
    };

    // Helper function to determine optimal font size based on text length
    const determineOptimalFontSize = (text, availableWidth, availableHeight) => {
        if (!text) return '14px';
        
        const textLength = text.length;
        const baseSize = 14;
        
        // Simple scaling algorithm based on text length
        if (textLength < 100) return `${baseSize}px`;
        if (textLength < 200) return `${baseSize - 1}px`;
        if (textLength < 350) return `${baseSize - 2}px`;
        if (textLength < 500) return `${baseSize - 3}px`;
        if (textLength < 650) return `${baseSize - 4}px`;
        if (textLength < 800) return `${baseSize - 5}px`;
        
        // For really long text, cap at minimum readable size
        return `${Math.max(8, baseSize - 6)}px`;
    };

    return (
        <div className={styles.container}>
            {/* Keep axisLines but adjust its z-index to be behind text */}
            <div className={styles.axisLines} style={{
                zIndex: 1, // Lower z-index so it's behind other elements
                pointerEvents: 'none', // Prevents it from interfering with clicks
            }}></div>
            
            <div className={styles.randomShadowGrid} aria-hidden="true">
                {randomShadowGrid}
            </div>
            
            <div className={styles.answersLayer}>
                {/* This contains bubbles and clusters - should be above the grid lines */}
                <div className={styles.answersGrid} style={{ position: 'relative', zIndex: 10 }}>
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
                                            
                                            // CHANGED: Don't clear the newestAnswerId here!
                                            // Instead, expand this cluster to show the highlighted card
                                            handleClusterClick(cluster, e);
                                            
                                            // Don't dismiss the label yet - let it show on the card
                                            // setNewestAnswerId(null);
                                            // setYouLabelDismissed(true); 
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
                                            cursor: 'pointer',
                                            pointerEvents: 'auto',
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

            {/* Keep gridLines with labels but ensure it's behind bubbles */}
            <div className={styles.gridLines} style={{ 
                opacity: expandedCluster ? 0 : 1,
                transition: 'opacity 0.3s ease',
                pointerEvents: expandedCluster ? 'none' : 'auto',
                zIndex: 5  // Higher than base grid but lower than bubbles
            }}>
                <div className={`${styles.axisLabel} ${styles.labelTop}`} style={{ zIndex: 15 }}>AI enthusiast</div>
                <div className={`${styles.axisLabel} ${styles.labelBottom}`} style={{ zIndex: 15 }}>AI skeptic</div>
                <div className={`${styles.axisLabel} ${styles.labelLeft}`} style={{ zIndex: 15 }}>Little scared
                of the
                future</div>
                <div className={`${styles.axisLabel} ${styles.labelRight}`} style={{ zIndex: 15 }}>Looking bright
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