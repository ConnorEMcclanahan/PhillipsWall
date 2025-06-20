import logging
from Backend import create_app


def configure_logging():
    logging.getLogger().setLevel(logging.WARNING)


configure_logging()
app = create_app()

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5000)
