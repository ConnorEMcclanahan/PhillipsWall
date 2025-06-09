import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import { useLanguage } from './LanguageContext';

const AIQuestionsDisplay = () => {
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const { language } = useLanguage();
    const [questionsData, setQuestionsData] = useState([]);
    const [activeQuestion, setActiveQuestion] = useState(null); //??
    const [activeQuestionData, setActiveQuestionData] = useState(null); //??
    const [currentPage, setCurrentPage] = useState(1);
    const [currentAnswers, setCurrentAnswers] = useState([]);//??
    const [answersData, setAnswersData] = useState([]);

    const [isZooming, setIsZooming] = useState(false);
    const [clickedQuestionPosition, setClickedQuestionPosition] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    const ITEMS_PER_PAGE = 20;
    const TRANSITION_DURATION = 500; 

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

    return (
        <div className={styles.container}>
            <div className={styles.answersLayer}>
                <div className={styles.answersGrid}>
                    {answersData.map((answer, index) => (    
                        <div
                            key={answer.answer_id}
                            className={styles.answerItem}
                            data-color={getQuestionColor(answer.question_id)}
                            style={bubbleStyles[index]}
                            onClick={(e) => handleBubbleClick(answer.answer_id, answer.question_id, e)}
                        />
                    ))}
                </div>
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