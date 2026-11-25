'use client';

import { useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  occasionId: string;
}

export default function QRCodeDisplay({ occasionId }: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<{
    qrCode: string;
    galleryUrl: string;
    slideshowUrl: string;
    accessCode: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<'gallery' | 'slideshow' | null>(null);

  useEffect(() => {
    fetch(`/api/qr?occasionId=${occasionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.qrCode) setQrData(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [occasionId]);

  const downloadQR = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.href = qrData.qrCode;
    link.download = `snapshare-qr-${qrData.accessCode}.png`;
    link.click();
  };

  const copyLink = async (url: string, key: 'gallery' | 'slideshow') => {
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!qrData) {
    return <p className="text-sm text-neutral-500">Could not generate QR code.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="border border-neutral-200 rounded p-6 bg-white flex flex-col items-center text-center">
        <img
          src={qrData.qrCode}
          alt={`QR code for ${qrData.accessCode}`}
          className="w-52 h-52 border border-neutral-100"
        />
        <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mt-5">
          Access code
        </p>
        <p className="text-2xl font-mono font-bold text-neutral-900 tracking-[0.22em] mt-1">
          {qrData.accessCode}
        </p>
        <div className="flex items-center gap-2 mt-5">
          <button onClick={downloadQR} className="btn-primary text-xs">
            Download PNG
          </button>
          <button
            onClick={() => copyLink(qrData.galleryUrl, 'gallery')}
            className="btn-secondary text-xs"
          >
            {copiedKey === 'gallery' ? 'Copied' : 'Copy gallery URL'}
          </button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded divide-y divide-neutral-100 text-xs">
        <div className="p-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
              Guest gallery link
            </p>
            <p className="font-mono text-neutral-700 truncate mt-0.5">{qrData.galleryUrl}</p>
          </div>
          <button
            onClick={() => copyLink(qrData.galleryUrl, 'gallery')}
            className="btn-secondary text-xs py-1 px-2.5 shrink-0"
          >
            {copiedKey === 'gallery' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="p-3.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
              Projector slideshow link
            </p>
            <p className="font-mono text-neutral-700 truncate mt-0.5">{qrData.slideshowUrl}</p>
          </div>
          <button
            onClick={() => copyLink(qrData.slideshowUrl, 'slideshow')}
            className="btn-secondary text-xs py-1 px-2.5 shrink-0"
          >
            {copiedKey === 'slideshow' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
