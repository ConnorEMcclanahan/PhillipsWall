class QuestionService:
    def __init__(self, answers_for_questions_dao, question_dao):
        self.answers_for_questions_dao = answers_for_questions_dao
        self.question_dao = question_dao

    def get_questions(self):
        questions = self.question_dao.get_questions()
        if not questions:
            return {"error": "Questions not found."}, 500
        return questions

    def get_question_with_answers(self, question_id):
        try:
            question_list = self.answers_for_questions_dao.get_answers_for_question(
                question_id
            )
            if not question_list:
                return {"error": "Question list is empty."}, 500

            return self.format_question_list_to_json(question_list)
        except Exception as e:
            return {"error": str(e)}, 500

    @staticmethod
    def format_question_list_to_json(data):
        question_info = {
            "id": data[0].id,
            "question": {
                "en": data[0].question_en,
                "nl": data[0].question_nl,
            },
            "color": data[0].color,
            "answers": {
                "en": [answer.answer_en for answer in data],
                "nl": [answer.answer_nl for answer in data]
            }
        }
        return question_info

    def get_question_color(self, question_id):
        try:
            data_object = self.answers_for_questions_dao.get_question_color(question_id)
            return {
                "color": data_object["color"],
                "gradientColor": data_object["gradientColor"],
            }
        except Exception as e:
            return {"error": str(e)}, 500
