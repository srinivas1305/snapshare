# SnapShare — Implementation & Architecture Guide

This document describes the architecture, data model, UI design system, API surface, and extension points of **SnapShare** for ongoing development.

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js `14.2.15` (App Router) | Server/client rendering & REST API routes |
| Language | TypeScript `5.6.3` | End-to-end type safety |
| Styling | Tailwind CSS `3.4.13` | Warm minimalist / Swiss editorial UI tokens |
| Database / ORM | Prisma `5.20.0` (SQLite dev / PostgreSQL prod) | Relational catalog, analytics & collaboration |
| Auth | NextAuth `4.24.8` (Credentials + JWT) | Photographer registration & sessions |
| Image Processing | Sharp `0.33.5` | Server-side thumbnails & normalized brand logos |
| Archive Export | Archiver `7.0.1` | Zero-compression ZIP exports for multi-photo downloads |
| Face Recognition | `face-api.js` (client `/public/face-api.min.js`) | TinyFaceDetector + 68-landmark alignment + 128-d FaceNet |
| Object Storage | `@aws-sdk/client-s3` | Cloudflare R2 / AWS S3 in production, local disk in dev |
| QR Generation | `qrcode` `1.5.4` | Server QR generation & projector QR overlay |

---

## 2. Design System & UI Architecture

The UI follows a **warm minimalist / Swiss editorial** system defined across:
- `src/app/layout.tsx`: Loads `Inter` (`--font-body`), `Space Grotesk` (`--font-display`), and `JetBrains Mono` (`--font-mono`).
- `tailwind.config.ts`: Defines `fontFamily.display`, `fontFamily.body`, `fontFamily.mono`, tightened display tracking (`tighter: -0.04em`), body width cap (`prose: 65ch`), and a single burnt-terracotta accent (`#c2410c`).
- `src/app/globals.css`: Provides restrained button primitives (`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-accent`), `.input-field`, and `.label`.

### Rules for Future UI Changes
1. Avoid purple/indigo/blue gradients, neon glows, glassmorphism blur layers, and floating card-soup layouts with drop shadows.
2. Separate layout groups with whitespace, `1px` `border-neutral-200` / `border-neutral-100` dividers, or subtle `bg-stone-50` fills.
3. Keep border radii tight (`rounded` / `4px` to `rounded-md` / `6px`) except circular capture shutters and small status dots.
4. Use `--font-mono` (`font-mono tabular-nums`) for access codes, dimensions, timestamps, and metrics.
5. Keep interactive feedback subtle (`duration-150` color/border transitions and crisp focus rings) and copy direct without marketing buzzwords or sparkle icons.
6. Public guest pages (`/gallery/[code]`, `/gallery/[code]/slideshow`, `/gallery/[code]/delivery/[deliveryId]`) dynamically apply the occasion's `accentColor` to top hairline bars and primary CTA actions while keeping surrounding surfaces neutral.

---

## 3. Database Schema (`prisma/schema.prisma`)

Local development defaults to `provider = "sqlite"` (`file:./dev.db`). Production builds run `npm run vercel-build`, which invokes `scripts/switch-db.js postgresql` and runs `npx prisma db push`.

### Models

| Model | Key Fields | Purpose |
|---|---|---|
| `User` | `id`, `email` (unique, normalized lowercase on signup), `name`, `passwordHash` | Photographer accounts |
| `Occasion` | `id`, `name`, `description`, `date`, `accessCode`, `isActive`, `brandName`, `accentColor`, `logoUrl`, `photographerBio`, `slideshowEnabled`, `slideshowInterval`, `userId` | Event gallery container, branding & projector settings |
| `Photo` | `id`, `fileName`, `originalPath`, `thumbnailPath`, `fileSize`, `mimeType`, `width`, `height`, `faceProcessed`, `occasionId`, `uploadedById` | Uploaded photo metadata & uploader attribution |
| `FaceDescriptor` | `id`, `descriptor` (JSON `128`-float vector), `x`, `y`, `width`, `height`, `photoId` | Normalized face coordinates & 128-d FaceNet embedding |
| `Collaborator` | `id`, `occasionId`, `userId?`, `invitedEmail`, `role` (`EDITOR`), `status` (`PENDING` / `ACCEPTED` / `REJECTED`) | Multi-photographer team membership |
| `ViewEvent` | `id`, `occasionId`, `photoId?`, `eventType`, `ipHash`, `userAgent`, `createdAt` | Privacy-preserving engagement telemetry |
| `SmartAlbum` | `id`, `occasionId`, `name`, `type`, `faceDescriptorId?`, `centroidDescriptor`, `coverPhotoId?` | Named person clusters backed by 128-d centroids |
| `PhotoDelivery` | `id`, `occasionId`, `channel` (`EMAIL` / `WHATSAPP`), `recipientEmail?`, `recipientPhone?`, `photoIds` (JSON array), `status` (`PENDING` / `READY` / `SENT`), `sentAt?` | Shareable guest photo packs |

