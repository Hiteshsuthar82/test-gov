import { Router } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(adminAuthMiddleware);

// Upload endpoint for images
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return sendError(res, 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.', 500);
    }

    const folder = req.body.folder || 'general';
    
    try {
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        folder,
        `${folder}-${Date.now()}`
      );

      if (!uploadResult.secure_url) {
        return sendError(res, 'Failed to get image URL from Cloudinary', 500);
      }

      sendSuccess(res, { url: uploadResult.secure_url }, 'Image uploaded successfully');
    } catch (cloudinaryError: any) {
        console.log("CLOUD_NAME : ", process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set', "API_KEY : ", process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set', "API_SECRET : ", process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set');
      console.error('Cloudinary upload error:', cloudinaryError);
      console.error('Error details:', {
        message: cloudinaryError.message,
        http_code: cloudinaryError.http_code,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set (hidden)' : 'Not set',
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set (hidden)' : 'Not set',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set (hidden)' : 'Not set',
      });
      return sendError(res, cloudinaryError.message || 'Cloudinary upload failed', 500);
    }
  } catch (error: any) {
    console.error('Upload endpoint error:', error);
    sendError(res, error.message || 'Upload failed', 500);
  }
});

export default router;

