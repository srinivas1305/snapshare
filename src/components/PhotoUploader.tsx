'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
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
    const newFiles = acceptedFiles.map((file) => ({ file, status: 'pending' as const }));
    setFiles((prev) => [...prev, ...newFiles]);
    loadFaceModels().catch(() => {});
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/tiff': ['.tiff', '.tif'] },
    maxSize: 52428800,
  });

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const uploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const batchSize = 3;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const formData = new FormData();
      formData.append('occasionId', occasionId);

      for (let j = 0; j < batch.length; j++) {
        const fileObj = batch[j];
        const idx = i + j;
        if (fileObj.status !== 'pending') continue;
        formData.append('photos', fileObj.file);

        setFiles((prev) => prev.map((f, k) => k === idx ? { ...f, status: 'scanning' as const } : f));
        setStatusText(`Detecting faces in ${fileObj.file.name}...`);

        try {
          const img = await fileToImageElement(fileObj.file);
          const faces = await detectAllFacesInImage(img);
          if (faces.length > 0) formData.append(`faces_${fileObj.file.name}`, JSON.stringify(faces));
          setFiles((prev) => prev.map((f, k) => k === idx ? { ...f, status: 'uploading' as const, faceCount: faces.length } : f));
        } catch {
          setFiles((prev) => prev.map((f, k) => k === idx ? { ...f, status: 'uploading' as const } : f));
        }
      }

      setStatusText(`Uploading batch ${Math.floor(i / batchSize) + 1}...`);

      try {
        const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
        if (res.ok) {
          setFiles((prev) => prev.map((f, k) =>
            k >= i && k < i + batchSize && (f.status === 'uploading' || f.status === 'scanning')
              ? { ...f, status: 'success' as const } : f
          ));
        } else {
          const data = await res.json();
          setFiles((prev) => prev.map((f, k) =>
            k >= i && k < i + batchSize && (f.status === 'uploading' || f.status === 'scanning')
              ? { ...f, status: 'error' as const, error: data.error } : f
          ));
        }
      } catch {
        setFiles((prev) => prev.map((f, k) =>
          k >= i && k < i + batchSize && (f.status === 'uploading' || f.status === 'scanning')
            ? { ...f, status: 'error' as const, error: 'Upload failed' } : f
        ));
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
        className={`border border-dashed rounded p-8 text-center cursor-pointer transition-colors duration-150 ${
          isDragActive ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-sm text-neutral-900 font-medium">Drop photos here</p>
        ) : (
          <>
            <p className="text-sm text-neutral-600">Drag photos here or click to browse</p>
            <p className="text-xs text-neutral-400 mt-1">JPG, PNG, WebP, TIFF — up to 50 MB each</p>
            <p className="text-[10px] font-mono text-neutral-300 mt-2 uppercase tracking-wide">
              Face detection runs automatically on upload
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">{files.length} file{files.length !== 1 ? 's' : ''} · {successCount} uploaded</p>
              {statusText && <p className="text-[10px] font-mono text-accent mt-0.5">{statusText}</p>}
            </div>
            <div className="flex gap-2">
              {successCount > 0 && successCount === files.length && (
                <button onClick={() => setFiles([])} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Clear</button>
              )}
              {pendingCount > 0 && (
                <button onClick={uploadFiles} disabled={uploading} className="btn-primary text-xs py-1.5 px-3">
                  {uploading ? 'Processing...' : `Upload ${pendingCount}`}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-px">
            {files.map((f, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-neutral-50 transition-colors duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    f.status === 'success' ? 'bg-green-500' :
                    f.status === 'error' ? 'bg-red-500' :
                    f.status === 'scanning' || f.status === 'uploading' ? 'bg-amber-400 animate-pulse' :
                    'bg-neutral-300'
                  }`} />
                  <span className="text-neutral-700 truncate">{f.file.name}</span>
                  <span className="text-neutral-300 font-mono shrink-0">{formatFileSize(f.file.size)}</span>
                  {f.faceCount !== undefined && (
                    <span className="text-neutral-400 font-mono shrink-0">{f.faceCount} face{f.faceCount === 1 ? '' : 's'}</span>
                  )}
                </div>
                {f.status === 'pending' && (
                  <button onClick={() => removeFile(index)} className="text-neutral-300 hover:text-neutral-500 ml-2 transition-colors">×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
