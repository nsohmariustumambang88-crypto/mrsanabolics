# Vercel Environment Variables Setup

Copy these variables into your new Vercel account. Go to: **Project Settings → Environment Variables**

---

## REQUIRED VARIABLES (Copy from your .env file)

### Database Connection (SENSITIVE - Keep private!)
```
DATABASE_URL=
DIRECT_URL=
```
**Where to get:** From your current `.env` file (Supabase connection strings)

---

### Cloudinary (Public - OK to expose)
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```
**Where to get:** From your current `.env` file (this is the public cloud name, safe to expose)

---

### Admin Credentials (SENSITIVE - Keep private!)
```
ADMIN_EMAIL=
ADMIN_PASSWORD=
```
**Where to get:** From your current `.env` file

---

## OPTIONAL VARIABLES (Only if you have them set)

```
SUBSCRIBER_IP_SALT=
```
**Where to get:** From your current `.env` file (for email subscriber IP hashing)

---

## STEP-BY-STEP TO ADD VARIABLES IN VERCEL:

1. **Go to new Vercel project** → Settings
2. **Click "Environment Variables"**
3. **For each variable:**
   - Name: `DATABASE_URL`
   - Value: [paste from .env]
   - Select: **Production**
   - Click Add
4. **Repeat for all variables above**

---

## COPY YOUR CURRENT .ENV VALUES HERE:

### From your current mranabolics/.env file:

```
DATABASE_URL = 
DIRECT_URL = 
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 
ADMIN_EMAIL = 
ADMIN_PASSWORD = 
SUBSCRIBER_IP_SALT = 
```

Then paste these into Vercel's Environment Variables dashboard.

---

## IMPORTANT NOTES:

- ✅ These are the ONLY variables needed for production
- ✅ `NEXT_PUBLIC_*` variables are safe to expose (they go into browser)
- ⚠️ All other variables are SENSITIVE - keep them private
- ✅ No need for NODE_ENV (Vercel sets it automatically)
- ✅ No need for other variables (code has sensible defaults)

---

## AFTER ADDING VARIABLES:

1. Make sure all Production environment variables are set
2. Push code to GitHub (or just connect the repo)
3. Vercel will auto-deploy
4. Check deployment logs for any errors
5. Update domain DNS if you have custom domain

---

## VERIFY DEPLOYMENT:

After deployment, check:
- ✅ https://mrsanabolics.com/blog → See 21 articles
- ✅ Homepage → See trust badges (scroll down)
- ✅ All pages → See "📖 Free Guide" button (bottom-right)
- ✅ Admin login → /admin login works with ADMIN_EMAIL / ADMIN_PASSWORD
