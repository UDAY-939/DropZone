from flask import Blueprint, request, jsonify, send_file
import os
from models import db
from models.room import Room
from models.file import SharedFile, Message
from services.room_service import RoomService
from services.storage_service import StorageService

api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "application": "DropZone API",
        "message": "Backend is running smoothly"
    })

@api_bp.post("/rooms")
def create_room():
    data = request.get_json() or {}
    room_type = data.get("room_type", "personal") # "personal" | "global"
    password = data.get("password")
    custom_code = data.get("custom_code")

    try:
        room = RoomService.create_room(
            room_type=room_type,
            password=password,
            custom_code=custom_code
        )
        res = room.to_dict()
        res["owner_token"] = room.owner_token
        return jsonify(res), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to create room", "details": str(e)}), 500

@api_bp.post("/rooms/join")
def join_room():
    data = request.get_json() or {}
    room_code = data.get("room_code", "").strip().upper()
    password = data.get("password")

    room = RoomService.get_room(room_code)
    if not room:
        return jsonify({"error": "Room not found, closed, or expired"}), 404

    if room.password_hash and not room.check_password(password):
        return jsonify({"error": "Invalid room password", "require_password": True}), 401

    return jsonify(room.to_dict()), 200

@api_bp.get("/rooms/<room_code>")
def get_room_details(room_code):
    room = RoomService.get_room(room_code)
    if not room:
        return jsonify({"error": "Room not found or expired"}), 404

    files = [f.to_dict() for f in room.files]
    messages = [m.to_dict() for m in room.messages]

    data = room.to_dict()
    data["files"] = files
    data["messages"] = messages
    return jsonify(data), 200

@api_bp.delete("/rooms/<room_code>")
def delete_room(room_code):
    data = request.get_json(silent=True) or {}
    owner_token = data.get("owner_token") or request.headers.get("X-Owner-Token")
    success, msg = RoomService.delete_room(room_code, owner_token=owner_token)
    if not success:
        return jsonify({"error": msg}), 400
    return jsonify({"message": msg}), 200

@api_bp.post("/rooms/<room_code>/files")
def upload_file(room_code):
    room = RoomService.get_room(room_code)
    if not room:
        return jsonify({"error": "Room not found or expired"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    uploaded_by = request.form.get("uploaded_by", "Guest")

    try:
        saved = StorageService.save_file(uploaded_file, room.room_code)
        file_record = SharedFile(
            room_id=room.id,
            file_name=saved["file_name"],
            content_type=saved["content_type"],
            size_bytes=saved["size_bytes"],
            storage_path=saved["storage_path"],
            uploaded_by=uploaded_by
        )
        db.session.add(file_record)
        db.session.commit()

        # Emit socket event via socketio
        from app import socketio
        socketio.emit("new_file", file_record.to_dict(), to=room.room_code)

        return jsonify(file_record.to_dict()), 201
    except Exception as e:
        return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500

@api_bp.get("/rooms/files/<int:file_id>/download")
def download_file(file_id):
    file_record = SharedFile.query.get(file_id)
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    if not os.path.exists(file_record.storage_path):
        return jsonify({"error": "File removed from disk"}), 404

    return send_file(
        file_record.storage_path,
        as_attachment=True,
        download_name=file_record.file_name,
        mimetype=file_record.content_type
    )

@api_bp.delete("/rooms/files/<int:file_id>")
def delete_file(file_id):
    file_record = SharedFile.query.get(file_id)
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    room = Room.query.get(file_record.room_id)
    room_code = room.room_code if room else None

    StorageService.delete_file(file_record.storage_path)
    db.session.delete(file_record)
    db.session.commit()

    if room_code:
        from app import socketio
        socketio.emit("file_deleted", {"file_id": file_id}, to=room_code)

    return jsonify({"message": "File deleted", "file_id": file_id}), 200

@api_bp.post("/rooms/<room_code>/messages")
def post_message(room_code):
    room = RoomService.get_room(room_code)
    if not room:
        return jsonify({"error": "Room not found or expired"}), 404

    data = request.get_json() or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Message content cannot be empty"}), 400

    msg = Message(
        room_id=room.id,
        sender=data.get("sender", "Anonymous"),
        sender_device=data.get("sender_device", "browser"),
        content=content
    )
    db.session.add(msg)
    db.session.commit()

    from app import socketio
    socketio.emit("new_message", msg.to_dict(), to=room.room_code)

    return jsonify(msg.to_dict()), 201
