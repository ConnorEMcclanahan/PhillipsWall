import base64
import os
import tempfile

from flask import Flask, jsonify, request
from flask_cors import CORS

from DAL.PostWallPersistence import PostWallPersistence
from Visualization.PaddleOCR.Upload_Information import process_single_postit

app = Flask(__name__)
CORS(app)
db = PostWallPersistence()



@app.route('/questions', methods=['GET'])
def get_questions():
    questions = db.get_questions()
    if not questions:
        return jsonify({"error": "Failed to fetch questions"}), 500
    return jsonify(questions)

@app.route('/question/<int:question_id>', methods=['GET'])
def get_question(question_id):
    try:
        data_object = db.get_data_object(question_id)
        return jsonify(data_object), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/question-color/<int:question_id>', methods=['GET'])
def get_question_color(question_id):
    try:
        data_object = db.get_data_object(question_id)
        return jsonify({
            "color": data_object["color"],
            "gradientColor": data_object["gradientColor"]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/statistics', methods=['GET'])
def get_statistics():
    try:
        statistics = db.get_statistics()
        return jsonify(statistics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/process-image', methods=['POST'])
def process_image():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "error": "No image data provided"
            }), 400

        # Get base64 image data
        base64_string = data['image']
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            image_data = base64.b64decode(base64_string)
            temp_file.write(image_data)
            temp_path = temp_file.name

        try:
            # Process the image using your existing function
            result = process_single_postit(temp_path)
            return jsonify(result if result else {
                "success": False,
                "error": "Processing failed"
            })
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
