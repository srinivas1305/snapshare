'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface PhotoUploaderProps {
  occasionId: string;
  onUploadComplete?: () => void;
}

export default function PhotoUploader({ occasionId, onUploadComplete }: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxSize: 52428800, // 50MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true);

    // Upload in batches of 5
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const formData = new FormData();
      formData.append('occasionId', occasionId);
      
      batch.forEach((f) => {
        if (f.status === 'pending') {
          formData.append('photos', f.file);
        }
      });

      // Update status to uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx >= i && idx < i + batchSize && f.status === 'pending'
            ? { ...f, status: 'uploading' as const }
            : f
        )
      );

      try {
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx >= i && idx < i + batchSize && f.status === 'uploading'
                ? { ...f, status: 'success' as const }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx >= i && idx < i + batchSize && f.status === 'uploading'
                ? { ...f, status: 'error' as const, error: data.error }
                : f
            )
          );
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx >= i && idx < i + batchSize && f.status === 'uploading'
              ? { ...f, status: 'error' as const, error: 'Upload failed' }
              : f
          )
        );
      }
    }

    setUploading(false);
    onUploadComplete?.();
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-primary-600 font-medium">Drop photos here...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Drag & drop photos here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <p className="text-gray-400 text-xs mt-2">
              Supports JPEG, PNG, WebP, TIFF • Max 50MB per file
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {files.length} file(s) • {successCount} uploaded
            </p>
            <div className="space-x-2">
              {successCount > 0 && successCount === files.length && (
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="btn-primary text-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="inline h-4 w-4 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${pendingCount} photo(s)`
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {files.map((f, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {f.status === 'pending' && <div className="h-4 w-4 rounded-full bg-gray-300" />}
                  {f.status === 'uploading' && <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />}
                  {f.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {f.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm text-gray-700 truncate">{f.file.name}</span>
                  <span className="text-xs text-gray-400">{formatFileSize(f.file.size)}</span>
                </div>
                {f.status === 'pending' && (
                  <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
