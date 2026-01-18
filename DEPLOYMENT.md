# Deployment Guide

This guide covers deploying both the frontend (React/Vite) and backend (FastAPI) components of AlertStream Live.

## Architecture

- **Frontend**: React + TypeScript + Vite (static site)
- **Backend**: FastAPI WebSocket signaling server for WebRTC

## Prerequisites

- Node.js 18+ installed
- Python 3.9+ installed
- Git repository set up
- Accounts on your chosen hosting platforms

## Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

#### Frontend on Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel will auto-detect Vite configuration
   - Add environment variable:
     - `VITE_SIGNALING_SERVER`: `wss://your-backend-url.railway.app`
   - Deploy

3. **Or deploy via CLI**:
   ```bash
   vercel
   ```

#### Backend on Railway

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

3. **Set Environment Variables** (if needed):
   - Railway will auto-detect Python and install dependencies
   - The `railway.json` file configures the deployment

4. **Get your backend URL** and update frontend `VITE_SIGNALING_SERVER`

---

### Option 2: Netlify (Frontend) + Render (Backend)

#### Frontend on Netlify

1. **Deploy via Netlify Dashboard**:
   - Go to [netlify.com](https://netlify.com)
   - Import your Git repository
   - Build settings are auto-configured via `netlify.toml`
   - Add environment variable:
     - `VITE_SIGNALING_SERVER`: `wss://your-backend-url.onrender.com`

2. **Or deploy via CLI**:
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod
   ```

#### Backend on Render

1. **Create a new Web Service**:
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect your repository
   - Settings:
     - **Root Directory**: `backend`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Deploy

2. **Update CORS** in `backend/main.py`:
   ```python
   allow_origins=["https://your-frontend-url.netlify.app"]
   ```

---

### Option 3: Fly.io (Full Stack)

#### Deploy Both Services

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Deploy Backend**:
   ```bash
   cd backend
   fly launch
   # Follow prompts, select region
   fly deploy
   ```

3. **Deploy Frontend**:
   ```bash
   cd ..
   fly launch
   # Configure as static site
   fly deploy
   ```

---

## Environment Variables

### Frontend

Create a `.env.production` file or set in your hosting platform:

```env
VITE_SIGNALING_SERVER=wss://your-backend-url.com
```

**Important**: The URL must use `wss://` (secure WebSocket) for HTTPS sites, or `ws://` for local development.

### Backend

The backend uses CORS middleware. Update `backend/main.py` line 19 to restrict origins in production:

```python
allow_origins=["https://your-frontend-url.com"]  # Replace with your frontend URL
```

## Local Testing

1. **Start Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   npm install
   npm run dev
   ```

3. **Set environment variable** (create `.env.local`):
   ```env
   VITE_SIGNALING_SERVER=ws://localhost:8000
   ```

## Post-Deployment Checklist

- [ ] Backend is accessible and returns `{"status": "ok"}` at root URL
- [ ] Frontend environment variable `VITE_SIGNALING_SERVER` is set correctly
- [ ] CORS is configured to allow your frontend domain
- [ ] WebSocket connections work (check browser console)
- [ ] HTTPS is enabled (required for WebRTC in production)

## Troubleshooting

### WebSocket Connection Failed
- Ensure backend URL uses `wss://` for HTTPS sites
- Check CORS configuration allows your frontend domain
- Verify backend is running and accessible

### Build Errors
- Ensure Node.js 18+ is installed
- Run `npm install` before building
- Check for TypeScript errors: `npm run build`

### Backend Not Starting
- Verify Python 3.9+ is installed
- Install dependencies: `pip install -r requirements.txt`
- Check port configuration (most platforms set `$PORT`)

## Additional Notes

- The backend uses in-memory storage (streams reset on restart)
- For production, consider adding a database for persistent stream storage
- WebRTC requires STUN servers (configured in `signalingConfig.ts`)
- For TURN servers in production, add them to `rtcConfig` in `signalingConfig.ts`
