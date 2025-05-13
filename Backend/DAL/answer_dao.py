from .connection_db import create_connection


class AnswerDAO:
    @staticmethod
    def get_answers(question_id):
        query = "SELECT * FROM answers WHERE question_id = ?"
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (question_id,))
                rows = cursor.fetchall()
                answers = [
                    dict(zip([column[0] for column in cursor.description], row))
                    for row in rows
                ]
            return answers
        except Exception as e:
            print("Error fetching answers:", e)
            return []

    @staticmethod
    def insert_answer(answer, question_id, image_name, language):
        query = "INSERT INTO answers (question_id, answer, img_name, language) VALUES (?, ?, ?, ?)"

        # INSERT
        # INTO
        # answers(question_id, answer, img_name, language)
        # VALUES(?, ?, ?, ?)
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (question_id, answer, image_name, language))
                connection.commit()
        except Exception as e:
            print("Error inserting answer:", e)