from .connection_db import create_connection


class AnswersForQuestionsDAO:
    @staticmethod
    def get_answers_for_question(question_id):
        try:
            with create_connection() as connection:
                with connection.cursor() as cur:
                    cur.execute(
                        """
                            SELECT 
                                q.question_id AS id,
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
                            """,
                        (question_id,),
                    )
                    rows = cur.fetchall()
                return rows
        except Exception as e:
            print(f"Error fetching question and answers: {e}")
            return None
