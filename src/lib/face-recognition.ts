/**
 * Face Recognition Module for SnapShare
 * 
 * Uses a simple pixel-based face comparison approach that works without
 * external AI model dependencies. For production, integrate with a proper
 * face recognition API (AWS Rekognition, Google Vision, Azure Face API).
 * 
 * Current implementation:
 * - Detects faces using canvas-based skin tone detection
 * - Creates simplified face descriptors for matching
 * - Compares descriptors using euclidean distance
 * 
 * This module provides the interface that can be swapped with a real
 * face recognition backend.
 */

import sharp from 'sharp';
import crypto from 'crypto';

// Face descriptor is a 128-dimension float array stored as JSON string
export type FaceDescriptorData = {
  descriptor: number[];
  box: { x: number; y: number; width: number; height: number };
};

/**
 * Extract face region features from an image buffer.
 * This is a simplified approach using image analysis.
 * Returns color histogram + structural features as a descriptor.
 */
async function extractRegionFeatures(imageBuffer: Buffer, region?: { left: number; top: number; width: number; height: number }): Promise<number[]> {
  let processBuffer = imageBuffer;
  
  if (region) {
    processBuffer = await sharp(imageBuffer)
      .extract(region)
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer();
  } else {
    processBuffer = await sharp(imageBuffer)
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer();
  }

  // Create a 128-dimension descriptor from pixel data
  const descriptor: number[] = [];
  const pixelCount = processBuffer.length / 3;
  const blockSize = Math.floor(pixelCount / 32);

  // Extract 32 color histogram buckets for each channel (R, G, B) = 96 features
  for (let channel = 0; channel < 3; channel++) {
    for (let block = 0; block < 32; block++) {
      let sum = 0;
      let count = 0;
      const start = block * blockSize;
      const end = Math.min(start + blockSize, pixelCount);
      for (let i = start; i < end; i++) {
        sum += processBuffer[i * 3 + channel];
        count++;
      }
      descriptor.push(count > 0 ? sum / count / 255.0 : 0);
    }
  }

  // Add 32 structural features (edge detection approximation)
  const grayBuffer = await sharp(imageBuffer)
    .resize(64, 64, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();

  for (let block = 0; block < 32; block++) {
    let edgeSum = 0;
    let count = 0;
    const start = block * Math.floor(grayBuffer.length / 32);
    const end = Math.min(start + Math.floor(grayBuffer.length / 32), grayBuffer.length - 1);
    for (let i = start; i < end; i++) {
      edgeSum += Math.abs(grayBuffer[i] - grayBuffer[i + 1]);
      count++;
    }
    descriptor.push(count > 0 ? edgeSum / count / 255.0 : 0);
  }

  return descriptor.slice(0, 128);
}

/**
 * Detect face-like regions in an image using skin tone detection.
 * Returns bounding boxes of potential face regions.
 */
async function detectFaceRegions(imageBuffer: Buffer): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 640;
  const imgHeight = metadata.height || 480;

  // Resize for analysis
  const analysisWidth = 160;
  const analysisHeight = Math.round((imgHeight / imgWidth) * analysisWidth);
  
  const rawBuffer = await sharp(imageBuffer)
    .resize(analysisWidth, analysisHeight, { fit: 'fill' })
    .raw()
    .toBuffer();

  // Skin tone detection
  const skinMap: boolean[][] = [];
  for (let y = 0; y < analysisHeight; y++) {
    skinMap[y] = [];
    for (let x = 0; x < analysisWidth; x++) {
      const idx = (y * analysisWidth + x) * 3;
      const r = rawBuffer[idx];
      const g = rawBuffer[idx + 1];
      const b = rawBuffer[idx + 2];
      
      // Simple skin tone detection
      skinMap[y][x] = r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - g) > 15 &&
        Math.abs(r - g) > 15 &&
        r - b > 15;
    }
  }

  // Find connected regions of skin pixels using simple flood fill approximation
  const regions: Array<{ x: number; y: number; width: number; height: number }> = [];
  const visited = Array.from({ length: analysisHeight }, () => new Array(analysisWidth).fill(false));

  for (let y = 0; y < analysisHeight; y++) {
    for (let x = 0; x < analysisWidth; x++) {
      if (skinMap[y][x] && !visited[y][x]) {
        // BFS to find connected component
        let minX = x, maxX = x, minY = y, maxY = y;
        let pixelCount = 0;
        const queue: [number, number][] = [[x, y]];
        visited[y][x] = true;

        while (queue.length > 0) {
          const [cx, cy] = queue.shift()!;
          pixelCount++;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);

          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < analysisWidth && ny >= 0 && ny < analysisHeight &&
                !visited[ny][nx] && skinMap[ny][nx]) {
              visited[ny][nx] = true;
              queue.push([nx, ny]);
            }
          }
        }

        const regionWidth = maxX - minX;
        const regionHeight = maxY - minY;
        const area = regionWidth * regionHeight;
        const density = pixelCount / (area || 1);
        const aspectRatio = regionHeight / (regionWidth || 1);

        // Filter for face-like regions
        if (area > 100 && density > 0.3 && aspectRatio > 0.8 && aspectRatio < 2.0) {
          // Scale back to original image dimensions
          const scaleX = imgWidth / analysisWidth;
          const scaleY = imgHeight / analysisHeight;
          
          // Add some padding
          const pad = 0.3;
          const faceX = Math.max(0, (minX - regionWidth * pad) * scaleX);
          const faceY = Math.max(0, (minY - regionHeight * pad) * scaleY);
          const faceW = Math.min(imgWidth - faceX, regionWidth * (1 + 2 * pad) * scaleX);
          const faceH = Math.min(imgHeight - faceY, regionHeight * (1 + 2 * pad) * scaleY);

          regions.push({
            x: Math.round(faceX),
            y: Math.round(faceY),
            width: Math.round(faceW),
            height: Math.round(faceH),
          });
        }
      }
    }
  }

  // If no faces detected, return a center crop as fallback
  if (regions.length === 0) {
    const size = Math.min(imgWidth, imgHeight) * 0.5;
    regions.push({
      x: Math.round((imgWidth - size) / 2),
      y: Math.round((imgHeight - size) / 4), // bias toward top
      width: Math.round(size),
      height: Math.round(size),
    });
  }

  // Limit to top 10 largest regions
  return regions
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .slice(0, 10);
}

