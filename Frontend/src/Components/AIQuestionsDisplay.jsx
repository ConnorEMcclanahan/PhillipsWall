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

    const ITEMS_PER_PAGE = 7;
    const TRANSITION_DURATION = 500; // Match with CSS transition duration

    const generateSpiralPoints = useCallback((count, centerX, centerY, spiralAngle) => {
        const points = [];
        const a = 35;
        const b = 0.4;

        for (let i = 0; i < count; i++) {
            let angle = i * spiralAngle * (Math.PI / 180);
            let radius = a * Math.sqrt(i) * b;

            let x = centerX + radius * Math.cos(angle);
            let y = centerY + radius * Math.sin(angle);

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
    const generateGradientBackground = (questions, bubbleStyles) => {
        if (!questions.length || !bubbleStyles.length) return 'none';

        // Create gradient background based on questions data and their positions
        const gradients = questions.map((question, index) => {
            // Convert the percentage positions from bubbleStyles to the gradient position
            const top = parseFloat(bubbleStyles[index]?.top) || 0;
            const left = parseFloat(bubbleStyles[index]?.left) || 0;

            // Adjust left and top to center the gradients behind the bubbles
            // Example adjustment: centering using 50% as base
            const centeredLeft = left - 40 + 50;
            const centeredTop = top - 40 + 50;

            // Extract the main color from the linear gradient
            const mainColor = extractColorFromGradient(question.gradient_color);

            // Create two radial gradients for each question - one for glow, one for core
            return [
                // Larger, softer gradient for the glow effect
                `radial-gradient(350px at ${centeredLeft}% ${centeredTop}%, ${mainColor}33 0%, transparent 100%)`,
                // Smaller, more intense gradient for the core
                `radial-gradient(650px at ${centeredLeft}% ${centeredTop}%, ${mainColor}66 0%, transparent 60%)`
            ];
        }).flat();

        // Join all gradients
        return gradients.join(", ");
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
            const randomSpiralAngle = Math.floor(Math.random() * (150 - 130 + 1)) + 130;
            const points = generateSpiralPoints(questionsData.length, 42, 40, randomSpiralAngle);

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
    }, [questionsData.length, generateSpiralPoints]);

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

    return (
        <div className={styles.container}>
            <div
                className={styles.gradientBackground}
                style={{
                    background: activeQuestionData
                        ? `radial-gradient(700px at center, ${activeQuestionData.color}33 80%, transparent 100%)`
                        : generateGradientBackground(questionsData, bubbleStyles),
                    opacity: isZooming ? 0.5 : 1
                }}
            />
            <div className={styles.pixelGrid} />

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
                            style={{
                                ...bubbleStyles[index],
                                ...(clickedQuestionPosition && question.question_id === activeQuestion
                                    ? {
                                        top: clickedQuestionPosition.top,
                                        left: clickedQuestionPosition.left,
                                        width: clickedQuestionPosition.width,
                                        height: clickedQuestionPosition.height
                                    }
                                    : {}),
                                boxShadow: `0 0 40px ${question.gradient_color}`,
                            }}
                            onClick={(e) => handleQuestionClick(question.question_id, e)}
                        >
                            <div className={styles.questionText}>
                                {question[language]}
                            </div>
                            <div
                                className={styles.glowEffect}
                                style={{ backgroundColor: question.color }}
                            />
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
        </div>
    );
};

export default AIQuestionsDisplay;