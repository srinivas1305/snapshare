'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export default function CameraCapture({ onCapture, onCancel, loading = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(
        'Could not access camera. Please ensure camera permissions are granted.'
      );
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for selfie mode
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const confirmCapture = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  if (error) {
    return (
      <div className="text-center p-8 card">
        <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <div className="space-x-2">
          <button onClick={startCamera} className="btn-primary text-sm">
            Try Again
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      {capturedImage ? (
        <div className="relative">
          <img
            src={capturedImage}
            alt="Captured selfie"
            className="w-full max-w-md mx-auto rounded-xl"
          />
          {loading && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Finding your photos...</p>
              </div>
            </div>
          )}
          {!loading && (
            <div className="flex justify-center space-x-3 mt-4">
              <button onClick={retake} className="btn-secondary flex items-center space-x-1">
                <RotateCcw className="h-4 w-4" />
                <span>Retake</span>
              </button>
              <button onClick={confirmCapture} className="btn-primary flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Find My Photos</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full max-w-md mx-auto rounded-xl bg-gray-900 ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />
          <div className="flex justify-center space-x-3 mt-4">
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary">
                <X className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={capture}
              className="h-16 w-16 rounded-full bg-white border-4 border-primary-600 hover:border-primary-700 transition-colors flex items-center justify-center"
            >
              <div className="h-12 w-12 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors" />
            </button>
            <button onClick={toggleCamera} className="btn-secondary">
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Take a clear selfie to find your photos
          </p>
        </div>
      )}
    </div>
  );
}
