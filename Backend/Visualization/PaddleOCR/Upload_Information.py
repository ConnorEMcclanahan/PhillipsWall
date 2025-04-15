import os
from paddleocr import PaddleOCR
from fuzzywuzzy import fuzz
from Visualization.PaddleOCR.DataParser import DataParser
from DAL.QuestionsDAL import QuestionsDAL
from DAL.AnswersDAL import AnswersDAL

# Initialize PaddleOCR with default and custom models
default_ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, cpu_threads=4)
custom_ocr = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=False,
    cpu_threads=4,
    rec_model_dir="../../output/v3_en_mobile/inference"  # Path to your custom inference model
)

# Initialize DataParser
data_parser = DataParser()

# Initialize DAL classes
questions_dal = QuestionsDAL()
answers_dal = AnswersDAL()

# Fetch all questions from the database
questions = questions_dal.get_all_questions()


def process_single_postit(image_path):
    """
    Process a single post-it note image using both the default PaddleOCR model and the custom model.
    Displays accuracy ratings for both and selects the best result.
    :param image_path: Path to the image file to process.
    """
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} does not exist.")
        return {
            "success": False,
            "error": "File does not exist"
        }

    # Run OCR with both models
    default_result = default_ocr.ocr(image_path, cls=True)
    custom_result = custom_ocr.ocr(image_path, cls=True)

    # Extract recognized text and accuracy ratings
    def extract_text_and_accuracy(result):
        extracted_text = []
        total_confidence = 0
        num_lines = 0

        for line in result[0]:
            text, confidence = line[1]
            if confidence > 0.0:
                extracted_text.append(text)
                total_confidence += confidence
                num_lines += 1

        average_confidence = total_confidence / num_lines if num_lines > 0 else 0
        return " ".join(extracted_text), average_confidence

    default_text, default_accuracy = extract_text_and_accuracy(default_result)
    custom_text, custom_accuracy = extract_text_and_accuracy(custom_result)

    if default_accuracy >= custom_accuracy:
        selected_text = default_text
        selected_accuracy = default_accuracy
        selected_model = "Default Model"
    else:
        selected_text = custom_text
        selected_accuracy = custom_accuracy
        selected_model = "Custom Model"

    if not selected_text.strip():
        return {
            "success": False,
            "error": "No text above confidence threshold"
        }

    # Process the text with DataParser
    processed_data = data_parser.process_text(selected_text, os.path.basename(image_path))

    if not processed_data:
        return {
            "success": False,
            "error": "Processing failed"
        }

    detected_language = processed_data['language']
    question_text = processed_data['question']
    answer_text = processed_data['answer']

    # Perform fuzzy matching
    best_match = None
    best_score = 0
    question_id = None
    for question in questions:
        match_score = fuzz.ratio(question_text, question["en"])
        if match_score > best_score:
            best_score = match_score
            question_id = question["question_id"]

    # Insert the answer if match score is acceptable
    if best_score > 70:
        answers_dal.insert_answer(answer_text, question_id, os.path.basename(image_path), detected_language)
        print(f"Processed: {image_path} - Linked to Question ID {question_id} with match score {best_score}.")
    else:
        print(f"Processed: {image_path} - No suitable match found.")

    print(f"Best Match Score: {best_score}, Matched Question ID: {question_id}")
    return {
        "success": True,
        "model_used": selected_model,
        "accuracy": selected_accuracy,
        "question": question_text,
        "answer": answer_text,
        "language": detected_language,
        "match_score": best_score if best_score > 70 else None,
        "question_id": question_id if best_score > 70 else None,
    }
