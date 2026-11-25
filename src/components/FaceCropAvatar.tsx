'use client';

import { useEffect, useRef, useState } from 'react';

interface FaceCropAvatarProps {
  imagePath: string;
  box: { x: number; y: number; width: number; height: number };
  label: string;
  size?: number;
}

/**
 * Renders a cropped square face portrait from a photo thumbnail using normalized face bounding box coordinates.
 */
export default function FaceCropAvatar({
  imagePath,
  box,
  label,
  size = 40,
}: FaceCropAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;

      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;

      // Expand bounding box slightly for a natural portrait crop
      const pad = 0.35;
      const rawW = Math.max(0.08, box.width) * iw;
      const rawH = Math.max(0.08, box.height) * ih;
      const cx = (box.x + box.width / 2) * iw;
      const cy = (box.y + box.height / 2) * ih;
      const side = Math.max(rawW, rawH) * (1 + pad * 2);

      const sx = Math.max(0, Math.min(iw - side, cx - side / 2));
      const sy = Math.max(0, Math.min(ih - side, cy - side / 2));
      const sSize = Math.min(side, iw - sx, ih - sy);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, canvas.width, canvas.height);
      setLoaded(true);
    };
    img.src = `/api/photos/serve?path=${encodeURIComponent(imagePath)}`;
    return () => {
      cancelled = true;
    };
  }, [imagePath, box.x, box.y, box.width, box.height, size]);

  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      className="relative rounded overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <span className="text-[10px] font-mono text-neutral-400">{initials}</span>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`block ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
      />
    </div>
  );
}
