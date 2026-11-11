from datetime import datetime, timezone
from . import db

class SharedFile(db.Model):
    __tablename__ = "shared_files"

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=False, index=True)
    file_name = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(128), default="application/octet-stream")
    size_bytes = db.Column(db.BigInteger, default=0)
    storage_path = db.Column(db.String(512), nullable=False)
    uploaded_by = db.Column(db.String(64), default="Anonymous")
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "file_name": self.file_name,
            "content_type": self.content_type,
            "size_bytes": self.size_bytes,
            "uploaded_by": self.uploaded_by,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "download_url": f"/api/rooms/files/{self.id}/download",
        }

class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"), nullable=False, index=True)
    sender = db.Column(db.String(64), default="Anonymous")
    sender_device = db.Column(db.String(32), default="web") # 'laptop', 'mobile', etc.
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "room_id": self.room_id,
            "sender": self.sender,
            "sender_device": self.sender_device,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
