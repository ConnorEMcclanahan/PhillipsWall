import pyodbc

class AnswersDAL:
    def __init__(self):
        self.connection_string = (
            "Driver={ODBC Driver 18 for SQL Server};"
            "Server=mssqlstud.fhict.local;"
            "Database=dbi423421_philips;"
            "UID=dbi423421_philips;"
            "PWD=philips;"
            "TrustServerCertificate=Yes;"
        )

    def get_connection(self):
        """Open a connection to the MSSQL database."""
        return pyodbc.connect(self.connection_string)

    def insert_answer(self, answer, question_id, img_name, language):
        """
        Inserts an answer into the database.
        :param answer: The text of the answer.
        :param question_id: The ID of the related question.
        :param img_name: The name of the image file.
        :param detected_language: The language detected for the answer.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            sql = """
                INSERT INTO dbo.answers (answer, question_id, img_name, language)
                VALUES (?, ?, ?, ?)
            """
            cursor.execute(sql, (answer, question_id, img_name, language))
            conn.commit()