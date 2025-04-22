import os


class PostItParser:
    ACCEPTANCE_SCORE = 70

    def __init__(
        self, default_ocr, custom_ocr, data_parser, question_dal, answer_dal, fuzz
    ):
        self.default_ocr = default_ocr
        self.custom_ocr = custom_ocr
        self.data_parser = data_parser
        self.question_dal = question_dal
        self.answer_dal = answer_dal
        self.fuzz = fuzz
        self.questions = self.question_dal.get_questions()

    """
        Process a single post-it note image using both the default PaddleOCR model and the custom model.
        Displays accuracy ratings for both and selects the best result.
        :param image_path: Path to the image file to process.
    """

    @staticmethod
    def validate_image_path(image_path):
        if not os.path.exists(image_path):
            print(f"Error: File {image_path} does not exist.")
            raise FileNotFoundError(f"File {image_path} does not exist.")

    # Selects best results with OCR default & custom models
    def parse_image(self, image_path: str):
        self.validate_image_path(image_path)
        default_result = self.default_ocr.ocr(image_path, cls=True)
        custom_result = self.custom_ocr.ocr(image_path, cls=True)

        default_text, default_accuracy = self.extract_text_and_accuracy(default_result)
        custom_text, custom_accuracy = self.extract_text_and_accuracy(custom_result)
        ocr_configs = [
            (default_text, default_accuracy, "Default Model"),
            (custom_text, custom_accuracy, "Custom Model"),
        ]
        selected_result = max(ocr_configs, key=lambda x: x[1])
        return self.parse_text(selected_result, image_path)

    # Extract recognized text and accuracy ratings
    @staticmethod
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

    def parse_text(self, output: tuple, image_path: str):
        # Process the text with DataParser
        try:
            parsed_data = self.data_parser.process_text(
                output[0], os.path.basename(image_path)
            )
            answer_record = {
                "question_text": parsed_data["question"],
                "answer_text": parsed_data["answer"],
                "language": parsed_data["language"],
                "image_path": image_path,
                "selected_model": output[2],
                "accuracy": output[1],
            }
            return self.find_best_question_id(answer_record)
        except Exception as e:
            print(f"Error processing text: {e}")
            return {"success": False, "error": str(e)}

    # Perform fuzzy matching to find what existing question matches the best
    def find_best_question_id(self, answer_record: dict):
        best_score = 0
        best_question_id = 0
        for question in self.questions:
            match_score = self.fuzz.ratio(
                answer_record["question_text"], question["en"]
            )
            if match_score > best_score:
                best_score = match_score
                best_question_id = question["question_id"]
        answer_record["question_id"] = best_question_id
        if best_score > self.ACCEPTANCE_SCORE:
            self.insert_answer(answer_record)
        result = self.format_result(answer_record, best_score)
        return result

    def insert_answer(self, post_it_data: dict):
        self.answer_dal.insert_answer(
            post_it_data["answer_text"],
            post_it_data["question_id"],
            post_it_data["image_path"],
            post_it_data["language"],
        )

    @staticmethod
    def format_result(post_it_data: dict, match_score):
        question_id = (
            post_it_data["question_id"]
            if post_it_data["question_id"]
            else "No match found."
        )

        return {
            "success": True,
            "model_used": post_it_data["selected_model"],
            "accuracy": post_it_data["accuracy"],
            "question": post_it_data["question_text"],
            "answer": post_it_data["answer_text"],
            "language": post_it_data["language"],
            "match_score": match_score,
            "question_id": question_id,
        }
