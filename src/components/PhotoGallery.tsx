'use client';

import { useEffect, useState } from 'react';
import { formatFileSize } from '@/lib/utils';

export interface GalleryPhoto {
  id: string;
  fileName: string;
  thumbnailPath: string | null;
  originalPath: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploadedBy?: { name: string };
}

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  selectable?: boolean;
  accessCode?: string;
  accentColor?: string;
  initialPhotoId?: string | null;
  canDelete?: boolean;
  onDeletePhoto?: (photoId: string) => void;
  onDeliverSelected?: (photoIds: string[]) => void;
}

export default function PhotoGallery({
  photos,
  selectable = true,
  accessCode,
  accentColor = '#18181b',
  initialPhotoId,
  canDelete = false,
  onDeletePhoto,
  onDeliverSelected,
}: PhotoGalleryProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPhotoId && photos.length > 0) {
      const idx = photos.findIndex((p) => p.id === initialPhotoId);
      if (idx !== -1) setLightbox(idx);
    }
  }, [initialPhotoId, photos]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i !== null && i > 0 ? i - 1 : i));
      if (e.key === 'ArrowRight') {
        setLightbox((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, photos.length]);

  const trackEvent = (eventType: 'PHOTO_VIEW' | 'SHARE', photoId?: string) => {
    if (!accessCode) return;
    fetch(`/api/gallery/${accessCode}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, photoId }),
    }).catch(() => {});
  };

  const openLightbox = (index: number) => {
    setLightbox(index);
    const photo = photos[index];
    if (photo) trackEvent('PHOTO_VIEW', photo.id);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    selected.size === photos.length
      ? setSelected(new Set())
      : setSelected(new Set(photos.map((p) => p.id)));
  };

  const downloadSelected = () => {
    if (selected.size === 0) return;
    if (selected.size === 1) {
      window.open(`/api/photos/download?id=${Array.from(selected)[0]}`, '_blank');
    } else {
      window.open(`/api/photos/download?ids=${Array.from(selected).join(',')}`, '_blank');
    }
  };

  const downloadSingle = (id: string) => {
    window.open(`/api/photos/download?id=${id}`, '_blank');
  };

  const getShareUrl = (photo: GalleryPhoto) => {
    if (accessCode) {
      return `${window.location.origin}/gallery/${accessCode}?photo=${photo.id}`;
    }
    return `${window.location.origin}/api/photos/download?id=${photo.id}`;
  };

  const sharePhoto = async (
    photo: GalleryPhoto,
    method: 'native' | 'whatsapp' | 'x' | 'copy' | 'email'
  ) => {
    const shareUrl = getShareUrl(photo);
    const downloadUrl = `${window.location.origin}/api/photos/download?id=${photo.id}`;
    trackEvent('SHARE', photo.id);

    if (method === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        // Attempt sharing the actual image file if supported, fallback to link
        const res = await fetch(
          `/api/photos/serve?path=${encodeURIComponent(photo.originalPath)}`
        );
        const blob = await res.blob();
        const file = new File([blob], photo.fileName, { type: photo.mimeType || 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: photo.fileName,
            text: 'Event photo via SnapShare',
          });
          return;
        }
      } catch {
        // Fallback to URL share
      }
      try {
        await navigator.share({ title: photo.fileName, url: shareUrl });
        return;
      } catch {
        return;
      }
    }

    if (method === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`Event photo: ${shareUrl}`)}`,
        '_blank'
      );
    } else if (method === 'x') {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Photo from the event')}`,
        '_blank'
      );
    } else if (method === 'copy') {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast('Share link copied');
      setTimeout(() => setShareToast(null), 2000);
    } else if (method === 'email') {
      window.open(
        `mailto:?subject=Event photo&body=${encodeURIComponent(`View photo:\n${shareUrl}\n\nDownload original:\n${downloadUrl}`)}`,
        '_blank'
      );
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!onDeletePhoto || !confirm(`Delete ${photo.fileName}?`)) return;
    setDeletingId(photo.id);
    try {
      const res = await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (lightbox !== null) setLightbox(null);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(photo.id);
          return next;
        });
        onDeletePhoto(photo.id);
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-neutral-200 rounded py-16 text-center">
        <p className="text-sm text-neutral-500">No photos in this view.</p>
      </div>
    );
  }

  return (
    <div>
      {shareToast && (
        <div className="fixed top-16 right-4 z-50 text-xs font-mono bg-neutral-900 text-white px-3 py-1.5 rounded border border-neutral-800">
          {shareToast}
        </div>
      )}

      {selectable && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 py-2 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-150"
            >
              {selected.size === photos.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              {selected.size > 0 ? `${selected.size} of ${photos.length} selected` : `${photos.length} photos`}
            </span>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              {onDeliverSelected && (
                <button
                  onClick={() => onDeliverSelected(Array.from(selected))}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Send to Email / WhatsApp
                </button>
              )}
              <button
                onClick={downloadSelected}
                className="text-white text-xs font-medium py-1.5 px-3 rounded transition-opacity duration-150 hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                Download{selected.size > 1 ? ` ZIP (${selected.size})` : ' original'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {photos.map((photo, index) => {
          const isSelected = selected.has(photo.id);
          return (
            <div
              key={photo.id}
              className={`group relative aspect-square bg-neutral-100 cursor-pointer overflow-hidden rounded-sm border transition-colors duration-150 ${
                isSelected ? 'border-neutral-900' : 'border-transparent hover:border-neutral-300'
              }`}
            >
              <img
                src={`/api/photos/serve?path=${encodeURIComponent(
                  photo.thumbnailPath || photo.originalPath
                )}`}
                alt={photo.fileName}
                className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-95"
                loading="lazy"
                onClick={() => openLightbox(index)}
              />

              {selectable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(photo.id);
                  }}
                  aria-label={`Select ${photo.fileName}`}
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border flex items-center justify-center transition-all duration-150 ${
                    isSelected
                      ? 'text-white border-transparent'
                      : 'bg-white/90 border-neutral-300 opacity-0 group-hover:opacity-100'
                  }`}
                  style={isSelected ? { backgroundColor: accentColor } : undefined}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M2 5l2.2 2.2L8 3" />
                    </svg>
                  )}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSingle(photo.id);
                }}
                aria-label={`Download ${photo.fileName}`}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded bg-neutral-900/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-neutral-900"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 2v6M3 6l3 3 3-3M2 10h8" />
                </svg>
              </button>

              {photo.uploadedBy?.name && (
                <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-neutral-950/65 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/90 truncate">
                    {photo.uploadedBy.name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setLightbox(null)}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400" onClick={(e) => e.stopPropagation()}>
            <span>
              {lightbox + 1} / {photos.length}
              {photos[lightbox].width && photos[lightbox].height && (
                <> · {photos[lightbox].width}×{photos[lightbox].height}</>
              )}
              {' · '}
              {formatFileSize(photos[lightbox].fileSize)}
              {photos[lightbox].uploadedBy?.name && <> · shot by {photos[lightbox].uploadedBy.name}</>}
            </span>
            <button
              onClick={() => setLightbox(null)}
              className="text-neutral-400 hover:text-white px-2 py-1 text-sm transition-colors"
            >
              Close [Esc]
            </button>
          </div>

          {/* Image area */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 my-2">
            {lightbox > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(lightbox - 1);
                }}
                aria-label="Previous photo"
                className="absolute left-0 sm:left-2 px-3 py-6 text-neutral-400 hover:text-white text-2xl transition-colors"
              >
                ‹
              </button>
            )}

            <img
              src={`/api/photos/serve?path=${encodeURIComponent(
                photos[lightbox].originalPath
              )}&type=original`}
              alt={photos[lightbox].fileName}
              className="max-h-full max-w-[88vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {lightbox < photos.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(lightbox + 1);
                }}
                aria-label="Next photo"
                className="absolute right-0 sm:right-2 px-3 py-6 text-neutral-400 hover:text-white text-2xl transition-colors"
              >
                ›
              </button>
            )}
          </div>

          {/* Actions bar */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => downloadSingle(photos[lightbox].id)}
              className="bg-white text-neutral-900 hover:bg-neutral-200 font-medium px-3.5 py-1.5 rounded transition-colors duration-150"
            >
              Download original
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={() => sharePhoto(photos[lightbox], 'native')}
                className="text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors duration-150"
              >
                Share
              </button>
            )}
            <button
              onClick={() => sharePhoto(photos[lightbox], 'whatsapp')}
              className="text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors duration-150"
            >
              WhatsApp
            </button>
            <button
              onClick={() => sharePhoto(photos[lightbox], 'x')}
              className="text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors duration-150"
            >
              Post on X
            </button>
            <button
              onClick={() => sharePhoto(photos[lightbox], 'copy')}
              className="text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors duration-150"
            >
              Copy link
            </button>
            <button
              onClick={() => sharePhoto(photos[lightbox], 'email')}
              className="text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors duration-150"
            >
              Email
            </button>
            {canDelete && onDeletePhoto && (
              <button
                onClick={() => handleDelete(photos[lightbox])}
                disabled={deletingId === photos[lightbox].id}
                className="text-red-400 hover:text-red-300 border border-red-900/60 px-3 py-1.5 rounded transition-colors duration-150"
              >
                {deletingId === photos[lightbox].id ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
