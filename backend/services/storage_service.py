import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

class StorageService:
    @staticmethod
    def get_upload_dir():
        folder = current_app.config.get("UPLOAD_FOLDER", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
        os.makedirs(folder, exist_ok=True)
        return folder

    @staticmethod
    def save_file(file_storage, room_code):
        upload_dir = StorageService.get_upload_dir()
        room_folder = os.path.join(upload_dir, room_code)
        os.makedirs(room_folder, exist_ok=True)

        original_filename = secure_filename(file_storage.filename) or "file"
        unique_name = f"{uuid.uuid4().hex[:8]}_{original_filename}"
        dest_path = os.path.join(room_folder, unique_name)
        file_storage.save(dest_path)

        size_bytes = os.path.getsize(dest_path)
        content_type = file_storage.content_type or "application/octet-stream"

        return {
            "file_name": original_filename,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "storage_path": dest_path
        }

    @staticmethod
    def delete_file(storage_path):
        if storage_path and os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception:
                pass

    @staticmethod
    def delete_room_folder(room_code):
        upload_dir = StorageService.get_upload_dir()
        room_folder = os.path.join(upload_dir, room_code)
        if os.path.exists(room_folder):
            import shutil
            try:
                shutil.rmtree(room_folder)
            except Exception:
                pass
