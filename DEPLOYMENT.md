# SnapShare Deployment Guide (Vercel + Neon/Supabase + Cloudflare R2)

SnapShare is production-ready for deployment on **Vercel** with full quality photo persistence and PostgreSQL.

---

## 1. Quick Prerequisites (Free Tiers)

1. **GitHub Repository**: To push your code and connect to Vercel.
2. **PostgreSQL Database** (Free):
   - Option A: **[Neon](https://neon.tech)** (Recommended — 1-click free serverless Postgres)
   - Option B: **[Supabase](https://supabase.com)** (Free Postgres DB)
   - Option C: **Vercel Postgres** (Directly in Vercel Dashboard -> Storage)
3. **Photo Storage (S3-Compatible)**:
   - Option A: **[Cloudflare R2](https://dash.cloudflare.com)** (Recommended: **10 GB free** and **$0 egress fees** so downloading HD photos is completely free!)
   - Option B: **AWS S3** (5 GB free tier)
   - Option C: **Supabase Storage** (1 GB free)

---

## 2. Push Your Project to GitHub

In your terminal, create a new GitHub repository (e.g. `snapshare`) on [github.com/new](https://github.com/new), then link and push:

```bash
cd /Users/srinivasreddy/snapshare

# Add your GitHub remote URL
git remote add origin https://github.com/<your-username>/snapshare.git

# Push main branch
git push -u origin main
```

---

## 3. Deploy to Vercel

1. Go to **[vercel.com/new](https://vercel.com/new)** and import your `snapshare` repository.
2. In the **Build and Output Settings**, the default `Build Command` is automatically:
   ```bash
   npm run vercel-build
   ```
   *(This automatically migrates Prisma schema to PostgreSQL and runs `prisma db push`)*

3. In the **Environment Variables** section, add the following variables:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Connection string from Neon, Supabase, or Vercel Postgres |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Any long random secret string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel production domain |
| `S3_BUCKET_NAME` | `snapshare-photos` | Your R2 / S3 bucket name |
| `S3_REGION` | `auto` | `auto` for Cloudflare R2, or `us-east-1` for AWS S3 |
| `S3_ACCESS_KEY_ID` | `...` | Cloudflare R2 or AWS S3 API Token Access Key |
| `S3_SECRET_ACCESS_KEY` | `...` | Cloudflare R2 or AWS S3 API Token Secret Key |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | (Optional, required for Cloudflare R2 / MinIO) |
| `RESEND_API_KEY` | `re_...` | (Optional) Enables direct automated Email photo pack delivery |
| `EMAIL_FROM` | `SnapShare <photos@yourdomain.com>` | (Optional) Sender address when `RESEND_API_KEY` is configured |

4. Click **Deploy**!

---

## 4. Post-Deployment Verification

1. Open your live Vercel URL (e.g. `https://snapshare.vercel.app`).
2. Click **Sign Up** to create your primary photographer account.
3. Create an occasion, upload high-resolution photos, and verify:
   - Sharp generates thumbnails for instant browsing.
   - Originals are preserved in full resolution in R2/S3.
   - Scan the QR code on a mobile phone.
   - Take a selfie with the "Find My Photos" feature to test AI face matching!