All occasion children (`Photo`, `Collaborator`, `ViewEvent`, `SmartAlbum`, `PhotoDelivery`) cascade delete cleanly when an `Occasion` is deleted.

---

## 4. Feature Modules & Implementation Details

### 4.1 AI Face Recognition & Re-indexing
- **Client extraction**: `src/lib/face-client.ts` dynamically loads `/face-api.min.js` and weights from `/public/models/` (`tinyFaceDetector`, `faceLandmark68TinyNet`, `faceRecognitionNet`).
- **Upload path**: `src/components/PhotoUploader.tsx` scans each photo in batches of 3 in the browser and attaches `faces_<fileName>` JSON embeddings to `POST /api/photos/upload`.
- **Re-indexing**: `src/app/occasions/[id]/page.tsx` can scan existing photos in-browser and overwrite descriptors via `POST /api/photos/[id]/faces`.
- **Matching**: `src/app/api/face/match/route.ts` accepts a client-computed 128-d `descriptor` (or falls back to `src/lib/face-recognition.ts`) and matches when `euclideanDistance <= 0.62` OR `cosineSimilarity >= 0.80`, sorting matches by best distance.

### 4.2 Smart Albums
- **Clustering engine**: `src/lib/smart-albums.ts` (`buildSmartAlbums(occasionId)`) seeds clusters from any saved named `SmartAlbum` rows (`centroidDescriptor`), then greedily clusters remaining 128-d face vectors using Euclidean distance `<= 0.56` while preventing two faces from the same photo from merging into one person cluster.
- **Categories**: Computes `Portraits & Couples` (1–2 faces), `Group Shots` (3+ faces), and `Details & Venue` (`faceProcessed: true` with `0` faces).
- **Face avatars**: `src/components/FaceCropAvatar.tsx` draws a square portrait crop on `<canvas>` directly from the photo thumbnail using normalized bounding box coordinates with `35%` padding.
- **Naming persistence**: Photographers/collaborators name clusters via `POST /api/occasions/[id]/albums`, storing the cluster `centroidDescriptor` so newly uploaded photos of the same person match the named album automatically.

### 4.3 Live Slideshow Mode
- **Route**: `src/app/gallery/[code]/slideshow/page.tsx` renders a distraction-free fullscreen stage.
- **Real-time polling**: Polls `GET /api/gallery/[code]?after=<latestPhotoCreatedAt>` every 8 seconds and splices newly uploaded photos directly ahead of the current playback position.
- **Venue QR overlay**: Generates an in-browser QR code linking guests to `/gallery/[code]` alongside the access code, with toggle (`Show QR` / `Hide QR`), interval selector (`3s`–`20s`), keyboard controls (`Space`, `ArrowLeft`, `ArrowRight`, `F`), and idle HUD fade-out.
- **Navbar exclusion**: `src/components/Navbar.tsx` checks `pathname?.endsWith('/slideshow')` and hides site navigation during projection.

### 4.4 Email & WhatsApp Delivery + Manual Download
- **Server pack creation**: `POST /api/gallery/[code]/deliver` verifies every `photoId` belongs to the occasion, creates a `PhotoDelivery` record, logs a `DELIVERY` event, and builds:
  - `packUrl`: `/gallery/[code]/delivery/[deliveryId]`
  - `zipUrl`: `/api/photos/download?ids=...`
  - `whatsappUrl`: `https://wa.me/<digits>?text=...` (or general share if phone omitted)
  - `mailtoUrl`: prefilled email fallback when automated email isn't configured
