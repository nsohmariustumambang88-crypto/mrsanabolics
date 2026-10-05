# Transfer to New Vercel Account - Checklist

Follow these steps to transfer mranabolics to a new free-tier Vercel account.

---

## STEP 1: Prepare Environment Variables
- [ ] Open `.env` file (in project root)
- [ ] Open `VERCEL_ENV_VARS.md` (in project root)
- [ ] Copy these values from `.env` into `VERCEL_ENV_VARS.md`:
  - [ ] DATABASE_URL
  - [ ] DIRECT_URL
  - [ ] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  - [ ] ADMIN_EMAIL
  - [ ] ADMIN_PASSWORD
  - [ ] SUBSCRIBER_IP_SALT (if set)

---

## STEP 2: Create New Vercel Account
- [ ] Go to https://vercel.com/signup
- [ ] Sign up with **new email** (different from current account)
- [ ] Verify email
- [ ] Complete account setup

---

## STEP 3: Connect GitHub Repo
- [ ] Log into new Vercel account
- [ ] Click "Add New" → "Project"
- [ ] Search for `marztuma/mranabolics`
- [ ] Click "Import"
- [ ] (May need to authorize GitHub access first)

---

## STEP 4: Add Environment Variables
- [ ] After importing, go to **Settings** tab
- [ ] Click **Environment Variables**
- [ ] For EACH variable in VERCEL_ENV_VARS.md:
  - [ ] Click "Add New"
  - [ ] Name: `[variable name]` (e.g., DATABASE_URL)
  - [ ] Value: `[copy from VERCEL_ENV_VARS.md]`
  - [ ] Select: **Production**
  - [ ] Click "Save"

**Variables to add:**
- [ ] DATABASE_URL
- [ ] DIRECT_URL
- [ ] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- [ ] ADMIN_EMAIL
- [ ] ADMIN_PASSWORD
- [ ] SUBSCRIBER_IP_SALT (if you have it)

---

## STEP 5: Verify Deployment
- [ ] Go to **Deployments** tab
- [ ] Wait for green checkmark (2-5 minutes)
- [ ] Click the deployment to see logs
- [ ] Verify no errors

---

## STEP 6: Test Site
- [ ] Visit **Vercel preview URL** (from deployment)
- [ ] Check: `/blog` shows 21 articles ✅
- [ ] Check: Homepage shows trust badges ✅
- [ ] Check: "📖 Free Guide" button visible ✅
- [ ] Check: `/admin` login works ✅

---

## STEP 7: Update Domain (Optional)
If you have a custom domain (mrsanabolics.com):

- [ ] Get new Vercel deployment URL
- [ ] Go to your **domain registrar** (GoDaddy, Namecheap, etc.)
- [ ] Update DNS to point to new Vercel URL
  - [ ] Find "CNAME" or "A" record
  - [ ] Set to: `cname.vercel.com` (or as Vercel instructs)
- [ ] Wait 24-48 hours for DNS to propagate
- [ ] Verify domain is working

---

## STEP 8: Clean Up (Optional)
- [ ] Once new Vercel account is working, you can **remove old Vercel project**
- [ ] Old account can be deleted

---

## TROUBLESHOOTING

**Deployment fails:**
- [ ] Check all environment variables are set
- [ ] Check variable values are copied exactly (no extra spaces)
- [ ] Check database is reachable (SUPABASE_URL format correct)

**Domain not pointing to new site:**
- [ ] DNS changes take 24-48 hours
- [ ] Verify DNS record at your registrar
- [ ] Clear browser cache (Ctrl+Shift+R)

**Articles not showing:**
- [ ] Database connection working? Check `/admin` login works
- [ ] Cloudinary key correct? Check product images load
- [ ] If images missing, check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

---

**Estimated time: 15-20 minutes**

Good luck! 🚀
