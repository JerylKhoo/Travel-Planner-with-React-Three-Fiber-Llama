# Supabase Authentication Setup Guide

## Issue: Can't sign in after registration

If you created an account but can't sign in with the same credentials, it's because **email confirmation is still enabled** in Supabase.

## Solution: Disable Email Confirmation

Follow these steps to fix the sign-in issue:

### Step 1: Go to Supabase Dashboard
1. Visit [supabase.com](https://supabase.com)
2. Open your project
3. Click on **Authentication** in the left sidebar

### Step 2: Configure Email Provider
1. Click on **Providers** tab
2. Find and click on **Email** provider
3. You'll see a setting called **"Confirm email"**
4. **DISABLE** the "Confirm email" toggle
5. Click **Save**

### Step 3: (Optional) Delete Old Test Accounts
If you created test accounts before disabling email confirmation, they are stuck in "unconfirmed" state:

1. Go to **Authentication** → **Users**
2. Find the test accounts
3. Click the three dots (⋮) → **Delete user**
4. Or, you can manually confirm them by clicking **Confirm user**

### Step 4: Test Registration & Login
1. Create a new account with fresh credentials
2. You should be logged in immediately after registration
3. Sign out and try signing in again with the same credentials
4. It should work! ✓

## Why This Happens

By default, Supabase requires email confirmation for new accounts:
- When you register, the account is created in "unconfirmed" state
- Supabase sends a confirmation email (which you need to click)
- Until confirmed, you **cannot sign in** even with correct credentials
- The error message says "Invalid credentials" which is confusing

By disabling email confirmation:
- Accounts are created in "confirmed" state immediately
- Users can sign in right away
- No email verification needed

## Additional Notes

### If You Want Email Confirmation Later
If you want to enable email confirmation in the future:
1. Go to Authentication → Providers → Email
2. Enable "Confirm email"
3. Configure your email templates in Authentication → Email Templates
4. Users will need to verify their email before signing in

### Testing with Console Logs
I've added console logs to help debug:
- Open browser DevTools (F12)
- Go to Console tab
- You'll see "Sign up response" and "Sign in response" messages
- Check if `data.user.email_confirmed_at` is null (unconfirmed) or has a timestamp (confirmed)

### Email Confirmation Status in Supabase
To check if email confirmation is disabled:
1. Authentication → Providers → Email
2. Look for "Confirm email" toggle
3. It should be **OFF** (gray/disabled)

## Setting Up Google OAuth (Optional)

To enable Google sign-in:

### Step 1: Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Supabase
1. Go to your Supabase project dashboard
2. Click **Authentication** → **Providers**
3. Find **Google** and enable it
4. Paste your Google **Client ID** and **Client Secret**
5. Click **Save**

### Step 3: Test Google Sign-In
1. Click "Continue with Google" on the login page
2. You'll be redirected to Google's login page
3. After authentication, you'll be redirected back to your app

## Environment Variables

Your `.env` file should contain:

```
VITE_SUPABASE_URL=https://tvkmbutldrpvckizxdeq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a21idXRsZHJwdmNraXp4ZGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTQxOTMsImV4cCI6MjA3NTQ3MDE5M30.gD-mtInYo3C0PNy-vpuZgis4OTS4_CbgjffvQ2xzrac
```

**Important:**
- Never commit the `.env` file to version control
- Add `.env` to your `.gitignore` file
- The anon key is safe to use in client-side code

## Troubleshooting

### "Invalid credentials" error
- Make sure email confirmation is disabled in Supabase
- Check that the user exists in Authentication → Users
- Verify the user's email is confirmed (if confirmation is enabled)

### Google OAuth not working
- Verify your redirect URIs are correctly configured in Google Cloud Console
- Check that Google provider is enabled in Supabase
- Make sure Client ID and Client Secret are correctly entered

### Session not persisting
- The Supabase client is configured with `persistSession: true` by default
- Sessions are stored in localStorage
- Check browser console for any errors related to localStorage

### "Missing Supabase credentials" error
- Make sure your `.env` file is in the Frontend directory
- Restart the dev server after creating/modifying `.env`
- Verify the environment variable names match exactly (VITE_ prefix is required for Vite)
