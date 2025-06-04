from flask import Blueprint, request, jsonify


def create_answer_group_blueprint(answer_group_service):
    answer_group_bp = Blueprint("answer_group", __name__)

    @answer_group_bp.route("/answer_groups", methods=["GET"])
    def get_answer_groups():
        return jsonify(answer_group_service.get_answer_groups())

    return answer_group_bp
