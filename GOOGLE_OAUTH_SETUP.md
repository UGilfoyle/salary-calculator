# Google OAuth Setup Guide

## Step-by-Step Instructions for Google Cloud Platform

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `Salary Calculator` (or any name you prefer)
5. Click **"Create"**
6. Wait for the project to be created and select it

### Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google+ API"** (or "Google Identity Services")
3. Click on it and click **"Enable"**
4. Also search for **"People API"** and enable it (for getting user profile info)

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: `Salary Calculator` (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
   - Click **"Save and Continue"**
5. **Scopes** (Step 2):
   - Click **"Add or Remove Scopes"**
   - Add these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click **"Update"** then **"Save and Continue"**
6. **Test users** (Step 3):
   - Add your email address as a test user (if app is in testing mode)
   - Click **"Save and Continue"**
7. **Summary** (Step 4):
   - Review and click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"** as the application type
5. Fill in the details:
   - **Name**: `Salary Calculator Web Client` (or any name)
   - **Authorized JavaScript origins**:
     - For local development: `http://localhost:3000`
     - For production: `https://your-backend-url.com` (e.g., your Render URL)
   - **Authorized redirect URIs**:
     - For local development: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://your-backend-url.com/api/auth/google/callback`
     - Example: `https://salary-calculator-backend.onrender.com/api/auth/google/callback`
6. Click **"Create"**
7. **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - You'll need these for your environment variables
   - The secret is only shown once!

### Step 5: Set Environment Variables

#### For Local Development (.env file in backend folder):

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

#### For Production (Render/Vercel):

1. **Backend (Render)**:
   - Go to your Render dashboard
   - Select your backend service
   - Go to **"Environment"** tab
   - Add these variables:
     - `GOOGLE_CLIENT_ID` = your-client-id
     - `GOOGLE_CLIENT_SECRET` = your-client-secret
     - `GOOGLE_CALLBACK_URL` = https://your-backend-url.com/api/auth/google/callback

2. **Frontend (Vercel)**:
   - No additional environment variables needed for Google OAuth
   - The frontend will redirect to the backend URL

### Step 6: Update Authorized Redirect URIs (After Deployment)

Once you deploy your backend:
1. Go back to Google Cloud Console > Credentials
2. Edit your OAuth 2.0 Client ID
3. Add your production redirect URI:
   - `https://your-actual-backend-url.com/api/auth/google/callback`
4. Save the changes

### Important Notes:

- **Testing Mode**: Your app will be in testing mode initially. Only test users can sign in.
- **Publishing**: To allow all users, you need to submit your app for verification (if using sensitive scopes)
- **Local Development**: Make sure your redirect URI matches exactly (including http vs https, port numbers, etc.)
- **Security**: Never commit your Client Secret to version control. Always use environment variables.

### Troubleshooting:

1. **"redirect_uri_mismatch" error**:
   - Check that the redirect URI in Google Console exactly matches your callback URL
   - Include the full path: `/api/auth/google/callback`

2. **"access_denied" error**:
   - Make sure you added yourself as a test user (if in testing mode)
   - Check that the required APIs are enabled

3. **"invalid_client" error**:
   - Verify your Client ID and Client Secret are correct
   - Make sure environment variables are set correctly

### Next Steps:

After completing these steps, the code implementation will be done. The backend will handle the OAuth flow and redirect users back to your frontend with authentication tokens.

