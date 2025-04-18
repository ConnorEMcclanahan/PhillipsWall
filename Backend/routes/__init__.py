from flask import Flask


from .answer_route import create_answer_blueprint
from .utility_route import create_utility_blueprint
from .question_route import create_question_blueprint
from ..dal.answers_for_question_dao import AnswersForQuestionsDAO
from ..dal.question_dao import QuestionDAO
from ..dal.answer_dao import AnswerDAO
from ..services.question_service import QuestionService
from ..services.answer_service import AnswerService
from ..services.utility_service import UtilityService


def create_app():
    app = Flask(__name__)

    answers_for_questions_dao = AnswersForQuestionsDAO()
    question_dao = QuestionDAO()
    answer_dao = AnswerDAO()

    question_service = QuestionService(answers_for_questions_dao, question_dao)
    answer_service = AnswerService(answer_dao, answers_for_questions_dao)
    utility_service = UtilityService(question_dao, answer_dao)

    app.register_blueprint(create_question_blueprint(question_service))
    app.register_blueprint(create_answer_blueprint(answer_service))
    app.register_blueprint(create_utility_blueprint(utility_service))

    return app
