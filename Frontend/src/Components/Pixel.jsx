import React, { useState } from "react";
import styles from "./Pixel.module.css";

const PixelBackground = ({ bubblesData, onPixelClick }) => {
    // Determine the grid size
    const gridSize = 20; // Number of pixels per row/column
    const totalPixels = gridSize * gridSize;

    // Generate pixel colors based on bubble positions
    const pixels = Array.from({ length: totalPixels }).map((_, index) => {
        // Use a heuristic to assign colors (e.g., map bubbles to regions of the grid)
        const bubbleIndex = index % bubblesData.length; // Example mapping
        return {
            color: bubblesData[bubbleIndex].color,
            question: bubblesData[bubbleIndex].question,
            answers: bubblesData[bubbleIndex].answers,
        };
    });

    return (
        <div className={styles.pixelGrid}>
            {pixels.map((pixel, index) => (
                <div
                    key={index}
                    className={styles.pixel}
                    style={{ backgroundColor: pixel.color }}
                    onClick={() => onPixelClick(pixel)}
                />
            ))}
        </div>
    );
};

export default PixelBackground;
