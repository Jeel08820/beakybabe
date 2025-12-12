# 🚀 BeakyBabe Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Database Setup (DONE)
- [x] Supabase project created
- [x] Database schema applied
- [x] Triggers configured
- [x] RLS policies enabled

### ✅ Core Features Ready
- [x] User authentication (signup/login/logout)
- [x] Dashboard with analytics
- [x] Links management (CRUD)
- [x] Appearance/theme editor
- [x] Settings page
- [x] Store/products page
- [x] Public profile pages
- [x] Analytics tracking

### 📋 Before Going Live

#### 1. Supabase Configuration
```
1. Go to Authentication → URL Configuration
2. Set Site URL: https://yourdomain.com
3. Add Redirect URLs:
   - https://yourdomain.com/dashboard.html
   - https://yourdomain.com/reset-password.html
```

#### 2. Enable Email Confirmation (Optional but Recommended)
```
1. Authentication → Providers → Email
2. Enable "Confirm email"
3. Customize email templates in Authentication → Email Templates
```

#### 3. Set up OAuth Providers (Optional)

**Google:**
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add redirect URI: https://efbvstybjgzqumsmnuhm.supabase.co/auth/v1/callback
4. Copy Client ID & Secret to Supabase

**GitHub:**
1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Authorization callback: https://efbvstybjgzqumsmnuhm.supabase.co/auth/v1/callback
4. Copy Client ID & Secret to Supabase

---

## 🌐 Deploy to Vercel (Recommended)

### Option A: GitHub Deployment
```bash
1. Push code to GitHub:
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/beakybabe.git
   git push -u origin main

2. Go to vercel.com
3. Click "Import Project"
4. Select your GitHub repository
5. Click "Deploy"
```

### Option B: CLI Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd c:\Users\patel\Desktop\BeakyBabe
vercel

# Deploy to production
vercel --prod
```

### After Deployment
1. Go to your Vercel dashboard
2. Add custom domain (optional)
3. Update Supabase Site URL to your Vercel URL

---

## 🌐 Deploy to Netlify (Alternative)

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
cd c:\Users\patel\Desktop\BeakyBabe
netlify deploy

# Deploy to production
netlify deploy --prod
```

---

## 🔒 Security Checklist

- [x] CORS configured in Supabase
- [x] RLS policies on all tables
- [x] API keys are anon keys (not service keys)
- [x] Security headers in vercel.json/netlify.toml
- [ ] Enable HTTPS (automatic on Vercel/Netlify)
- [ ] Set up rate limiting (optional, via Supabase)

---

## 💳 Stripe Setup (For Payments)

### 1. Get Stripe Keys
1. Go to https://dashboard.stripe.com
2. Get your API keys (test mode first)
3. Update config.js with your Stripe publishable key

### 2. Set up Stripe Connect
1. Enable Connect in Stripe dashboard
2. Set up Express accounts for sellers
3. Configure webhook endpoints

### 3. Webhook Setup
1. Go to Stripe → Developers → Webhooks
2. Add endpoint: https://yourdomain.com/api/stripe-webhook
3. Select events:
   - checkout.session.completed
   - payment_intent.succeeded
   - customer.subscription.created
   - account.updated

---

## 📧 Email Service Setup

### Option 1: Resend (Recommended)
1. Sign up at https://resend.com
2. Add and verify your domain
3. Get API key
4. Add to environment variables

### Option 2: SendGrid
1. Sign up at https://sendgrid.com
2. Create API key
3. Add to environment variables

---

## 🔧 Environment Variables

For production, set these in Vercel/Netlify:

```
SUPABASE_URL=https://efbvstybjgzqumsmnuhm.supabase.co
SUPABASE_ANON_KEY=your_anon_key
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx (backend only)
RESEND_API_KEY=re_xxx (backend only)
```

---

## 📊 Analytics & Monitoring

### 1. Vercel Analytics (Free)
- Enable in Vercel dashboard → Analytics

### 2. Google Analytics (Optional)
1. Create GA4 property
2. Add tracking code to index.html

### 3. Error Tracking (Optional)
- Sentry: https://sentry.io
- LogRocket: https://logrocket.com

---

## 🎯 Post-Launch Checklist

- [ ] Test signup flow on production
- [ ] Test login/logout
- [ ] Test password reset
- [ ] Test creating links
- [ ] Test public profile page
- [ ] Check all pages load correctly
- [ ] Test on mobile devices
- [ ] Set up custom domain (optional)
- [ ] Set up SSL (automatic on Vercel/Netlify)
- [ ] Monitor for errors

---

## 🆘 Troubleshooting

### "Failed to fetch" errors
- Check Supabase URL is correct
- Check CORS settings in Supabase

### OAuth not working
- Verify redirect URLs in provider settings
- Check callback URL matches Supabase

### Database errors
- Check RLS policies
- Verify table permissions

### Styles not loading
- Clear browser cache
- Check file paths are relative

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs

---

**Your app is ready for production! 🎉**
