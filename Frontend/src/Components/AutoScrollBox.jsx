import { useEffect, useState, useRef } from "react";
import questionsData from "../Data/Questions.json"; // Adjust the path as needed
import styles from "./AutoScrollBox.module.css";
import Bubble from "./BubbleComponent";

const AutoScrollBox = ({ language = "en" }) => {
    const [bubbleStyles, setBubbleStyles] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = useRef(null);

    useEffect(() => {
        // Generate spaced-out styles for the bubbles
        const styles = Array(questionsData.length)
            .fill()
            .map((_, i) => ({
                top: `${10 + (i * 15) % 70}%`,
                left: `${10 + (i * 20) % 70}%`,
                zIndex: Math.floor(Math.random() * 10),
            }));
        setBubbleStyles(styles);
    }, []);

    useEffect(() => {
        // Infinite scrolling interval
        const interval = setInterval(() => {
            setActiveIndex((prevIndex) => (prevIndex + 1) % questionsData.length);

            if (carouselRef.current) {
                const container = carouselRef.current;
                const bubbleWidth = container.firstChild.offsetWidth;
                container.scrollLeft += bubbleWidth;

                // Reset scroll for infinite effect
                if (container.scrollLeft >= container.scrollWidth / 2) {
                    container.scrollLeft = 0;
                }
            }
        }, 3000); // Change bubble every 3 seconds

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    // Duplicate bubbles for infinite scrolling effect
    const infiniteData = [...questionsData, ...questionsData];

    return (
        <div className={styles.container} ref={carouselRef}>
            {infiniteData.map((question, index) => (
                <Bubble
                    key={index}
                    style={{
                        ...bubbleStyles[index % questionsData.length], // Cycle styles
                        backgroundColor: question.color,
                        transform: activeIndex === index % questionsData.length ? "scale(1.2)" : "scale(1)",
                        transition: "transform 0.5s ease",
                    }}
                    text={question.question[language]}
                />
            ))}
        </div>
    );
};

export default AutoScrollBox;
