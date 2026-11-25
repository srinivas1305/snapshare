'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { loadFaceModels, detectSingleFace } from '@/lib/face-client';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob, descriptor?: number[]) => void;
  onCancel?: () => void;
  loading?: boolean;
  accentColor?: string;
}

export default function CameraCapture({
  onCapture,
  onCancel,
  loading = false,
  accentColor = '#18181b',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [faceStatus, setFaceStatus] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    loadFaceModels((s) => setFaceStatus(s))
      .then(() => {
        setModelsReady(true);
        setFaceStatus('Ready');
      })
      .catch(() => {});
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      stream?.getTracks().forEach((t) => t.stop());
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch {
      setError('Camera access denied. Check your browser permissions.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setDetecting(true);
        setFaceStatus('Extracting facial geometry...');
        try {
          const face = await detectSingleFace(canvas);
          if (face?.descriptor?.length === 128) {
            setDescriptor(face.descriptor);
            setFaceStatus('Face detected');
          } else {
            setDescriptor(null);
            setFaceStatus('No face detected — face the camera in clear light');
          }
        } catch {
          setFaceStatus(null);
        } finally {
          setDetecting(false);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setDescriptor(null);
    setFaceStatus(modelsReady ? 'Ready' : null);
  };

  const confirm = () => {
    if (capturedBlob) onCapture(capturedBlob, descriptor || undefined);
  };

  if (error) {
    return (
      <div className="border border-neutral-200 rounded p-6 text-center bg-white">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <div className="flex justify-center gap-2">
          <button onClick={startCamera} className="btn-primary text-xs">
            Try again
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn-secondary text-xs">
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
            className="w-full max-w-sm mx-auto rounded border border-neutral-200"
          />
          <div className="mt-3 text-center">
            {detecting && (
              <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                Detecting face...
              </span>
            )}
            {!detecting && descriptor && (
              <span className="text-[11px] font-mono text-green-700 uppercase tracking-wider">
                Face detected
              </span>
            )}
            {!detecting && !descriptor && faceStatus && (
              <span className="text-[11px] font-mono text-amber-700 uppercase tracking-wider">
                {faceStatus}
              </span>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 bg-neutral-950/70 rounded flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-mono">Matching photos...</p>
              </div>
            </div>
          )}
          {!loading && (
            <div className="flex justify-center gap-2.5 mt-4">
              <button onClick={retake} className="btn-secondary text-xs">
                Retake
              </button>
              <button
                onClick={confirm}
                disabled={detecting}
                className="text-white text-xs font-medium px-4 py-2 rounded transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: accentColor }}
              >
                Find my photos
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="relative w-full max-w-sm mx-auto rounded overflow-hidden bg-neutral-950 border border-neutral-200 aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-40 h-52 border border-dashed border-white/35 rounded-[50%]" />
            </div>
          </div>

          <div className="flex justify-center items-center gap-3 mt-4">
            {onCancel && (
              <button onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">
                Cancel
              </button>
            )}
            <button
              onClick={capture}
              className="w-12 h-12 rounded-full bg-white border-[3px] border-neutral-900 flex items-center justify-center active:scale-95 transition-transform"
              title="Take selfie"
            >
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            </button>
            <button
              onClick={() => {
                setFacing((p) => (p === 'user' ? 'environment' : 'user'));
                retake();
              }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Flip
            </button>
          </div>
          <p className="text-center text-[10px] font-mono text-neutral-400 mt-2 uppercase tracking-wider">
            Selfies are matched locally and never saved
          </p>
        </div>
      )}
    </div>
  );
}
