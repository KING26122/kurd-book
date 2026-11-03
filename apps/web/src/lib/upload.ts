import { refreshAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mime: string;
  kind: 'image' | 'video' | 'audio' | 'file';
  encrypted: boolean;
}

export type UploadKind = 'avatar' | 'cover' | 'post' | 'story' | 'chat' | 'verification' | 'receipt';

function uploadOnce(
  file: File,
  kind: UploadKind,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/uploads?kind=${encodeURIComponent(kind)}`);
    xhr.withCredentials = true;
    const token = useAuthStore.getState().accessToken;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onerror = () => reject(new Error('پەیوەندی هەڵوەشایەوە لە کاتی ئەپلۆدکردن.'));
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data as UploadResult);
        return;
      }
      const error = (data as { error?: { message?: string } } | null)?.error;
      const err = new Error(error?.message || `ئەپلۆدکردن سەرکەوتوو نەبوو (${xhr.status}).`);
      (err as Error & { status?: number }).status = xhr.status;
      reject(err);
    };
    const form = new FormData();
    form.append('file', file, file.name || 'upload');
    xhr.send(form);
  });
}

export async function uploadFile(
  file: File,
  kind: UploadKind,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  try {
    return await uploadOnce(file, kind, onProgress);
  } catch (error) {
    if ((error as Error & { status?: number }).status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return uploadOnce(file, kind, onProgress);
    }
    throw error;
  }
}

export async function uploadBlob(
  blob: Blob,
  filename: string,
  kind: UploadKind,
  onProgress?: (percent: number) => void,
  mime = 'application/octet-stream',
): Promise<UploadResult> {
  const file = new File([blob], filename, { type: mime });
  return uploadFile(file, kind, onProgress);
}

export function fileKind(file: File): 'image' | 'video' | 'audio' | 'file' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

export async function mediaDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (file.type.startsWith('image/')) {
    try {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      return {};
    }
  }
  if (file.type.startsWith('video/')) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const dims = { width: video.videoWidth, height: video.videoHeight };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      video.src = url;
    });
  }
  return {};
}
