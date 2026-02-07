const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require('../lib/logger');

const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${Math.round(Math.random()*10000)}${ext}`;
    cb(null, name);
  },
});
// Configure upload limits and file filtering. Default max size controllable via env MAX_UPLOAD_SIZE_BYTES
const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES) || (5 * 1024 * 1024); // 5 MB default
const imageMimeRegex = /^image\//i;
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file || !file.mimetype) return cb(new Error('Invalid file'));
    if (!imageMimeRegex.test(file.mimetype)) return cb(new Error('Only image uploads are allowed'));
    cb(null, true);
  }
});

// Internal handler used after multer completes successfully
async function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  try {
    const url = `/uploads/${req.file.filename}`;

    // Try to create a thumbnail server-side if sharp is available
    let thumbUrl = null;
    try {
      const sharp = require('sharp');
      const filepath = path.join(uploadDir, req.file.filename);
      const thumbName = `thumb_${req.file.filename}`;
      const thumbPath = path.join(uploadDir, thumbName);
      await sharp(filepath).resize({ width: 400, height: 400, fit: 'inside' }).toFile(thumbPath);
      thumbUrl = `/uploads/${thumbName}`;
    } catch (e) {
      // sharp not installed or processing failed; ignore and continue
    }

    return res.json({ url, thumbUrl });
  } catch (e) {
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  }
}

// POST /api/upload - handle single file upload and return a relative URL
router.post("/", (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // MulterError or custom errors from fileFilter
      const code = err.code || '';
      if (code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
      return res.status(400).json({ error: err.message || 'Upload error' });
    }
    // proceed to handler
    handleUpload(req, res).catch((e) => {
      logger.error('[UPLOAD] handler error:', e && e.message ? e.message : e);
      res.status(500).json({ error: 'Upload processing failed' });
    });
  });
});

module.exports = router;
