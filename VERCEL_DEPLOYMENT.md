# 🚀 Vercel Frontend Deployment Guide

## Quick Steps

### 1. Go to Vercel
- Visit: https://vercel.com
- Sign in with GitHub (use the same account as your repository)

### 2. Create New Project
- Click **"Add New..."** → **"Project"**
- Find and select your repository: `akashkaintura/salary-calculator`
- Click **"Import"**

### 3. Configure Project Settings

**Root Directory:**
- Click **"Edit"** next to Root Directory
- Set to: `frontend`
- Click **"Continue"**

**Framework Preset:**
- Should auto-detect as **Vite**
- If not, select **Vite** manually

**Build Settings:**
- Build Command: `npm run build` (auto-detected)
- Output Directory: `dist` (auto-detected)
- Install Command: `npm install` (auto-detected)

### 4. Add Environment Variables

Click **"Environment Variables"** and add:

```
VITE_API_URL=http://localhost:3000
```

**Note:** For now, use `http://localhost:3000` as a placeholder. After Railway backend is deployed, update this to your Railway backend URL.

### 5. Deploy

- Click **"Deploy"**
- Wait for build to complete (usually 1-2 minutes)
- You'll get a URL like: `https://salary-calculator.vercel.app`

### 6. Update Environment Variable (After Backend is Ready)

Once your Railway backend is deployed:

1. Go to Vercel Project → Settings → Environment Variables
2. Update `VITE_API_URL` to your Railway backend URL:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
3. Redeploy (Vercel will auto-redeploy on next push, or click "Redeploy")

## ✅ Verification

After deployment:
1. Visit your Vercel URL
2. You should see the login page
3. Try email registration/login (backend will work once Railway is deployed)

## 🔄 Auto-Deployment

Vercel automatically deploys on every push to `main` branch!

