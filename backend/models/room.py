from datetime import datetime, timezone
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from . import db

class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.Integer, primary_key=True)
    room_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    room_type = db.Column(db.String(20), nullable=False)  # 'personal' or 'global'
    password_hash = db.Column(db.String(255), nullable=True) # Optional password for global rooms
    owner_token = db.Column(db.String(64), nullable=False) # For owner auth / delete room
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=True)     # For temporary/expired personal rooms
    status = db.Column(db.String(20), default="active")    # 'active' or 'closed'

    files = db.relationship("SharedFile", backref="room", cascade="all, delete-orphan", lazy=True)
    messages = db.relationship("Message", backref="room", cascade="all, delete-orphan", lazy=True)

    def set_password(self, password):
        if password:
            self.password_hash = generate_password_hash(password)
        else:
            self.password_hash = None

    def check_password(self, password):
        if not self.password_hash:
            return True
        if not password:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "room_code": self.room_code,
            "room_type": self.room_type,
            "has_password": bool(self.password_hash),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "status": self.status,
            "file_count": len(self.files),
            "message_count": len(self.messages),
        }
