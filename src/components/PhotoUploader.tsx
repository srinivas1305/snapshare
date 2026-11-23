'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { fileToImageElement, detectAllFacesInImage, loadFaceModels } from '@/lib/face-client';

interface UploadedFile {
  file: File;
  status: 'pending' | 'scanning' | 'uploading' | 'success' | 'error';
  faceCount?: number;
  error?: string;
}

interface PhotoUploaderProps {
  occasionId: string;
  onUploadComplete?: () => void;
}

export default function PhotoUploader({ occasionId, onUploadComplete }: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      status: 'pending' as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);

    // Preload face models in background
    loadFaceModels().catch(() => {});
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

    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const formData = new FormData();
      formData.append('occasionId', occasionId);

      // Step 1: Scan faces in each photo using client AI
      for (let j = 0; j < batch.length; j++) {
        const fileObj = batch[j];
        const overallIndex = i + j;

        if (fileObj.status !== 'pending') continue;

        formData.append('photos', fileObj.file);

        // Update status to scanning
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === overallIndex ? { ...f, status: 'scanning' as const } : f
          )
        );
        setStatusText(`Scanning faces in ${fileObj.file.name}...`);

        try {
          const img = await fileToImageElement(fileObj.file);
          const faces = await detectAllFacesInImage(img);

          if (faces.length > 0) {
            formData.append(`faces_${fileObj.file.name}`, JSON.stringify(faces));
          }

          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === overallIndex
                ? { ...f, status: 'uploading' as const, faceCount: faces.length }
                : f
            )
          );
        } catch (err) {
          console.warn('Face scan failed, uploading photo without client embeddings:', err);
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === overallIndex ? { ...f, status: 'uploading' as const } : f
            )
          );
        }
      }

      setStatusText(`Uploading batch ${Math.floor(i / batchSize) + 1}...`);

      try {
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx >= i && idx < i + batchSize && (f.status === 'uploading' || f.status === 'scanning')
                ? { ...f, status: 'success' as const }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx >= i && idx < i + batchSize && (f.status === 'uploading' || f.status === 'scanning')
                ? { ...f, status: 'error' as const, error: data.error }
                : f
            )
          );
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx >= i && idx < i + batchSize && (f.status === 'uploading' || f.status === 'scanning')
              ? { ...f, status: 'error' as const, error: 'Upload failed' }
              : f
          )
        );
      }
    }

    setStatusText(null);
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
            <div className="flex items-center justify-center space-x-1 mt-2 text-xs text-primary-600 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Automatic AI Face Detection Enabled</span>
            </div>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {files.length} file(s) • {successCount} uploaded
              </p>
              {statusText && (
                <p className="text-xs text-primary-600 mt-0.5 animate-pulse font-medium">
                  {statusText}
                </p>
              )}
            </div>
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
                      Processing AI...
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
                  {f.status === 'scanning' && <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />}
                  {f.status === 'uploading' && <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />}
                  {f.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {f.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm text-gray-700 truncate">{f.file.name}</span>
                  <span className="text-xs text-gray-400">{formatFileSize(f.file.size)}</span>
                  {f.faceCount !== undefined && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {f.faceCount} face{f.faceCount === 1 ? '' : 's'} found
                    </span>
                  )}
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
