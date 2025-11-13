# Firebase Authentication Setup Guide

This guide will help you set up Google and Facebook authentication for your BloxMarket application.

## Prerequisites

1. A Google account for Firebase Console access
2. A Facebook Developer account
3. Your BloxMarket project set up locally

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "bloxmarket-v2")
4. Enable Google Analytics if desired
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click on the "Sign-in method" tab
3. Enable "Google" sign-in:
   - Click on "Google"
   - Toggle "Enable"
   - Enter your project support email
   - Click "Save"
4. Enable "Facebook" sign-in:
   - Click on "Facebook"
   - Toggle "Enable"
   - You'll need Facebook App ID and App Secret (see Step 3)
   - Click "Save"

## Step 3: Set up Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" or "Business" app type
4. Enter app name (e.g., "BloxMarket") and contact email
5. In your app dashboard, go to "Settings" → "Basic"
6. Copy the "App ID" and "App Secret"
7. Go back to Firebase Console → Authentication → Sign-in method → Facebook
8. Paste your App ID and App Secret
9. For OAuth redirect URI, copy the URL provided by Firebase and add it to your Facebook app:
   - In Facebook app: Products → Facebook Login → Settings
   - Add the Firebase OAuth redirect URI to "Valid OAuth Redirect URIs"

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps" section
3. Click "Add app" → Web app (</>)
4. Enter app nickname (e.g., "BloxMarket Web")
5. Copy the Firebase config object

## Step 5: Configure Environment Variables

### Backend (.env)
Add these variables to your `backend/.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

### Frontend (.env)
Add these variables to your `frontend/.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Step 6: Get Firebase Service Account Key

1. In Firebase Console → Project settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values and add them to your backend `.env` file:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` for line breaks)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `client_id` → `FIREBASE_CLIENT_ID`
   - `client_x509_cert_url` → `FIREBASE_CLIENT_X509_CERT_URL`

## Step 7: Test the Setup

1. Start your backend server:
   ```bash
   cd backend && npm run dev
   ```

2. Start your frontend:
   ```bash
   cd frontend && npm run dev
   ```

3. Go to the login/register page
4. Try signing in with Google or Facebook
5. Check browser console and server logs for any errors

## Troubleshooting

### Common Issues:

1. **"Invalid Firebase token" error:**
   - Check that your Firebase service account credentials are correct
   - Ensure the private key is properly formatted with `\n` for line breaks

2. **"Pop-up blocked" error:**
   - Allow pop-ups in your browser for the localhost domain

3. **"Auth domain not authorized" error:**
   - Add `http://localhost:5173` to authorized domains in Firebase Console → Authentication → Settings

4. **Facebook login not working:**
   - Ensure your Facebook app is in "Live" mode or add test users
   - Check that the OAuth redirect URI is correctly set in Facebook app settings

5. **Environment variables not loading:**
   - Restart your development servers after adding new environment variables
   - Check that variable names match exactly (case-sensitive)

### Debug Steps:

1. Check browser console for Firebase errors
2. Check server logs for backend authentication errors
3. Verify Firebase Console shows successful authentication attempts
4. Test with Firebase's built-in authentication testing

## Security Notes

- Never commit Firebase service account keys to version control
- Use environment variables for all Firebase configuration
- Regularly rotate service account keys
- Monitor Firebase Console for suspicious authentication activity
- Consider implementing additional security measures like reCAPTCHA

## Next Steps

After successful setup, you can:
- Add more social providers (Twitter, GitHub, etc.)
- Implement account linking (connect multiple auth providers to one account)
- Add custom claims for role-based access control
- Implement password reset via Firebase
- Add multi-factor authentication

The Firebase authentication is now integrated with your existing JWT system, so all your current authentication middleware and user management will continue to work seamlessly.