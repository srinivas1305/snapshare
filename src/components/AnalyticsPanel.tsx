'use client';

import { useEffect, useState } from 'react';
import { formatFileSize } from '@/lib/utils';

interface AnalyticsPayload {
  totalPhotos: number;
  facesIndexed: number;
  totalFaces: number;
  totalSizeBytes: number;
  isActive: boolean;
  accessCode: string;
  summary: {
    galleryViews: number;
    photoViews: number;
    downloads: number;
    faceMatches: number;
    shares: number;
    deliveries: number;
    uniqueVisitors: number;
  };
  dailyActivity: Array<{
    date: string;
    label: string;
    views: number;
    downloads: number;
    matches: number;
  }>;
  topPhotos: Array<{
    id: string;
    fileName: string;
    thumbnailPath: string | null;
    originalPath: string;
    views: number;
    downloads: number;
  }>;
  contributors: Array<{
    userId: string;
    name: string;
    photoCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    photoId: string | null;
  }>;
}

export default function AnalyticsPanel({ occasionId }: { occasionId: string }) {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/occasions/${occasionId}/analytics`)
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [occasionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-neutral-500">Analytics unavailable.</p>;
  }

  const maxDaily = Math.max(
    1,
    ...data.dailyActivity.map((d) => d.views + d.downloads + d.matches)
  );

  return (
    <div className="space-y-8">
      {/* Primary engagement telemetry */}
      <div>
        <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-3">
          Engagement overview
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 border border-neutral-200 rounded divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 bg-white">
          {[
            { label: 'Gallery views', value: data.summary.galleryViews },
            { label: 'Unique guests', value: data.summary.uniqueVisitors },
            { label: 'Downloads', value: data.summary.downloads },
            { label: 'Face searches', value: data.summary.faceMatches },
            { label: 'Deliveries / shares', value: data.summary.deliveries + data.summary.shares },
          ].map((item) => (
            <div key={item.label} className="p-4">
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-2xl font-mono font-semibold text-neutral-900 mt-1 tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 7-day activity chart & inventory */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-neutral-200 rounded p-5 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                7-day activity
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Views, face matches, and downloads by day
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-neutral-900 inline-block rounded-sm" />
                Views
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-accent inline-block rounded-sm" />
                Downloads
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-36 pt-2">
            {data.dailyActivity.map((day) => {
              const viewsH = Math.round((day.views / maxDaily) * 100);
              const dlH = Math.round((day.downloads / maxDaily) * 100);
              const matchH = Math.round((day.matches / maxDaily) * 100);
              const total = day.views + day.downloads + day.matches;
              return (
                <div key={day.date} className="flex flex-col items-center h-full justify-end">
                  <span className="text-[10px] font-mono text-neutral-400 mb-1 tabular-nums">
                    {total > 0 ? total : ''}
                  </span>
                  <div className="w-full max-w-[32px] flex-1 flex items-end gap-0.5 border-b border-neutral-200 pb-0.5">
                    <div
                      className="flex-1 bg-neutral-900 rounded-t-sm transition-all duration-150"
                      style={{ height: `${Math.max(viewsH, day.views > 0 ? 6 : 0)}%` }}
                      title={`${day.views} views`}
                    />
                    <div
                      className="flex-1 bg-accent rounded-t-sm transition-all duration-150"
                      style={{ height: `${Math.max(dlH + matchH, day.downloads + day.matches > 0 ? 6 : 0)}%` }}
                      title={`${day.downloads} downloads, ${day.matches} face searches`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 mt-1.5">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Storage & Indexing */}
        <div className="border border-neutral-200 rounded p-5 bg-white flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-4">
              Catalog health
            </p>
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">Total photos</dt>
                <dd className="font-mono font-medium text-neutral-900 tabular-nums">
                  {data.totalPhotos}
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">Indexed for faces</dt>
                <dd className="font-mono font-medium text-neutral-900 tabular-nums">
                  {data.facesIndexed} / {data.totalPhotos}
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">Detected face embeddings</dt>
                <dd className="font-mono font-medium text-neutral-900 tabular-nums">
                  {data.totalFaces}
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
                <dt className="text-neutral-500">Storage footprint</dt>
                <dd className="font-mono font-medium text-neutral-900 tabular-nums">
                  {formatFileSize(data.totalSizeBytes)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-neutral-500">Photo lightbox opens</dt>
                <dd className="font-mono font-medium text-neutral-900 tabular-nums">
                  {data.summary.photoViews}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Top photos & Multi-photographer contributors */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-neutral-200 rounded p-5 bg-white">
          <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-4">
            Most popular photos
          </p>
          {data.topPhotos.length === 0 ? (
            <p className="text-xs text-neutral-400">No photo engagement recorded yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {data.topPhotos.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={`/api/photos/serve?path=${encodeURIComponent(p.thumbnailPath || p.originalPath)}`}
                      alt={p.fileName}
                      className="w-9 h-9 object-cover rounded-sm border border-neutral-200 shrink-0"
                    />
                    <span className="text-xs text-neutral-800 truncate">{p.fileName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 shrink-0 tabular-nums">
                    <span>{p.views} views</span>
                    <span className="text-neutral-900 font-medium">{p.downloads} dl</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-neutral-200 rounded p-5 bg-white">
          <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-4">
            Photographer contributions
          </p>
          {data.contributors.length === 0 ? (
            <p className="text-xs text-neutral-400">No uploads yet.</p>
          ) : (
            <div className="space-y-3">
              {data.contributors.map((c) => {
                const pct =
                  data.totalPhotos > 0
                    ? Math.round((c.photoCount / data.totalPhotos) * 100)
                    : 0;
                return (
                  <div key={c.userId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-800 font-medium">{c.name}</span>
                      <span className="font-mono text-neutral-500 tabular-nums">
                        {c.photoCount} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.recentEvents.length > 0 && (
            <div className="mt-6 pt-5 border-t border-neutral-100">
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2.5">
                Recent events
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {data.recentEvents.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-neutral-700">{ev.eventType.toLowerCase().replace('_', ' ')}</span>
                    <span className="text-neutral-400">
                      {new Date(ev.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
