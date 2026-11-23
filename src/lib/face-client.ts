/**
 * Client-Side Face Recognition using face-api.js
 * Runs 100% inside the user's browser using WebGL / WASM.
 * 
 * Uses:
 * - TinyFaceDetector / SSD MobileNet v1 for face detection
 * - FaceLandmark68Net for 68-point facial landmark alignment
 * - FaceRecognitionNet (ResNet-34) for generating true 128-d FaceNet embeddings
 */

declare global {
  interface Window {
    faceapi: any;
  }
}

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadFaceApiScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.faceapi) return;

  return new Promise((resolve, reject) => {
    // Check if already in DOM
    const existing = document.querySelector('script[src="/face-api.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = '/face-api.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error('Failed to load /face-api.min.js: ' + err));
    document.head.appendChild(script);
  });
}

export async function loadFaceModels(onProgress?: (text: string) => void): Promise<void> {
  if (typeof window === 'undefined') return;
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    onProgress?.('Loading face recognition library...');
    await loadFaceApiScript();

    const faceapi = window.faceapi;
    if (!faceapi) {
      throw new Error('face-api.js failed to initialize');
    }

    onProgress?.('Loading AI neural network models...');
    const MODEL_URL = '/models';

    // Load TinyFaceDetector, Landmarks, and Face Recognition Net
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    onProgress?.('AI models loaded successfully');
  })();

  return loadPromise;
}

export interface DetectedFace {
  descriptor: number[];
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Detect all faces in an image element or canvas.
 * Returns array of detected faces with 128-d embeddings and bounding boxes.
 */
export async function detectAllFacesInImage(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<DetectedFace[]> {
  await loadFaceModels();
  const faceapi = window.faceapi;

  const width = imageSource.width || 640;
  const height = imageSource.height || 480;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.35,
  });

  const detections = await faceapi
    .detectAllFaces(imageSource, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  return detections.map((det: any) => {
    const box = det.detection.box;
    return {
      descriptor: Array.from(det.descriptor),
      box: {
        x: Math.max(0, box.x / width),
        y: Math.max(0, box.y / height),
        width: Math.min(1, box.width / width),
        height: Math.min(1, box.height / height),
      },
    };
  });
}

/**
 * Detect a single face from camera video or selfie canvas.
 * Returns the face embedding or null if no face is detected.
 */
export async function detectSingleFace(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<DetectedFace | null> {
  await loadFaceModels();
  const faceapi = window.faceapi;

  const width = (source as any).videoWidth || source.width || 640;
  const height = (source as any).videoHeight || source.height || 480;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.4,
  });

  const detection = await faceapi
    .detectSingleFace(source, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection) return null;

  const box = detection.detection.box;
  return {
    descriptor: Array.from(detection.descriptor),
    box: {
      x: Math.max(0, box.x / width),
      y: Math.max(0, box.y / height),
      width: Math.min(1, box.width / width),
      height: Math.min(1, box.height / height),
    },
  };
}

/**
 * Helper to load an image file into an HTMLImageElement for face extraction
 */
export function fileToImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
