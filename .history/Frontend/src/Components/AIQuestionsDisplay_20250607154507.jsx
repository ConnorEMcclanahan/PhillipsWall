import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';

const AIQuestionsDisplay = () => {
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const { language, setLanguage } = useLanguage();
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
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeMonth, setActiveMonth] = useState(null);

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
                const response = await fetch('http://localhost:5000/answer_groups');
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

    // Function to extract the first color from a linear gradient string - NOT used in this version
    const extractColorFromGradient = (gradientString) => {
        // Extract the first color from the linear gradient
        const matches = gradientString.match(/#[a-fA-F0-9]{6}/g);
        if (matches && matches.length > 0) {
            return matches[0]; // Return the first color
        }
        return '#000000'; // Fallback color
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
                // Use the original position of the first answer in cluster
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

    // Update bubble positions for clustered answers
    useEffect(() => {
        if (!clusteredAnswers.length) return;

        const styles = clusteredAnswers.map((cluster) => {
            // Use the first answer's position instead of averaging
            const firstAnswer = cluster.answers[0];
            const normalizedX = firstAnswer.x_axis_value * 50 + 50;
            const normalizedY = firstAnswer.y_axis_value * 50 + 50;

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
    }, [clusteredAnswers, getQuestionColor]);

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
            }, TRANSITION_DURATION / 2);
        } catch (error) {
            console.error("Error fetching question details:", error);
        }
    };

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
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-based (January is 0)
        setActiveMonth(currentMonth);
    }, []);

    const handleTimelinePointClick = (monthIndex) => {
        setActiveMonth(monthIndex);
        const monthName = MONTHS[monthIndex];
        console.log(`Showing data for ${monthName}`);
    };

    // Render expanded cluster
    const renderExpandedCluster = () => {
        if (!expandedCluster) return null;

        const clusterAnswers = expandedCluster.answers;
        const radius = 80; // Distance from center for individual bubbles
        
        // Use the first answer's position instead of the calculated center
        const firstAnswer = clusterAnswers[0];
        const normalizedX = firstAnswer.x_axis_value * 50 + 50;
        const normalizedY = firstAnswer.y_axis_value * 50 + 50;

        return (
            <div className={styles.expandedCluster}>
                {clusterAnswers.map((answer, index) => {
                    // Calculate position around cluster center
                    const angle = (index / clusterAnswers.length) * 2 * Math.PI;
                    const offsetX = Math.cos(angle) * radius;
                    const offsetY = Math.sin(angle) * radius;

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
                        bottom: `calc(${normalizedY}% + 100px)`,
                        left: `${normalizedX}%`,
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

    const toggleLanguage = (lang) => {
        setLanguage(lang);
        setDropdownOpen(false);
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

            {/* Language selector */}
            <div className={styles.languageSelector}>
                <div 
                    className={styles.languageToggle}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    {language.toUpperCase()}
                </div>
                {dropdownOpen && (
                    <div className={styles.languageDropdown}>
                        <div 
                            className={`${styles.languageOption} ${language === 'en' ? styles.active : ''}`}
                            onClick={() => toggleLanguage('en')}
                        >
                            EN
                        </div>
                        <div 
                            className={`${styles.languageOption} ${language === 'nl' ? styles.active : ''}`}
                            onClick={() => toggleLanguage('nl')}
                        >
                            NL
                        </div>
                    </div>
                )}
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