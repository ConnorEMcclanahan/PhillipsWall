from flask import Blueprint, request


def create_answer_blueprint(answer_service):
    answer_bp = Blueprint("answer", __name__)

    @answer_bp.route("/process-image2", methods=["POST"])
    def process_image():
        data = request.get_json()
        return answer_service.process_image(data)
    

    return answer_bp

def create_automated_answer_blueprint(automated_answer_service):
    automated_answer_bp = Blueprint("automated_answer", __name__)
    print('automated_answer_bp')
    @automated_answer_bp.route("/process-image", methods=["POST"])
    def process_image():
        data = request.get_json()
        return automated_answer_service.process_folder()
    

    return automated_answer_bp

