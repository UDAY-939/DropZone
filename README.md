<div align="center">

# ⚡ DropZone

### Fast, Minimalist, Login-Free Cross-Device File & Notes Exchange

[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-yellow?style=for-the-badge&logo=python)](https://python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-black?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-Realtime-black?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

<p align="center">
  <b>DropZone</b> is a zero-authentication, peer-to-peer inspired file-sharing web application. Move photos, videos, documents, and live notes between your phone and laptop in seconds using instant dynamic QR codes, or create password-protected persistent rooms accessible anywhere on Earth.
</p>

[Key Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Deployment](#-production-deployment) • [Author](#-author)

---

</div>

## 🌟 Key Features

### 1. 📱 Share Within You (Mobile ↔ Laptop Quick Transfer)
- **Zero Login or Sign-Up**: No credentials, accounts, or emails required.
- **Instant QR Pairing**: Point your phone camera at your laptop screen to immediately auto-join the same session.
- **Ephemeral & Auto-Vanishing**: The room, files, and chat messages automatically vanish and purge from storage as soon as you finish your session.
- **No Heavy Native Apps**: Runs directly inside any modern mobile or desktop browser (Safari, Chrome, Edge, Firefox).

### 2. 🌍 Global Sharing (Multi-Device Anywhere)
- **Code & Password Protected**: Create a room with a custom code (e.g., `DZ-PROJECTX`) and an optional password.
- **Persistent Access**: Access your shared documents, media, and notes across completely different Wi-Fi networks and locations.
- **Full File Formats**: Transfer images, high-res videos, PDFs, zip archives, text files, and code repositories up to 100MB per file.
- **Bulk One-Click ZIP Download**: Download all shared files in a room bundled into a single `.zip` archive on the fly using JSZip.
- **Inline Media Viewer**: Preview images and stream videos directly inside the browser before downloading.

### 3. 💬 Real-Time Notes & Clipboard Sync
- **Instant Dual-Channel Sync**: Powered by WebSocket signaling (`Flask-SocketIO`) with automatic background polling fallback.
- **Live Board**: Seamlessly copy-paste URLs, texts, meeting notes, and snippets across devices with timestamps and device names.
- **Interactive UI**: Fluid micro-interactions, glassmorphism, responsive mobile switcher tabs, and celebration confetti.

---

## 🛠️ Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│                   DropZone Web Client                  │
│       React 18 · Vite · Canvas Confetti · Lucide       │
└───────────────────────────┬────────────────────────────┘
                            │  HTTP REST / WebSockets
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Flask Backend API                    │
│      Flask-SocketIO · SQLAlchemy ORM · Gunicorn        │
└─────────────┬────────────────────────────┬─────────────┘
              │ Relational Data            │ File Storage
              ▼                            ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│   PostgreSQL / SQLite     │ │   Local Disk / S3 / R2   │
│ Rooms · Files · Messages  │ │ Binary File Encrypted    │
└───────────────────────────┘ └──────────────────────────┘
```

- **Frontend**: React 18, Vite 6, Custom Design System (Plus Jakarta Sans & JetBrains Mono), Canvas Confetti, Lucide Icons.
- **Backend**: Python 3.10+, Flask, Flask-SocketIO (Eventlet/Threading), Werkzeug Security.
- **Database**: SQLite (out-of-the-box local development) & PostgreSQL (cloud production via SQLAlchemy ORM).
- **Storage**: Pluggable storage architecture (local disk storage with Cloudflare R2 / AWS S3 compatibility via `boto3`).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ 
- **Python**: v3.10+
- **Git**

---

### Local Installation & Running

#### 1. Clone the repository
```bash
git clone https://github.com/uday045/dropzone.git
cd dropzone
```

#### 2. Setup & Start Backend
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```
> The backend will launch at `http://localhost:5000` with automated SQLite setup.

#### 3. Setup & Start Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
> The frontend dev server will launch at:
> - **Local**: `http://localhost:5173`
> - **Network (for Mobile)**: `http://<your-lan-ip>:5173`

---

## 🌐 Production Deployment

The project is pre-configured with production deployment blueprints (`render.yaml`, `Procfile`, and `railway.json`).

### Recommended Free Tier Deployment:
1. **Backend & Database**: Deploy on [Render.com](https://render.com) using the included `backend/Procfile` and free managed PostgreSQL.
2. **Frontend**: Deploy on [Vercel](https://vercel.com) or [Netlify](https://netlify.com) pointing `VITE_API_URL` to your live backend domain.
3. **Detailed Step-by-Step Instructions**: Check the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md).

---

## 📁 Project Structure

```
DropZone/
├── backend/
│   ├── models/            # SQLAlchemy database models (Room, SharedFile, Message)
│   ├── routes/            # REST API endpoints (Rooms, Files, Chat)
│   ├── services/          # Business logic, WebSockets signaling, Storage services
│   ├── app.py             # Flask application entry point & Socket.IO initialization
│   ├── config.py          # App configuration & database connection strings
│   ├── Procfile           # Production Gunicorn worker definition
│   └── requirements.txt   # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Core application interface & WebSocket client
│   │   ├── main.jsx       # React application entry point
│   │   └── styles.css     # Bespoke UI design system & responsive styles
│   ├── index.html         # Document template
│   ├── package.json       # Frontend scripts and packages
│   └── vite.config.js     # Vite configuration & dev proxy
│
├── docs/
│   ├── ARCHITECTURE.md    # System architecture deep-dive
│   └── DEPLOYMENT_GUIDE.md# Cloud hosting walkthrough
│
├── render.yaml            # Render infrastructure as code
├── railway.json           # Railway deployment config
└── README.md
```

---

## 👨‍💻 Author

**Uday Sonawane**

[![GitHub](https://img.shields.io/badge/GitHub-uday045-181717?style=flat&logo=github)](https://github.com/UDAY-939)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Uday_Sonawane-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/uday-sonawane-9244a1404)
[![Instagram](https://img.shields.io/badge/Instagram-@uday__sonawane045-E4405F?style=flat&logo=instagram)](https://www.instagram.com/uday._.369)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to use, modify, and distribute it for personal and commercial projects.

<div align="center">
  <sub>© 2026 U//DEV · Designed & Developed by Uday</sub>
</div>
