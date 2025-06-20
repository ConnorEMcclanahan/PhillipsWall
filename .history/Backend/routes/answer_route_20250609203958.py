from flask import Blueprint, request, jsonify


def create_answer_blueprint(answer_service):
    answer_bp = Blueprint("answer", __name__)

    @answer_bp.route("/answers", methods=["GET"])
    def get_answers():
        print("Answers API called")
        try:
            result = answer_service.get_answers()
            print(f"Successfully fetched {len(result)} answers")
            return jsonify(result)
        except Exception as e:
            print(f"Error in answers API: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @answer_bp.route("/process-image", methods=["POST"])
    def process_image():
        data = request.get_json()
        return answer_service.process_image(data)

    return answer_bp
