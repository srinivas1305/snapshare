'use client';

import { useState } from 'react';
import { Download, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

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

interface PhotoGalleryProps {
  photos: Photo[];
  selectable?: boolean;
}

export default function PhotoGallery({ photos, selectable = true }: PhotoGalleryProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const toggleSelect = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => p.id)));
    }
  };

  const downloadSelected = () => {
    if (selectedPhotos.size === 0) return;
    
    if (selectedPhotos.size === 1) {
      const photoId = Array.from(selectedPhotos)[0];
      window.open(`/api/photos/download?id=${photoId}`, '_blank');
    } else {
      const ids = Array.from(selectedPhotos).join(',');
      window.open(`/api/photos/download?ids=${ids}`, '_blank');
    }
  };

  const downloadSingle = (photoId: string) => {
    window.open(`/api/photos/download?id=${photoId}`, '_blank');
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No photos yet</p>
        <p className="text-sm mt-1">Upload some photos to get started</p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection toolbar */}
      {selectable && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <button
              onClick={selectAll}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {selectedPhotos.size === photos.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedPhotos.size > 0 && (
              <span className="text-sm text-gray-500">
                {selectedPhotos.size} selected
              </span>
            )}
          </div>
          {selectedPhotos.size > 0 && (
            <button onClick={downloadSelected} className="btn-primary text-sm flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>
                Download {selectedPhotos.size === 1 ? '' : `(${selectedPhotos.size})`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
          >
            <img
              src={`/api/photos/serve?path=${encodeURIComponent(photo.thumbnailPath || photo.originalPath)}`}
              alt={photo.fileName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onClick={() => setLightboxIndex(index)}
            />

            {/* Selection checkbox */}
            {selectable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(photo.id);
                }}
                className={`absolute top-2 left-2 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPhotos.has(photo.id)
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {selectedPhotos.has(photo.id) && <Check className="h-3 w-3" />}
              </button>
            )}

            {/* Download button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadSingle(photo.id);
              }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <Download className="h-3.5 w-3.5" />
            </button>

            {/* File info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{photo.fileName}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-4 text-white/70 hover:text-white z-10"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-4 text-white/70 hover:text-white z-10"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          <img
            src={`/api/photos/serve?path=${encodeURIComponent(photos[lightboxIndex].originalPath)}&type=original`}
            alt={photos[lightboxIndex].fileName}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4">
            <span className="text-white/70 text-sm">
              {photos[lightboxIndex].fileName} • {formatFileSize(photos[lightboxIndex].fileSize)}
            </span>
            <button
              onClick={() => downloadSingle(photos[lightboxIndex!].id)}
              className="btn-primary text-sm flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>Download Original</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
