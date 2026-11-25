# SnapShare

Event photo delivery platform for photographers and guests. Photographers upload full-resolution event galleries and share one QR code; guests scan, take a quick selfie to match their face against the catalog, browse auto-grouped Smart Albums, and export originals directly or via Email and WhatsApp.

## Key Features

- **In-Browser AI Face Recognition**: Extracts 128-dimension FaceNet embeddings (`face-api.js`) during upload and selfie matching, with Euclidean (`<= 0.62`) and cosine (`>= 0.80`) scoring.
- **Smart Albums**: Automatically clusters detected faces into person albums alongside `Portraits & Couples`, `Group Shots`, and `Details & Venue` filters, with custom naming.
- **Live Slideshow Mode**: Dedicated dark-canvas projector route (`/gallery/[code]/slideshow`) with 8-second incremental upload polling, keyboard shortcuts, and an optional scannable venue QR overlay.
- **Email & WhatsApp Delivery + Manual Downloads**: Generates permanent Personal Photo Pack URLs (`/gallery/[code]/delivery/[deliveryId]`), supports direct Resend email delivery (with `mailto:` fallback), prefilled WhatsApp sharing, and uncompressed single/ZIP archive downloads.
- **Social Sharing**: Supports Web Share API (`navigator.share`), WhatsApp, X, Email, copyable links, and `?photo=` lightbox deep-linking.
- **Analytics Dashboard**: Tracks gallery views, unique guests, photo views, face matches, downloads, shares, deliveries, 7-day activity, top photos, and per-photographer contributions.
- **Multi-Photographer Collaboration**: Owner-controlled email invitations, accept/decline workflow on Dashboard, shared catalog access, and per-photo shooter attribution.
- **Custom Branding**: Configurable studio/brand name, uploaded PNG/WebP/JPEG logo mark, photographer bio, and gallery accent color applied across guest galleries, delivery packs, and slideshows.
- **Dual Storage**: Local filesystem in development and S3-compatible object storage (Cloudflare R2 / AWS S3) in production, including full asset cleanup on occasion deletion.

## Documentation

- [IMPLEMENTATION.md](./IMPLEMENTATION.md) — Architecture, design system, Prisma models, API reference, and future development roadmap.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Step-by-step Vercel, Neon PostgreSQL, and Cloudflare R2 setup.

## Local Development

```bash
npm install
cp .env.example .env   # Configure DATABASE_URL=file:./dev.db and NEXTAUTH_SECRET
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.
