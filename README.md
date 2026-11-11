# DropZone 🚀

A modern, login-free, cross-device file sharing web platform.

---

## 🌟 Key Features

1. **Share Within You (Mobile ↔ Laptop Quick Pair)**:
   - **Zero Login**: Scan a dynamically generated **QR Code** on your laptop screen with your phone camera, or type the 6-digit PIN.
   - **Auto-Sync**: Direct peer signaling using WebSockets & WebRTC.
   - **Ephemeral / Vanishing**: The room and files automatically vanish and are purged from storage once the session completes or you exit.

2. **Global Sharing (Multi-Device Across Any Network)**:
   - Create a persistent room with a custom room code (e.g. `DZ-PROJECTX`) and an optional password.
   - Share all kinds of files (photos, videos, PDFs, documents, code archives) up to 100MB.
   - Real-time room notes / chat log with timestamps and device names.
   - Persistent until manually deleted by the room creator.

3. **Built with Modern Tech**:
   - **Frontend**: React 18, Vite, Lucide Icons, QRCode Generator, Socket.IO Client.
   - **Backend**: Python 3.10+, Flask, Flask-SocketIO (eventlet/threading), SQLAlchemy.
   - **Storage & Database**: SQLite by default (zero setup, plug-and-play for PostgreSQL when configured).

---

## 🚀 How to Run Locally

### 1. Backend (Flask + Socket.IO)
```bash
cd backend
# Activate virtual environment
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate  # macOS / Linux

python app.py
```
Backend runs at `http://localhost:5000` (and `http://0.0.0.0:5000`).

### 2. Frontend (React + Vite)
```bash
cd frontend
node "D:\node\node_modules\npm\bin\npm-cli.js" run dev
# or: npm run dev
```
Frontend runs at:
- **Local:** `http://localhost:5173`
- **Your LAN / Mobile Access:** `http://10.221.141.64:5173`
