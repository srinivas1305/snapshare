'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const BRAND_SWATCHES = [
  { name: 'Charcoal', hex: '#18181b' },
  { name: 'Terracotta', hex: '#c2410c' },
  { name: 'Forest', hex: '#14532d' },
  { name: 'Ochre', hex: '#92400e' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Burgundy', hex: '#881337' },
];

export default function NewOccasionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [brandName, setBrandName] = useState('');
  const [photographerBio, setPhotographerBio] = useState('');
  const [accentColor, setAccentColor] = useState('#18181b');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/occasions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          date,
          brandName,
          photographerBio,
          accentColor,
          slideshowEnabled,
          slideshowInterval,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create occasion');
        return;
      }

      if (logoFile && data.id) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        await fetch(`/api/occasions/${data.id}/logo`, {
          method: 'POST',
          body: fd,
        }).catch(() => {});
      }

      router.push(`/occasions/${data.id}`);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors duration-150 mb-4 block"
        >
          ← Back to dashboard
        </button>
        <h1 className="text-2xl font-display font-bold tracking-tighter text-neutral-900">
          New occasion
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Configure event details, branding, and live slideshow defaults.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* Section 1: Event details */}
        <div className="space-y-4">
          <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Event details
          </p>
          <div>
            <label htmlFor="name" className="label">Occasion name *</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Sarah & Tom's Wedding"
            />
          </div>
          <div>
            <label htmlFor="date" className="label">Event date *</label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="description" className="label">Welcome note for guests</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[76px] resize-y"
              placeholder="Optional note displayed at the top of the gallery"
            />
          </div>
        </div>

        {/* Section 2: Custom branding */}
        <div className="pt-6 border-t border-neutral-200 space-y-4">
          <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Custom branding
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brandName" className="label">Studio / photographer name</label>
              <input
                id="brandName"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="input-field"
                placeholder={session.user?.name || 'Your Studio'}
              />
            </div>
            <div>
              <label htmlFor="logoFile" className="label">Studio logo (PNG/JPG)</label>
              <input
                id="logoFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-neutral-200 file:text-xs file:font-medium file:bg-white file:text-neutral-700 hover:file:bg-neutral-50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="label">Studio bio / credit line</label>
            <input
              id="bio"
              type="text"
              value={photographerBio}
              onChange={(e) => setPhotographerBio(e.target.value)}
              className="input-field"
              placeholder="e.g. Documentary wedding photography · studio.com"
            />
          </div>

          <div>
            <label className="label">Gallery accent color</label>
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setAccentColor(swatch.hex)}
                  title={swatch.name}
                  className={`w-7 h-7 rounded border transition-transform duration-150 ${
                    accentColor.toLowerCase() === swatch.hex
                      ? 'border-neutral-900 scale-110 ring-2 ring-neutral-900 ring-offset-1'
                      : 'border-neutral-200'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0 bg-white"
                title="Custom color"
              />
              <span className="text-xs font-mono text-neutral-400 ml-1">{accentColor}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Live slideshow */}
        <div className="pt-6 border-t border-neutral-200 space-y-3">
          <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Live slideshow mode
          </p>
          <div className="flex items-center justify-between border border-neutral-200 rounded p-3.5 bg-stone-50/60">
            <div>
              <p className="text-sm font-medium text-neutral-900">Enable public venue slideshow</p>
              <p className="text-xs text-neutral-500">
                Stream newly uploaded photos onto projectors in real time.
              </p>
            </div>
            <input
              type="checkbox"
              checked={slideshowEnabled}
              onChange={(e) => setSlideshowEnabled(e.target.checked)}
              className="h-4 w-4 accent-neutral-900 rounded"
            />
          </div>
          {slideshowEnabled && (
            <div className="flex items-center gap-3">
              <label htmlFor="interval" className="text-xs text-neutral-600">
                Slide duration
              </label>
              <select
                id="interval"
                value={slideshowInterval}
                onChange={(e) => setSlideshowInterval(Number(e.target.value))}
                className="input-field w-32 text-xs"
              >
                {[3, 5, 8, 12, 20].map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} seconds
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create occasion'}
          </button>
        </div>
      </form>
    </div>
  );
}
