// client/src/utils/imageUtils.js
// Helpers for client-side image resizing/thumbnail creation
export async function createThumbnail(file, maxSide = 200, quality = 0.8) {
  if (!file) return null;
  // Create image bitmap
  const img = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  // Convert to blob (jpeg fallback)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob;
}

const ImageUtils = { createThumbnail, createResizedImage };
export default ImageUtils;

// Resize a full image file to a maximum side (keeps aspect ratio) and return a Blob.
// Useful to constrain uploads so very large photos don't saturate bandwidth or memory.
export async function createResizedImage(file, maxSide = 1600, quality = 0.9) {
  if (!file) return null;
  // Reuse same logic as createThumbnail but with configurable size and mime fallback
  const img = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  // prefer original file type when supported, otherwise jpeg
  const mime = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  return blob;
}
