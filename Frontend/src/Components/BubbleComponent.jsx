import React from 'react';
import styles from "./BubbleComponent.module.css"; // Import CSS module

const Bubble = ({ style, text }) => {
    return (
        <div className={styles.bubble} style={style}>
            <span className={styles.bubbleText}>{text}</span>
        </div>
    );
};

export default Bubble;
