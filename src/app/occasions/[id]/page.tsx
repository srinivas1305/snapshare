'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import PhotoUploader from '@/components/PhotoUploader';
import PhotoGallery, { GalleryPhoto } from '@/components/PhotoGallery';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import SmartAlbumsSection from '@/components/SmartAlbumsSection';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import BrandMark from '@/components/BrandMark';
import { formatDate } from '@/lib/utils';
import { loadFaceModels, detectAllFacesInImage } from '@/lib/face-client';
import type { SmartAlbumPerson, SmartAlbumCategory } from '@/lib/smart-albums';

interface Collaborator {
  id: string;
  invitedEmail: string;
  role: string;
  status: string;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

interface OccasionPhoto extends GalleryPhoto {
  faceProcessed: boolean;
}

interface Occasion {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  isActive: boolean;
  brandName: string | null;
  accentColor: string;
  logoUrl: string | null;
  photographerBio: string | null;
  slideshowEnabled: boolean;
  slideshowInterval: number;
  role: 'OWNER' | 'EDITOR';
  user: { id: string; name: string; email: string };
  photos: OccasionPhoto[];
  collaborators: Collaborator[];
  _count: { photos: number };
}

type Tab = 'photos' | 'upload' | 'qr' | 'slideshow' | 'analytics' | 'team' | 'branding';

const BRAND_SWATCHES = ['#18181b', '#c2410c', '#14532d', '#92400e', '#334155', '#881337'];

export default function OccasionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const occasionId = params.id as string;

  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('photos');

  // Face indexing
  const [reindexing, setReindexing] = useState(false);
  const [reindexStatus, setReindexStatus] = useState<string | null>(null);

  // Smart albums
  const [smartPeople, setSmartPeople] = useState<SmartAlbumPerson[]>([]);
  const [smartCategories, setSmartCategories] = useState<SmartAlbumCategory[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeAlbumPhotoIds, setActiveAlbumPhotoIds] = useState<string[] | null>(null);

