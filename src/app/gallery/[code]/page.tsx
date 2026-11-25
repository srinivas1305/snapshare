'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PhotoGallery, { GalleryPhoto } from '@/components/PhotoGallery';
import CameraCapture from '@/components/CameraCapture';
import DeliveryPanel from '@/components/DeliveryPanel';
import SmartAlbumsSection from '@/components/SmartAlbumsSection';
import BrandMark from '@/components/BrandMark';
import { formatDate } from '@/lib/utils';
import type { SmartAlbumPerson, SmartAlbumCategory } from '@/lib/smart-albums';

interface GalleryData {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  photographerName: string;
  brandName: string | null;
  accentColor: string;
  logoUrl: string | null;
  photographerBio: string | null;
  slideshowEnabled: boolean;
  photoCount: number;
  photos: GalleryPhoto[];
}

type View = 'gallery' | 'scan' | 'results';

function GalleryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const initialPhotoId = searchParams.get('photo');

  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('gallery');

  const [matched, setMatched] = useState<GalleryPhoto[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [smartPeople, setSmartPeople] = useState<SmartAlbumPerson[]>([]);
  const [smartCategories, setSmartCategories] = useState<SmartAlbumCategory[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeAlbumPhotoIds, setActiveAlbumPhotoIds] = useState<string[] | null>(null);

  const [deliverIds, setDeliverIds] = useState<string[] | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const viewRecordedRef = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/gallery/${code}`).then((r) => r.json()),
      fetch(`/api/gallery/${code}/albums`).then((r) => r.json()).catch(() => null),
    ])
      .then(([galleryData, albumsData]) => {
        if (galleryData?.id) {
          setGallery(galleryData);
          if (!viewRecordedRef.current) {
            viewRecordedRef.current = true;
            fetch(`/api/gallery/${code}/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventType: 'GALLERY_VIEW' }),
            }).catch(() => {});
          }
        } else {
          setError(galleryData?.error || 'Gallery not found');
        }
        if (albumsData?.people) {
          setSmartPeople(albumsData.people);
          setSmartCategories(albumsData.categories || []);
        }
      })
      .catch(() => setError('Could not load gallery'))
      .finally(() => setLoading(false));
  }, [code]);

  const filteredPhotos = useMemo(() => {
    if (!gallery) return [];
    if (!activeAlbumPhotoIds) return gallery.photos;
    const allowed = new Set(activeAlbumPhotoIds);
    return gallery.photos.filter((p) => allowed.has(p.id));
  }, [gallery, activeAlbumPhotoIds]);

  const handleSelfie = async (blob: Blob, descriptor?: number[]) => {
    setMatching(true);
    setMatchError(null);
    try {
      let res: Response;
      if (descriptor?.length === 128) {
        res = await fetch('/api/face/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: code, descriptor }),
        });
      } else {
        const form = new FormData();
        form.append('selfie', blob, 'selfie.jpg');
        form.append('accessCode', code);
        res = await fetch('/api/face/match', { method: 'POST', body: form });
      }
      const data = await res.json();
      if (res.ok) {
        setMatched(data.matches);
        setView('results');
      } else {
        setMatchError(data.error || 'Matching failed');
      }
    } catch {
      setMatchError('Something went wrong. Please try again.');
    } finally {
      setMatching(false);
    }
  };

  const shareGalleryLink = async () => {
    const url = window.location.href.split('?')[0];
    fetch(`/api/gallery/${code}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'SHARE' }),
    }).catch(() => {});

    if (navigator.share) {
      try {
        await navigator.share({
          title: gallery?.name || 'Event Gallery',
          text: `Browse photos from ${gallery?.name}`,
          url,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        <p className="text-xs font-mono text-neutral-400 mt-3">Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-sm font-medium text-neutral-800">{error}</p>
        <p className="text-xs text-neutral-400 mt-1">Verify your QR code or access code.</p>
      </div>
    );
  }

  if (!gallery) return null;

  const accent = gallery.accentColor || '#18181b';

  return (
    <div>
      {/* Custom branded hairline rule */}
      <div className="h-[3px] w-full" style={{ backgroundColor: accent }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Branded Gallery Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-neutral-200">
          <div className="flex items-start gap-4">
            <BrandMark
              logoUrl={gallery.logoUrl}
              name={gallery.photographerName}
              accentColor={accent}
              size="lg"
            />
            <div>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                {gallery.photographerName} · {formatDate(gallery.date)}
              </p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tighter text-neutral-900 mt-1">
                {gallery.name}
              </h1>
              {gallery.description && (
                <p className="text-sm text-neutral-600 mt-2 max-w-prose">
                  {gallery.description}
                </p>
              )}
              {gallery.photographerBio && (
                <p className="text-xs text-neutral-400 mt-1.5">{gallery.photographerBio}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setView('scan')}
              className="text-xs font-medium py-2 px-4 rounded transition-opacity duration-150"
              style={
                view === 'scan' || view === 'results'
                  ? { backgroundColor: accent, color: '#ffffff' }
                  : { backgroundColor: '#18181b', color: '#ffffff' }
              }
            >
              Find my photos
            </button>
            <button
              onClick={() => {
                setView('gallery');
                setDeliverIds(null);
              }}
              className={`text-xs font-medium py-2 px-4 rounded border transition-colors duration-150 ${
                view === 'gallery'
                  ? 'border-neutral-900 bg-neutral-100 text-neutral-900'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
              }`}
            >
              Browse all ({gallery.photoCount})
            </button>
            {gallery.slideshowEnabled && (
              <Link
                href={`/gallery/${code}/slideshow`}
                className="btn-secondary text-xs py-2 px-3"
              >
                Live slideshow ↗
              </Link>
            )}
            <button
              onClick={shareGalleryLink}
              className="btn-secondary text-xs py-2 px-3"
            >
              {shareCopied ? 'Link copied' : 'Share gallery'}
            </button>
          </div>
        </div>

        {/* Gallery & Smart Albums */}
        {view === 'gallery' && (
          <div className="space-y-6">
            {deliverIds && deliverIds.length > 0 && (
              <DeliveryPanel
                accessCode={code}
                occasionName={gallery.name}
                photoIds={deliverIds}
                accentColor={accent}
              />
            )}

            <SmartAlbumsSection
              people={smartPeople}
              categories={smartCategories}
              activeAlbumId={activeAlbumId}
              onSelectAlbum={(id, photoIds) => {
                setActiveAlbumId(id);
                setActiveAlbumPhotoIds(photoIds);
              }}
              accentColor={accent}
            />

            <PhotoGallery
              photos={filteredPhotos}
              selectable={true}
              accessCode={code}
              accentColor={accent}
              initialPhotoId={initialPhotoId}
              onDeliverSelected={(ids) => setDeliverIds(ids)}
            />
          </div>
        )}

        {/* Face Scan */}
        {view === 'scan' && (
          <div className="max-w-md mx-auto py-4">
            <div className="text-center mb-6">
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Face search
              </p>
              <h2 className="text-xl font-display font-semibold text-neutral-900 tracking-tight mt-1">
                Find every photo you appear in
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5">
                Position your face inside the frame and take one quick selfie.
              </p>
            </div>
            {matchError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
                {matchError}
              </div>
            )}
            <CameraCapture
              onCapture={handleSelfie}
              onCancel={() => setView('gallery')}
              loading={matching}
              accentColor={accent}
            />
          </div>
        )}

        {/* Face Match Results + Delivery */}
        {view === 'results' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Match results
                </p>
                <h2 className="text-lg font-display font-semibold text-neutral-900 mt-0.5">
                  {matched.length} photo{matched.length === 1 ? '' : 's'} matched your selfie
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setView('scan')} className="btn-secondary text-xs py-1.5 px-3">
                  Scan again
                </button>
                <button onClick={() => setView('gallery')} className="btn-secondary text-xs py-1.5 px-3">
                  Browse full gallery
                </button>
              </div>
            </div>

            {matched.length > 0 ? (
              <>
                <DeliveryPanel
                  accessCode={code}
                  occasionName={gallery.name}
                  photoIds={matched.map((p) => p.id)}
                  accentColor={accent}
                />
                <PhotoGallery
                  photos={matched}
                  selectable={true}
                  accessCode={code}
                  accentColor={accent}
                />
              </>
            ) : (
              <div className="border border-dashed border-neutral-200 rounded py-14 text-center px-4">
                <p className="text-sm font-medium text-neutral-800">No matching photos found</p>
                <p className="text-xs text-neutral-500 mt-1.5 max-w-md mx-auto">
                  Photos may still be indexing, or lighting differed significantly from your selfie. Try scanning again or browse the Smart Albums.
                </p>
                <div className="flex justify-center gap-2.5 mt-5">
                  <button
                    onClick={() => setView('scan')}
                    className="text-white text-xs font-medium px-4 py-2 rounded"
                    style={{ backgroundColor: accent }}
                  >
                    Try another selfie
                  </button>
                  <button onClick={() => setView('gallery')} className="btn-secondary text-xs">
                    Browse all photos
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}
