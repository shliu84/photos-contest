export const MAX_PHOTOS = 5;
export const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export interface PhotoMeta {
  r2_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
}

export interface PhotoSlot {
  id: string;
  file: File | null;
  previewUrl: string | null;
  uploading: boolean;
  meta: PhotoMeta | null;
  taken_at: string;
  location: string;
  photo_title: string;
  photo_description: string;
}