export const REVIEW_PHOTO_BUCKET = "hike-reviews";
export const MAX_REVIEW_PHOTO_BYTES = 6 * 1024 * 1024;

export const REVIEW_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const REVIEW_PHOTO_ACCEPT = Object.keys(REVIEW_PHOTO_TYPES).join(",");

export function reviewPhotoError(file: { type: string; size: number }) {
  if (!(file.type in REVIEW_PHOTO_TYPES)) return "Photos must be JPEG, PNG, WebP, or GIF images.";
  if (file.size <= 0 || file.size > MAX_REVIEW_PHOTO_BYTES) return "Photos must be 6MB or smaller.";
  return null;
}

export function isOwnedReviewPhotoPath(path: string, hikerId: string) {
  const prefix = `reviews/${hikerId}/`;
  return path.startsWith(prefix) && /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(path.slice(prefix.length));
}
