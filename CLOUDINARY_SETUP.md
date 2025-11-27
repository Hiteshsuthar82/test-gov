# Cloudinary Setup Guide

## Error: "cloud_name is disabled" (HTTP 401)

This error typically means one of the following:

### 1. Cloudinary Account Issues
- Your Cloudinary account might be disabled
- You might be using incorrect credentials
- Your free tier account might have expired

### 2. How to Fix

#### Step 1: Verify Your Cloudinary Account
1. Go to [Cloudinary Dashboard](https://console.cloudinary.com/)
2. Log in to your account
3. Check if your account is active
4. If you don't have an account, sign up for a free account

#### Step 2: Get Your Credentials
1. In the Cloudinary Dashboard, go to **Settings** → **Security**
2. Copy the following values:
   - **Cloud name** (e.g., `your-cloud-name`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

#### Step 3: Update Your Backend .env File
Add these variables to your `backend/.env` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here
```

**Important:**
- Replace the placeholder values with your actual credentials
- Never commit your `.env` file to version control
- Make sure there are no spaces around the `=` sign
- Don't use quotes around the values

#### Step 4: Restart Your Backend Server
After updating the `.env` file, restart your backend server:
```bash
cd backend
npm run dev
```

### 3. Verify Configuration

To verify your configuration is correct, check the backend console when starting the server. You should see:
- No warnings about missing Cloudinary credentials
- Server starts successfully

### 4. Test Upload

Try uploading an image through the admin panel. If you still get errors:
1. Check the backend console for detailed error messages
2. Verify your credentials are correct in the Cloudinary dashboard
3. Make sure your account is active and not suspended

### 5. Common Issues

**Issue: "Invalid API Key"**
- Solution: Double-check your API Key in the Cloudinary dashboard

**Issue: "Invalid API Secret"**
- Solution: Regenerate your API Secret in Cloudinary dashboard and update your .env file

**Issue: "Account disabled"**
- Solution: Contact Cloudinary support or check your account status in the dashboard

### 6. Alternative: Use Environment Variables Directly

If you're running the server in production, you can also set environment variables directly:

```bash
export CLOUDINARY_CLOUD_NAME=your-cloud-name
export CLOUDINARY_API_KEY=your-api-key
export CLOUDINARY_API_SECRET=your-api-secret
```

### Need Help?

If you continue to have issues:
1. Check Cloudinary's [documentation](https://cloudinary.com/documentation)
2. Verify your account status in the Cloudinary dashboard
3. Check the backend console logs for detailed error messages

