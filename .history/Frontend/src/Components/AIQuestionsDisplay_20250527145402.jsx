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
    const [activeMonth, setActiveMonth] = useState(null);
    const [selectedBubble, setSelectedBubble] = useState(null);

    const TRANSITION_DURATION = 500; 

    const MONTHS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Fetch questions
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

    // Fetch answers
    useEffect(() => {
        const fetchAnswers = async () => {
            try {
                const response = await fetch('http://localhost:5000/answers');
                const data = await response.json();
                setAnswersData(data);
            } catch (error) {
                console.error("Error fetching answers:", error);
            }
        };

        fetchAnswers();
    }, []);

    // Extract colors from questionsData
    const questionColorMap = useMemo(() => {
        const map = {};
        for (const q of questionsData) {
            map[q.question_id] = q.color;
        }
        return map;
    }, [questionsData]);
    
    // Get color function
    const getQuestionColor = useCallback((questionId) => {
        return questionColorMap[questionId] || '#7EDDDE';
    }, [questionColorMap]);

    // Position bubble function
    useEffect(() => {
        if (!answersData.length) return;

        const updateBubblePositions = () => {
            const styles = answersData.map((answer) => {
                // Make sure values are numbers
                const x = parseFloat(answer.x_axis_value) || 0;
                const y = parseFloat(answer.y_axis_value) || 0;
                
                const normalizedX = x * 50 + 50;
                const normalizedY = y * 50 + 50;
                
                return {
                    top: `${normalizedY}%`, // Changed from bottom to top
                    left: `${normalizedX}%`,
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: getQuestionColor(answer.question_id),
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                    zIndex: selectedBubble === answer.answer_id ? 10 : 5
                };
            });

            setBubbleStyles(styles);
        };

        updateBubblePositions();
        const interval = setInterval(updateBubblePositions, 8000);
        return () => clearInterval(interval);
    }, [answersData, getQuestionColor, selectedBubble]);

    // Handle bubble click
    const handleBubbleClick = (answerId) => {
        console.log(`Bubble clicked: ${answerId}`);
        setSelectedBubble(prevSelected => prevSelected === answerId ? null : answerId);
        
        // Find the clicked answer
        const clickedAnswer = answersData.find(answer => answer.answer_id === answerId);
        if (clickedAnswer) {
            console.log("Clicked answer data:", clickedAnswer);
            // You can add additional functionality here like showing answer details
        }
    };

    // Set current month as active
    useEffect(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        setActiveMonth(currentMonth);
    }, []);

    // Handle timeline point click
    const handleTimelinePointClick = (monthIndex) => {
        setActiveMonth(monthIndex);
        const monthName = MONTHS[monthIndex];
        console.log(`Showing data for ${monthName}`);
        
        // Reset selected bubble when changing months
        setSelectedBubble(null);
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
                                ${selectedBubble === answer.answer_id ? styles.selected : ''}
                            `}
                            data-color={getQuestionColor(answer.question_id)}
                            style={bubbleStyles[index]}
                            onClick={() => handleBubbleClick(answer.answer_id)}
                        />
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
        </div>
    );
};

export default AIQuestionsDisplay;