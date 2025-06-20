import React, { useState, useEffect, useCallback } from "react";
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
    const [isZooming, setIsZooming] = useState(false);
    const [clickedQuestionPosition, setClickedQuestionPosition] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);

    const ITEMS_PER_PAGE = 7;
    const TRANSITION_DURATION = 500; // Match with CSS transition duration

    const MONTHS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Replace the generateSpiralPoints function with this new positioning system
    const generateQuadrantPoints = useCallback((count) => {
        const points = [];
        
        // Define quadrant boundaries (in percentages)
        const quadrants = [
            { x: [25, 50], y: [25, 50] },  // Top Left
            { x: [50, 75], y: [25, 50] },  // Top Right
            { x: [25, 50], y: [50, 75] },  // Bottom Left
            { x: [50, 75], y: [50, 75] }   // Bottom Right
        ];

        for (let i = 0; i < count; i++) {
            const quadrant = quadrants[i % 4];
            
            // Random position within quadrant
            const x = Math.random() * (quadrant.x[1] - quadrant.x[0]) + quadrant.x[0];
            const y = Math.random() * (quadrant.y[1] - quadrant.y[0]) + quadrant.y[0];
            
            points.push({ x, y });
        }

        return points;
    }, []);
    const extractColorFromGradient = (gradientString) => {
        // Extract the first color from the linear gradient
        const matches = gradientString.match(/#[a-fA-F0-9]{6}/g);
        if (matches && matches.length > 0) {
            return matches[0]; // Return the first color
        }
        return '#000000'; // Fallback color
    };


    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await fetch('http://localhost:5000/questions');
                const data = await response.json();
                setQuestionsData(data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            }
        };

        fetchQuestions();
    }, []);

    useEffect(() => {
        if (!questionsData.length) return;

        const updateBubblePositions = () => {
            const points = generateQuadrantPoints(questionsData.length);

            const styles = points.map((point) => ({
                top: `${point.y}%`,
                left: `${point.x}%`,
                transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: Math.floor(Math.random() * 10),
            }));

            setBubbleStyles(styles);
        };

        updateBubblePositions();
        const interval = setInterval(updateBubblePositions, 8000);
        return () => clearInterval(interval);
    }, [questionsData.length, generateQuadrantPoints]);

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


    const handleBack = () => {
        setIsZooming(false);

        const gridElement = document.querySelector(`.${styles.questionsGrid}`);
        gridElement?.classList.remove(styles.zoomed);

        setTimeout(() => {
            gridElement?.classList.remove(styles.zooming);
            setActiveQuestion(null);
            setActiveQuestionData(null);
            setCurrentPage(1);
            setClickedQuestionPosition(null);
        }, TRANSITION_DURATION);
    };


    const getAnswerPosition = (index, total) => {
        const radius = 325;
        const angleOffset = -Math.PI / 2;
        const angle = angleOffset + (2 * Math.PI * index) / total;
        const randomRotation = Math.random() * 10 - 5;

        return {
            left: `calc(50% + ${radius * Math.cos(angle)}px)`,
            top: `calc(50% + ${radius * Math.sin(angle)}px)`,
            transform: `translate(-50%, -50%) rotate(${randomRotation}deg)`,
        };
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

    const handleMonthClick = (month) => {
        setSelectedMonth(prev => prev === month ? null : month);
    };

    // Update the color function with exact hex values
    const getQuestionColor = (question) => {
        // You'll need to adjust these conditions based on your actual question data
        if (question.includes("can AI do")) return "#7EDDDE"; // Turquoise
        if (question.includes("daily chore")) return "#009C49"; // Green
        if (question.includes("applications")) return "#A77AD7"; // Purple
        if (question.includes("problem")) return "#FFA40D"; // Orange
        return "#7EDDDE"; // default color - turquoise
    };

    return (
        <div className={styles.container}>
            <div className={styles.questionsLayer}>
                <div className={styles.questionsGrid}>
                    {questionsData.map((question, index) => (
                        <div
                            key={question.question_id}
                            className={`
                                ${styles.questionItem}
                                ${activeQuestion ? styles.inactiveQuestion : ''}
                                ${isZooming && question.question_id === activeQuestion ? styles.zoomTransition : ''}
                            `}
                            data-color={getQuestionColor(question[language])}
                            style={{
                                ...bubbleStyles[index],
                                ...(clickedQuestionPosition && question.question_id === activeQuestion
                                    ? {
                                        top: clickedQuestionPosition.top,
                                        left: clickedQuestionPosition.left,
                                        width: clickedQuestionPosition.width,
                                        height: clickedQuestionPosition.height
                                    }
                                    : {})
                            }}
                            onClick={(e) => handleQuestionClick(question.question_id, e)}
                        >
                            <div className={styles.questionText}>
                                {question[language]}
                            </div>
                        </div>
                    ))}

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
                                        backgroundColor: activeQuestionData.color, // Dynamically set the color
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
                                                ...getAnswerPosition(index, array.length),
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
            </div>

            <div className={styles.gridLines}>
                <div className={`${styles.axisLabel} ${styles.labelTop}`}>AI enthusiast</div>
                <div className={`${styles.axisLabel} ${styles.labelBottom}`}>AI skeptic</div>
                <div className={`${styles.axisLabel} ${styles.labelLeft}`}>Little scared of the future</div>
                <div className={`${styles.axisLabel} ${styles.labelRight}`}>Looking bright to the future</div>
            </div>

            <div className={styles.timeline}>
                {/* Add a continuous line element */}
                <div className={styles.continuousLine}></div>
                
                {MONTHS.map((month, index) => (
                    <div
                        key={month}
                        className={styles.timelineItem}
                        onClick={() => handleMonthClick(month)}
                    >
                        <div 
                            className={`
                                ${styles.timelinePoint} 
                                ${selectedMonth === month ? styles.active : ''}
                            `}
                        />
                        <div className={styles.timelineMonth}>{month}</div>
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
        </div>
    );
};

export default AIQuestionsDisplay;