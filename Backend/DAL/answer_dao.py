from .connection_db import create_connection


class AnswerDAO:
    @staticmethod
    def get_answers(question_id):
        query = "SELECT * FROM Answer WHERE question_id = ?"
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
    def get_answer(answer_id):
        query = "SELECT * FROM Answer WHERE answer_id = ?"
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (answer_id,))
                row = cursor.fetchone()
                if row:
                    return dict(zip([column[0] for column in cursor.description], row))
                else:
                    return None
        except Exception as e:
            print("Error fetching answer:", e)
            return None

    @staticmethod
    def insert_answer(data, axis_value):
        query = (
            "INSERT INTO Answer (answer_text, answer_date, x_axis_value, y_axis_value, answer_language, image_url, question_id) "
            "OUTPUT INSERTED.answer_id "
            "VALUES (?, ?, ?, ?, ?,  ?, (SELECT question_id FROM Question WHERE question_text_dutch = ? OR question_text_english = ?));")
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (
                    data["answer_text"],
                    data["answer_date"],
                    axis_value["x"],
                    axis_value["y"],
                    data["answer_language"],
                    data["image_url"],
                    data["question_text"],
                    data["question_text"]
                ))
                answer_id = cursor.fetchone()[0]
                connection.commit()
            return answer_id
        except Exception as e:
            print("Error inserting answer:", e)

    @staticmethod
    def insert_translated_answer(answer_id, answer_data):
        query = ("INSERT INTO AnswerTranslation (answer_dutch, answer_english, answer_id) "
                 "VALUES (?, ?, ?);")
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (
                    answer_data["answer_dutch"],
                    answer_data["answer_english"],
                    answer_id
                ))
                connection.commit()
        except Exception as e:
            print("Error inserting translated answer:", e)
