from flask import Blueprint, request, jsonify


def create_answer_group_blueprint(answer_group_service):
    answer_group_bp = Blueprint("answer_group", __name__)

    return answer_group_bp
