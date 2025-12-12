# 🚀 BeakyBabe - Supabase Setup Guide

## Quick Start (5 minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in with GitHub or email
3. Click **"New Project"**
4. Settings:
   - **Name:** `beakybabe`
   - **Password:** Create a strong password
   - **Region:** Choose closest to users
5. Click **"Create new project"** (wait 1-2 min)

---

### Step 2: Get Your API Keys

1. In your Supabase project, go to:
   **Settings** (⚙️) → **API**

2. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon (public) key:** `eyJhbGciOiJ...`

3. Update `config.js` (lines 8-9):

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

### Step 3: Run Database Schema

1. Go to **SQL Editor** in Supabase sidebar
2. Click **"New query"**
3. Open `database.sql` from your project
4. Copy ALL contents and paste in SQL Editor
5. Click **"Run"** (green play button)

✅ You should see: "Success. No rows returned"

---

### Step 4: Enable OAuth Providers (Optional)

To enable Google/GitHub login:

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Add authorized redirect URI:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. In Supabase: **Authentication** → **Providers** → **Google**
9. Enable and paste your credentials

#### GitHub OAuth:
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Settings:
   - **Application name:** BeakyBabe
   - **Homepage URL:** http://localhost:3000
   - **Authorization callback URL:**
     ```
     https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
     ```
4. Copy **Client ID** and generate **Client Secret**
5. In Supabase: **Authentication** → **Providers** → **GitHub**
6. Enable and paste your credentials

---

### Step 5: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize templates:
   - **Confirm signup**
   - **Reset Password**
   - **Magic Link**

3. Update the "Site URL" in **Authentication** → **URL Configuration**:
   ```
   http://localhost:3000
   ```
   (Change to your domain in production)

---

### Step 6: Test Your Setup

1. Make sure your server is running:
   ```bash
   npx -y serve@latest -l 3000
   ```

2. Open http://localhost:3000/signup.html

3. Create a test account

4. Check Supabase **Authentication** → **Users** to see your new user

5. Check **Table Editor** → **profiles** to see the auto-created profile

---

## Troubleshooting

### "Invalid API key"
- Make sure you copied the entire key (they're long!)
- Check there's no extra spaces or newlines

### "Email not confirmed"
- Check **Authentication** → **Providers** → **Email**
- Toggle "Confirm email" OFF for testing

### "Password too weak"
- Supabase requires 6+ character passwords
- The signup form has client-side validation

### OAuth redirects don't work
- Check your callback URL is exactly:
  `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- Make sure the provider is enabled in Supabase

### RLS blocking queries
- Check that you're authenticated
- View the policies in **Table Editor** → click table → **Policies**

---

## Database Tables Created

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles & settings |
| `links` | User's links |
| `page_views` | Analytics - page visits |
| `link_clicks` | Analytics - link clicks |
| `products` | Store products |
| `orders` | Store orders |
| `subscribers` | Email subscribers |
| `social_connections` | Connected social accounts |
| `scheduled_jobs` | Background job tracking |

---

## Next Steps

1. ✅ Supabase configured
2. 🔄 Test signup/login flow
3. 🔄 Set up Stripe (see `stripe-client.js`)
4. 🔄 Deploy to Vercel/Netlify
5. 🔄 Add custom domain

---

## Production Checklist

- [ ] Update `config.js` with production Supabase keys
- [ ] Set Site URL to your domain in Supabase Auth settings
- [ ] Enable email confirmation
- [ ] Add your domain to OAuth callback URLs
- [ ] Enable Supabase database backups
- [ ] Set up Stripe webhook endpoint
- [ ] Configure email service (Resend/SendGrid)

---

Need help? Check the [Supabase Docs](https://supabase.com/docs)
