'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import BrandMark from '@/components/BrandMark';

interface SlideshowPhoto {
  id: string;
  fileName: string;
  originalPath: string;
  thumbnailPath: string | null;
  createdAt: string;
  uploadedBy?: { name: string };
}

interface GalleryMeta {
  name: string;
  accessCode: string;
  photographerName: string;
  accentColor: string;
  logoUrl: string | null;
  slideshowInterval: number;
  photos: SlideshowPhoto[];
}

export default function LiveSlideshowPage() {
  const params = useParams();
  const code = params.code as string;

  const [meta, setMeta] = useState<GalleryMeta | null>(null);
  const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(5);
  const [showQr, setShowQr] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [hudVisible, setHudVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const latestTimestampRef = useRef<string | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load + QR generation
  useEffect(() => {
    fetch(`/api/gallery/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setMeta(data);
          setPhotos(data.photos || []);
          setIntervalSec(data.slideshowInterval || 5);
          if (data.photos?.length > 0) {
            latestTimestampRef.current = data.photos[0].createdAt;
          }
        } else {
          setError(data?.error || 'Slideshow unavailable');
        }
      })
      .catch(() => setError('Could not load slideshow'));

    const galleryLink = `${window.location.origin}/gallery/${code}`;
    QRCode.toDataURL(galleryLink, {
      width: 240,
      margin: 1,
      color: { dark: '#18181b', light: '#ffffff' },
    })
      .then(setQrUrl)
      .catch(() => {});
  }, [code]);

  // Real-time polling for newly uploaded photos every 8s
  useEffect(() => {
    const poller = setInterval(async () => {
      try {
        const after = latestTimestampRef.current;
        const url = after
          ? `/api/gallery/${code}?after=${encodeURIComponent(after)}`
          : `/api/gallery/${code}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: SlideshowPhoto[] = data.photos || [];
        if (incoming.length > 0) {
          latestTimestampRef.current = incoming[0].createdAt;
          setPhotos((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const unique = incoming.filter((p) => !seen.has(p.id));
            if (unique.length === 0) return prev;
            // Place new photos right after current slide so guests see fresh shots immediately
            const before = prev.slice(0, index + 1);
            const afterSlice = prev.slice(index + 1);
            return [...before, ...unique, ...afterSlice];
          });
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 8000);
    return () => clearInterval(poller);
  }, [code, index]);

  // Auto-advance timer
  useEffect(() => {
    if (!playing || photos.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [playing, photos.length, intervalSec]);

  // Auto-hide HUD controls after inactivity
  const bumpHud = () => {
    setHudVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setHudVisible(false), 3500);
  };

  useEffect(() => {
    bumpHud();
    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      bumpHud();
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight' && photos.length > 0) {
        setIndex((i) => (i + 1) % photos.length);
      } else if (e.key === 'ArrowLeft' && photos.length > 0) {
        setIndex((i) => (i - 1 + photos.length) % photos.length);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
        <p className="text-sm text-neutral-300">{error}</p>
        <Link href={`/gallery/${code}`} className="text-xs font-mono text-neutral-400 hover:text-white mt-4">
          ← Back to gallery
        </Link>
      </div>
    );
  }

  const currentPhoto = photos[index];

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpHud}
      onClick={bumpHud}
      className="fixed inset-0 bg-neutral-950 text-white flex flex-col justify-between select-none overflow-hidden"
    >
      {/* Top HUD */}
      <div
        className={`relative z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {meta && (
            <BrandMark
              logoUrl={meta.logoUrl}
              name={meta.photographerName}
              accentColor={meta.accentColor}
              size="sm"
            />
          )}
          <div>
            <p className="text-sm font-display font-medium text-white">
              {meta?.name || 'Live Slideshow'}
            </p>
            <p className="text-[11px] font-mono text-neutral-400">
              {meta?.photographerName}
              {currentPhoto?.uploadedBy?.name && <> · Shot by {currentPhoto.uploadedBy.name}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE {lastUpdated ? `· updated ${lastUpdated}` : ''}
          </span>
          <Link
            href={`/gallery/${code}`}
            className="border border-white/20 hover:border-white/50 px-2.5 py-1 rounded text-neutral-200 transition-colors"
          >
            Exit
          </Link>
        </div>
      </div>

      {/* Main Stage */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-10">
        {photos.length === 0 ? (
          <div className="text-center">
            <p className="text-sm text-neutral-400 font-mono">
              Waiting for photos to be uploaded...
            </p>
          </div>
        ) : currentPhoto ? (
          <img
            key={currentPhoto.id}
            src={`/api/photos/serve?path=${encodeURIComponent(
              currentPhoto.originalPath
            )}&type=original`}
            alt={currentPhoto.fileName}
            className="max-h-full max-w-full object-contain transition-opacity duration-500"
          />
        ) : null}
      </div>

      {/* Scannable Venue QR Overlay */}
      {showQr && qrUrl && (
        <div className="fixed bottom-6 left-6 z-20 hidden sm:flex items-center gap-3 bg-white text-neutral-900 p-2.5 pr-4 rounded border border-neutral-200">
          <img src={qrUrl} alt="Scan QR" className="w-16 h-16" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Scan for photos
            </p>
            <p className="text-sm font-mono font-bold tracking-widest text-neutral-900 mt-0.5">
              {code}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Controls HUD */}
      <div
        className={`relative z-20 flex items-center justify-end sm:justify-center gap-2 px-6 py-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => photos.length > 0 && setIndex((i) => (i - 1 + photos.length) % photos.length)}
          className="text-xs font-mono border border-white/20 hover:border-white/50 px-3 py-1.5 rounded bg-black/40"
        >
          ← Prev
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="text-xs font-mono bg-white text-neutral-900 hover:bg-neutral-200 px-4 py-1.5 rounded font-medium"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => photos.length > 0 && setIndex((i) => (i + 1) % photos.length)}
          className="text-xs font-mono border border-white/20 hover:border-white/50 px-3 py-1.5 rounded bg-black/40"
        >
          Next →
        </button>
        <select
          value={intervalSec}
          onChange={(e) => setIntervalSec(Number(e.target.value))}
          className="text-xs font-mono border border-white/20 px-2.5 py-1.5 rounded bg-neutral-900 text-white"
        >
          {[3, 5, 8, 12, 20].map((s) => (
            <option key={s} value={s}>
              {s}s
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowQr((q) => !q)}
          className="text-xs font-mono border border-white/20 hover:border-white/50 px-2.5 py-1.5 rounded bg-black/40"
        >
          {showQr ? 'Hide QR' : 'Show QR'}
        </button>
        <button
          onClick={toggleFullscreen}
          className="text-xs font-mono border border-white/20 hover:border-white/50 px-2.5 py-1.5 rounded bg-black/40"
        >
          Fullscreen [F]
        </button>
        {photos.length > 0 && (
          <span className="text-xs font-mono text-neutral-400 ml-2 tabular-nums">
            {index + 1} / {photos.length}
          </span>
        )}
      </div>
    </div>
  );
}
