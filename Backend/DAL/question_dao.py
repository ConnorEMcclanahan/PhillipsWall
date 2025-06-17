from .connection_db import create_connection


class QuestionDAO:
    @staticmethod
    def get_questions():
        with create_connection() as connection:
            with connection.cursor() as cur:
              
                cur.execute("SELECT "
                            "question_id, "
                            "question_text_dutch as nl, "
                            "question_text_english as en, "
                            "color_hex as color FROM Question")

                columns = [desc[0] for desc in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return rows
