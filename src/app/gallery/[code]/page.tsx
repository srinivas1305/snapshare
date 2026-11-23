'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Camera, Scan, Image as ImageIcon, Loader2,
  Calendar, User, Download, AlertCircle
} from 'lucide-react';
import PhotoGallery from '@/components/PhotoGallery';
import CameraCapture from '@/components/CameraCapture';
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
  createdAt: string;
}

interface GalleryData {
  id: string;
  name: string;
  description: string | null;
  date: string;
  photographerName: string;
  photoCount: number;
  photos: Photo[];
}

type ViewMode = 'gallery' | 'face-scan' | 'face-results';

export default function GalleryPage() {
  const params = useParams();
  const code = params.code as string;
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [matchedPhotos, setMatchedPhotos] = useState<Photo[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    fetchGallery();
  }, [code]);

  const fetchGallery = async () => {
    try {
      const res = await fetch(`/api/gallery/${code}`);
      const data = await res.json();
      if (res.ok) {
        setGallery(data);
      } else {
        setError(data.error || 'Gallery not found');
      }
    } catch (err) {
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfieCapture = async (imageBlob: Blob, descriptor?: number[]) => {
    setMatchLoading(true);
    setMatchError(null);

    try {
      let res: Response;

      if (descriptor && descriptor.length === 128) {
        // High accuracy: send 128-d neural network face embedding directly
        res = await fetch('/api/face/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessCode: code,
            descriptor,
          }),
        });
      } else {
        // Fallback: send image blob
        const formData = new FormData();
        formData.append('selfie', imageBlob, 'selfie.jpg');
        formData.append('accessCode', code);

        res = await fetch('/api/face/match', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();

      if (res.ok) {
        setMatchedPhotos(data.matches);
        setViewMode('face-results');
      } else {
        setMatchError(data.error || 'Face matching failed');
      }
    } catch (err) {
      setMatchError('Failed to process face matching. Please try again.');
    } finally {
      setMatchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-4" />
        <p className="text-gray-500">Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Gallery Not Found</h1>
        <p className="text-gray-500 text-center">{error}</p>
      </div>
    );
  }

  if (!gallery) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Gallery Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{gallery.name}</h1>
        {gallery.description && (
          <p className="text-gray-500 mt-2">{gallery.description}</p>
        )}
        <div className="flex items-center justify-center space-x-4 mt-3 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(gallery.date)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>by {gallery.photographerName}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ImageIcon className="h-4 w-4" />
            <span>{gallery.photoCount} photos</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
        <button
          onClick={() => setViewMode('face-scan')}
          className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-medium transition-all ${
            viewMode === 'face-scan' || viewMode === 'face-results'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
              : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
          }`}
        >
          <Scan className="h-5 w-5" />
          <span>Find My Photos</span>
        </button>
        <button
          onClick={() => setViewMode('gallery')}
          className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-medium transition-all ${
            viewMode === 'gallery'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
              : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
          }`}
        >
          <ImageIcon className="h-5 w-5" />
          <span>Browse All Photos</span>
        </button>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'gallery' && (
        <PhotoGallery photos={gallery.photos} selectable={true} />
      )}

      {viewMode === 'face-scan' && (
        <div className="max-w-lg mx-auto">
          <div className="card">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Find Your Photos</h2>
              <p className="text-gray-500 text-sm mt-1">
                Take a quick selfie and our AI will find all photos you appear in
              </p>
            </div>

            {matchError && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{matchError}</p>
              </div>
            )}

            <CameraCapture
              onCapture={handleSelfieCapture}
              onCancel={() => setViewMode('gallery')}
              loading={matchLoading}
            />
          </div>
        </div>
      )}

      {viewMode === 'face-results' && (
        <div>
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
              <Scan className="h-5 w-5" />
              <span className="font-medium">
                Found {matchedPhotos.length} photo{matchedPhotos.length !== 1 ? 's' : ''} of you!
              </span>
            </div>
          </div>

          {matchedPhotos.length > 0 ? (
            <PhotoGallery photos={matchedPhotos} selectable={true} />
          ) : (
            <div className="text-center py-12 card max-w-lg mx-auto">
              <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-500 text-sm mb-6">
                We couldn&apos;t find photos matching your face. This could happen if the photos are still being processed or if lighting conditions differ.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setViewMode('face-scan')}
                  className="btn-primary text-sm"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className="btn-secondary text-sm"
                >
                  Browse All Photos
                </button>
              </div>
            </div>
          )}

          <div className="text-center mt-6">
            <button
              onClick={() => setViewMode('face-scan')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium mr-4"
            >
              Scan Again
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              View All Photos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
