'use client';

import { useState } from 'react';

interface DeliveryPanelProps {
  accessCode: string;
  occasionName: string;
  photoIds: string[];
  accentColor?: string;
}

type ChannelMode = 'download' | 'email' | 'whatsapp';

export default function DeliveryPanel({
  accessCode,
  occasionName,
  photoIds,
  accentColor = '#18181b',
}: DeliveryPanelProps) {
  const [mode, setMode] = useState<ChannelMode>('download');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    packUrl: string;
    zipUrl: string;
    emailSent: boolean;
    mailtoUrl: string | null;
    whatsappUrl: string;
    channel: 'EMAIL' | 'WHATSAPP';
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (photoIds.length === 0) return null;

  const triggerManualZip = () => {
    if (photoIds.length === 1) {
      window.open(`/api/photos/download?id=${photoIds[0]}`, '_blank');
    } else {
      window.open(`/api/photos/download?ids=${photoIds.join(',')}`, '_blank');
    }
  };

  const handleDeliver = async (channel: 'EMAIL' | 'WHATSAPP') => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/gallery/${accessCode}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          recipientEmail: channel === 'EMAIL' ? email : undefined,
          recipientPhone: channel === 'WHATSAPP' ? phone : undefined,
          photoIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not prepare delivery');
        return;
      }

      setResult({ ...data, channel });

      if (channel === 'WHATSAPP' && data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      } else if (channel === 'EMAIL' && !data.emailSent && data.mailtoUrl) {
        window.open(data.mailtoUrl, '_blank');
      }
    } catch {
      setError('Network error preparing delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPackLink = async () => {
    if (!result?.packUrl) return;
    await navigator.clipboard.writeText(result.packUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-neutral-200 rounded bg-stone-50/70 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            Delivery & export
          </p>
          <p className="text-sm font-medium text-neutral-900 mt-0.5">
            {photoIds.length} photo{photoIds.length === 1 ? '' : 's'} ready from {occasionName}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded p-0.5 self-start sm:self-auto">
          {([
            ['download', 'Manual download'],
            ['email', 'Email'],
            ['whatsapp', 'WhatsApp'],
          ] as [ChannelMode, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setMode(key);
                setError(null);
              }}
              className={`text-xs px-2.5 py-1 rounded transition-colors duration-150 ${
                mode === key
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'download' && (
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">
            Full original quality — uncompressed archive ({photoIds.length}{' '}
            file{photoIds.length === 1 ? '' : 's'}).
          </p>
          <button
            type="button"
            onClick={triggerManualZip}
            className="text-white text-xs font-medium px-4 py-2 rounded transition-opacity duration-150 hover:opacity-90 shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            Download {photoIds.length === 1 ? 'original' : `all (${photoIds.length} ZIP)`}
          </button>
        </div>
      )}

      {mode === 'email' && (
        <div className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              className="input-field flex-1 text-xs"
            />
            <button
              type="button"
              disabled={submitting || !email}
              onClick={() => handleDeliver('EMAIL')}
              className="text-white text-xs font-medium px-4 py-2 rounded transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? 'Preparing...' : 'Send photo pack'}
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">
            Creates a permanent download link and delivers your photo pack via email.
          </p>
        </div>
      )}

      {mode === 'whatsapp' && (
        <div className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional WhatsApp number (e.g. +919876543210)"
              className="input-field flex-1 text-xs font-mono"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDeliver('WHATSAPP')}
              className="text-white text-xs font-medium px-4 py-2 rounded transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? 'Preparing...' : 'Send on WhatsApp'}
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">
            Generates a shareable personal pack URL and opens WhatsApp. Leave number blank to choose a chat.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-wider text-green-700">
              {result.emailSent ? 'Email sent' : 'Personal photo pack ready'}
            </span>
            <p className="font-mono text-neutral-600 truncate mt-0.5">{result.packUrl}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copyPackLink} className="btn-secondary text-xs py-1 px-2.5">
              {copied ? 'Copied' : 'Copy pack link'}
            </button>
            <a
              href={result.packUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs py-1 px-2.5"
            >
              Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
