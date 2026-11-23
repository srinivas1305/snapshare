'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { loadFaceModels, detectSingleFace } from '@/lib/face-client';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob, descriptor?: number[]) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export default function CameraCapture({ onCapture, onCancel, loading = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [detectedDescriptor, setDetectedDescriptor] = useState<number[] | null>(null);
  const [detectingFace, setDetectingFace] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Pre-load AI models when camera component mounts
  useEffect(() => {
    loadFaceModels((status) => {
      setFaceDetectionStatus(status);
    })
      .then(() => {
        setModelsReady(true);
        setFaceDetectionStatus('AI Face Recognition Ready');
      })
      .catch((err) => {
        console.warn('Face models loading error:', err);
      });
  }, []);

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

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for selfie mode
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);

        // Run client-side AI face detection
        setDetectingFace(true);
        setFaceDetectionStatus('Scanning facial landmarks with AI...');

        try {
          const face = await detectSingleFace(canvas);
          if (face && face.descriptor && face.descriptor.length === 128) {
            setDetectedDescriptor(face.descriptor);
            setFaceDetectionStatus('Face identified with 68 facial landmarks');
          } else {
            setDetectedDescriptor(null);
            setFaceDetectionStatus('No clear face detected. Please retake facing the camera.');
          }
        } catch (err) {
          console.error('Client face detection error:', err);
          setFaceDetectionStatus(null);
        } finally {
          setDetectingFace(false);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setDetectedDescriptor(null);
    setFaceDetectionStatus(modelsReady ? 'AI Face Recognition Ready' : null);
  };

  const confirmCapture = () => {
    if (capturedBlob) {
      onCapture(capturedBlob, detectedDescriptor || undefined);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    retake();
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
            className="w-full max-w-md mx-auto rounded-xl shadow-md"
          />

          {/* AI Status Badge */}
          <div className="mt-3 text-center">
            {detectingFace && (
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Scanning facial features...</span>
              </div>
            )}
            {!detectingFace && detectedDescriptor && (
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-green-600" />
                <span>Face verified with neural network</span>
              </div>
            )}
            {!detectingFace && !detectedDescriptor && faceDetectionStatus && (
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>{faceDetectionStatus}</span>
              </div>
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-400" />
                <p className="text-sm font-medium">Matching your face against event photos...</p>
              </div>
            </div>
          )}

          {!loading && (
            <div className="flex justify-center space-x-3 mt-4">
              <button onClick={retake} className="btn-secondary flex items-center space-x-1">
                <RotateCcw className="h-4 w-4" />
                <span>Retake</span>
              </button>
              <button
                onClick={confirmCapture}
                disabled={detectingFace}
                className="btn-primary flex items-center space-x-1"
              >
                <Check className="h-4 w-4" />
                <span>Find My Photos</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative w-full max-w-md mx-auto rounded-xl overflow-hidden bg-gray-900 aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
            {/* Face alignment guide frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-60 border-2 border-dashed border-white/40 rounded-[50%] flex items-center justify-center">
                <span className="text-[10px] text-white/60 tracking-wider uppercase bg-black/30 px-2 py-0.5 rounded">
                  Align Face
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center space-x-4 mt-4">
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary p-3 rounded-full" title="Cancel">
                <X className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={capture}
              className="h-16 w-16 rounded-full bg-white border-4 border-primary-600 hover:border-primary-700 transition-transform active:scale-95 flex items-center justify-center shadow-lg"
              title="Take Photo"
            >
              <div className="h-12 w-12 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors" />
            </button>
            <button onClick={toggleCamera} className="btn-secondary p-3 rounded-full" title="Switch Camera">
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Position your face inside the oval and tap capture
          </p>
        </div>
      )}
    </div>
  );
}
