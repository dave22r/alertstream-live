# Step-by-Step Deployment Guide

Follow these steps in order to deploy your AlertStream Live application.

## 🎯 Overview

We'll deploy:
- **Backend** (FastAPI) → Render (free tier available)
- **Frontend** (React) → Vercel (free tier available)

---

## 📦 PART 1: Deploy Backend to Render

### Step 1.1: Create Render Account
1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"** or **"Sign In"**
3. Sign up with GitHub (recommended) or email

### Step 1.2: Create New Web Service
1. In your Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Click **"Connect account"** next to GitHub (if not already connected)
4. Select your repository: `dave22r/alertstream-live`
5. Click **"Connect"**

### Step 1.3: Configure Backend Service
Fill in these settings:

- **Name**: `alertstream-backend` (or any name you like)
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend` ⚠️ **Important!**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Plan**: Select **"Free"** (or paid if you prefer)

### Step 1.4: Deploy and Get Your Backend URL
1. Scroll down and click **"Create Web Service"**
2. Render will start building and deploying (takes 2-5 minutes)
3. Once deployed, you'll see a URL like: `https://alertstream-backend.onrender.com`
4. **Copy this URL** - you'll need it for the frontend!
5. The URL is automatically generated and public

### Step 1.5: Verify Backend is Running
1. Wait for the deployment to finish (green "Live" status)
2. Click on your service name to open it
3. Click the URL or visit it directly
4. You should see: `{"status": "ok", "service": "SafeStream Signaling Server"}`
5. If you see this, your backend is working! ✅

✅ **Backend is now deployed!** Keep the Render URL handy (e.g., `https://alertstream-backend.onrender.com`)

---

## 🎨 PART 2: Deploy Frontend to Vercel

### Step 2.1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with GitHub (recommended)

### Step 2.2: Import Your Project
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository: `dave22r/alertstream-live`
3. Vercel will auto-detect it's a Vite project

### Step 2.3: Configure Build Settings
Vercel should auto-detect these, but verify:
- **Framework Preset**: Vite
- **Root Directory**: `./` (root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 2.4: Add Environment Variable
**This is critical!**

1. In the project settings, scroll to **"Environment Variables"**
2. Click **"Add"**
3. Add this variable:
   - **Name**: `VITE_SIGNALING_SERVER`
   - **Value**: `wss://your-render-url.onrender.com`
     - Replace `your-render-url.onrender.com` with your actual Render URL from Step 1.4
     - **Important**: Use `wss://` (not `https://`) for WebSocket connections
     - Example: `wss://alertstream-backend.onrender.com`
   - **Environment**: Select all (Production, Preview, Development)
4. Click **"Save"**

### Step 2.5: Deploy
1. Click **"Deploy"**
2. Wait for build to complete (usually 1-2 minutes)
3. Once done, you'll see a **"Visit"** button with your live URL

✅ **Frontend is now deployed!**

---

## 🔗 PART 3: Connect Frontend to Backend

### Step 3.1: Update CORS in Backend
Your backend needs to allow requests from your Vercel frontend:

1. Open `backend/main.py` in your editor
2. Find line 19 that says:
   ```python
   allow_origins=["*"],  # In production, restrict this
   ```
3. Replace it with:
   ```python
   allow_origins=["https://your-vercel-url.vercel.app", "http://localhost:8080"],  # Add your Vercel URL
   ```
   Replace `your-vercel-url.vercel.app` with your actual Vercel URL (you'll get this after Step 2.5)

4. Save and commit:
   ```bash
   git add backend/main.py
   git commit -m "Update CORS for production"
   git push
   ```

5. Render will automatically redeploy when you push! (takes 2-3 minutes)

### Step 3.2: Test the Connection
1. Visit your Vercel frontend URL
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Try using the app - check for any WebSocket connection errors
5. If you see errors, verify:
   - Frontend `VITE_SIGNALING_SERVER` env var is set correctly
   - Backend CORS includes your Vercel URL
   - Both services are deployed and running

---

## ✅ Final Checklist

- [ ] Backend deployed on Render and accessible
- [ ] Frontend deployed on Vercel and accessible
- [ ] Environment variable `VITE_SIGNALING_SERVER` set in Vercel
- [ ] CORS updated in backend to allow Vercel domain
- [ ] Both services are running (check Render and Vercel dashboards)
- [ ] Test the app - try creating a stream and viewing it

---

## 🐛 Troubleshooting

### Backend not accessible?
- Check Render deployment logs for errors (click on your service → Logs tab)
- Verify the service is running (green "Live" status)
- Render automatically provides a public domain - check your service URL
- Note: Free tier services spin down after 15 min of inactivity - first request may take 30-60 seconds

### Frontend can't connect to backend?
- Verify `VITE_SIGNALING_SERVER` uses `wss://` (not `https://`)
- Check that the Render URL is correct
- Ensure CORS allows your Vercel domain
- Check browser console for specific error messages
- If using Render free tier, first connection may be slow (service wakes up)

### Build fails?
- Check build logs in Vercel/Render dashboards
- Make sure all dependencies are in `package.json` and `requirements.txt`
- Verify Node.js and Python versions are compatible
- For Render: Check that Root Directory is set to `backend`

### WebSocket connection errors?
- HTTPS is required for WebRTC in production
- Both frontend and backend must use HTTPS/WSS
- Check browser console for specific WebSocket errors

---

## 🎉 You're Done!

Your app should now be live! Share your Vercel URL with others.

**Quick Links:**
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-app.onrender.com`
- Backend Health Check: `https://your-app.onrender.com/` (should return `{"status": "ok"}`)

---

## 📝 Notes

- **Render free tier**: Services spin down after 15 min inactivity (wake up on first request, ~30-60 sec delay)
- **Vercel free tier**: Unlimited for personal projects, instant deployments
- Both platforms auto-deploy on git push
- You can set up custom domains later in both platforms
- Render free tier is great for development/testing; consider paid tier for production if you need always-on service
