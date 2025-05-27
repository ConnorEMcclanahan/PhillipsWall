import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from './AIQuestionsDisplay.module.css';

// import { useLanguage } from './LanguageContext';

const AIQuestionsDisplay = () => {
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const [questionsData, setQuestionsData] = useState([]);
    const [answersData, setAnswersData] = useState([]);

    const [selectedMonth, setSelectedMonth] = useState(null);
    // const [currentPage, setCurrentPage] = useState(1);
    // const [isZooming, setIsZooming] = useState(false);

    // const ITEMS_PER_PAGE = 20;
    // const TRANSITION_DURATION = 500; 

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

    // const handleQuestionClick = async (questionId, event) => {
    //     const element = event.currentTarget;
    //     const rect = element.getBoundingClientRect();

    //     setClickedQuestionPosition({
    //         top: rect.top,
    //         left: rect.left,
    //         width: rect.width,
    //         height: rect.height
    //     });

    //     setIsZooming(true);

    //     // Add class to questionsGrid for zoom effect
    //     const gridElement = document.querySelector(`.${styles.questionsGrid}`);
    //     gridElement?.classList.add(styles.zooming);

    //     try {
    //         const response = await fetch(`http://localhost:5000/question/${questionId}`);
    //         const data = await response.json();

    //         // Stagger the transitions
    //         setTimeout(() => {
    //             gridElement?.classList.add(styles.zoomed);
    //             setActiveQuestion(questionId);
    //             setActiveQuestionData(data);
    //             setCurrentPage(1);
    //         }, TRANSITION_DURATION / 2);
    //     } catch (error) {
    //         console.error("Error fetching question details:", error);
    //     }
    // };

    // Function to handle back button click
    // const handleBack = () => {
    //     setIsZooming(false);

    //     const gridElement = document.querySelector(`.${styles.questionsGrid}`);
    //     gridElement?.classList.remove(styles.zoomed);

    //     setTimeout(() => {
    //         gridElement?.classList.remove(styles.zooming);
    //         setActiveQuestion(null);
    //         // setActiveQuestionData(null);
    //         setCurrentPage(1);
    //         setClickedQuestionPosition(null);
    //     }, TRANSITION_DURATION);
    // };


    const handleMonthClick = (month) => {
        setSelectedMonth(prev => prev === month ? null : month);
    };

    return (
        <div className={styles.container}>
            <div className={styles.answersLayer}>
                <div className={styles.answersGrid}>

                    {answersData.map((answer, index) => (    
                        <div
                            key={answer.answer_id}
                            className={`
                                ${styles.answerItem}
                            `}
                            data-color={getQuestionColor(answer.question_id)}
                            style={bubbleStyles[index]}
                            // onClick={(e) => handleQuestionClick(question.question_id, e)}
                        >
                            <div className={styles.answerText}>
                                {answer.answer_text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.gridLines}>
                <div className={`${styles.axisLabel} ${styles.labelTop}`}>AI enthusiast</div>
                <div className={`${styles.axisLabel} ${styles.labelBottom}`}>AI skeptic</div>
                <div className={`${styles.axisLabel} ${styles.labelLeft}`}>Little scared of the future</div>
                <div className={`${styles.axisLabel} ${styles.labelRight}`}>Looking bright to the future</div>
            </div>

            <div className={styles.timeline}>
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