# DropZone — Production Deployment Guide 🚀

This project is fully prepared for cloud deployment with zero headaches. It contains:
- `backend/Procfile`: Production Gunicorn runner with threading for Flask & Socket.IO.
- `render.yaml`: Blueprint for 1-click deployment on Render.
- `railway.json`: Configuration for Railway.
- Dynamic `VITE_API_URL` handling: Seamless connection between separated frontend and backend domains.

---

## 🏆 Recommended Hosting Options

| Component | Top Free / Easy Choice | Alternate Best |
|---|---|---|
| **Backend & WebSockets** | [Render.com](https://render.com) (Free tier) | [Railway.app](https://railway.app) ($5 trial) |
| **Database** | Render Managed PostgreSQL (Free) | [Neon.tech](https://neon.tech) / [Supabase](https://supabase.com) (Free Serverless Postgres) |
| **Frontend** | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (Free) | Render Static Site (Free) |

---

## 🚀 Option A: Render.com (Easiest — Everything in One Place)

Render allows you to host the **Python Backend**, **PostgreSQL Database**, and **React Frontend** together under one account for free.

### Step 1: Push Project to GitHub
1. Create a new repository on your GitHub (e.g., `https://github.com/uday045/dropzone`).
2. In your terminal in the project directory:
   ```bash
   git init
   git add .
   git commit -m "feat: complete DropZone webapp"
   git branch -M main
   git remote add origin https://github.com/uday045/dropzone.git
   git push -u origin main
   ```

### Step 2: Deploy Database (PostgreSQL)
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **PostgreSQL**.
2. Name it `dropzone-db`, select Region (e.g., Singapore or Frankfurt), and choose the **Free** plan.
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (or External Database URL).

### Step 3: Deploy Backend (Flask + Socket.IO)
1. On Render, click **New +** → **Web Service**.
2. Connect your `dropzone` GitHub repo.
3. Configure the settings:
   - **Name**: `dropzone-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --worker-class gthread -w 1 --threads 8 app:app`
   - **Instance Type**: `Free`
4. In **Environment Variables**, add:
   - `DATABASE_URL`: *(paste the Postgres connection URL from Step 2)*
   - `SECRET_KEY`: *(any random string, e.g., `dropzone-super-secret-2026`)*
   - `FLASK_DEBUG`: `false`
5. Click **Create Web Service**. Wait ~2 minutes for it to build.
6. Copy your live backend URL (e.g., `https://dropzone-api.onrender.com`).

### Step 4: Deploy Frontend (Vercel or Render Static Site)
#### Via Vercel (Fastest global CDN):
1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your `dropzone` repo.
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: Click edit and select `frontend`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://dropzone-api.onrender.com` *(your backend URL)*
4. Click **Deploy**. In 30 seconds your app is live!

---

## ⚡ Option B: Railway.app (Fastest Single-Click Deployment)

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Provision PostgreSQL**.
3. In the same project, click **New** → **GitHub Repo** → select `dropzone`.
4. In Railway project settings for the backend service:
   - Set Root Directory: `/backend`
   - Add Variable: `DATABASE_URL` -> Link to the Railway Postgres service (`${{Postgres.DATABASE_URL}}`)
5. For the frontend: Add another service from the same repo with Root Directory `/frontend`, and add `VITE_API_URL`.

---

## 📁 File Storage in Production (Cloudflare R2 or AWS S3)
For persistent uploads across server restarts on free tiers:
- The backend has `boto3` ready.
- You can create a free bucket on [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (10 GB free forever with zero egress fees).
- Add the credentials to your backend environment variables:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`

