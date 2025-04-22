from flask import Flask
from flask_cors import CORS

from .dal.answers_for_question_dao import AnswersForQuestionsDAO
from .dal.question_dao import QuestionDAO
from .dal.answer_dao import AnswerDAO
from .services.question_service import QuestionService
from .services.answer_service import AnswerService
from .services.utility_service import UtilityService
from .routes import question_route as qr
from .routes import answer_route as ar
from .routes import utility_route as ur

# Import needed for PostItParser
from .Visualization.PaddleOCR.post_it_parser import PostItParser
from .Visualization.PaddleOCR.data_parser import DataParser
from paddleocr import PaddleOCR
from fuzzywuzzy import fuzz
import yaml
import os


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Instantiate DAOs
    answers_for_questions_dao = AnswersForQuestionsDAO()
    question_dao = QuestionDAO()
    answer_dao = AnswerDAO()

    CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config/ocr_config.yml")
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)
    default_ocr = PaddleOCR(**config["default_ocr"])
    custom_ocr = PaddleOCR(**config["custom_ocr"])
    data_parser = DataParser()

    post_it_parser = PostItParser(
        default_ocr, custom_ocr, data_parser, question_dao, answer_dao, fuzz
    )

    # Instantiate service with DAOs
    question_service = QuestionService(answers_for_questions_dao, question_dao)
    answer_service = AnswerService(answer_dao, question_dao, post_it_parser)
    utility_service = UtilityService(question_dao, answer_dao)

    # Create blueprint by calling the factory function with the service instance
    question_bp = qr.create_question_blueprint(question_service)
    answer_bp = ar.create_answer_blueprint(answer_service)
    utility_bp = ur.create_utility_blueprint(utility_service)

    app.register_blueprint(answer_bp)
    app.register_blueprint(question_bp)
    app.register_blueprint(utility_bp)

    return app
