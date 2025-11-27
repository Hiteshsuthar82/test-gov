import multer from 'multer';
import path from 'path';

// Use memory storage to get file buffer for Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB default

export const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter,
});

