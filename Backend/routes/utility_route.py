from flask import Blueprint


def create_utility_blueprint(utility_service):
    utility_bp = Blueprint("utility", __name__)

    @utility_bp.route("/statistics", methods=["GET"])
    def get_statistics():
        return utility_service.get_statistics()

    return utility_bp
