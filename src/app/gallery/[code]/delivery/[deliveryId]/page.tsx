'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PhotoGallery, { GalleryPhoto } from '@/components/PhotoGallery';
import BrandMark from '@/components/BrandMark';
import { formatDate } from '@/lib/utils';

interface DeliveryPack {
  deliveryId: string;
  createdAt: string;
  occasion: {
    name: string;
    description: string | null;
    date: string;
    accessCode: string;
    photographerName: string;
    accentColor: string;
    logoUrl: string | null;
    photographerBio: string | null;
  };
  photos: GalleryPhoto[];
}

export default function DeliveryPackPage() {
  const params = useParams();
  const code = params.code as string;
  const deliveryId = params.deliveryId as string;

  const [pack, setPack] = useState<DeliveryPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/gallery/${code}/delivery/${deliveryId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.deliveryId) setPack(data);
        else setError(data?.error || 'Photo pack not found');
      })
      .catch(() => setError('Could not load photo pack'))
      .finally(() => setLoading(false));
  }, [code, deliveryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-sm text-neutral-600">{error || 'Photo pack not found'}</p>
        <Link href={`/gallery/${code}`} className="btn-secondary text-xs mt-4">
          Open full gallery
        </Link>
      </div>
    );
  }

  const accent = pack.occasion.accentColor || '#18181b';
  const photoIds = pack.photos.map((p) => p.id);

  const downloadAll = () => {
    if (photoIds.length === 1) {
      window.open(`/api/photos/download?id=${photoIds[0]}`, '_blank');
    } else if (photoIds.length > 1) {
      window.open(`/api/photos/download?ids=${photoIds.join(',')}`, '_blank');
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `My photos from ${pack.occasion.name}: ${window.location.href}`
      )}`,
      '_blank'
    );
  };

  return (
    <div>
      <div className="h-[3px] w-full" style={{ backgroundColor: accent }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 mb-8 border-b border-neutral-200">
          <div className="flex items-start gap-4">
            <BrandMark
              logoUrl={pack.occasion.logoUrl}
              name={pack.occasion.photographerName}
              accentColor={accent}
              size="lg"
            />
            <div>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Personal photo pack · {pack.occasion.photographerName}
              </p>
              <h1 className="text-2xl font-display font-bold tracking-tighter text-neutral-900 mt-1">
                {pack.occasion.name}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                {formatDate(pack.occasion.date)} ·{' '}
                <span className="font-mono">{pack.photos.length} full-resolution photos</span>
              </p>
              {pack.occasion.photographerBio && (
                <p className="text-xs text-neutral-400 mt-1">{pack.occasion.photographerBio}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={downloadAll}
              className="text-white text-xs font-medium px-4 py-2 rounded transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Download all ({pack.photos.length === 1 ? 'original' : 'ZIP'})
            </button>
            <button onClick={shareWhatsApp} className="btn-secondary text-xs py-2 px-3">
              Share on WhatsApp
            </button>
            <button onClick={copyLink} className="btn-secondary text-xs py-2 px-3">
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <Link href={`/gallery/${code}`} className="btn-secondary text-xs py-2 px-3">
              Full gallery
            </Link>
          </div>
        </div>

        <PhotoGallery
          photos={pack.photos}
          selectable={true}
          accessCode={code}
          accentColor={accent}
        />
      </div>
    </div>
  );
}
