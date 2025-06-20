import logging
from Backend import create_app


def configure_logging():
    logging.getLogger().setLevel(logging.WARNING)


configure_logging()
app = create_app()

if __name__ == "__main__":
    print("Starting server on all interfaces (0.0.0.0:5000)")
    print("Access from other devices at http://10.15.0.22:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
