import base64
import os
import tempfile

from flask import jsonify
from ..Visualization.PaddleOCR.post_it_parser import PostItParser


class AnswerService:
    def __init__(self, answer_dao, answers_for_questions_dao, post_it_parser):
        self.ad = answer_dao
        self.afqd = answers_for_questions_dao
        self.post_it_parser = post_it_parser

    def process_image(self, data):
        try:
            self.check_if_image(data)
            base64_string = data["image"]
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]

            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
                image_data = base64.b64decode(base64_string)
                temp_file.write(image_data)
                temp_path = temp_file.name

            try:
                # Process the image using your existing function
                result = self.post_it_parser.parse_image(temp_path)
                return jsonify(
                    result
                    if result
                    else {"success": False, "error": "Processing failed"}
                )
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @staticmethod
    def check_if_image(data):
        if not data or "image" not in data:
            return jsonify({"success": False, "error": "No image data provided"}), 400
