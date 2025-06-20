import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';

const AIQuestionsDisplay = () => {
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const { language } = useLanguage();
    const [questionsData, setQuestionsData] = useState([]);
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [activeQuestionData, setActiveQuestionData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentAnswers, setCurrentAnswers] = useState([]);
    const [answersData, setAnswersData] = useState([]);
    const [clusteredAnswers, setClusteredAnswers] = useState([]);
    const [expandedCluster, setExpandedCluster] = useState(null);

    const [isZooming, setIsZooming] = useState(false);
    const [clickedQuestionPosition, setClickedQuestionPosition] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    const ITEMS_PER_PAGE = 20;
    const TRANSITION_DURATION = 500;
    const CLUSTER_THRESHOLD = 15; // Distance threshold for clustering (in percentage points)

    const MONTHS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

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

    useEffect(() => {
        const fetchAnswers = async () => {
            try {
                const response = await fetch('http://localhost:5000/answers');
                const data = await response.json();
                setAnswersData(data);
                console.log("Answers data fetched:", data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        };

        fetchAnswers();
    }, []);

    // TO DO - GET answer translations implementation
    
    // TO DO - GET answer bubbles implementation 

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

    // Function to extract the first color from a linear gradient string - NOT used in this version
    const extractColorFromGradient = (gradientString) => {
        // Extract the first color from the linear gradient
        const matches = gradientString.match(/#[a-fA-F0-9]{6}/g);
        if (matches && matches.length > 0) {
            return matches[0]; // Return the first color
        }
        return '#000000'; // Fallback color
    };

    // Function to get the position of each answer bubble
    useEffect(() => {
        if (!answersData.length) return;

        const updateBubblePositions = () => {
            const styles = answersData.map((answer) => {
                const normalizedX = answer.x_axis_value * 50 + 50;
                const normalizedY = answer.y_axis_value * 50 + 50;

                console.log(`Answer ID: ${answer.answer_id}, X: ${normalizedX}, Y: ${normalizedY}`);
                console.log(`coordinates: (${answer.x_axis_value}, ${answer.y_axis_value})`);

                return {
                    bottom: `${normalizedY}%`,
                    left: `${normalizedX}%`,
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: getQuestionColor(answer.question_id)
                };
            });

            setBubbleStyles(styles);
        };

        updateBubblePositions();
        const interval = setInterval(updateBubblePositions, 8000);
        return () => clearInterval(interval);
    }, [answersData, getQuestionColor]);

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

    // Keep the handleQuestionClick function but modify it to work with answer bubbles
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

        // Add class to questionsGrid for zoom effect
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
            }, TRANSITION_DURATION / 2);
        } catch (error) {
            console.error("Error fetching question details:", error);
        }
    };

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
        }, TRANSITION_DURATION);
    };

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

    // Function to set current month as active
    useEffect(() => {
        // Get current date
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-based (January is 0)
        
        // Set initial active month
        setActiveMonth(currentMonth);
    }, []);

    // State for tracking active month
    const [activeMonth, setActiveMonth] = useState(null);

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

                    if (distance * 100 <= CLUSTER_THRESHOLD) { // Convert to percentage
                        cluster.answers.push(otherAnswer);
                        processed.add(otherIndex);
                    }
                }
            });

            // Calculate cluster center (average position)
            if (cluster.answers.length > 1) {
                const avgX = cluster.answers.reduce((sum, ans) => sum + ans.x_axis_value, 0) / cluster.answers.length;
                const avgY = cluster.answers.reduce((sum, ans) => sum + ans.y_axis_value, 0) / cluster.answers.length;
                cluster.centerX = avgX;
                cluster.centerY = avgY;
            }

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

    // Function to get the position and size of each cluster
    useEffect(() => {
        if (!clusteredAnswers.length) return;

        const updateClusterPositions = () => {
            // Find the maximum cluster size to calculate relative z-index
            const maxClusterSize = Math.max(...clusteredAnswers.map(cluster => cluster.size));
            
            const styles = clusteredAnswers.map((cluster) => {
                const normalizedX = cluster.centerX * 50 + 50;
                const normalizedY = cluster.centerY * 50 + 50;

                // Scale bubble size based on cluster size (min 20px, max 60px)
                const baseSize = 20;
                const maxSize = 0;
                const size = Math.min(maxSize, baseSize + (cluster.size - 1) * 8);

                // Single answers get the highest z-index, larger clusters get much lower z-index
                const zIndex = 1000 - (cluster.size * 100); // Large gap between sizes

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
                    transition: 'all 0.3s ease',
                    zIndex: zIndex // Much larger gaps ensure no overlap
                };
            });

            setBubbleStyles(styles);
        };

        updateClusterPositions();
        const interval = setInterval(updateClusterPositions, 8000);
        return () => clearInterval(interval);
    }, [clusteredAnswers, getQuestionColor]);

    // Handle cluster click - show individual answers in cluster
    const handleClusterClick = async (cluster, event) => {
        if (cluster.size === 1) {
            // Single answer - behave like before
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

    // Function to render expanded cluster
    const renderExpandedCluster = () => {
        if (!expandedCluster) return null;

        const clusterAnswers = expandedCluster.answers;
        const radius = 80; // Distance from center for individual bubbles

        return (
            <div className={styles.expandedCluster}>
                {clusterAnswers.map((answer, index) => {
                    // Calculate position around cluster center
                    const angle = (index / clusterAnswers.length) * 2 * Math.PI;
                    const offsetX = Math.cos(angle) * radius;
                    const offsetY = Math.sin(angle) * radius;

                    const normalizedX = expandedCluster.centerX * 50 + 50;
                    const normalizedY = expandedCluster.centerY * 50 + 50;

                    return (
                        <div
                            key={answer.answer_id}
                            className={styles.expandedAnswer}
                            style={{
                                bottom: `calc(${normalizedY}% + ${offsetY}px)`,
                                left: `calc(${normalizedX}% + ${offsetX}px)`,
                                position: 'absolute',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: getQuestionColor(answer.question_id),
                                width: '25px',
                                height: '25px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                zIndex: 20,
                                border: '2px solid white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBubbleClick(answer.answer_id, answer.question_id, e);
                            }}
                            title={`Answer ${index + 1}`}
                        />
                    );
                })}
                
                {/* Cluster info tooltip */}
                <div
                    className={styles.clusterInfo}
                    style={{
                        bottom: `calc(${expandedCluster.centerY * 50 + 50}% + 100px)`,
                        left: `${expandedCluster.centerX * 50 + 50}%`,
                        position: 'absolute',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        zIndex: 25
                    }}
                >
                    {clusterAnswers.length} answers clustered here
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.answersLayer}>
                <div className={styles.answersGrid}>
                    {clusteredAnswers.map((cluster, index) => (    
                        <div
                            key={cluster.id}
                            className={`${styles.answerItem} ${cluster.size > 1 ? styles.cluster : ''}`}
                            data-color={getQuestionColor(cluster.questionId)}
                            data-cluster-size={cluster.size}
                            style={bubbleStyles[index]}
                            onClick={(e) => handleClusterClick(cluster, e)}
                            title={cluster.size > 1 ? `${cluster.size} answers` : 'Single answer'}
                        >
                            {cluster.size > 1 && (
                                <span className={styles.clusterCount}>
                                    {cluster.size}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                
                {/* Render expanded cluster */}
                {renderExpandedCluster()}
            </div>

            <div className={styles.gridLines}>
                <div className={`${styles.axisLabel} ${styles.labelTop}`}>AI enthusiast</div>
                <div className={`${styles.axisLabel} ${styles.labelBottom}`}>AI skeptic</div>
                <div className={`${styles.axisLabel} ${styles.labelLeft}`}>Little scared
of the
future</div>
                <div className={`${styles.axisLabel} ${styles.labelRight}`}>Looking bright
to the
future</div>
            </div>

            <div className={styles.timeline}>
                {MONTHS.map((month, index) => (
                    <div
                        key={month}
                        className={styles.timelineItem}
                        onClick={() => handleTimelinePointClick(index)}
                    >
                        <div 
                            className={`
                                ${styles.timelinePoint} 
                                ${activeMonth === index ? styles.active : ''}
                            `}
                        />
                        <div className={`
                            ${styles.timelineMonth}
                            ${activeMonth === index ? styles.current : ''}
                        `}>
                            {month}
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