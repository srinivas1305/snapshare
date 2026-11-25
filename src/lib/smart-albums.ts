import prisma from '@/lib/prisma';

export interface SmartAlbumPerson {
  id: string;
  albumId: string | null;
  name: string;
  photoIds: string[];
  photoCount: number;
  coverPhotoId: string;
  coverThumbnailPath: string | null;
  coverOriginalPath: string;
  faceBox: { x: number; y: number; width: number; height: number };
  centroid: number[];
  isNamed: boolean;
}

export interface SmartAlbumCategory {
  id: string;
  name: string;
  description: string;
  photoIds: string[];
  photoCount: number;
}

export interface SmartAlbumsPayload {
  people: SmartAlbumPerson[];
  categories: SmartAlbumCategory[];
  totalFaceCount: number;
}

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function averageDescriptor(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const len = vectors[0].length;
  const avg = new Array<number>(len).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < len; i++) {
      avg[i] += vec[i];
    }
  }
  for (let i = 0; i < len; i++) {
    avg[i] /= vectors.length;
  }
  return avg;
}

/**
 * Group an occasion's photos into Smart Albums using stored 128-d FaceNet embeddings,
 * saved custom person names, and composition heuristics (Portraits vs Group Shots).
 */
export async function buildSmartAlbums(occasionId: string): Promise<SmartAlbumsPayload> {
  const [photos, savedAlbums] = await Promise.all([
    prisma.photo.findMany({
      where: { occasionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        thumbnailPath: true,
        originalPath: true,
        faceProcessed: true,
        faceDescriptors: {
          select: {
            id: true,
            descriptor: true,
            x: true,
            y: true,
            width: true,
            height: true,
          },
        },
      },
    }),
    prisma.smartAlbum.findMany({
      where: { occasionId, type: 'PERSON' },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const photoMap = new Map(photos.map((p) => [p.id, p]));

  interface ParsedFace {
    id: string;
    photoId: string;
    vec: number[];
    box: { x: number; y: number; width: number; height: number };
    area: number;
  }

  const allFaces: ParsedFace[] = [];
  for (const photo of photos) {
    for (const fd of photo.faceDescriptors) {
      try {
        const vec = JSON.parse(fd.descriptor) as number[];
        if (Array.isArray(vec) && vec.length === 128) {
          allFaces.push({
            id: fd.id,
            photoId: photo.id,
            vec,
            box: { x: fd.x, y: fd.y, width: fd.width, height: fd.height },
            area: fd.width * fd.height,
          });
        }
      } catch {
        // Ignore malformed descriptors
      }
    }
  }

  interface Cluster {
    albumId: string | null;
    name: string;
    isNamed: boolean;
    faces: ParsedFace[];
    photoIds: Set<string>;
    centroid: number[];
  }

  const clusters: Cluster[] = [];
  const ASSIGN_THRESHOLD = 0.56;

  // 1. Seed clusters from saved named SmartAlbums first
  for (const saved of savedAlbums) {
    let centroid: number[] | null = null;
    if (saved.centroidDescriptor) {
      try {
        const parsed = JSON.parse(saved.centroidDescriptor) as number[];
        if (Array.isArray(parsed) && parsed.length === 128) {
          centroid = parsed;
        }
      } catch { /* ignore */ }
    }
    if (!centroid && saved.faceDescriptorId) {
      const refFace = allFaces.find((f) => f.id === saved.faceDescriptorId);
      if (refFace) centroid = refFace.vec;
    }

    if (centroid) {
      clusters.push({
        albumId: saved.id,
        name: saved.name,
        isNamed: true,
        faces: [],
        photoIds: new Set<string>(),
        centroid,
      });
    }
  }

  // Sort faces largest-first so clear front-facing portraits seed clean centroids
  const sortedFaces = [...allFaces].sort((a, b) => b.area - a.area);

  for (const face of sortedFaces) {
    let bestCluster: Cluster | null = null;
    let bestDist = Infinity;

    for (const cluster of clusters) {
      // Avoid putting two different faces from the exact same photo into one person cluster
      if (cluster.photoIds.has(face.photoId)) continue;
      const dist = euclideanDistance(face.vec, cluster.centroid);
      if (dist <= ASSIGN_THRESHOLD && dist < bestDist) {
        bestDist = dist;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.faces.push(face);
      bestCluster.photoIds.add(face.photoId);
      // Keep named centroids stable unless unseeded, refine auto centroids
      if (!bestCluster.isNamed) {
        bestCluster.centroid = averageDescriptor(bestCluster.faces.map((f) => f.vec));
      }
    } else {
      clusters.push({
        albumId: null,
        name: '',
        isNamed: false,
        faces: [face],
        photoIds: new Set([face.photoId]),
        centroid: face.vec,
      });
    }
  }

  // Filter: keep all named clusters with >=1 photo, plus auto clusters with >=2 photos
  // If no auto cluster has >=2 photos yet (small event), keep top distinct single-face clusters
  const multiPhotoClusters = clusters.filter((c) => c.isNamed ? c.photoIds.size > 0 : c.photoIds.size >= 2);
  const selectedClusters =
    multiPhotoClusters.length > 0
      ? multiPhotoClusters
      : clusters.filter((c) => c.photoIds.size > 0).slice(0, 8);

  selectedClusters.sort((a, b) => {
    if (a.isNamed !== b.isNamed) return a.isNamed ? -1 : 1;
    return b.photoIds.size - a.photoIds.size;
  });

  let autoNumber = 1;
  const people: SmartAlbumPerson[] = [];

  for (const cluster of selectedClusters.slice(0, 16)) {
    if (cluster.faces.length === 0) continue;
    // Choose the largest/clearest face crop as cover portrait
    const coverFace = [...cluster.faces].sort((a, b) => b.area - a.area)[0];
    const coverPhoto = photoMap.get(coverFace.photoId);
    if (!coverPhoto) continue;

    const label = cluster.name || `Person ${autoNumber++}`;
    people.push({
      id: cluster.albumId || `cluster_${coverFace.id}`,
      albumId: cluster.albumId,
      name: label,
      photoIds: Array.from(cluster.photoIds),
      photoCount: cluster.photoIds.size,
      coverPhotoId: coverPhoto.id,
      coverThumbnailPath: coverPhoto.thumbnailPath,
      coverOriginalPath: coverPhoto.originalPath,
      faceBox: coverFace.box,
      centroid: cluster.centroid,
      isNamed: cluster.isNamed,
    });
  }

  // Curated smart categories from face counts
  const portraitIds = photos
    .filter((p) => p.faceDescriptors.length === 1 || p.faceDescriptors.length === 2)
    .map((p) => p.id);
  const groupIds = photos
    .filter((p) => p.faceDescriptors.length >= 3)
    .map((p) => p.id);
  const scenicIds = photos
    .filter((p) => p.faceProcessed && p.faceDescriptors.length === 0)
    .map((p) => p.id);

  const categories: SmartAlbumCategory[] = [];
  if (portraitIds.length > 0) {
    categories.push({
      id: 'cat_portraits',
      name: 'Portraits & Couples',
      description: '1–2 faces detected',
      photoIds: portraitIds,
      photoCount: portraitIds.length,
    });
  }
  if (groupIds.length > 0) {
    categories.push({
      id: 'cat_groups',
      name: 'Group Shots',
      description: '3+ people together',
      photoIds: groupIds,
      photoCount: groupIds.length,
    });
  }
  if (scenicIds.length > 0) {
    categories.push({
      id: 'cat_moments',
      name: 'Details & Venue',
      description: 'Atmosphere & candid scenes',
      photoIds: scenicIds,
      photoCount: scenicIds.length,
    });
  }

  return {
    people,
    categories,
    totalFaceCount: allFaces.length,
  };
}
