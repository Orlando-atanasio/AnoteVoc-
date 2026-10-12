export interface PhotoTransform {
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  photo?: string;
  photoTransform?: PhotoTransform;
}

const PROFILE_KEY = 'anote_voce_profile_v1';

export const DEFAULT_TRANSFORM: PhotoTransform = { x: 0, y: 0, scale: 1, rotate: 0 };

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: '', phone: '', email: '' };
    const p = JSON.parse(raw) as Partial<UserProfile>;
    return {
      name: typeof p.name === 'string' ? p.name : '',
      phone: typeof p.phone === 'string' ? p.phone : '',
      email: typeof p.email === 'string' ? p.email : '',
      photo: typeof p.photo === 'string' ? p.photo : undefined,
      photoTransform:
        p.photoTransform && typeof p.photoTransform === 'object'
          ? {
              x: Number(p.photoTransform.x) || 0,
              y: Number(p.photoTransform.y) || 0,
              scale: Number(p.photoTransform.scale) || 1,
              rotate: Number(p.photoTransform.rotate) || 0,
            }
          : undefined,
    };
  } catch {
    return { name: '', phone: '', email: '' };
  }
}

export function saveProfile(profile: UserProfile): boolean {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

// Downscale to max 1024px JPEG so the photo never blows the quota (C1).
export function fileToPhotoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function canvasToPhotoDataUrl(source: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    source.toBlob((blob) => {
      if (!blob) {
        reject(new Error('capture'));
        return;
      }
      fileToPhotoDataUrl(new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
        .then(resolve)
        .catch(reject);
    }, 'image/jpeg', 0.92);
  });
}
