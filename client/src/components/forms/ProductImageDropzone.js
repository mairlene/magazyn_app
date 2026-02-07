import React, { useRef } from "react";

import { createThumbnail } from '../../utils/imageUtils';
import { resolveImageUrl } from '../../services/api';

export default function ProductImageDropzone({ image, setImage }) {
  const fileInputRef = useRef();
  const [previewError, setPreviewError] = React.useState(false);
  const [objectUrl, setObjectUrl] = React.useState(null);
  const objectUrlRef = useRef(null);

  React.useEffect(() => {
    setPreviewError(false);
    try {
      // log incoming image value and a best-effort preview src
      let info = { raw: image };
      try {
        if (typeof image === 'string') {
          const trimmed = image.trim();
          if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
            try { info.parsed = JSON.parse(trimmed); } catch (_) { info.parsed = null; }
          }
        }
      } catch (_) {}
      console.warn('[ProductImageDropzone] image prop changed', info);
    } catch (_) {}
    // Manage object URL lifecycle when `image` is a File/Blob
    // Revoke previously created object URL (tracked in ref) to avoid leaking
    try {
      if (objectUrlRef.current) {
        try { URL.revokeObjectURL(objectUrlRef.current); } catch (_) {}
        objectUrlRef.current = null;
        setObjectUrl(null);
      }
    } catch (_) {}

    if (image && (image instanceof File || image instanceof Blob || (typeof image === 'object' && image instanceof Object && image.size))) {
      try {
        const url = URL.createObjectURL(image);
        objectUrlRef.current = url;
        setObjectUrl(url);
      } catch (e) {
        objectUrlRef.current = null;
        setObjectUrl(null);
      }
    }

    return () => {
      if (objectUrlRef.current) {
        try { URL.revokeObjectURL(objectUrlRef.current); } catch (_) {}
        objectUrlRef.current = null;
      }
    };
  }, [image]);

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      // create a lightweight thumbnail for immediate preview to avoid loading huge image into DOM
      try {
        const thumb = await createThumbnail(file, 400, 0.8);
        // prefer using the thumbnail blob for preview; keep original file attached under _original if parent needs it
        const thumbFile = thumb ? new File([thumb], `thumb-${file.name}`, { type: thumb.type }) : file;
        thumbFile._original = file;
        setImage(thumbFile);
      } catch (err) {
        setImage(file);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      (async () => {
        try {
          const thumb = await createThumbnail(file, 400, 0.8);
          const thumbFile = thumb ? new File([thumb], `thumb-${file.name}`, { type: thumb.type }) : file;
          thumbFile._original = file;
          setImage(thumbFile);
        } catch (err) {
          setImage(file);
        }
      })();
    }
  };

  return (
    <div
      className="border-2 border-dashed border-gray-400 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative w-48 h-48 min-w-[192px] min-h-[192px] max-w-[192px] max-h-[192px]"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current.click()}
      style={{}}
    >
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {image ? (
        <div className="relative w-full h-full flex items-center justify-center p-1">
          {(!previewError && image) ? (() => {
            // Determine preview src robustly: image may be a string URL, a stringified JSON
            // object (common when API sanitized complex fields), or a File/Blob.
            let src = null;
            try {
              if (typeof image === 'string') {
                const trimmed = image.trim();
                if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
                  try {
                    const parsed = JSON.parse(trimmed);
                    // Common shapes: { thumbUrl, url } or { imageUrl, imageThumb } or array of urls
                    if (parsed) {
                      if (Array.isArray(parsed) && parsed.length) src = parsed[0];
                      else if (parsed.thumbUrl) src = parsed.thumbUrl;
                      else if (parsed.imageThumb) src = parsed.imageThumb;
                      else if (parsed.url) src = parsed.url;
                      else if (parsed.imageUrl) src = parsed.imageUrl;
                      else {
                        // fallback to first string value in object
                        const vals = Object.values(parsed).filter(v => typeof v === 'string');
                        if (vals.length) src = vals[0];
                        else src = trimmed;
                      }
                    }
                  } catch (e) {
                    src = trimmed;
                  }
                } else {
                  src = trimmed;
                }
                // resolve relative paths
                src = resolveImageUrl(src);
              } else if (image instanceof File || image instanceof Blob) {
                src = URL.createObjectURL(image);
              } else if (image && typeof image === 'object' && image.url) {
                src = resolveImageUrl(image.url);
              } else {
                // unknown type -> try string coercion
                src = resolveImageUrl(String(image));
              }
            } catch (err) {
              src = null;
            }

            if (!src) return (
              <div className="w-full h-full rounded-xl shadow bg-white border border-dashed border-gray-400 flex items-center justify-center">
                <span className="text-gray-500">Brak podglądu</span>
              </div>
            );

            // If we created an objectUrl for a File/Blob, prefer it (and keep src for logging)
            const finalSrc = objectUrl || src;
            return (
              <img
                src={finalSrc}
                alt="Podgląd zdjęcia"
                className="object-contain w-full h-full rounded-xl shadow bg-white"
                onError={(e) => {
                  try { console.error('[ProductImageDropzone] preview image load error', { src: e?.target?.src }); } catch (err) {}
                  setPreviewError(true);
                }}
              />
            );
          })() : (
            <div className="w-full h-full rounded-xl shadow bg-white border border-dashed border-gray-400 flex items-center justify-center">
              <span className="text-gray-500">Brak podglądu</span>
            </div>
          )}
          <span style={{ position: 'absolute', left: 8, bottom: 8, background: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: 10, opacity: 0.8 }}>
            Podgląd zdjęcia
          </span>
          <button
            type="button"
            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 rounded-full p-1 bg-white shadow"
            style={{ zIndex: 2 }}
            onClick={e => { e.stopPropagation(); setImage(null); }}
            aria-label="Usuń zdjęcie"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <span className="text-gray-500 flex items-center justify-center h-full w-full text-center">Przeciągnij lub wybierz zdjęcie produktu (max 200x200px, opcjonalne)</span>
      )}
    </div>
  );
}
