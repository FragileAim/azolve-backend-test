const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { FILE_LIMITS } = require('../config/constants');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';

    if (FILE_LIMITS.ALLOWED_IMAGES.includes(file.mimetype)) {
      if (file.fieldname === 'avatar') {
        uploadPath += 'avatars/';
      } else if (file.fieldname === 'productImage') {
        uploadPath += 'products/';
      } else {
        uploadPath += 'documents/';
      }
    } else if (FILE_LIMITS.ALLOWED_VIDEOS.includes(file.mimetype)) {
      uploadPath += 'recordings/';
    } else {
      uploadPath += 'documents/';
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ...FILE_LIMITS.ALLOWED_IMAGES,
    ...FILE_LIMITS.ALLOWED_DOCS,
    ...FILE_LIMITS.ALLOWED_VIDEOS,
    ...FILE_LIMITS.ALLOWED_AUDIO,
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type '${file.mimetype}' is not allowed`), false);
  }
};

// Upload configurations
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_LIMITS.MAX_SIZE },
});

// Single file upload
const uploadSingle = (fieldName) => (req, res, next) => {
  const uploader = upload.single(fieldName);
  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => (req, res, next) => {
  const uploader = upload.array(fieldName, maxCount);
  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: `Maximum ${maxCount} files allowed` });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Get file URL from request
const getFileUrl = (req, file) => {
  if (!file) return '';
  const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
};

module.exports = { upload, uploadSingle, uploadMultiple, getFileUrl };