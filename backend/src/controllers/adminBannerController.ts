import { Request, Response } from 'express';
import { adminBannerService } from '../services/adminBannerService';
import { sendSuccess, sendError } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary, fetchAndUploadToCloudinary } from '../utils/cloudinary';

export const adminBannerController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const banners = await adminBannerService.getAll();
      sendSuccess(res, banners);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      let imageUrl: string | undefined;

      // If file is uploaded, upload to Cloudinary
      if (req.file) {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'banners',
          `banner-${Date.now()}`
        );
        imageUrl = uploadResult.secure_url;
      } 
      // If imageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.imageUrl && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
        // Check if it's already a Cloudinary URL
        if (req.body.imageUrl.includes('cloudinary.com')) {
          imageUrl = req.body.imageUrl;
        } else {
          // Fetch from URL and upload to Cloudinary
          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.imageUrl,
            'banners',
            `banner-${Date.now()}`
          );
          imageUrl = uploadResult.secure_url;
        }
      }

      if (!imageUrl) {
        return sendError(res, 'Image is required. Please select a file or provide an image URL.', 400);
      }

      const banner = await adminBannerService.create({
        title: req.body.title,
        description: req.body.description,
        imageUrl,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        sortOrder: parseInt(req.body.sortOrder) || 0,
      });
      sendSuccess(res, banner, 'Banner created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let imageUrl: string | undefined;

      // Get existing banner to delete old image if needed
      const existingBanner = await adminBannerService.getById(id);

      // Priority: new file > new URL > existing URL
      // If new file is uploaded, upload to Cloudinary
      if (req.file) {
        console.log('New file uploaded for banner update:', req.file.originalname);
        
        // Delete old image if it exists
        if (existingBanner?.imageUrl && existingBanner.imageUrl.includes('cloudinary.com')) {
          console.log('Deleting old banner image:', existingBanner.imageUrl);
          try {
            await deleteFromCloudinary(existingBanner.imageUrl);
            console.log('Old banner image deleted successfully');
          } catch (error) {
            console.error('Error deleting old image:', error);
            // Continue even if deletion fails
          }
        }

        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'banners',
          `banner-${Date.now()}`
        );
        imageUrl = uploadResult.secure_url;
        console.log('New banner image uploaded:', imageUrl);
      } 
      // If imageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.imageUrl && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
        // Check if it's already a Cloudinary URL
        if (req.body.imageUrl.includes('cloudinary.com')) {
          // If it's the same as existing, keep it (no change)
          if (req.body.imageUrl === existingBanner?.imageUrl) {
            imageUrl = req.body.imageUrl;
          } else {
            // New Cloudinary URL, delete old one if exists
            if (existingBanner?.imageUrl && existingBanner.imageUrl.includes('cloudinary.com')) {
              try {
                await deleteFromCloudinary(existingBanner.imageUrl);
              } catch (error) {
                console.error('Error deleting old image:', error);
              }
            }
            imageUrl = req.body.imageUrl;
          }
        } else {
          // External URL - fetch from URL and upload to Cloudinary
          // Delete old image first
          if (existingBanner?.imageUrl && existingBanner.imageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(existingBanner.imageUrl);
            } catch (error) {
              console.error('Error deleting old image:', error);
            }
          }

          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.imageUrl,
            'banners',
            `banner-${Date.now()}`
          );
          imageUrl = uploadResult.secure_url;
        }
      } else {
        // No new image provided - keep existing image
        imageUrl = existingBanner?.imageUrl;
      }

      const updateData: any = {
        title: req.body.title,
        description: req.body.description,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        sortOrder: parseInt(req.body.sortOrder) || 0,
      };
      
      if (imageUrl !== undefined) {
        updateData.imageUrl = imageUrl;
      }

      const banner = await adminBannerService.update(id, updateData);
      sendSuccess(res, banner, 'Banner updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get banner to delete image from Cloudinary
      const banner = await adminBannerService.getById(id);
      if (banner?.imageUrl) {
        try {
          await deleteFromCloudinary(banner.imageUrl);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
          // Continue even if deletion fails
        }
      }

      const result = await adminBannerService.delete(id);
      sendSuccess(res, result, 'Banner deleted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

