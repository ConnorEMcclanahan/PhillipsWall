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
            return self.structure_question_list(question_list)
        except Exception as e:
            return {"error": str(e)}, 500

    def structure_question_list(self, data):
        if not data:
            return {"error": "No data received."}, 500
        question_info = {
            "id": data[0].id,
            "question": {
                "en": data[0].question_en,
                "nl": data[0].question_nl,
            },
            "color": data[0].color,
            "gradientColor": data[0].gradient_color,
            "answers": {"en": [], "nl": []},
        }
        return self.check_language(question_info, data)

    @staticmethod
    def check_language(question_info, data):
        for row in data:
            if row.language == "en":
                question_info["answers"]["en"].append(row.answer)
            elif row.language == "nl":
                question_info["answers"]["nl"].append(row.answer)
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
