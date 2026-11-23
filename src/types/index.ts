export interface PhotoData {
  id: string;
  fileName: string;
  originalPath: string;
  thumbnailPath: string | null;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  faceProcessed: boolean;
  createdAt: string;
  occasionId: string;
  uploadedById: string;
}

export interface OccasionData {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  coverImage: string | null;
  isActive: boolean;
  createdAt: string;
  userId: string;
  _count?: {
    photos: number;
  };
}

export interface FaceMatchResult {
  photoId: string;
  distance: number;
  thumbnailUrl: string;
  originalUrl: string;
}
