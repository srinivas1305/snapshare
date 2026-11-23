'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, QrCode, Upload, Image, Trash2,
  Loader2, Calendar, AlertCircle
} from 'lucide-react';
import PhotoUploader from '@/components/PhotoUploader';
import PhotoGallery from '@/components/PhotoGallery';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { formatDate } from '@/lib/utils';

interface Photo {
  id: string;
  fileName: string;
  thumbnailPath: string | null;
  originalPath: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  faceProcessed: boolean;
  createdAt: string;
}

interface Occasion {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  isActive: boolean;
  photos: Photo[];
  _count: { photos: number };
}

export default function OccasionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'photos' | 'upload' | 'qr'>('photos');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session) {
      fetchOccasion();
    }
  }, [session, params.id]);

  const fetchOccasion = async () => {
    try {
      const res = await fetch(`/api/occasions/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setOccasion(data);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching occasion:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteOccasion = async () => {
    if (!confirm('Are you sure you want to delete this occasion and all its photos?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/occasions/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error deleting occasion:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!occasion) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{occasion.name}</h1>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(occasion.date)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Image className="h-4 w-4" />
                <span>{occasion._count.photos} photos</span>
              </div>
              <span className="font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                {occasion.accessCode}
              </span>
            </div>
          </div>
          <button
            onClick={deleteOccasion}
            disabled={deleting}
            className="btn-danger mt-4 sm:mt-0 inline-flex items-center space-x-1 text-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          {[
            { id: 'photos' as const, label: 'Photos', icon: Image },
            { id: 'upload' as const, label: 'Upload', icon: Upload },
            { id: 'qr' as const, label: 'QR Code', icon: QrCode },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'photos' && (
        <PhotoGallery photos={occasion.photos} selectable={true} />
      )}

      {activeTab === 'upload' && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Photos</h2>
          <PhotoUploader
            occasionId={occasion.id}
            onUploadComplete={() => {
              fetchOccasion();
              setActiveTab('photos');
            }}
          />
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Share this QR Code
          </h2>
          <div className="card">
            <QRCodeDisplay occasionId={occasion.id} />
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            Print this QR code or display it at your event. Guests can scan it to access the gallery and find their photos.
          </p>
        </div>
      )}
    </div>
  );
}
