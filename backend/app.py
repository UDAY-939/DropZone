import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

from config import Config
from models import db
from routes import api_bp
from services.webrtc_service import register_socket_events

load_dotenv()

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    CORS(app, origins="*")
    db.init_app(app)
    socketio.init_app(app)

    # Register blueprints
    app.register_blueprint(api_bp)

    # Register SocketIO signaling events
    register_socket_events(socketio)

    # Ensure tables exist
    with app.app_context():
        db.create_all()

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, allow_unsafe_werkzeug=True)
