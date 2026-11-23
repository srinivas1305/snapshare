'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Calendar, Image, QrCode, Loader2, Camera } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Occasion {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  isActive: boolean;
  createdAt: string;
  _count: { photos: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchOccasions();
    }
  }, [session]);

  const fetchOccasions = async () => {
    try {
      const res = await fetch('/api/occasions');
      const data = await res.json();
      if (res.ok) {
        setOccasions(data);
      }
    } catch (error) {
      console.error('Error fetching occasions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {session.user?.name}</p>
        </div>
        <Link href="/occasions/new" className="btn-primary mt-4 sm:mt-0 inline-flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>New Occasion</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card flex items-center space-x-4">
          <div className="h-12 w-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{occasions.length}</p>
            <p className="text-sm text-gray-500">Occasions</p>
          </div>
        </div>
        <div className="card flex items-center space-x-4">
          <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Image className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {occasions.reduce((sum, o) => sum + o._count.photos, 0)}
            </p>
            <p className="text-sm text-gray-500">Total Photos</p>
          </div>
        </div>
        <div className="card flex items-center space-x-4">
          <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <QrCode className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {occasions.filter((o) => o.isActive).length}
            </p>
            <p className="text-sm text-gray-500">Active Galleries</p>
          </div>
        </div>
      </div>

      {/* Occasions List */}
      {occasions.length === 0 ? (
        <div className="card text-center py-16">
          <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No occasions yet</h3>
          <p className="text-gray-500 mb-6">Create your first occasion to start uploading photos</p>
          <Link href="/occasions/new" className="btn-primary inline-flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Create Occasion</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {occasions.map((occasion) => (
            <Link
              key={occasion.id}
              href={`/occasions/${occasion.id}`}
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {occasion.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    occasion.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {occasion.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {occasion.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{occasion.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(occasion.date)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Image className="h-4 w-4" />
                  <span>{occasion._count.photos} photos</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Code: <span className="font-mono font-medium text-primary-600">{occasion.accessCode}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