- **Automated Email (optional)**: When `RESEND_API_KEY` (and optional `EMAIL_FROM`) is set, `POST /api/gallery/[code]/deliver` posts an HTML email to `https://api.resend.com/emails` and marks `PhotoDelivery.status = 'SENT'`.
- **Guest Delivery UI**: `src/components/DeliveryPanel.tsx` exposes **Manual download**, **Email**, and **WhatsApp** tabs on face-match results and multi-selected gallery items. `src/app/gallery/[code]/delivery/[deliveryId]/page.tsx` serves the dedicated persistent pack view.

### 4.5 Social Sharing
- `src/components/PhotoGallery.tsx` provides per-photo lightbox sharing (**Share** via Web Share API with image file attachment when supported, **WhatsApp**, **Post on X**, **Copy link**, **Email**) and records `SHARE` events.
- Direct photo links point to `/gallery/[code]?photo=[photoId]`, which `PhotoGallery` reads via `initialPhotoId` to open directly to that image.

### 4.6 Analytics Dashboard
- `src/lib/analytics.ts` (`recordViewEvent`) logs `GALLERY_VIEW`, `PHOTO_VIEW`, `DOWNLOAD`, `FACE_MATCH`, `QR_SCAN`, `SHARE`, and `DELIVERY` without failing upstream routes. Visitor IPs are SHA-256 hashed with `NEXTAUTH_SECRET` (`ipHash`) so unique guest counts are estimated without storing raw IPs.
- `GET /api/occasions/[id]/analytics` aggregates summary counts, unique guests, 7-day daily activity buckets, catalog storage footprint, face indexing coverage, top photos (`views + downloads * 2`), and per-photographer photo counts.
- Rendered in `src/components/AnalyticsPanel.tsx`.

### 4.7 Multi-Photographer Collaboration
- `src/lib/occasion-access.ts` provides `getOccasionAccess(occasionId, userId, userEmail)` (`OWNER` vs `EDITOR`) and `syncUserCollaborations(userId, email)` to link email invites created before a teammate registers.
- **Permissions**:
  - `OWNER`: Full control — edit settings/branding, invite/remove collaborators, toggle slideshow, delete occasion.
  - `EDITOR` (accepted collaborator): Appears on Dashboard (`collaborator` badge), can view photos/analytics/QR/smart albums, upload photos under their own `uploadedById`, run face indexing, and delete their own uploaded photos.
- **Invite flow**: `POST /api/occasions/[id]/collaborators` invites by email; recipients accept or decline on `/dashboard` via `/api/collaborations`.

### 4.8 Custom Branding & Object Storage
- `src/lib/storage.ts` handles dual-mode storage: local `./uploads/` (`originals/`, `thumbnails/`, `logos/`) when S3 env vars are absent, and Cloudflare R2 / S3 (`S3_BUCKET_NAME`, `S3_ENDPOINT`, etc.) when present.
- `saveBrandLogo` normalizes uploaded PNG/JPEG/WebP logos via Sharp (`<= 256px` fit inside, converted to PNG) and stores them under `logos/<uuid>.png`, served cleanly via `/api/photos/serve?path=...` (`BrandMark.tsx`).
- Deleting an occasion (`DELETE /api/occasions/[id]`) batch-deletes all original/thumbnail objects (`deletePhotos`) and removes any `logos/*` key via `deleteSingleKey` before removing DB rows.

---

## 5. Complete Route Reference

### App Pages
| Path | Access | Description |
|---|---|---|
| `/` | Public | Editorial landing page |
| `/login`, `/register` | Public | Photographer authentication |
| `/dashboard` | Auth | Studio summary, pending team invites, occasion ledger |
| `/occasions/new` | Auth | Create occasion with branding & slideshow defaults |
| `/occasions/[id]` | Owner / Collaborator | Tabs: Photos (+ Smart Albums), Upload, QR & links, Live slideshow, Analytics, Team, Branding & settings |
| `/gallery/[code]` | Public | Guest gallery, selfie face search, Smart Albums, sharing & delivery |
| `/gallery/[code]/slideshow` | Public | Live projector slideshow with polling & QR overlay |
| `/gallery/[code]/delivery/[deliveryId]` | Public | Persistent guest Personal Photo Pack |

