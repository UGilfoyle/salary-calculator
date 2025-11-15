# 🚀 Git Push & Deployment Guide

## Step 1: Push to GitHub

### Option A: Create New Repository on GitHub

1. **Go to GitHub** and create a new repository:
   - Visit: https://github.com/new
   - Repository name: `salary-calculator` (or your preferred name)
   - Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license
   - Click "Create repository"

2. **Push your code:**
   ```bash
   cd /Users/akashkaintura/Desktop/salary-calculator
   
   # Commit all changes
   git add .
   git commit -m "Initial commit: Salary Calculator with GitHub & Email auth"
   
   # Add remote (replace YOUR_USERNAME with your GitHub username)
   git remote add origin https://github.com/YOUR_USERNAME/salary-calculator.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Option B: If Repository Already Exists

If you already have a GitHub repository:

```bash
cd /Users/akashkaintura/Desktop/salary-calculator

# Commit all changes
git add .
git commit -m "Add GitHub & Email authentication, variable pay, insurance support"

# Add remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. **Go to [railway.app](https://railway.app)** and sign in with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `salary-calculator` repository

3. **Configure Service:**
   - Railway should auto-detect it's a Node.js project
   - Go to Settings → Source → Root Directory → Set to `backend`
   - Go to Settings → Deploy:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm run start:prod`

4. **Add Environment Variables:**
   Go to Variables tab and add:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_jVYdhUS13lEz@ep-shiny-sunset-a1fqkjgj-pooler.ap-southeast-1.aws.neon.tech/salaryCalc_dev?sslmode=require&channel_binding=require
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://your-frontend.vercel.app
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_CALLBACK_URL=https://your-backend.railway.app/api/auth/github/callback
   JWT_SECRET=your-production-jwt-secret
   ```

5. **Get Railway URL:**
   - Go to Settings → Networking
   - Generate a public domain (e.g., `salary-calculator-backend.railway.app`)
   - Copy this URL - you'll need it for frontend

## Step 3: Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

2. **Create New Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: **Vite**
     - Root Directory: `frontend`
     - Build Command: `npm run build` (auto-detected)
     - Output Directory: `dist` (auto-detected)

3. **Add Environment Variables:**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
   (Replace with your actual Railway backend URL)

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy
   - Copy your Vercel URL (e.g., `https://salary-calculator.vercel.app`)

## Step 4: Update GitHub OAuth App

1. **Go to [GitHub Developer Settings](https://github.com/settings/developers)**
2. **Edit your OAuth App:**
   - Update **Homepage URL** to your Vercel URL
   - Update **Authorization callback URL** to: `https://your-backend.railway.app/api/auth/github/callback`
3. **Save changes**

## Step 5: Update Railway Environment Variables

Go back to Railway and update:
```
FRONTEND_URL=https://your-frontend.vercel.app
```
(Replace with your actual Vercel URL)

Railway will automatically redeploy with the new environment variable.

## ✅ Verify Deployment

1. **Test Frontend:** Visit your Vercel URL
2. **Test Backend:** Visit `https://your-backend.railway.app/api/auth/me` (should return 401, which is expected)
3. **Test Login:** Try both GitHub and Email login
4. **Test Calculator:** Make a salary calculation

## 🔄 Future Updates

After making changes:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Both Railway and Vercel will automatically redeploy on push to main branch!

