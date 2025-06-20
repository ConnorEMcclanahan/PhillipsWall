import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';
import config from '../config';

const { API_BASE } = config;

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
    
    // Clustering state
    const [clusteredAnswers, setClusteredAnswers] = useState([]);
    const [expandedCluster, setExpandedCluster] = useState(null);
    const [previousExpandedCluster, setPreviousExpandedCluster] = useState(null);
    const [filteredClusters, setFilteredClusters] = useState([]);

    // UI state
    const [isZooming, setIsZooming] = useState(false);
    const [clickedQuestionPosition, setClickedQuestionPosition] = useState(null);
    const [yourRecentAnswerId, setYourRecentAnswerId] = useState(null);
    
    // Timeline state
    const [activeSeason, setActiveSeason] = useState(6); // Default to Summer 2025

    // Constants
    const ITEMS_PER_PAGE = 20;
    const TRANSITION_DURATION = 500;
    const CLUSTER_THRESHOLD = 15; // Distance threshold for clustering (in percentage points)
    const SEASONS = [
        'Winter 2024', 'Spring 2024', 'Summer 2024', 'Fall 2024',
        'Winter 2025', 'Spring 2025', 'Summer 2025'
    ];

    // Check for user's recent submission
    useEffect(() => {
        const storedId = localStorage.getItem('yourRecentAnswerId');
        if (storedId) {
            setYourRecentAnswerId(storedId);
        }
    }, []);

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

    // Handle clicking on a question
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

        const gridElement = document.querySelector(`.${styles.questionsGrid}`);
        gridElement?.classList.add(styles.zooming);

        try {
            const response = await fetch(`${API_BASE}/question/${questionId}`);
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

    // Handle clicking on a bubble/answer
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

        const gridElement = document.querySelector(`.${styles.answersGrid}`);
        gridElement?.classList.add(styles.zooming);

        try {
            const response = await fetch(`${API_BASE}/question/${questionId}`);
            const data = await response.json();

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

    // Handle clicking on a cluster
    const handleClusterClick = async (cluster, event) => {
        // Remove "YOU" label if this is the user's cluster
        if (cluster.answers.some(answer => answer.answer_id === yourRecentAnswerId)) {
            setYourRecentAnswerId(null);
            localStorage.removeItem('yourRecentAnswerId');
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
        if (!dateString) return 6; // Default to Summer 2025
        
        // Try to parse the date
        let date;
        try {
            date = new Date(dateString);
            
            if (isNaN(date.getTime())) {
                // If date parsing failed, default to Summer 2025
                console.log(`Invalid date format: ${dateString}, defaulting to Summer 2025`);
                return 6;
            }
        } catch (e) {
            console.log(`Error parsing date: ${dateString}, defaulting to Summer 2025`);
            return 6; // Default to Summer 2025
        }
        
        const month = date.getMonth(); // 0-indexed
        const year = date.getFullYear();
        
        // Map dates to seasons
        if (month <= 2) {
            return year >= 2025 ? 4 : 0; // Winter (Jan-Mar)
        } else if (month <= 5) {
            return year >= 2025 ? 5 : 1; // Spring (Apr-Jun)
        } else if (month <= 8) {
            return year >= 2025 ? 6 : 2; // Summer (Jul-Sep)
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
                const dateField = answer.answer_date
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
            
            // If no date is found, show in current season (Summer 2025) if that's selected
            return !foundDate && seasonIndex === 6;
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
        const radius = 300; // Radius to spread cards out
        const questionColor = getQuestionColor(expandedCluster.questionId);

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

                {/* Central question */}
                <div
                    className={styles.centralQuestion}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: questionColor,
                        color: 'white',
                        width: '240px',
                        height: '240px',
                        borderRadius: '50%',
                        padding: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        zIndex: 25,
                        boxShadow: `0 0 30px ${questionColor}, inset 0 0 60px ${questionColor}`,
                        fontSize: '18px',
                        fontWeight: 'bold'
                    }}
                >
                    {activeQuestionData?.question[language] || 'Loading question...'}
                </div>
                
                {/* Answer cards */}
                <div className={styles.expandedCluster}>
                    {clusterAnswers.map((answer, index) => {
                        const angle = (index / clusterAnswers.length) * 2 * Math.PI;
                        const offsetX = Math.cos(angle) * radius;
                        const offsetY = Math.sin(angle) * radius;
                        
                        // Get the answer text from various possible fields
                        const answerText = (() => {
                            if (answer.en) return answer.en;
                            if (answer.english) return answer.english;
                            if (answer.body) return answer.body;
                            if (typeof answer.answer === 'string') return answer.answer;
                            if (answer.content) return answer.content;
                            if (answer.text) return answer.text;
                            if (answer.answer_text) return answer.answer_text;
                            if (answer[language] && language === 'en') return answer[language];
                            return "That despite all technology, in 2044 we still answer these questions on paper with a pencil...";
                        })();

                        return (
                            <div
                                key={answer.answer_id}
                                className={styles.answerCard}
                                style={{
                                    position: 'fixed',
                                    top: `calc(50% + ${offsetY}px)`,
                                    left: `calc(50% + ${offsetX}px)`,
                                    transform: `translate(-50%, -50%) rotate(${Math.random() * 6 - 3}deg)`,
                                    backgroundColor: questionColor,
                                    width: '220px',
                                    minHeight: '150px',
                                    padding: '0',
                                    borderRadius: '8px',
                                    zIndex: 20,
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                                    overflow: 'visible',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '500',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    backgroundImage: `
                                        linear-gradient(transparent 0px, transparent 19px, rgba(255,255,255,0.4) 19px, rgba(255,255,255,0.4) 20px)
                                    `,
                                    backgroundSize: '100% 20px',
                                    backgroundPosition: '0 0',
                                }}
                            >
                                <div style={{
                                    fontFamily: "'Comic Sans MS', cursive, sans-serif",
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    width: '100%',
                                    height: '100%',
                                    padding: '19px 15px 0 15px',
                                    boxSizing: 'border-box',
                                    textShadow: '0 0 1px rgba(0,0,0,0.2)',
                                    letterSpacing: '0.5px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    textAlign: 'left',
                                }}>
                                    {answerText.split('\n').map((line, i) => (
                                        <div key={i} style={{ 
                                            marginBottom: '0',
                                            lineHeight: '20px',
                                            paddingTop: i === 0 ? '0' : '0'
                                        }}>
                                            {line || '\u00A0'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.answersLayer}>
                <div className={styles.answersGrid}>
                    {(filteredClusters.length > 0 ? filteredClusters : []).map((cluster, index) => {
                        // Check if this is the user's recent submission
                        const isYourCluster = yourRecentAnswerId && 
                            cluster.answers.some(answer => answer.answer_id === yourRecentAnswerId);
                        
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
                                    opacity: 1,
                                    pointerEvents: 'auto', 
                                    cursor: 'pointer',
                                    zIndex: isYourCluster ? 11 : 10,
                                    boxShadow: isYourCluster ? '0 0 15px rgba(255,255,255,0.5)' : 'none',
                                }}
                                onClick={(e) => handleClusterClick(cluster, e)}
                                title={cluster.size > 1 ? `${cluster.size} answers` : 'Single answer'}
                            >
                                {isYourCluster && (
                                    <div className={styles.youIndicator}>
                                        <span>YOU</span>
                                    </div>
                                )}
                                
                                {cluster.size > 1 && (
                                    <span className={styles.clusterCount}>
                                        {cluster.size}
                                    </span>
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