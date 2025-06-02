from datetime import datetime

from .connection_db import create_connection


class AnswerDAO:
    @staticmethod
    def get_answers():
        query = "SELECT * FROM Answer"
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query)
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
    def get_answers_with_translations():
        query = """
        SELECT 
            *
        FROM Answer a
        LEFT JOIN AnswerTranslation t ON a.answer_id = t.answer_id;
        """
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query)
                rows = cursor.fetchall()
                answers = [
                    dict(zip([column[0] for column in cursor.description], row))
                    for row in rows
                ]
            return answers
        except Exception as e:
            print("Error fetching answers with translations:", e)
            return []
        
    @staticmethod
    def get_answer_groups():
        query = """
        SELECT 
            ag.answer_group_id, 
            ag.x_axis_value, 
            ag.y_axis_value, 
            ag.question_id,

            a.answer_id, 
            a.answer_text,
            a.answer_date, 
            a.x_axis_value AS answer_x_axis_value, 
            a.y_axis_value AS answer_y_axis_value,
            a.answer_language,
            a.image_url,

            at.answer_dutch, 
            at.answer_english,

            COUNT(aig.answer_id) OVER (PARTITION BY ag.answer_group_id) AS answer_count

        FROM AnswerGroup ag
        JOIN AnswerInAnswerGroup aig ON ag.answer_group_id = aig.answer_group_id
        JOIN Answer a ON aig.answer_id = a.answer_id
        LEFT JOIN AnswerTranslation at ON a.answer_id = at.answer_id

        ORDER BY ag.answer_group_id;
        """
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query)
                rows = cursor.fetchall()
                columns = [column[0] for column in cursor.description]
                raw_results = [dict(zip(columns, row)) for row in rows]

            grouped = {}
            for row in raw_results:
                group_id = row["answer_group_id"]
                if group_id not in grouped:
                    grouped[group_id] = {
                        "answer_group_id": group_id,
                        "x_axis_value": row["x_axis_value"],
                        "y_axis_value": row["y_axis_value"],
                        "question_id": row["question_id"],
                        "answer_count": row["answer_count"],
                        "answers": []
                    }
                answer_data = {
                    "answer_id": row["answer_id"],
                    "answer_text": row["answer_text"],
                    "answer_date": row["answer_date"],
                    "x_axis_value": row["answer_x_axis_value"],
                    "y_axis_value": row["answer_y_axis_value"],
                    "answer_language": row["answer_language"],
                    "image_url": row["image_url"],
                    "answer_dutch": row["answer_dutch"],
                    "answer_english": row["answer_english"],
                }
                grouped[group_id]["answers"].append(answer_data)

            return list(grouped.values())

        except Exception as e:
            print("Error fetching answer groups:", e)
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
                    datetime.today().strftime('%Y-%m-%d %H:%M:%S'),
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
    
    @staticmethod
    def insert_answer_in_answer_group(answer_data, axis_values):
        match = AnswerDAO.get_answer_group_match(answer_data, axis_values)
        if match:
            # If a match is found, create a new anwerInAnswerGroup object
            AnswerDAO.create_answer_in_answer_group(answer_data, match)
            return
        else:
            answer_group_id = AnswerDAO.create_answer_group(answer_data, axis_values)
            if answer_group_id is not None:
                AnswerDAO.create_answer_in_answer_group(answer_data, {"answer_group_id": answer_group_id})
                return
            else:
                print("Failed to create answer in group.")
                return


    @staticmethod
    def get_answer_group_match(answer_data, axis_values):
        query = (
                "SELECT * FROM AnswerGroup "
                "WHERE x_axis_value = ? AND y_axis_value = ? "
                "AND question_id = ("
                "   SELECT question_id FROM Question "
                "   WHERE question_text_dutch = ? OR question_text_english = ?"
                ");" )
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (
                    axis_values["x"],
                    axis_values["y"],
                    answer_data["question_text"],
                    answer_data["question_text"]
                ))
                row = cursor.fetchone()
                if row:
                    return dict(zip([column[0] for column in cursor.description], row))  # Answer already exists in the group
                else:
                    return None
        except Exception as e:
            print("Error fetching answer group match:", e)
            return None
        
    @staticmethod
    def create_answer_in_answer_group(answer_data, match):
        query = ("INSERT INTO AnswerInAnswerGroup (answer_id, answer_group_id) "
                 "VALUES (?, ?);")
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (
                    answer_data["answer_id"],
                    match["answer_group_id"]
                ))
                connection.commit()
        except Exception as e:
            print("Error creating answer in answer group:", e)
        
    @staticmethod
    def create_answer_group(answer_data, axis_values):
        question_id = AnswerDAO.get_question_id_by_text(answer_data["question_text"])
        if question_id is None:
            print("Question ID not found for the provided question text.")
            return None
        
        query = ("INSERT INTO AnswerGroup (x_axis_value, y_axis_value, question_id)"
                 "OUTPUT INSERTED.answer_group_id "
                 "VALUES (?, ?, ?);")
        try:
            with create_connection() as connection:
                cursor = connection.cursor()
                cursor.execute(query, (
                    axis_values["x"],
                    axis_values["y"],
                    question_id
                ))
                answer_group_id = cursor.fetchone()[0]
                connection.commit()   
            return answer_group_id
        except Exception as e:
            print(f"SQL Error in create_answer_in_group: {e}")
            return None

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
