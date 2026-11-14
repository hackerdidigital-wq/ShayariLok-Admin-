import type { GitHubSettings } from '../types/config';

export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB upload guard

export function validateImageFile(file: {
  type: string;
  size: number;
  name?: string;
}): { ok: true } | { ok: false; error: string } {
  const mime = (file.type || '').toLowerCase();
  const isImageMime = mime.startsWith('image/');
  const isImageExt = /\.(png|jpe?g|webp|gif)$/i.test(file.name || '');

  if (!isImageMime && !isImageExt) {
    return {
      ok: false,
      error: 'कृपया केवल JPG, PNG, या WebP फोटो चुनें।',
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: 'चुनी गई फ़ाइल खाली है।' };
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return {
      ok: false,
      error: 'फोटो का साइज 10 MB से कम होना चाहिए।',
    };
  }
  return { ok: true };
}

export function buildGitHubImageRepoPath(
  shayariId: number,
  ext = 'jpg',
  nowMs: number = Date.now(),
  configFilePath = 'config.json'
): string {
  const cleanId = Math.max(1, Math.trunc(shayariId));
  const cleanExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const normalizedConfigPath = configFilePath.trim().replace(/^\/+/, '');
  const lastSlash = normalizedConfigPath.lastIndexOf('/');
  const baseDir =
    lastSlash > 0 ? normalizedConfigPath.slice(0, lastSlash) : '';
  const folder = baseDir ? `${baseDir}/images` : 'images';
  return `${folder}/shayari-${cleanId}-${Math.trunc(nowMs)}.${cleanExt}`;
}

export function buildPublicGitHubImageUrls(
  settings: Pick<GitHubSettings, 'owner' | 'repo' | 'branch'>,
  repoImagePath: string
): { rawUrl: string; jsdelivrUrl: string } {
  const owner = encodeURIComponent(settings.owner.trim() || 'YOUR_GITHUB_USERNAME');
  const repo = encodeURIComponent(settings.repo.trim() || 'YOUR_CONFIG_REPO');
  const branch = encodeURIComponent(settings.branch.trim() || 'main');
  const cleanPath = repoImagePath.trim().replace(/^\/+/, '');

  return {
    rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`,
    jsdelivrUrl: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${cleanPath}`,
  };
}

export interface CompressedImageResult {
  base64: string;
  previewDataUrl: string;
  mimeType: string;
  ext: 'jpg' | 'png' | 'webp';
  byteSize: number;
  width: number;
  height: number;
}

export async function compressImageFileToBase64(
  file: File,
  maxWidth = 1080,
  quality = 0.82
): Promise<CompressedImageResult> {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Image Data URL read failed'));
      }
    };
    reader.onerror = () => reject(new Error('फोटो पढ़ने में त्रुटि हुई।'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('अमान्य या खराब फोटो फ़ाइल।'));
    el.src = dataUrl;
  });

  const srcWidth = img.naturalWidth || img.width || 1;
  const srcHeight = img.naturalHeight || img.height || 1;
  const scale = srcWidth > maxWidth ? maxWidth / srcWidth : 1;
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ब्राउज़र Canvas उपलब्ध नहीं है।');
  }

  // Fill white behind transparent PNG/WebP before JPEG encoding
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const previewDataUrl = canvas.toDataURL('image/jpeg', quality);
  const commaIdx = previewDataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? previewDataUrl.slice(commaIdx + 1) : '';
  const byteSize = Math.floor((base64.length * 3) / 4);

  return {
    base64,
    previewDataUrl,
    mimeType: 'image/jpeg',
    ext: 'jpg',
    byteSize,
    width,
    height,
  };
}
