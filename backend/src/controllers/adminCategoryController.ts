import { Request, Response } from 'express';
import { adminCategoryService } from '../services/adminCategoryService';
import { sendSuccess, sendError } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary, fetchAndUploadToCloudinary } from '../utils/cloudinary';

export const adminCategoryController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await adminCategoryService.getAll(req.query as any);
      sendSuccess(res, result);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await adminCategoryService.getById(id);
      sendSuccess(res, category);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      let bannerImageUrl: string | undefined;

      // If file is uploaded, upload to Cloudinary
      if (req.file) {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'categories',
          `category-${Date.now()}`
        );
        bannerImageUrl = uploadResult.secure_url;
      } 
      // If bannerImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.bannerImageUrl && typeof req.body.bannerImageUrl === 'string' && req.body.bannerImageUrl.trim()) {
        // Check if it's already a Cloudinary URL
        if (req.body.bannerImageUrl.includes('cloudinary.com')) {
          bannerImageUrl = req.body.bannerImageUrl;
        } else {
          // Fetch from URL and upload to Cloudinary
          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.bannerImageUrl,
            'categories',
            `category-${Date.now()}`
          );
          bannerImageUrl = uploadResult.secure_url;
        }
      }

      const category = await adminCategoryService.create({
        name: req.body.name,
        description: req.body.description,
        bannerImageUrl: bannerImageUrl || undefined,
        price: parseFloat(req.body.price) || 0,
        details: req.body.details,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      });
      sendSuccess(res, category, 'Category created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let bannerImageUrl: string | undefined;

      // Get existing category to delete old image if needed
      const existingCategory = await adminCategoryService.getById(id);

      // Priority: new file > new URL > existing URL
      // If new file is uploaded, upload to Cloudinary
      if (req.file) {
        console.log('New file uploaded for category update:', req.file.originalname);
        
        // Delete old image if it exists
        if (existingCategory?.bannerImageUrl && existingCategory.bannerImageUrl.includes('cloudinary.com')) {
          console.log('Deleting old category image:', existingCategory.bannerImageUrl);
          try {
            await deleteFromCloudinary(existingCategory.bannerImageUrl);
            console.log('Old category image deleted successfully');
          } catch (error) {
            console.error('Error deleting old image:', error);
            // Continue even if deletion fails
          }
        }

        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'categories',
          `category-${Date.now()}`
        );
        bannerImageUrl = uploadResult.secure_url;
        console.log('New category image uploaded:', bannerImageUrl);
      } 
      // If bannerImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.bannerImageUrl && typeof req.body.bannerImageUrl === 'string' && req.body.bannerImageUrl.trim()) {
        // Check if it's already a Cloudinary URL
        if (req.body.bannerImageUrl.includes('cloudinary.com')) {
          // If it's the same as existing, keep it (no change)
          if (req.body.bannerImageUrl === existingCategory?.bannerImageUrl) {
            bannerImageUrl = req.body.bannerImageUrl;
          } else {
            // New Cloudinary URL, delete old one if exists
            if (existingCategory?.bannerImageUrl && existingCategory.bannerImageUrl.includes('cloudinary.com')) {
              try {
                await deleteFromCloudinary(existingCategory.bannerImageUrl);
              } catch (error) {
                console.error('Error deleting old image:', error);
              }
            }
            bannerImageUrl = req.body.bannerImageUrl;
          }
        } else {
          // External URL - fetch from URL and upload to Cloudinary
          // Delete old image first
          if (existingCategory?.bannerImageUrl && existingCategory.bannerImageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(existingCategory.bannerImageUrl);
            } catch (error) {
              console.error('Error deleting old image:', error);
            }
          }

          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.bannerImageUrl,
            'categories',
            `category-${Date.now()}`
          );
          bannerImageUrl = uploadResult.secure_url;
        }
      } else {
        // No new image provided - keep existing image
        bannerImageUrl = existingCategory?.bannerImageUrl;
      }

      const updateData: any = {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price) || 0,
        details: req.body.details,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      };
      
      if (bannerImageUrl !== undefined) {
        updateData.bannerImageUrl = bannerImageUrl || undefined;
      }

      const category = await adminCategoryService.update(id, updateData);
      sendSuccess(res, category, 'Category updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get category to delete image from Cloudinary
      const category = await adminCategoryService.getById(id);
      if (category?.bannerImageUrl) {
        try {
          await deleteFromCloudinary(category.bannerImageUrl);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
          // Continue even if deletion fails
        }
      }

      const result = await adminCategoryService.delete(id);
      sendSuccess(res, result, 'Category deactivated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },
};

