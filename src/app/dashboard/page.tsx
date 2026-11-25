'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Occasion {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  isActive: boolean;
  accentColor?: string;
  role?: 'OWNER' | 'EDITOR';
  ownerName?: string;
  createdAt: string;
  _count: { photos: number; collaborators?: number };
}

interface PendingInvite {
  id: string;
  occasionId: string;
  invitedEmail: string;
  role: string;
  occasion: {
    id: string;
    name: string;
    date: string;
    accessCode: string;
    user: { name: string; email: string };
    _count: { photos: number };
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const loadData = async () => {
    try {
      const [occRes, invRes] = await Promise.all([
        fetch('/api/occasions'),
        fetch('/api/collaborations'),
      ]);
      const occData = await occRes.json();
      const invData = await invRes.json();
      if (Array.isArray(occData)) setOccasions(occData);
      if (Array.isArray(invData)) setInvites(invData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  const respondInvite = async (collaboratorId: string, action: 'ACCEPT' | 'DECLINE') => {
    setRespondingId(collaboratorId);
    try {
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId, action }),
      });
      if (res.ok) await loadData();
    } finally {
      setRespondingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const totalPhotos = occasions.reduce((s, o) => s + o._count.photos, 0);
  const activeCount = occasions.filter((o) => o.isActive).length;
  const sharedCount = occasions.filter((o) => o.role === 'EDITOR').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Studio workspace
          </p>
          <h1 className="text-2xl font-display font-bold tracking-tighter text-neutral-900 mt-1">
            Occasions
          </h1>
        </div>
        <Link href="/occasions/new" className="btn-accent self-start sm:self-auto">
          New occasion
        </Link>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-neutral-200 rounded divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 mb-8 bg-white">
        <div className="p-4">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Total occasions</p>
          <p className="text-xl font-mono font-semibold text-neutral-900 mt-1 tabular-nums">{occasions.length}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Catalog photos</p>
          <p className="text-xl font-mono font-semibold text-neutral-900 mt-1 tabular-nums">{totalPhotos}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Active galleries</p>
          <p className="text-xl font-mono font-semibold text-neutral-900 mt-1 tabular-nums">{activeCount}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Shared with you</p>
          <p className="text-xl font-mono font-semibold text-neutral-900 mt-1 tabular-nums">{sharedCount}</p>
        </div>
      </div>

      {/* Pending Collaboration Invites */}
      {invites.length > 0 && (
        <div className="mb-8 border border-neutral-200 rounded bg-stone-50 p-4">
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-3">
            Pending team invitations ({invites.length})
          </p>
          <div className="divide-y divide-neutral-200">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">{inv.occasion.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Invited by {inv.occasion.user.name} · {formatDate(inv.occasion.date)} ·{' '}
                    <span className="font-mono">{inv.occasion._count.photos} photos</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => respondInvite(inv.id, 'DECLINE')}
                    disabled={respondingId === inv.id}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => respondInvite(inv.id, 'ACCEPT')}
                    disabled={respondingId === inv.id}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Accept invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Occasions Table / Ledger */}
      {occasions.length === 0 ? (
        <div className="border border-dashed border-neutral-200 rounded py-20 text-center">
          <p className="text-sm text-neutral-500">No occasions created or shared yet.</p>
          <Link href="/occasions/new" className="btn-primary mt-4 inline-block text-xs">
            Create your first occasion
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded divide-y divide-neutral-200 bg-white">
          {occasions.map((o) => (
            <div
              key={o.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-stone-50/70 transition-colors duration-150"
            >
              <Link href={`/occasions/${o.id}`} className="min-w-0 flex-1 group">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: o.accentColor || '#18181b' }}
                  />
                  <h3 className="text-sm font-medium text-neutral-900 group-hover:text-accent transition-colors duration-150 truncate">
                    {o.name}
                  </h3>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      o.isActive
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                    }`}
                  >
                    {o.isActive ? 'active' : 'closed'}
                  </span>
                  {o.role === 'EDITOR' && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-200 bg-stone-50 text-neutral-600">
                      collaborator · {o.ownerName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1 truncate">
                  {formatDate(o.date)}
                  {o.description && <> · {o.description}</>}
                </p>
              </Link>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span className="font-mono text-neutral-500 tabular-nums">
                  {o._count.photos} photos
                </span>
                <span className="font-mono text-neutral-400 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                  {o.accessCode}
                </span>
                <Link
                  href={`/gallery/${o.accessCode}`}
                  target="_blank"
                  className="text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Gallery ↗
                </Link>
                <Link
                  href={`/occasions/${o.id}`}
                  className="text-neutral-700 hover:text-neutral-950 font-medium transition-colors"
                >
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
