import pyodbc
from collections import Counter
import statistics
from typing import Dict, List

class PostWallPersistence:
    def __init__(self):
        # e.g. "ODBC Driver 17 for SQL Server" or "ODBC Driver 18 for SQL Server"
        self.connection_string = (
            "Driver={ODBC Driver 18 for SQL Server};"
            "Server=mssqlstud.fhict.local;"
            "Database=dbi423421_philips;"
            "UID=dbi423421_philips;"
            "PWD=philips;"
            "TrustServerCertificate=Yes;"
        )

    def _connect(self):
        try:
            connection = pyodbc.connect(self.connection_string)
            return connection
        except pyodbc.Error as e:
            print("Error connecting to the database:", e)
            return None

    def get_data_object(self, question_id):
        connection = pyodbc.connect(self.connection_string)
        cursor = connection.cursor()

        # SQL query to fetch question and answers
        query = """
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
            """

        cursor.execute(query, (question_id,))
        rows = cursor.fetchall()

        # Transform data into desired structure
        result = {
            "id": rows[0].id,
            "question": {
                "en": rows[0].question_en,
                "nl": rows[0].question_nl,
            },
            "color": rows[0].color,
            "gradientColor": rows[0].gradient_color,
            "answers": {
                "en": [],
                "nl": []
            }
        }

        for row in rows:
            if row.language == "en":
                result["answers"]["en"].append(row.answer)
            elif row.language == "nl":
                result["answers"]["nl"].append(row.answer)

        connection.close()
        return result
    def get_questions(self):
        query = "SELECT * FROM questions"
        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query)
                rows = cursor.fetchall()
                questions = [dict(zip([column[0] for column in cursor.description], row)) for row in rows]
                return questions
            except pyodbc.Error as e:
                print("Error fetching questions:", e)
                return []
            finally:
                connection.close()
    def get_answers(self, question_id):
        query = "SELECT * FROM answers WHERE question_id = ?"
        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query, (question_id,))
                rows = cursor.fetchall()
                answers = [dict(zip([column[0] for column in cursor.description], row)) for row in rows]
                return answers
            except pyodbc.Error as e:
                print("Error fetching answers:", e)
                return []
            finally:
                connection.close()
    def insert_question(self, en_text, nl_text, color, gradient_color):
        query = """
            INSERT INTO questions (en, nl, color, gradient_color)
            VALUES (?, ?, ?, ?)
            """
        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query, (en_text, nl_text, color, gradient_color))
                connection.commit()
                print("Question inserted successfully.")
            except pyodbc.Error as e:
                print("Error inserting question:", e)
            finally:
                connection.close()
    def insert_answer(self, question_id, answer, img_name, language):
        query = """
            INSERT INTO answers (question_id, answer, img_name, language)
            VALUES (?, ?, ?, ?)
            """
        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query, (question_id, answer, img_name, language))
                connection.commit()
                print("Answer inserted successfully.")
            except pyodbc.Error as e:
                print("Error inserting answer:", e)
            finally:
                connection.close()
    def update_question(self, question_id, en_text=None, nl_text=None, color=None, gradient_color=None):
        updates = []
        params = []

        if en_text:
            updates.append("en = ?")
            params.append(en_text)
        if nl_text:
            updates.append("nl = ?")
            params.append(nl_text)
        if color:
            updates.append("color = ?")
            params.append(color)
        if gradient_color:
            updates.append("gradient_color = ?")
            params.append(gradient_color)

        params.append(question_id)
        query = f"UPDATE questions SET {', '.join(updates)} WHERE question_id = ?"

        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query, params)
                connection.commit()
                print("Question updated successfully.")
            except pyodbc.Error as e:
                print("Error updating question:", e)
            finally:
                connection.close()
    def delete_question(self, question_id):
        query = "DELETE FROM questions WHERE question_id = ?"
        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query, (question_id,))
                connection.commit()
                print("Question deleted successfully.")
            except pyodbc.Error as e:
                print("Error deleting question:", e)
            finally:
                connection.close()
    def delete_answer(self, answer_id):
        query = "DELETE FROM answers WHERE answer_id = ?"
        connection = self._connect()
        if connection:
            try:
                cursor = connection.cursor()
                cursor.execute(query, (answer_id,))
                connection.commit()
                print("Answer deleted successfully.")
            except pyodbc.Error as e:
                print("Error deleting answer:", e)
            finally:
                connection.close()

    def _calculate_general_metrics(self, questions: List, answers: List) -> Dict:
        return {
            "total_questions": len(questions),
            "total_answers": len(answers),
            "average_answers_per_question": round(len(answers) / len(questions), 2) if questions else 0,
            "questions_with_answers": len(set(answer['question_id'] for answer in answers)),
            "questions_without_answers": len(questions) - len(set(answer['question_id'] for answer in answers))
        }

    def _calculate_response_distribution(self, questions: List) -> Dict:
        question_answer_counts = {
            question['question_id']: len(self.get_answers(question['question_id']))
            for question in questions
        }

        answer_lengths = list(question_answer_counts.values())

        return {
            "max_answers_for_question": max(answer_lengths) if answer_lengths else 0,
            "min_answers_for_question": min(answer_lengths) if answer_lengths else 0,
            "median_answers_per_question": statistics.median(answer_lengths) if answer_lengths else 0,
            "questions_by_answer_count": question_answer_counts  # Map question_id to the number of answers
        }
    def _calculate_engagement_metrics(self, questions: List, answers: List) -> Dict:
        # Calculate engagement over time (you might want to add timestamp field to your DB)
        question_engagement = {}
        for question in questions:
            question_answers = [a for a in answers if a['question_id'] == question['question_id']]
            question_engagement[question['question_id']] = len(question_answers)

        most_engaging = sorted(question_engagement.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "most_engaging_questions": [
                {
                    "question_id": q_id,
                    "answer_count": count,
                    "question_text_en": next(q['en'] for q in questions if q['question_id'] == q_id)
                }
                for q_id, count in most_engaging
            ]
        }

    def get_statistics(self) -> Dict:
        """Calculate various statistics from the questions and answers data"""
        questions = self.get_questions() or []
        all_answers = []
        for question in questions:
            answers = self.get_answers(question.get('question_id')) or []
            all_answers.extend(answers)

        stats = {
            "general_metrics": self._calculate_general_metrics(questions, all_answers),
            "language_distribution": self._calculate_language_distribution(all_answers),
            "response_distribution": self._calculate_response_distribution(questions),
            "engagement_metrics": self._calculate_engagement_metrics(questions, all_answers),
            "completion_rate": self._calculate_completion_rate(questions, all_answers),
            "popularity": self._calculate_popularity(questions, all_answers),
            "color_usage": self._analyze_color_usage(questions)
        }
        return stats

    def _calculate_language_distribution(self, answers: List) -> Dict:
        language_counts = Counter(answer.get('language', 'unknown') for answer in answers if answer.get('language'))
        return {
            "language_counts": dict(language_counts),
            "percentage_per_language": {
                lang: round((count / len(answers) * 100), 2)
                for lang, count in language_counts.items()
            } if answers else {}
        }

    def _analyze_color_usage(self, questions: List) -> Dict:
        colors = Counter(question.get('color', 'unknown') for question in questions if question.get('color'))
        gradient_colors = Counter(
            question.get('gradient_color', 'unknown') for question in questions if question.get('gradient_color'))

        return {
            "color_palette": dict(colors),
            "gradient_palette": dict(gradient_colors),
            "most_used_colors": dict(colors.most_common(3)),
            "most_used_gradients": dict(gradient_colors.most_common(3))
        }

    def _calculate_completion_rate(self, questions: List, answers: List) -> Dict:
        question_answer_counts = {q['question_id']: len([a for a in answers if a['question_id'] == q['question_id']])
                                  for q in questions}
        return {
            "question_completion_rate": {
                q_id: round((count / len(answers)) * 100, 2) if len(answers) > 0 else 0
                for q_id, count in question_answer_counts.items()
            }
        }


    def _calculate_popularity(self, questions: List, answers: List) -> Dict:
        question_answer_counts = {q['question_id']: len([a for a in answers if a['question_id'] == q['question_id']])
                                  for q in questions}
        most_popular = sorted(question_answer_counts.items(), key=lambda x: x[1], reverse=True)[0]
        least_popular = sorted(question_answer_counts.items(), key=lambda x: x[1])[
            0] if question_answer_counts else None
        return {
            "most_popular_question": most_popular,
            "least_popular_question": least_popular,
        }