### API Routes
| Endpoint | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/[...nextauth]` | `GET`, `POST` | Public | NextAuth credentials handler |
| `/api/auth/register` | `POST` | Public | Create user + link pending invites |
| `/api/collaborations` | `GET`, `POST` | Session | List & accept/decline team invites |
| `/api/occasions` | `GET`, `POST` | Session | List owned + shared occasions; create occasion |
| `/api/occasions/[id]` | `GET`, `PUT`, `DELETE` | Owner / Collaborator (`GET`), Owner (`PUT`/`DELETE`) | Occasion CRUD & R2/S3 cascade cleanup |
| `/api/occasions/[id]/logo` | `POST`, `DELETE` | Owner | Upload/remove Sharp-normalized studio logo |
| `/api/occasions/[id]/collaborators` | `GET`, `POST`, `DELETE` | Owner / Collaborator | Team member list, invite & removal |
| `/api/occasions/[id]/albums` | `GET`, `POST`, `DELETE` | Owner / Collaborator | Compute & name Smart Albums |
| `/api/occasions/[id]/analytics` | `GET` | Owner / Collaborator | Engagement metrics, 7-day chart & contributors |
| `/api/photos/upload` | `POST` | Owner / Collaborator | Multi-file upload + Sharp thumbnail + face vectors |
| `/api/photos/[id]` | `DELETE` | Uploader / Owner | Delete single photo from storage & DB |
| `/api/photos/[id]/faces` | `POST` | Owner / Collaborator / Uploader | Replace 128-d face descriptors |
| `/api/photos/serve` | `GET` | Public | Stream thumbnail, original, or brand logo |
| `/api/photos/download` | `GET` | Public | Original single download or uncompressed ZIP + analytics |
| `/api/qr` | `GET` | Owner / Collaborator | Generate QR PNG, gallery URL & slideshow URL |
| `/api/face/match` | `POST` | Public | Match 128-d selfie descriptor against occasion faces |
| `/api/gallery/[code]` | `GET` | Public | Occasion gallery + branding + `?after=` live poll |
| `/api/gallery/[code]/albums` | `GET` | Public | Guest Smart Albums (People + Categories) |
| `/api/gallery/[code]/events` | `POST` | Public | Record view/share analytics events |
| `/api/gallery/[code]/deliver` | `POST` | Public | Create Email/WhatsApp PhotoDelivery pack |
| `/api/gallery/[code]/delivery/[deliveryId]` | `GET` | Public | Fetch photos for a Personal Photo Pack |

---

## 6. Verification & Deployment Notes

### Standard Checks
```bash
npx prisma generate
npx prisma db push         # SQLite locally
npx tsc --noEmit
npm run lint
npm run build              # Requires outbound access to Google Fonts (fonts.googleapis.com)
```

### Vercel Deployment (`vercel-build`)
`npm run vercel-build` runs:
1. `node scripts/switch-db.js postgresql`
2. `npx prisma db push`
3. `next build`

Configure all variables listed in `.env.example` in Vercel Project Settings (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `S3_*`, and optionally `RESEND_API_KEY` + `EMAIL_FROM`).

---

## 7. Future Development Backlog

1. **Direct-to-R2 Presigned Uploads**: Vercel Serverless Functions cap request bodies at ~4.5 MB. Moving photo uploads to client -> S3/R2 presigned `PUT` URLs followed by a metadata webhook will unlock full 50 MB raw/JPEG uploads in production.
2. **Next.js Security Upgrade**: Upgrade `next` (`14.2.15`) and `eslint-config-next` to the latest patched `14.2.x` or `15.x` release.
3. **Gallery Pagination / Virtualization**: Add cursor-based pagination to `GET /api/gallery/[code]` and `PhotoGallery` for events exceeding 500–1,000 photos.
4. **Automated Test Suite**: Add Playwright end-to-end tests and Vitest unit coverage for `smart-albums.ts`, `occasion-access.ts`, and `analytics.ts`.
5. **Rate Limiting & Abuse Protection**: Add Upstash/IP rate limiting on `/api/face/match`, `/api/gallery/[code]/deliver`, and `/api/auth/register`.
6. **Guest Photo Uploads & Watermarked Previews**: Optional event toggle allowing guests to contribute candid shots and photographers to serve watermarked previews before download/purchase.
7. **SMS Delivery**: Extend `PhotoDelivery` (`channel: 'SMS'`) using Twilio if phone SMS alerts are desired alongside WhatsApp and Email.
