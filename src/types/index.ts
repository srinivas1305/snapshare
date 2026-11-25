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
  uploadedBy?: {
    id: string;
    name: string;
  };
}

export interface CollaboratorData {
  id: string;
  occasionId: string;
  userId: string | null;
  invitedEmail: string;
  role: string;
  status: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  } | null;
}

export interface OccasionData {
  id: string;
  name: string;
  description: string | null;
  date: string;
  accessCode: string;
  coverImage: string | null;
  isActive: boolean;
  brandName?: string | null;
  accentColor: string;
  logoUrl?: string | null;
  photographerBio?: string | null;
  slideshowEnabled: boolean;
  slideshowInterval: number;
  createdAt: string;
  userId: string;
  role?: 'OWNER' | 'EDITOR';
  ownerName?: string;
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
