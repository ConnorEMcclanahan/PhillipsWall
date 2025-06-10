from flask import Blueprint, request, jsonify


def create_answer_blueprint(answer_service):
    answer_bp = Blueprint("answer", __name__)

    @answer_bp.route("/answers", methods=["GET"])
    def get_answers():
        return jsonify(answer_service.get_answers())

    @answer_bp.route("/process-image", methods=["POST"])
    def process_image():
        data = request.get_json()
        return answer_service.process_image(data)

    @answer_bp.route("/get_newest_answer")
    def get_latest_answer_id():
        return jsonify(answer_service.get_latest_answer_id())

    return answer_bp
