import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dropzone-secret-key-2026")
    # Default to sqlite if DATABASE_URL is not set or postgres is not available
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'dropzone.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(os.path.dirname(__file__), "uploads")
    )
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max file upload
