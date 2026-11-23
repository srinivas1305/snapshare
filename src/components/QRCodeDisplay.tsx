'use client';

import { useState, useEffect } from 'react';
import { Download, Copy, Check, Loader2 } from 'lucide-react';

interface QRCodeDisplayProps {
  occasionId: string;
}

export default function QRCodeDisplay({ occasionId }: QRCodeDisplayProps) {
  const [qrData, setQrData] = useState<{
    qrCode: string;
    galleryUrl: string;
    accessCode: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchQR();
  }, [occasionId]);

  const fetchQR = async () => {
    try {
      const res = await fetch(`/api/qr?occasionId=${occasionId}`);
      const data = await res.json();
      if (res.ok) {
        setQrData(data);
      }
    } catch (error) {
      console.error('Error fetching QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.href = qrData.qrCode;
    link.download = `snapshare-qr-${qrData.accessCode}.png`;
    link.click();
  };

  const copyLink = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData.galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!qrData) {
    return <p className="text-gray-500">Failed to generate QR code</p>;
  }

  return (
    <div className="text-center space-y-4">
      <img
        src={qrData.qrCode}
        alt="QR Code"
        className="mx-auto w-64 h-64 rounded-xl shadow-lg"
      />
      <div>
        <p className="text-sm text-gray-500">Access Code</p>
        <p className="text-2xl font-bold text-primary-700 tracking-widest">
          {qrData.accessCode}
        </p>
      </div>
      <div className="flex justify-center space-x-2">
        <button onClick={downloadQR} className="btn-secondary text-sm flex items-center space-x-1">
          <Download className="h-4 w-4" />
          <span>Download QR</span>
        </button>
        <button onClick={copyLink} className="btn-secondary text-sm flex items-center space-x-1">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>
      <p className="text-xs text-gray-400 break-all">{qrData.galleryUrl}</p>
    </div>
  );
}