  // Slideshow preview
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  // Team
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Branding & Settings
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAccent, setEditAccent] = useState('#18181b');
  const [editSlideshowEnabled, setEditSlideshowEnabled] = useState(false);
  const [editSlideshowInterval, setEditSlideshowInterval] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchOccasion = async () => {
    try {
      const res = await fetch(`/api/occasions/${occasionId}`);
      const data = await res.json();
      if (res.ok) {
        setOccasion(data);
        setEditName(data.name || '');
        setEditDescription(data.description || '');
        setEditDate(data.date ? new Date(data.date).toISOString().slice(0, 10) : '');
        setEditActive(Boolean(data.isActive));
        setEditBrandName(data.brandName || '');
        setEditBio(data.photographerBio || '');
        setEditAccent(data.accentColor || '#18181b');
        setEditSlideshowEnabled(Boolean(data.slideshowEnabled));
        setEditSlideshowInterval(data.slideshowInterval || 5);
      } else {
        router.push('/dashboard');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchSmartAlbums = async () => {
    try {
      const res = await fetch(`/api/occasions/${occasionId}/albums`);
      const data = await res.json();
      if (res.ok) {
        setSmartPeople(data.people || []);
        setSmartCategories(data.categories || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (session) {
      fetchOccasion();
      fetchSmartAlbums();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, occasionId]);

  useEffect(() => {
    if (tab !== 'slideshow' || !slideshowPlaying || !occasion?.photos.length) return;
    const interval = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % occasion.photos.length);
    }, (occasion.slideshowInterval || 5) * 1000);
    return () => clearInterval(interval);
  }, [tab, slideshowPlaying, occasion?.photos.length, occasion?.slideshowInterval]);

  const visiblePhotos = useMemo(() => {
    if (!occasion) return [];
    if (!activeAlbumPhotoIds) return occasion.photos;
    const allowed = new Set(activeAlbumPhotoIds);
    return occasion.photos.filter((p) => allowed.has(p.id));
  }, [occasion, activeAlbumPhotoIds]);

  const reindexAllPhotos = async () => {
    if (!occasion || occasion.photos.length === 0) return;
    setReindexing(true);
    setReindexStatus('Loading face models...');
    try {
      await loadFaceModels();
      let total = 0;
      for (let i = 0; i < occasion.photos.length; i++) {
        const photo = occasion.photos[i];
        setReindexStatus(`Indexing ${i + 1} / ${occasion.photos.length}...`);
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = `/api/photos/serve?path=${encodeURIComponent(
            photo.thumbnailPath || photo.originalPath
          )}`;
        });
        if (!loaded) continue;
        const faces = await detectAllFacesInImage(img);
        total += faces.length;
        await fetch(`/api/photos/${photo.id}/faces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ faces }),
        });
      }
      setReindexStatus(`Indexed ${total} faces`);
      setTimeout(() => setReindexStatus(null), 3500);
      await Promise.all([fetchOccasion(), fetchSmartAlbums()]);
    } catch {
      setReindexStatus('Indexing failed');
    } finally {
      setReindexing(false);
    }
  };

  const saveSettings = async (override?: Partial<{ slideshowEnabled: boolean; slideshowInterval: number }>) => {
    if (!occasion || occasion.role !== 'OWNER') return;
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          date: editDate,
          isActive: editActive,
          brandName: editBrandName,
          photographerBio: editBio,
          accentColor: editAccent,
          slideshowEnabled: override?.slideshowEnabled ?? editSlideshowEnabled,
          slideshowInterval: override?.slideshowInterval ?? editSlideshowInterval,
        }),
      });
      if (res.ok) {
        setSettingsMsg('Saved');
        await fetchOccasion();
        setTimeout(() => setSettingsMsg(null), 2500);
      } else {
        const d = await res.json();
        setSettingsMsg(d.error || 'Save failed');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch(`/api/occasions/${occasionId}/logo`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) await fetchOccasion();
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    setUploadingLogo(true);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/logo`, { method: 'DELETE' });
      if (res.ok) await fetchOccasion();
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteFeedback(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteEmail('');
        setInviteFeedback({
          type: 'ok',
          msg: `Invitation created for ${data.invitedEmail}. They can accept from their Dashboard.`,
        });
        await fetchOccasion();
      } else {
        setInviteFeedback({ type: 'err', msg: data.error || 'Invite failed' });
      }
    } catch {
      setInviteFeedback({ type: 'err', msg: 'Request failed' });
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    const res = await fetch(
      `/api/occasions/${occasionId}/collaborators?collaboratorId=${collaboratorId}`,
      { method: 'DELETE' }
    );
    if (res.ok) await fetchOccasion();
  };

  const deleteOccasion = async () => {
    if (!confirm('Delete this occasion, all photos from cloud storage, and analytics?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/occasions/${occasionId}`, { method: 'DELETE' });
      if (res.ok) router.push('/dashboard');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!occasion) return null;

  const isOwner = occasion.role === 'OWNER';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'photos', label: `Photos (${occasion._count.photos})` },
    { id: 'upload', label: 'Upload' },
    { id: 'qr', label: 'QR & links' },
    { id: 'slideshow', label: 'Live slideshow' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'team', label: `Team (${occasion.collaborators.length + 1})` },
    ...(isOwner ? [{ id: 'branding' as const, label: 'Branding & settings' }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors duration-150 mb-4 inline-block"
        >
          ← Back to occasions
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <BrandMark
              logoUrl={occasion.logoUrl}
              name={occasion.brandName || occasion.name}
              accentColor={occasion.accentColor}
              size="md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tighter text-neutral-900">
                  {occasion.name}
                </h1>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    occasion.isActive
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                  }`}
                >
                  {occasion.isActive ? 'active' : 'closed'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-neutral-500">
                <span>{formatDate(occasion.date)}</span>
                <span className="text-neutral-300">·</span>
                <span className="font-mono">{occasion._count.photos} photos</span>
                <span className="text-neutral-300">·</span>
                <span className="font-mono text-neutral-700">{occasion.accessCode}</span>
                {occasion.brandName && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span>{occasion.brandName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              href={`/gallery/${occasion.accessCode}`}
              target="_blank"
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Guest gallery ↗
            </Link>
            <Link
              href={`/gallery/${occasion.accessCode}/slideshow`}
              target="_blank"
              className="btn-primary text-xs py-1.5 px-3"
            >
              Projector mode ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs font-medium py-3 border-b-2 transition-colors duration-150 whitespace-nowrap ${
                tab === t.id
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photos + Smart Albums */}
      {tab === 'photos' && (
        <div>
          <SmartAlbumsSection
            people={smartPeople}
            categories={smartCategories}
            activeAlbumId={activeAlbumId}
            onSelectAlbum={(id, photoIds) => {
              setActiveAlbumId(id);
              setActiveAlbumPhotoIds(photoIds);
            }}
            editable={true}
            occasionId={occasion.id}
            onRenamed={fetchSmartAlbums}
            accentColor={occasion.accentColor}
          />

          {occasion.photos.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs text-neutral-400 font-mono">
                {occasion.photos.filter((p) => p.faceProcessed).length} / {occasion.photos.length} face-indexed
              </p>
              <div className="flex items-center gap-3">
                {reindexStatus && (
                  <span className="text-[11px] font-mono text-accent">{reindexStatus}</span>
                )}
                <button
                  onClick={reindexAllPhotos}
                  disabled={reindexing}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {reindexing ? 'Indexing faces...' : 'Scan / re-index faces'}
                </button>
              </div>
            </div>
          )}

          <PhotoGallery
            photos={visiblePhotos}
            selectable={true}
            accessCode={occasion.accessCode}
            accentColor={occasion.accentColor}
            canDelete={true}
            onDeletePhoto={() => {
              fetchOccasion();
              fetchSmartAlbums();
            }}
          />
        </div>
      )}

      {/* Upload */}
      {tab === 'upload' && (
        <div className="max-w-xl space-y-6">
          <div>
            <h2 className="text-base font-display font-semibold text-neutral-900">
              Upload photos
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Uploading as <span className="font-mono text-neutral-800">{session?.user?.name}</span>. Originals are stored full-resolution and faces are extracted automatically.
            </p>
          </div>
          <PhotoUploader
            occasionId={occasion.id}
            onUploadComplete={() => {
              fetchOccasion();
              fetchSmartAlbums();
              setTab('photos');
            }}
          />
        </div>
      )}

      {/* QR & Links */}
      {tab === 'qr' && (
        <div className="max-w-md mx-auto">
          <QRCodeDisplay occasionId={occasion.id} />
        </div>
      )}

      {/* Slideshow */}
      {tab === 'slideshow' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-200 rounded p-4 bg-stone-50/70">
            <div>
              <p className="text-sm font-medium text-neutral-900">Live venue slideshow</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Fullscreen dark display with automatic 8-second polling for newly uploaded photos and scannable QR overlay.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isOwner && (
                <>
                  <select
                    value={editSlideshowInterval}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditSlideshowInterval(val);
                      saveSettings({ slideshowInterval: val });
                    }}
                    className="input-field w-24 text-xs py-1.5"
                    title="Slide duration"
                  >
                    {[3, 5, 8, 12, 20].map((s) => (
                      <option key={s} value={s}>
                        {s}s / slide
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const next = !editSlideshowEnabled;
                      setEditSlideshowEnabled(next);
                      saveSettings({ slideshowEnabled: next });
                    }}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      editSlideshowEnabled
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    {editSlideshowEnabled ? 'Public link: On' : 'Public link: Off'}
                  </button>
                </>
              )}
              <Link
                href={`/gallery/${occasion.accessCode}/slideshow`}
                target="_blank"
                className="btn-primary text-xs py-1.5 px-3.5"
              >
                Launch fullscreen ↗
              </Link>
            </div>
          </div>

          {occasion.photos.length === 0 ? (
            <div className="border border-dashed border-neutral-200 rounded py-16 text-center">
              <p className="text-sm text-neutral-400">Upload photos to preview the slideshow.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <div className="aspect-video bg-neutral-950 rounded overflow-hidden relative border border-neutral-200">
                <img
                  src={`/api/photos/serve?path=${encodeURIComponent(
                    occasion.photos[slideshowIndex]?.originalPath || ''
                  )}&type=original`}
                  alt=""
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-3 left-3 text-white/60 text-[11px] font-mono bg-black/50 px-2 py-0.5 rounded">
                  {occasion.name}
                </div>
                <div className="absolute bottom-3 right-3 text-white/60 text-[11px] font-mono bg-black/50 px-2 py-0.5 rounded tabular-nums">
                  {slideshowIndex + 1} / {occasion.photos.length}
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() =>
                    setSlideshowIndex((p) => (p - 1 + occasion.photos.length) % occasion.photos.length)
                  }
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setSlideshowPlaying(!slideshowPlaying)}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  {slideshowPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() =>
                    setSlideshowIndex((p) => (p + 1) % occasion.photos.length)
                  }
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && <AnalyticsPanel occasionId={occasion.id} />}

      {/* Team / Multi-Photographer Collaboration */}
      {tab === 'team' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-display font-semibold text-neutral-900">
              Photography team
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Collaborators can view the catalog, upload photos under their own name, index faces, and access analytics.
            </p>
          </div>

          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-2">
              <label htmlFor="inviteEmail" className="label">Invite collaborator by email</label>
              <div className="flex gap-2">
                <input
                  id="inviteEmail"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="secondshooter@studio.com"
                  className="input-field flex-1"
                />
                <button type="submit" className="btn-primary whitespace-nowrap">
                  Send invite
                </button>
              </div>
              {inviteFeedback && (
                <p
                  className={`text-xs ${
                    inviteFeedback.type === 'ok' ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {inviteFeedback.msg}
                </p>
              )}
            </form>
          )}

          <div className="border border-neutral-200 rounded divide-y divide-neutral-200 bg-white">
            {/* Owner row */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">{occasion.user.name}</p>
                <p className="text-xs font-mono text-neutral-400">{occasion.user.email}</p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-neutral-200 bg-stone-50 text-neutral-700">
                Owner
              </span>
            </div>

            {occasion.collaborators.map((collab) => (
              <div key={collab.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {collab.user?.name || collab.invitedEmail}
                  </p>
                  <p className="text-xs font-mono text-neutral-400 truncate">
                    {collab.invitedEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      collab.status === 'ACCEPTED'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : collab.status === 'REJECTED'
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {collab.status}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => removeCollaborator(collab.id)}
                      className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Branding & Settings (Owner only) */}
      {tab === 'branding' && isOwner && (
        <div className="max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Studio branding
            </p>

            {/* Logo uploader */}
            <div className="flex items-center gap-4 p-4 border border-neutral-200 rounded bg-stone-50/50">
              <BrandMark
                logoUrl={occasion.logoUrl}
                name={editBrandName || occasion.name}
                accentColor={editAccent}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-900">Studio logo mark</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Shown in guest galleries, email photo packs, and venue slideshows.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <label className="btn-secondary text-xs py-1 px-2.5 cursor-pointer">
                    {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                  {occasion.logoUrl && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={uploadingLogo}
                      className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Studio / photographer brand name</label>
              <input
                type="text"
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                placeholder={occasion.user.name}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Photographer bio / credit line</label>
              <input
                type="text"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Documentary wedding photography · @yourstudio"
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Gallery accent color</label>
              <div className="flex flex-wrap items-center gap-2">
                {BRAND_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setEditAccent(hex)}
                    className={`w-7 h-7 rounded border transition-transform duration-150 ${
                      editAccent.toLowerCase() === hex
                        ? 'border-neutral-900 scale-110 ring-2 ring-neutral-900 ring-offset-1'
                        : 'border-neutral-200'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  type="color"
                  value={editAccent}
                  onChange={(e) => setEditAccent(e.target.value)}
                  className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0 bg-white"
                />
                <span className="text-xs font-mono text-neutral-400">{editAccent}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 space-y-4">
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Event settings
            </p>
            <div>
              <label className="label">Occasion name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="input-field min-h-[72px]"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Event date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2.5 text-sm text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 accent-neutral-900 rounded"
                  />
                  <span>Gallery open to guests</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => saveSettings()}
                className="btn-primary"
              >
                {savingSettings ? 'Saving...' : 'Save changes'}
              </button>
              {settingsMsg && (
                <span className="text-xs font-mono text-neutral-500">{settingsMsg}</span>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-neutral-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Delete occasion</p>
              <p className="text-xs text-neutral-500">
                Removes the gallery, database entries, and all stored files permanently.
              </p>
            </div>
            <button
              onClick={deleteOccasion}
              disabled={deleting}
              className="btn-danger text-xs shrink-0"
            >
              {deleting ? 'Deleting...' : 'Delete occasion'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
