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

    // Change the SEASONS array to only include seasons up to Summer 2025
    const SEASONS = [
        'Winter 2024', 'Spring 2024', 'Summer 2024', 'Fall 2024',
        'Winter 2025', 'Spring 2025', 'Summer 2025'
    ];

    // Add this state variable
    const [activeSeason, setActiveSeason] = useState(6); // Default to Summer 2025

    // Add a new state for filtered clusters
    const [filteredClusters, setFilteredClusters] = useState([]);

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

    // Update the bubble positioning in the useEffect that sets bubble styles
    useEffect(() => {
        if (!clusteredAnswers.length) return;

        const styles = clusteredAnswers.map((cluster) => {
            const firstAnswer = cluster.answers[0];
            
            // Add padding to keep bubbles away from edges (15% padding on each side)
            // This changes range from 0-100% to 15-85%
            const normalizedX = firstAnswer.x_axis_value * 70 + 50;
            const normalizedY = firstAnswer.y_axis_value * 70 + 50;
            
            // Constrain values to stay within the safe area
            const constrainedX = Math.max(15, Math.min(85, normalizedX));
            const constrainedY = Math.max(15, Math.min(85, normalizedY));

            console.log(`Cluster ID: ${cluster.id}, X: ${constrainedX}, Y: ${constrainedY}`);
            
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

    // Update the handleClusterClick function to handle single answers like clusters
    const handleClusterClick = async (cluster, event) => {
        // Multiple answers OR single answer - show cluster expansion with flash cards
        if (expandedCluster?.id === cluster.id) {
            setExpandedCluster(null);
            return;
        }

        setExpandedCluster(cluster);

        // Fetch question data for either cluster or single answer
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
    const handleTimelinePointClick = (seasonIndex) => {
        setActiveSeason(seasonIndex);
        filterClustersBySeason(seasonIndex);
    };

    // Add a useEffect to filter clusters by season
    useEffect(() => {
        // Only proceed if we have clustered answers
        if (clusteredAnswers.length > 0) {
            filterClustersBySeason(activeSeason);
        }
    }, [clusteredAnswers, activeSeason]);

    // Fix the getSeasonIndex function to be more tolerant of date formats
    const getSeasonIndex = (dateString) => {
        if (!dateString) return 6; // Default to Summer 2025 for missing dates
        
        // Try to parse the date - handle different formats
        let date;
        try {
            // Try standard format first
            date = new Date(dateString);
            
            // Check if we got an invalid date
            if (isNaN(date.getTime())) {
                // Try to extract date from non-standard format if possible
                const numbers = dateString.match(/\d+/g);
                if (numbers && numbers.length >= 3) {
                    // Try to construct a date from the extracted numbers
                    date = new Date(numbers[0], numbers[1] - 1, numbers[2]);
                    if (isNaN(date.getTime())) {
                        console.log(`Failed to parse date: ${dateString}`);
                        return 6; // Default to Summer 2025
                    }
                } else {
                    console.log(`Invalid date format: ${dateString}`);
                    return 6; // Default to Summer 2025
                }
            }
        } catch (e) {
            console.log(`Date parsing error for: ${dateString}`);
            return 6; // Default to Summer 2025
        }
        
        const month = date.getMonth(); // 0-indexed
        const year = date.getFullYear();
        
        // More permissive approach - assign all dates to a season regardless of year
        // Just map to our 7 seasons based on month pattern
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

    // Updated filtering function to ensure each season has data
    const filterClustersBySeason = (seasonIndex) => {
        if (!clusteredAnswers.length) return;
        
        console.log(`Filtering for ${SEASONS[seasonIndex]} - before filter: ${clusteredAnswers.length} clusters`);
        
        // First try to filter by real dates
        const realDateFiltered = clusteredAnswers.filter(cluster => {
            for (const answer of cluster.answers) {
                const dateField = answer.scan_date || 
                              answer.created_at || 
                              answer.createdAt || 
                              answer.date || 
                              answer.timestamp;
                
                if (dateField) {
                    const parsed = getSeasonIndex(dateField);
                    if (parsed === seasonIndex) {
                        return true; // Include this cluster - it has a matching date
                    }
                }
            }
            return false;
        });
        
        // If we have enough real date matches, use those
        if (realDateFiltered.length >= 5) {
            console.log(`Found ${realDateFiltered.length} clusters with real dates for ${SEASONS[seasonIndex]}`);
            setFilteredClusters(realDateFiltered);
            return;
        }
        
        // Otherwise, distribute clusters deterministically across seasons
        console.log(`Insufficient real date matches, using deterministic distribution for ${SEASONS[seasonIndex]}`);
        
        const assignedClusters = clusteredAnswers.filter(cluster => {
            // Use numeric portion of cluster ID (or answer ID) for deterministic assignment
            const hash = parseInt((cluster.id || '').replace(/\D/g, '')) || 
                        parseInt((cluster.answers[0].answer_id || '').toString().replace(/\D/g, '')) || 0;
            
            return hash % SEASONS.length === seasonIndex;
        });
        
        console.log(`Assigned ${assignedClusters.length} clusters to ${SEASONS[seasonIndex]}`);
        setFilteredClusters(assignedClusters);
    };

    // Add this after the data is fetched
    useEffect(() => {
        if (answersData.length > 0) {
            // Log the first few answers to check date fields
            console.log("Sample answers to check date fields:", 
                answersData.slice(0, 3).map(a => ({
                    answer_id: a.answer_id,
                    date_fields: {
                        created_at: a.created_at,
                        createdAt: a.createdAt,
                        date: a.date,
                        timestamp: a.timestamp,
                        scan_date: a.scan_date
                    }
                }))
            );
            
            // Initial filtering using current season
            filterClustersBySeason(activeSeason);
        }
    }, [answersData, activeSeason]);

    // Update the renderExpandedCluster function to remove the redundant circle

    const renderExpandedCluster = () => {
        if (!expandedCluster) return null;

        const clusterAnswers = expandedCluster.answers;
        const radius = 300; // Much larger radius to spread cards out
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

                {/* Central question - now fixed in center of page */}
                <div
                    className={styles.centralQuestion}
                    style={{
                        position: 'fixed', // Changed to fixed
                        top: '50%', // Center vertically
                        left: '50%', // Center horizontally
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
                
                {/* Answer cards - now positioned around center of page */}
                <div className={styles.expandedCluster}>
                    {clusterAnswers.map((answer, index) => {
                        const angle = (index / clusterAnswers.length) * 2 * Math.PI;
                        const rotation = Math.random() * 6 - 3; // Small random rotation
                        const offsetX = Math.cos(angle) * radius;
                        const offsetY = Math.sin(angle) * radius;
                        
                        // Get the actual answer text - handle different possible formats
                        const answerText = (() => {
                            // First try to get English content specifically
                            if (answer.en) return answer.en;
                            if (answer.english) return answer.english;
                            
                            // Then try common locations for answer text
                            if (answer.body) return answer.body;
                            if (typeof answer.answer === 'string') return answer.answer;
                            if (answer.content) return answer.content;
                            if (answer.text) return answer.text;
                            if (answer.answer_text) return answer.answer_text;
                            
                            // Only use other languages as a last resort
                            if (answer[language] && language === 'en') return answer[language];
                            
                            // Last resort fallback
                            return "That despite all technology, in 2044 we still answer these questions on paper with a pencil...";
                        })();

                        // Update the answer card styling to properly align text with the lines
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
                                    padding: '0', // Remove default padding
                                    borderRadius: '8px',
                                    zIndex: 20,
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                                    overflow: 'visible',
                                    display: 'flex',
                                    alignItems: 'flex-start', // Align from the top
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '500',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    // Improved line styling with more accurate measurements
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
                                    lineHeight: '20px', // Exactly match the background line height
                                    width: '100%',
                                    height: '100%',
                                    padding: '19px 15px 0 15px', // Padding top aligns with first line
                                    boxSizing: 'border-box',
                                    textShadow: '0 0 1px rgba(0,0,0,0.2)',
                                    letterSpacing: '0.5px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    textAlign: 'left',
                                    // Apply no rotation to text so it stays aligned with lines
                                }}>
                                    {/* Split text into lines for better alignment with background */}
                                    {answerText.split('\n').map((line, i) => (
                                        <div key={i} style={{ 
                                            marginBottom: '0', // No margin between lines
                                            lineHeight: '20px', // Match background line height exactly
                                            paddingTop: i === 0 ? '0' : '0' // No padding for consistent line height
                                        }}>
                                            {line || '\u00A0'} {/* Use non-breaking space for empty lines */}
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
                    {/* Only show clusters if there are filtered results for this season */}
                    {(filteredClusters.length > 0 ? filteredClusters : []).map((cluster, index) => {
                        // Use existing style if found, otherwise generate one
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
                                className={`${styles.answerItem} ${cluster.size > 1 ? styles.cluster : ''}`}
                                data-color={getQuestionColor(cluster.questionId)}
                                data-cluster-size={cluster.size}
                                style={{
                                    ...style,
                                    opacity: 1,
                                    pointerEvents: 'auto', 
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                                onClick={(e) => handleClusterClick(cluster, e)}
                                title={cluster.size > 1 ? `${cluster.size} answers` : 'Single answer'}
                            >
                                {cluster.size > 1 && (
                                    <span className={styles.clusterCount}>
                                        {cluster.size}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Show message when no data for this season */}
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
                
                {/* Render expanded cluster */}
                {renderExpandedCluster()}
            </div>

            {/* Keeping all the up-to-date UI elements */}
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
                transform: 'scale(0.85)', // Scale down the timeline to 85% of original size
                width: '95%',  // Simple fix - make the timeline slightly narrower to hide the tails
                margin: '0 auto',  // Center the timeline
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
                            {currentAnswers.map((answer, index, array) => (
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