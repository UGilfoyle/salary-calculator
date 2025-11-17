# Google OAuth Setup Guide

## Step-by-Step Instructions for Google Cloud Platform

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `Salary Calculator` (or any name you prefer)
5. Click **"Create"**
6. Wait for the project to be created and select it

### Step 2: Enable Required APIs (Optional but Recommended)

**Important Note**: For OAuth 2.0 login, you technically don't need to enable any specific API. However, enabling the **People API** is recommended to ensure you can access user profile information reliably.

1. In the Google Cloud Console, go to **"APIs & Services"** > **"Library"**
2. Search for **"People API"** (this is the modern replacement for Google+ API)
3. Click on it and click **"Enable"**
4. **Note**: Google+ API is deprecated, so use People API instead

**Why People API?**
- It's the modern way to access Google user profile information
- Our Passport.js strategy will use it to get user email, name, and profile picture
- It's free and doesn't require any special permissions

### Step 3: Configure OAuth Consent Screen

**⚠️ IMPORTANT: You MUST complete this step BEFORE Step 4!** This is where you configure scopes and app information. Google won't let you create OAuth credentials until this is done.

**What is this?** This is where you tell Google what your app is and what permissions it needs. This is required before you can create OAuth credentials.

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**
4. **App Information** (Step 1):
   - Fill in the required information:
     - **App name**: `Salary Calculator` (or your app name)
     - **User support email**: Your email address
     - **Developer contact information**: Your email address
     - Click **"Save and Continue"**
   
5. **Scopes** (Step 2) - **THIS IS WHERE YOU ADD SCOPES:**
   - You'll see a section titled "Scopes"
   - Click the **"Add or Remove Scopes"** button
   - A popup/modal will appear showing available scopes
   - **Where to find the scopes:**
     - Scroll down or search for these scopes in the list:
     - Look for: **"userinfo.email"** (full name: `https://www.googleapis.com/auth/userinfo.email`)
     - Look for: **"userinfo.profile"** (full name: `https://www.googleapis.com/auth/userinfo.profile`)
   - **How to add them:**
     - Check the boxes next to:
       - ✅ `.../auth/userinfo.email` (See your primary Google Account email address)
       - ✅ `.../auth/userinfo.profile` (See your personal info, including any personal info you've made publicly available)
   - Click **"Update"** button at the bottom of the popup
   - Then click **"Save and Continue"** on the main screen
   
   **Note**: If you can't find these scopes, you can also manually add them by clicking "Add custom scope" and entering:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

6. **Test users** (Step 3):
   - Add your email address as a test user (if app is in testing mode)
   - Click **"Save and Continue"**

7. **Summary** (Step 4):
   - Review and click **"Back to Dashboard"**

**⚠️ Make sure you complete ALL steps in the OAuth consent screen before moving to Step 4!**

### Step 4: Create OAuth 2.0 Credentials

**This is the main step!** You're creating the Client ID and Client Secret that your backend will use.

**⚠️ Make sure you completed Step 3 (OAuth Consent Screen) first!** If you see a warning about configuring the consent screen, go back to Step 3.

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If you see a warning: "To create an OAuth client ID, you must first configure the consent screen", click the link and complete Step 3 first.

5. **Application type**: Select **"Web application"** from the dropdown (you should see this already selected)

6. **Name**: 
   - Enter: `Salary Calculator Web Client` (or any name you prefer)
   - This is just for your reference in the console

7. **Authorized JavaScript origins**:
   - **IMPORTANT**: Remove the example URL (`https://www.example.com`) if it's there
   - Click the trash icon to delete it
   - Click **"Add URI"** button
   - Add these URIs (one at a time):
     - For **local development**: `http://localhost:3000`
     - For **production**: `https://your-backend-url.com` (replace with your actual Render backend URL)
     - Example: `https://salary-calculator-backend.onrender.com`
   - **Note**: These are the domains where your backend runs (NOT your frontend URL)

8. **Authorized redirect URIs**:
   - Click **"Add URI"** button
   - Add these URIs (one at a time):
     - For **local development**: `http://localhost:3000/api/auth/google/callback`
     - For **production**: `https://your-backend-url.com/api/auth/google/callback`
     - Example: `https://salary-calculator-backend.onrender.com/api/auth/google/callback`
   - **IMPORTANT**: The redirect URI must match EXACTLY, including the full path `/api/auth/google/callback`

9. Click **"Create"** button

10. **IMPORTANT**: A popup will appear with your credentials:
    - **Client ID**: Copy this immediately (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
    - **Client Secret**: Copy this immediately (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)
    - ⚠️ **The Client Secret is only shown ONCE!** Save it somewhere safe.
    - Click **"OK"** to close the popup

**What to do with these:**
- You'll add them to your environment variables in Step 5

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

- **No API Required**: You don't actually need to enable Google+ API or People API for basic OAuth login to work. The OAuth 2.0 credentials are enough. However, enabling People API ensures better access to user profile data.

- **What We're Using**: 
  - **OAuth 2.0** (not an API, but a protocol/standard)
  - **People API** (optional, but recommended for profile data)
  - **NOT Google+ API** (deprecated, don't use this)

- **Testing Mode**: Your app will be in testing mode initially. Only test users can sign in.

- **Publishing**: To allow all users, you need to submit your app for verification (if using sensitive scopes)

- **Local Development**: Make sure your redirect URI matches exactly (including http vs https, port numbers, etc.)

- **Security**: Never commit your Client Secret to version control. Always use environment variables.

### Quick Answer: Which API?

**Answer**: You don't need a specific API! Just create **OAuth 2.0 Credentials** (Step 4). 

However, if you want to be safe and ensure profile data access works well, enable **People API** (Step 2). That's it!

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

