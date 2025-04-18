from .connection_db import create_connection

class QuestionDAO:
    @staticmethod
    def get_questions():
        with create_connection() as connection:
            with connection.cursor() as cur:
                cur.execute("SELECT * FROM questions")
                columns = [desc[0] for desc in cur.description]
                rows = [dict(zip(columns, row)) for row in cur.fetchall()]
                return rows
