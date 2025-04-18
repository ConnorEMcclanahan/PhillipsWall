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
                                q.en AS question_en,
                                q.nl AS question_nl,
                                q.color AS color,
                                q.gradient_color AS gradient_color,
                                a.answer AS answer,
                                a.language AS language
                            FROM questions q
                            LEFT JOIN answers a ON q.question_id = a.question_id
                            WHERE q.question_id = ?
                            """,
                        (question_id,)
                    )
                    rows = cur.fetchall()
                return rows
        except Exception as e:
            print(f"Error fetching question and answers: {e}")
            return None
