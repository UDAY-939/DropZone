import string
import random
import secrets
from datetime import datetime, timezone, timedelta
from models import db
from models.room import Room
from services.storage_service import StorageService

class RoomService:
    @staticmethod
    def generate_room_code(length=6, room_type="personal"):
        if room_type == "personal":
            # 6-digit numeric code easy to type/scan
            chars = string.digits
            return "".join(random.choices(chars, k=6))
        else:
            # Global room code: alphanumeric like DZ-XXXX
            chars = string.ascii_uppercase + string.digits
            suffix = "".join(random.choices(chars, k=5))
            return f"DZ-{suffix}"

    @staticmethod
    def create_room(room_type="personal", password=None, custom_code=None, expiry_hours=2):
        if custom_code:
            code = custom_code.strip().upper()
            existing = Room.query.filter_by(room_code=code, status="active").first()
            if existing:
                raise ValueError("Room code already exists. Please choose another code.")
        else:
            for _ in range(10):
                code = RoomService.generate_room_code(room_type=room_type)
                if not Room.query.filter_by(room_code=code, status="active").first():
                    break

        owner_token = secrets.token_hex(24)

        expires_at = None
        if room_type == "personal":
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)

        room = Room(
            room_code=code,
            room_type=room_type,
            owner_token=owner_token,
            expires_at=expires_at,
            status="active"
        )
        if password:
            room.set_password(password)

        db.session.add(room)
        db.session.commit()
        return room

    @staticmethod
    def get_room(room_code):
        if not room_code:
            return None
        code = room_code.strip().upper()
        room = Room.query.filter_by(room_code=code).first()
        if not room or room.status != "active":
            return None
        # Check expiry for personal room
        if room.expires_at:
            exp = room.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                room.status = "closed"
                db.session.commit()
                return None
        return room

    @staticmethod
    def delete_room(room_code, owner_token=None):
        room = RoomService.get_room(room_code)
        if not room:
            return False, "Room not found or already closed"

        if owner_token and room.owner_token != owner_token:
            return False, "Unauthorized: invalid owner token"

        # Delete physical files
        StorageService.delete_room_folder(room.room_code)

        db.session.delete(room)
        db.session.commit()
        return True, "Room deleted successfully"
