'use client';

interface BrandMarkProps {
  logoUrl?: string | null;
  name: string;
  accentColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function resolveLogoSrc(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:')) {
    return logoUrl;
  }
  return `/api/photos/serve?path=${encodeURIComponent(logoUrl)}`;
}

export default function BrandMark({
  logoUrl,
  name,
  accentColor = '#18181b',
  size = 'md',
}: BrandMarkProps) {
  const src = resolveLogoSrc(logoUrl);
  const dims =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-14 w-14 text-base' : 'h-10 w-10 text-sm';

  if (src) {
    return (
      <div className={`${dims} rounded border border-neutral-200 bg-white overflow-hidden flex items-center justify-center p-1`}>
        <img
          src={src}
          alt={name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('') || 'S';

  return (
    <div
      className={`${dims} rounded flex items-center justify-center font-mono font-semibold text-white shrink-0`}
      style={{ backgroundColor: accentColor }}
    >
      {initials}
    </div>
  );
}
