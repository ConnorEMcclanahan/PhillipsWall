import configparser
import os

import pyodbc


def get_db_config(path=None):
    config = configparser.ConfigParser()
    if not path:
        path = os.path.join(os.path.dirname(__file__), "..", "config", "database.ini")
    config.read(path)
    return config["sqlserver"]


def create_connection():
    cfg = get_db_config()
    try:
        conn_str = (
            f"DRIVER={{{cfg['driver']}}};"
            f"SERVER={cfg['server']};"
            f"DATABASE={cfg['database']};"
            f"UID={cfg['uid']};"
            f"PWD={cfg['pwd']};"
            f"ENCRYPT=yes;"
            f"TRUSTSERVERCERTIFICATE={cfg['TrustServerCertificate']};"
        )
        return pyodbc.connect(conn_str)
    except Exception as e:
        print("Error, couldn't connect to database.", e)
