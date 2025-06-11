from .connection_db import create_connection


class AnswersForQuestionsDAO:
    @staticmethod
    def get_answers_for_question(question_id):
        query = """
        SELECT 
            q.question_id,
            q.question_text_dutch AS question_nl,
            q.question_text_english AS question_en,
            q.color_hex AS color,
            aTra.answer_dutch AS answer_nl,
            aTra.answer_english AS answer_en,
            a.answer_language AS language
        FROM Question q
        LEFT JOIN Answer a ON a.question_id = q.question_id
        LEFT JOIN AnswerTranslation aTra ON aTra.answer_id = a.answer_id
        WHERE q.question_id = ?
        """
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (question_id,))
                rows = cursor.fetchall()
                if rows:
                    return [
                        dict(zip([column[0] for column in cursor.description], row))
                        for row in rows
                    ]
                else:
                    return []
        except Exception as e:
            print("Error fetching answers:", e)
            return []
