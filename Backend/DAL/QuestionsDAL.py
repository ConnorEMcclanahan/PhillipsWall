import pyodbc

class QuestionsDAL:
    def __init__(self):
        self.connection_string = (
            "Driver={ODBC Driver 18 for SQL Server};"
            "Server=mssqlstud.fhict.local;"
            "Database=dbi423421_philips;"
            "UID=dbi423421_philips;"
            "PWD=philips;"
            "TrustServerCertificate=Yes;"
        )

    def get_all_questions(self):
        with pyodbc.connect(self.connection_string) as conn:
            cursor = conn.cursor()
            query = "SELECT question_id, en FROM questions"
            cursor.execute(query)
            return [{"question_id": row.question_id, "en": row.en} for row in cursor.fetchall()]
