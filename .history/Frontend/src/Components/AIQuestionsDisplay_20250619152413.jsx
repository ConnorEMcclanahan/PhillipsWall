import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';
import config from '../config';

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
    
    // Clustering state
    const [clusteredAnswers, setClusteredAnswers] = useState([]);
    const [expandedCluster, setExpandedCluster] = useState(null);
    const [previousExpandedCluster, setPreviousExpandedCluster] = useState(null);
    const [filteredClusters, setFilteredClusters] = useState([]);

    // UI state
    const [isZooming, setIsZooming] = useState(false);
    const [newestAnswerId, setNewestAnswerId] = useState(null);
    
    // Timeline state
    const [activeSeason, setActiveSeason] = useState(5); // Default to Spring 2025

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
        // Check if this is "your" cluster and hide the "YOU" label when clicked
        const isYourCluster = newestAnswerId && 
            cluster.answers.some(answer => answer.answer_id === newestAnswerId);
        
        if (isYourCluster) {
            // Clear the newestAnswerId to hide the "YOU" label
            setNewestAnswerId(null);
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
        const baseRadius = 350; // Base radius for card positioning
        const questionColor = getQuestionColor(expandedCluster.questionId);

        return (
            <>
                {/* Overlay with transition */}
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
                        opacity: 1,
                        transition: 'opacity 0.4s ease-in-out',
                    }}
                />

                {/* Central question with smooth transition */}
                <div
                    className={styles.centralQuestion}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) scale(1)',
                        backgroundColor: questionColor,
                        color: 'white',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        padding: '25px', 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        zIndex: 25,
                        boxShadow: `0 0 30px ${questionColor}, inset 0 0 60px ${questionColor}`,
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'all 0.5s ease-out',
                    }}
                >
                    {activeQuestionData?.question[language] || 'Loading question...'}
                </div>
                
                {/* Answer cards - with smooth animations */}
                <div className={styles.expandedCluster}>
                    {clusterAnswers.map((answer, index) => {
                        // Get the answer text
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
                        
                        // Determine radius based on text length - push longer texts further out
                        const textLength = answerText.length;
                        const dynamicRadius = baseRadius + (textLength > 100 ? 50 : 0) + 
                                         (textLength > 200 ? 50 : 0) + 
                                         (textLength > 300 ? 50 : 0);
                        
                        // Calculate angle and position - use consistent positioning
                        const angle = (index / clusterAnswers.length) * 2 * Math.PI;
                        const offsetX = Math.cos(angle) * dynamicRadius;
                        const offsetY = Math.sin(angle) * dynamicRadius;
                        
                        // Calculate dynamic height based on content length
                        const estimatedLines = Math.ceil(textLength / 25); // Rough estimate of chars per line
                        const minHeight = 180;
                        const dynamicHeight = Math.max(minHeight, 100 + estimatedLines * 20);
                        const cappedHeight = Math.min(400, dynamicHeight);

                        return (
                            <div
                                key={answer.answer_id || index}
                                className={styles.answerCard}
                                style={{
                                    position: 'fixed',
                                    top: `calc(50% + ${offsetY}px)`,
                                    left: `calc(50% + ${offsetX}px)`,
                                    transform: `translate(-50%, -50%)`, // Base transform
                                    backgroundColor: questionColor,
                                    width: '220px',
                                    minHeight: `${cappedHeight}px`,
                                    padding: '0',
                                    borderRadius: '2px',
                                    zIndex: 20,
                                    boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    transition: 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
                                    animationFillMode: 'both',
                                    opacity: 1,
                                    // Add the animation properties
                                    animation: `float ${6 + (index % 4)}s ease-in-out ${index * 0.4}s infinite alternate`,
                                    // This will create a gentle floating effect
                                }}
                            >
                                {/* Thumb tack hole effect */}
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
                                
                                {/* Answer text with better handling */}
                                <div style={{
                                    fontFamily: "'Comic Sans MS', cursive, sans-serif",
                                    fontSize: '14px',
                                    lineHeight: '20px',
                                    width: '90%',
                                    height: '90%',
                                    textAlign: 'left',
                                    color: '#fff',
                                    position: 'relative',
                                    zIndex: 2,
                                    margin: '20px 10px 10px 10px',
                                    padding: '5px',
                                    overflowY: textLength > 300 ? 'auto' : 'visible',
                                    maxHeight: textLength > 300 ? '340px' : 'none',
                                }}>
                                    {answerText.split('\n').map((line, i) => (
                                        <div key={i} style={{ 
                                            marginBottom: '0',
                                            lineHeight: '20px',
                                            wordWrap: 'break-word'
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

    // Fix the randomShadowGrid to not use useMemo incorrectly
const randomShadowGrid = useMemo(() => {
    return createRandomShadowGrid(gridCols, gridRows);
}, [gridCols, gridRows]);
   // Replace the useEffect that's currently trying to fetch the newest answer
useEffect(() => {
        // Fix the fetchNewestAnswer function
        const fetchNewestAnswer = async () => {
            try {
                console.log("Fetching newest answer ID...");
                const response = await fetch(`${API_BASE}/get_newest_answer`);
                if (response.ok) {
                    const data = await response.json();
                    console.log("Raw API response for newest answer:", data);
                    
                    // Handle case where API returns just the number instead of {answer_id: number}
                    const newId = typeof data === 'number' ? data : (data && data.answer_id);
                    
                    if (newId) {
                        setNewestAnswerId(newId);
                        console.log("✅ Newest answer ID set to:", newId);
                        
                        // Debug check: log all answer IDs in filtered clusters
                        const allIds = [];
                        filteredClusters.forEach(cluster => {
                            cluster.answers.forEach(answer => {
                                if (answer.answer_id) allIds.push(answer.answer_id);
                            });
                        });
                        console.log("Available answer IDs in clusters:", allIds);
                        
                        // Check if any clusters have this ID
                        const foundCluster = filteredClusters.find(cluster => 
                            cluster.answers.some(answer => answer.answer_id === newId)
                        );
                        console.log("Found cluster with newest ID:", foundCluster ? "YES" : "NO");
                    } else {
                        console.error("❌ No answer ID found in response");
                    }
                } else {
                    console.error("❌ Error fetching newest answer - non-OK response");
                }
            } catch (error) {
                console.error("❌ Error fetching newest answer:", error);
            }
        };

        // Custom event listener for new submissions
        const handleNewSubmission = (event) => {
            if (event.detail && event.detail.answer_id) {
                console.log("New submission detected:", event.detail.answer_id);
                setNewestAnswerId(event.detail.answer_id);
            }
        };

        // Listen for custom events
        window.addEventListener('newAnswerSubmitted', handleNewSubmission);
        
        // Initial fetch
        fetchNewestAnswer();
        
        // Less frequent polling to reduce server load
        const interval = setInterval(fetchNewestAnswer, 10000);
        
        return () => {
            window.removeEventListener('newAnswerSubmitted', handleNewSubmission);
            clearInterval(interval);
        };
    }, [filteredClusters]); // Add filteredClusters as a dependency so it re-checks when clusters change

    // Add this useEffect to hide "YOU" label after 20 seconds
useEffect(() => {
    // When the newestAnswerId changes and is not null
    if (newestAnswerId) {
        console.log("Setting timeout to hide YOU label after 20 seconds for ID:", newestAnswerId);
        
        // Set a timeout to clear the newestAnswerId after 20 seconds
        const hideYouLabelTimer = setTimeout(() => {
            console.log("Clearing YOU label after timeout");
            setNewestAnswerId(null); // Clear the newestAnswerId instead of yourRecentAnswerId
        }, 20000); // 20 seconds
        
        // Clean up the timer when component unmounts or newestAnswerId changes
        return () => {
            clearTimeout(hideYouLabelTimer);
        };
    }
}, [newestAnswerId]); // Watch newestAnswerId instead of yourRecentAnswerId

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
      opacity: 1,
      pointerEvents: 'auto', 
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
                pointerEvents: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
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