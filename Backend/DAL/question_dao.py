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
            
    @staticmethod
    def get_question_id_by_text(question_text):
        query = """
        SELECT question_id FROM Question 
        WHERE question_text_dutch = ? OR question_text_english = ?;
        """
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (question_text, question_text))
                row = cursor.fetchone()
                if row:
                    return row[0]
                else:
                    print("No matching question found for text:", question_text)
                    return None
        except Exception as e:
            print("Error fetching question ID:", e)
            return None