/**
 * Process an uploaded photo to extract face descriptors.
 * Returns array of face descriptors found in the image.
 */
export async function extractFaces(imageBuffer: Buffer): Promise<FaceDescriptorData[]> {
  try {
    const regions = await detectFaceRegions(imageBuffer);
    const faces: FaceDescriptorData[] = [];

    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 640;
    const imgHeight = metadata.height || 480;

    for (const region of regions) {
      try {
        // Ensure valid extraction region
        const left = Math.max(0, Math.min(region.x, imgWidth - 1));
        const top = Math.max(0, Math.min(region.y, imgHeight - 1));
        const width = Math.max(1, Math.min(region.width, imgWidth - left));
        const height = Math.max(1, Math.min(region.height, imgHeight - top));

        const descriptor = await extractRegionFeatures(imageBuffer, { left, top, width, height });
        
        faces.push({
          descriptor,
          box: {
            x: left / imgWidth,
            y: top / imgHeight,
            width: width / imgWidth,
            height: height / imgHeight,
          },
        });
      } catch (err) {
        console.error('Error extracting features for region:', err);
      }
    }

    return faces;
  } catch (error) {
    console.error('Error in face extraction:', error);
    return [];
  }
}

/**
 * Compare two face descriptors using Euclidean distance.
 * Returns distance (lower = more similar). Threshold ~0.6 for a match.
 */
export function compareDescriptors(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return Infinity;
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Find matching photos from a list of face descriptors.
 * Returns photo IDs that contain faces matching the selfie.
 */
export function findMatches(
  selfieDescriptor: number[],
  storedDescriptors: Array<{ photoId: string; descriptor: number[] }>,
  threshold: number = 0.6
): string[] {
  const matchedPhotoIds = new Set<string>();

  for (const stored of storedDescriptors) {
    const distance = compareDescriptors(selfieDescriptor, stored.descriptor);
    if (distance < threshold) {
      matchedPhotoIds.add(stored.photoId);
    }
  }

  return Array.from(matchedPhotoIds);
}
