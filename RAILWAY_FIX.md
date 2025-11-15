# 🔧 Railway Backend Deployment Fix

## Important: Railway Settings

Make sure in Railway project settings:

1. **Go to:** Your Railway Project → Settings → Source
2. **Set Root Directory to:** `backend`
3. **Save**

This tells Railway to build from the `backend` folder, so all commands run from there.

## Current Configuration

- ✅ `nixpacks.toml` - Configured for backend root directory
- ✅ `railway.json` - Has start command
- ✅ No conflicting Dockerfile at root

## If Still Failing

### Option 1: Check Railway Logs
- Go to Railway → Your Service → Deployments
- Click on the failed deployment
- Check the build logs for specific errors

### Option 2: Verify Environment Variables
Make sure these are set in Railway:
- `DATABASE_URL` - Your Neon database URL
- `NODE_ENV=production`
- `PORT=3000`
- `JWT_SECRET` - A random secret string
- `FRONTEND_URL` - Your Vercel frontend URL
- `GITHUB_CLIENT_ID` - Your GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth secret
- `GITHUB_CALLBACK_URL` - Your Railway backend URL + `/api/auth/github/callback`

### Option 3: Manual Build Test
Test locally if build works:
```bash
cd backend
npm ci
npm run build
npm run start:prod
```

## Common Issues

1. **"npm: command not found"** - Railway should auto-detect Node.js with Nixpacks
2. **Build fails** - Check if all dependencies are in package.json
3. **Start fails** - Check if dist/main.js exists after build

