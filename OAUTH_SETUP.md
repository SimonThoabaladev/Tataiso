# Google OAuth Setup Guide

This document provides step-by-step instructions for setting up Google OAuth authentication for the TATAISO platform.

## Overview

The authentication system now supports both:
- Email/Password authentication
- Google OAuth authentication

## Prerequisites

- Google Cloud Console account
- A project in Google Cloud Console
- Project credentials with Google+ API enabled

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click on the project selector at the top
3. Click "NEW PROJECT"
4. Enter a project name (e.g., "TATAISO")
5. Click "CREATE"
6. Wait for the project to be created

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on "Google+ API"
4. Click the "ENABLE" button
5. Wait for the API to be enabled

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" for User Type
   - Click "CREATE"
   - Fill in the Application name: "TATAISO"
   - Add your email address as User support email
   - Add your email again as Developer contact information
   - Click "SAVE AND CONTINUE"
   - For Scopes, add: `openid`, `email`, `profile`
   - Click "SAVE AND CONTINUE"
   - For Test users, add your test email addresses
   - Click "SAVE AND CONTINUE"
   - Review and click "BACK TO DASHBOARD"

4. After consent screen is set up, go back to **Credentials**
5. Click "CREATE CREDENTIALS" > "OAuth client ID"
6. Select "Web application" as the Application type
7. Under "Authorized redirect URIs", add:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google` (replace with your actual domain)
8. Click "CREATE"
9. A popup will show your credentials. Click "Download JSON" to download, or note the:
   - **Client ID**
   - **Client Secret**

## Step 4: Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Update the following variables with your credentials:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

3. Save the file

## Step 5: Test the Setup

1. Make sure your development server is running:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/sign-in
3. You should see a "Continue with Google" button below the email/password form
4. Click the Google button and you should be redirected to Google's login page
5. After authentication, you'll be redirected back to your application

## Production Deployment

When deploying to production:

1. Update your Google OAuth credentials to include your production domain:
   - Go back to Google Cloud Console > Credentials
   - Edit your OAuth client
   - Add your production redirect URI: `https://yourdomain.com/api/auth/callback/google`
   - Save changes

2. Update environment variables in your hosting platform:
   - Set `GOOGLE_CLIENT_ID` to your Google Client ID
   - Set `GOOGLE_CLIENT_SECRET` to your Google Client Secret

## Features

### Email/Password Authentication
- Users can sign up with email and password
- Users can sign in with email and password
- Role selection during signup (Student, Tutor, Lecturer)
- Password validation (minimum 8 characters)

### Google OAuth Authentication
- One-click sign-in with Google account
- Automatic account creation on first sign-in
- Email and profile information automatically populated
- No password required for Google-authenticated users
- Users can choose their role after first-time Google sign-in

## Troubleshooting

### "Invalid Client ID" Error
- Verify your `GOOGLE_CLIENT_ID` is correct in `.env.local`
- Check that spaces or quotes aren't accidentally included
- Restart your development server after updating `.env.local`

### Redirect URI Mismatch
- Ensure the callback URL in your code matches exactly what you configured in Google Console
- Check for http vs https mismatch
- Verify port numbers match (3000 for local development)

### Google Sign-In Button Not Appearing
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set
- The button will only appear if both variables are configured
- Check browser console for errors

### Users Can't Complete Sign-In
- Make sure you've added test user emails in the OAuth consent screen
- Check that the redirect URI on your server matches the authorized URI in Google Console
- Verify your application's base URL is correct in `BETTER_AUTH_URL`

## Security Notes

- Never commit `.env.local` to version control
- Never share your `GOOGLE_CLIENT_SECRET`
- Use environment variables for all sensitive credentials
- For production, use a secrets management system

## Next Steps

1. Test email/password authentication thoroughly
2. Test Google authentication with test accounts
3. Implement additional features like:
   - Password reset functionality
   - Social sign-in with other providers (GitHub, Discord, etc.)
   - Two-factor authentication
   - Session management and logout functionality

## References

- [Better Auth Documentation](https://www.betterauth.dev/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
