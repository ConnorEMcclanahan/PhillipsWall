from flask import Blueprint, jsonify


def create_question_blueprint(question_service):
    question_bp = Blueprint("question", __name__)

    @question_bp.route("/questions", methods=["GET"])
    def get_questions():
        return jsonify(question_service.get_questions())

    @question_bp.route("/question/<int:question_id>", methods=["GET"])
    def get_question(question_id):
        return jsonify(question_service.get_question_with_answers(question_id))

    @question_bp.route("/question-color/<int:question_id>", methods=["GET"])
    def get_question_color(question_id):
        return jsonify(question_service.get_question_color(question_id))

    return question_bp
