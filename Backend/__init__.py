from flask import Flask
from flask_cors import CORS

from .DAL.answers_for_question_dao import AnswersForQuestionsDAO
from .DAL.question_dao import QuestionDAO
from .DAL.answer_dao import AnswerDAO
from .DAL.answer_group_dao import AnswerGroupDAO
from .DAL.api.portkey_client import PortkeyClient
from .services.question_service import QuestionService
from .services.answer_service import AnswerService
from .services.answer_group_service import AnswerGroupService
from .services.utility_service import UtilityService
from .routes import question_route as qr
from .routes import answer_route as ar
from .routes import answer_group_route as agr
from .routes import utility_route as ur

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Instantiate DAOs
    answers_for_questions_dao = AnswersForQuestionsDAO()
    question_dao = QuestionDAO()
    answer_dao = AnswerDAO()
    answer_group_dao = AnswerGroupDAO()
    portkey_client = PortkeyClient()

    # Instantiate service with DAOs
    question_service = QuestionService(answers_for_questions_dao, question_dao)
    answer_group_service = AnswerGroupService(portkey_client, answer_group_dao)
    answer_service = AnswerService(portkey_client, answer_dao, answer_group_service)
    utility_service = UtilityService(question_dao, answers_for_questions_dao, answer_dao)

    # Create blueprint by calling the factory function with the service instance
    question_bp = qr.create_question_blueprint(question_service)
    answer_bp = ar.create_answer_blueprint(answer_service)
    answer_group_bp = agr.create_answer_group_blueprint(answer_group_service)
    utility_bp = ur.create_utility_blueprint(utility_service)

    app.register_blueprint(answer_bp)
    app.register_blueprint(answer_group_bp)
    app.register_blueprint(question_bp)
    app.register_blueprint(utility_bp)

    return app
