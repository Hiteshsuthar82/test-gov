import { Request, Response } from 'express';
import { adminQuestionService } from '../services/adminQuestionService';
import { sendSuccess, sendError } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary, fetchAndUploadToCloudinary } from '../utils/cloudinary';

export const adminQuestionController = {
  getByTestSet: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const questions = await adminQuestionService.getByTestSet(setId);
      sendSuccess(res, questions);
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const question = await adminQuestionService.getById(id);
      sendSuccess(res, question);
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      // When using upload.any(), files come as an array, not an object
      const files = (req.files as Express.Multer.File[]) || [];
      
      // Helper function to find file by fieldname
      const getFileByFieldname = (fieldname: string): Express.Multer.File | undefined => {
        return files.find(f => f.fieldname === fieldname);
      };
      
      // Helper function to get all files with fieldname starting with prefix
      const getFilesByPrefix = (prefix: string): Express.Multer.File[] => {
        return files.filter(f => f.fieldname.startsWith(prefix)).sort((a, b) => 
          a.fieldname.localeCompare(b.fieldname)
        );
      };
      
      let directionImageUrl: string | undefined;
      let questionImageUrl: string | undefined;
      let conclusionImageUrl: string | undefined;
      let explanationImageUrls: string[] = [];

      // Upload direction image if file provided
      const directionImageFile = getFileByFieldname('directionImage');
      if (directionImageFile) {
        const uploadResult = await uploadToCloudinary(
          directionImageFile.buffer,
          'questions',
          `direction-${Date.now()}`
        );
        directionImageUrl = uploadResult.secure_url;
      } 
      // If directionImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.directionImageUrl && typeof req.body.directionImageUrl === 'string' && req.body.directionImageUrl.trim()) {
        if (req.body.directionImageUrl.includes('cloudinary.com')) {
          directionImageUrl = req.body.directionImageUrl;
        } else {
          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.directionImageUrl,
            'questions',
            `direction-${Date.now()}`
          );
          directionImageUrl = uploadResult.secure_url;
        }
      }

      // Upload question image if file provided
      const questionImageFile = getFileByFieldname('questionImage');
      if (questionImageFile) {
        const uploadResult = await uploadToCloudinary(
          questionImageFile.buffer,
          'questions',
          `question-${Date.now()}`
        );
        questionImageUrl = uploadResult.secure_url;
      } 
      // If questionImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.questionImageUrl && typeof req.body.questionImageUrl === 'string' && req.body.questionImageUrl.trim()) {
        if (req.body.questionImageUrl.includes('cloudinary.com')) {
          questionImageUrl = req.body.questionImageUrl;
        } else {
          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.questionImageUrl,
            'questions',
            `question-${Date.now()}`
          );
          questionImageUrl = uploadResult.secure_url;
        }
      }

      // Upload conclusion image if file provided
      const conclusionImageFile = getFileByFieldname('conclusionImage');
      if (conclusionImageFile) {
        const uploadResult = await uploadToCloudinary(
          conclusionImageFile.buffer,
          'questions',
          `conclusion-${Date.now()}`
        );
        conclusionImageUrl = uploadResult.secure_url;
      } 
      // If conclusionImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.conclusionImageUrl && typeof req.body.conclusionImageUrl === 'string' && req.body.conclusionImageUrl.trim()) {
        if (req.body.conclusionImageUrl.includes('cloudinary.com')) {
          conclusionImageUrl = req.body.conclusionImageUrl;
        } else {
          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.conclusionImageUrl,
            'questions',
            `conclusion-${Date.now()}`
          );
          conclusionImageUrl = uploadResult.secure_url;
        }
      }

      // Handle multiple explanation images
      // First, handle files (explanationImage_0, explanationImage_1, etc.)
      const explanationImageFiles = getFilesByPrefix('explanationImage_');
      
      for (const file of explanationImageFiles) {
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          'questions',
          `explanation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        );
        explanationImageUrls.push(uploadResult.secure_url);
      }

      // Then, handle URLs (from explanationImageUrls JSON string or array)
      let explanationImageUrlsFromBody: string[] = [];
      if (req.body.explanationImageUrls) {
        if (typeof req.body.explanationImageUrls === 'string') {
          try {
            explanationImageUrlsFromBody = JSON.parse(req.body.explanationImageUrls);
          } catch {
            // If not JSON, treat as single URL string (backward compatibility)
            explanationImageUrlsFromBody = [req.body.explanationImageUrls];
          }
        } else if (Array.isArray(req.body.explanationImageUrls)) {
          explanationImageUrlsFromBody = req.body.explanationImageUrls;
        }
      }

      // Process each URL: if it's already Cloudinary, keep it; otherwise fetch and upload
      for (const url of explanationImageUrlsFromBody) {
        if (url && typeof url === 'string' && url.trim()) {
          if (url.includes('cloudinary.com')) {
            explanationImageUrls.push(url);
          } else {
            const uploadResult = await fetchAndUploadToCloudinary(
              url,
              'questions',
              `explanation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            );
            explanationImageUrls.push(uploadResult.secure_url);
          }
        }
      }

      // Parse options if it's a string
      let options = req.body.options;
      if (typeof options === 'string') {
        options = JSON.parse(options);
      }

      // Handle option images if provided in form data
      if (options && Array.isArray(options)) {
        for (let i = 0; i < options.length; i++) {
          const optionImageField = `optionImage_${i}`;
          
          // If file is provided
          const optionImageFile = getFileByFieldname(optionImageField);
          if (optionImageFile) {
            const uploadResult = await uploadToCloudinary(
              optionImageFile.buffer,
              'questions/options',
              `option-${Date.now()}-${i}`
            );
            options[i].imageUrl = uploadResult.secure_url;
          } 
          // If URL is provided in option data
          else if (options[i].imageUrl && typeof options[i].imageUrl === 'string' && options[i].imageUrl.trim()) {
            if (options[i].imageUrl.includes('cloudinary.com')) {
              // Already Cloudinary URL, keep it
            } else {
              // Fetch from URL and upload to Cloudinary
              const uploadResult = await fetchAndUploadToCloudinary(
                options[i].imageUrl,
                'questions/options',
                `option-${Date.now()}-${i}`
              );
              options[i].imageUrl = uploadResult.secure_url;
            }
          }
        }
      }

      const question = await adminQuestionService.create(setId, {
        sectionId: req.body.sectionId,
        direction: req.body.direction,
        directionImageUrl: directionImageUrl || undefined,
        questionText: req.body.questionText,
        questionImageUrl: questionImageUrl || undefined,
        conclusion: req.body.conclusion,
        conclusionImageUrl: conclusionImageUrl || undefined,
        options: options || req.body.options,
        correctOptionId: req.body.correctOptionId,
        marks: parseInt(req.body.marks) || 1,
        explanationText: req.body.explanationText,
        explanationFormattedText: req.body.explanationFormattedText,
        explanationImageUrls: explanationImageUrls.length > 0 ? explanationImageUrls : undefined,
        questionOrder: parseInt(req.body.questionOrder) || 1,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      });
      sendSuccess(res, question, 'Question created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // When using upload.any(), files come as an array, not an object
      const files = (req.files as Express.Multer.File[]) || [];
      
      // Helper function to find file by fieldname
      const getFileByFieldname = (fieldname: string): Express.Multer.File | undefined => {
        return files.find(f => f.fieldname === fieldname);
      };
      
      // Helper function to get all files with fieldname starting with prefix
      const getFilesByPrefix = (prefix: string): Express.Multer.File[] => {
        return files.filter(f => f.fieldname.startsWith(prefix)).sort((a, b) => 
          a.fieldname.localeCompare(b.fieldname)
        );
      };
      
      let directionImageUrl: string | undefined;
      let questionImageUrl: string | undefined;
      let conclusionImageUrl: string | undefined;
      let explanationImageUrls: string[] = [];

      // Get existing question to delete old images
      const existingQuestion = await adminQuestionService.getById(id);

      // Upload new direction image if file provided
      const directionImageFile = getFileByFieldname('directionImage');
      if (directionImageFile) {
        // Delete old image
        if (existingQuestion?.directionImageUrl && existingQuestion.directionImageUrl.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(existingQuestion.directionImageUrl);
          } catch (error) {
            console.error('Error deleting old direction image:', error);
          }
        }

        const uploadResult = await uploadToCloudinary(
          directionImageFile.buffer,
          'questions',
          `direction-${Date.now()}`
        );
        directionImageUrl = uploadResult.secure_url;
      } 
      // If directionImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.directionImageUrl && typeof req.body.directionImageUrl === 'string' && req.body.directionImageUrl.trim()) {
        if (req.body.directionImageUrl.includes('cloudinary.com')) {
          if (req.body.directionImageUrl !== existingQuestion?.directionImageUrl) {
            // New Cloudinary URL, delete old one if exists
            if (existingQuestion?.directionImageUrl && existingQuestion.directionImageUrl.includes('cloudinary.com')) {
              try {
                await deleteFromCloudinary(existingQuestion.directionImageUrl);
              } catch (error) {
                console.error('Error deleting old direction image:', error);
              }
            }
            directionImageUrl = req.body.directionImageUrl;
          } else {
            directionImageUrl = req.body.directionImageUrl;
          }
        } else {
          // Fetch from URL and upload to Cloudinary
          if (existingQuestion?.directionImageUrl && existingQuestion.directionImageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(existingQuestion.directionImageUrl);
            } catch (error) {
              console.error('Error deleting old direction image:', error);
            }
          }

          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.directionImageUrl,
            'questions',
            `direction-${Date.now()}`
          );
          directionImageUrl = uploadResult.secure_url;
        }
      }

      // Upload new question image if file provided
      const questionImageFile = getFileByFieldname('questionImage');
      if (questionImageFile) {
        // Delete old image
        if (existingQuestion?.questionImageUrl && existingQuestion.questionImageUrl.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(existingQuestion.questionImageUrl);
          } catch (error) {
            console.error('Error deleting old question image:', error);
          }
        }

        const uploadResult = await uploadToCloudinary(
          questionImageFile.buffer,
          'questions',
          `question-${Date.now()}`
        );
        questionImageUrl = uploadResult.secure_url;
      } 
      // If questionImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.questionImageUrl && typeof req.body.questionImageUrl === 'string' && req.body.questionImageUrl.trim()) {
        if (req.body.questionImageUrl.includes('cloudinary.com')) {
          if (req.body.questionImageUrl !== existingQuestion?.questionImageUrl) {
            // New Cloudinary URL, delete old one if exists
            if (existingQuestion?.questionImageUrl && existingQuestion.questionImageUrl.includes('cloudinary.com')) {
              try {
                await deleteFromCloudinary(existingQuestion.questionImageUrl);
              } catch (error) {
                console.error('Error deleting old question image:', error);
              }
            }
            questionImageUrl = req.body.questionImageUrl;
          } else {
            questionImageUrl = req.body.questionImageUrl;
          }
        } else {
          // Fetch from URL and upload to Cloudinary
          if (existingQuestion?.questionImageUrl && existingQuestion.questionImageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(existingQuestion.questionImageUrl);
            } catch (error) {
              console.error('Error deleting old question image:', error);
            }
          }

          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.questionImageUrl,
            'questions',
            `question-${Date.now()}`
          );
          questionImageUrl = uploadResult.secure_url;
        }
      }

      // Upload new conclusion image if file provided
      const conclusionImageFile = getFileByFieldname('conclusionImage');
      if (conclusionImageFile) {
        // Delete old image
        if (existingQuestion?.conclusionImageUrl && existingQuestion.conclusionImageUrl.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(existingQuestion.conclusionImageUrl);
          } catch (error) {
            console.error('Error deleting old conclusion image:', error);
          }
        }

        const uploadResult = await uploadToCloudinary(
          conclusionImageFile.buffer,
          'questions',
          `conclusion-${Date.now()}`
        );
        conclusionImageUrl = uploadResult.secure_url;
      } 
      // If conclusionImageUrl is provided (from URL input), fetch and upload to Cloudinary
      else if (req.body.conclusionImageUrl && typeof req.body.conclusionImageUrl === 'string' && req.body.conclusionImageUrl.trim()) {
        if (req.body.conclusionImageUrl.includes('cloudinary.com')) {
          if (req.body.conclusionImageUrl !== existingQuestion?.conclusionImageUrl) {
            // New Cloudinary URL, delete old one if exists
            if (existingQuestion?.conclusionImageUrl && existingQuestion.conclusionImageUrl.includes('cloudinary.com')) {
              try {
                await deleteFromCloudinary(existingQuestion.conclusionImageUrl);
              } catch (error) {
                console.error('Error deleting old conclusion image:', error);
              }
            }
            conclusionImageUrl = req.body.conclusionImageUrl;
          } else {
            conclusionImageUrl = req.body.conclusionImageUrl;
          }
        } else {
          // Fetch from URL and upload to Cloudinary
          if (existingQuestion?.conclusionImageUrl && existingQuestion.conclusionImageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(existingQuestion.conclusionImageUrl);
            } catch (error) {
              console.error('Error deleting old conclusion image:', error);
            }
          }

          const uploadResult = await fetchAndUploadToCloudinary(
            req.body.conclusionImageUrl,
            'questions',
            `conclusion-${Date.now()}`
          );
          conclusionImageUrl = uploadResult.secure_url;
        }
      }

      // Handle multiple explanation images
      // First, handle files (explanationImage_0, explanationImage_1, etc.)
      const explanationImageFiles = getFilesByPrefix('explanationImage_');
      
      // Delete old explanation images if new files are being uploaded
      if (explanationImageFiles.length > 0 && existingQuestion?.explanationImageUrls) {
        for (const oldUrl of existingQuestion.explanationImageUrls) {
          if (oldUrl && oldUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(oldUrl);
            } catch (error) {
              console.error('Error deleting old explanation image:', error);
            }
          }
        }
      }

      for (const file of explanationImageFiles) {
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          'questions',
          `explanation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        );
        explanationImageUrls.push(uploadResult.secure_url);
      }

      // Then, handle URLs (from explanationImageUrls JSON string or array)
      let explanationImageUrlsFromBody: string[] = [];
      if (req.body.explanationImageUrls) {
        if (typeof req.body.explanationImageUrls === 'string') {
          try {
            explanationImageUrlsFromBody = JSON.parse(req.body.explanationImageUrls);
          } catch {
            // If not JSON, treat as single URL string (backward compatibility)
            explanationImageUrlsFromBody = [req.body.explanationImageUrls];
          }
        } else if (Array.isArray(req.body.explanationImageUrls)) {
          explanationImageUrlsFromBody = req.body.explanationImageUrls;
        }
      }

      // If URLs are provided, delete old images that are not in the new list
      if (explanationImageUrlsFromBody.length > 0 && existingQuestion?.explanationImageUrls) {
        const existingUrls = existingQuestion.explanationImageUrls || [];
        const newUrls = explanationImageUrlsFromBody.filter((url: string) => 
          url && typeof url === 'string' && url.trim()
        );
        
        // Find URLs to delete (existing URLs not in new list)
        const urlsToDelete = existingUrls.filter((oldUrl: string) => 
          oldUrl.includes('cloudinary.com') && !newUrls.includes(oldUrl)
        );
        
        for (const urlToDelete of urlsToDelete) {
          try {
            await deleteFromCloudinary(urlToDelete);
          } catch (error) {
            console.error('Error deleting old explanation image:', error);
          }
        }
      }

      // Process each URL: if it's already Cloudinary, keep it; otherwise fetch and upload
      for (const url of explanationImageUrlsFromBody) {
        if (url && typeof url === 'string' && url.trim()) {
          if (url.includes('cloudinary.com')) {
            explanationImageUrls.push(url);
          } else {
            const uploadResult = await fetchAndUploadToCloudinary(
              url,
              'questions',
              `explanation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            );
            explanationImageUrls.push(uploadResult.secure_url);
          }
        }
      }

      // If no new explanation images provided (no files and no URLs), keep existing ones
      // Only update if files or URLs were explicitly provided
      const hasNewExplanationImages = explanationImageFiles.length > 0 || explanationImageUrlsFromBody.length > 0;
      if (!hasNewExplanationImages && existingQuestion?.explanationImageUrls) {
        // Keep existing images - don't update the field
        explanationImageUrls = existingQuestion.explanationImageUrls;
      }

      // Parse options if it's a string
      let options = req.body.options;
      if (typeof options === 'string') {
        options = JSON.parse(options);
      }

      // Handle option images if provided in form data
      if (options && Array.isArray(options)) {
        for (let i = 0; i < options.length; i++) {
          const optionImageField = `optionImage_${i}`;
          
          // If file is provided
          const optionImageFile = getFileByFieldname(optionImageField);
          if (optionImageFile) {
            // Delete old option image if exists
            if (existingQuestion?.options?.[i]?.imageUrl && existingQuestion.options[i].imageUrl.includes('cloudinary.com')) {
              try {
                await deleteFromCloudinary(existingQuestion.options[i].imageUrl);
              } catch (error) {
                console.error('Error deleting old option image:', error);
              }
            }

            const uploadResult = await uploadToCloudinary(
              optionImageFile.buffer,
              'questions/options',
              `option-${Date.now()}-${i}`
            );
            options[i].imageUrl = uploadResult.secure_url;
          } 
          // If URL is provided in option data
          else if (options[i].imageUrl && typeof options[i].imageUrl === 'string' && options[i].imageUrl.trim()) {
            if (options[i].imageUrl.includes('cloudinary.com')) {
              // Already Cloudinary URL
              if (options[i].imageUrl !== existingQuestion?.options?.[i]?.imageUrl) {
                // New URL, delete old one if exists
                if (existingQuestion?.options?.[i]?.imageUrl && existingQuestion.options[i].imageUrl.includes('cloudinary.com')) {
                  try {
                    await deleteFromCloudinary(existingQuestion.options[i].imageUrl);
                  } catch (error) {
                    console.error('Error deleting old option image:', error);
                  }
                }
              }
            } else {
              // Fetch from URL and upload to Cloudinary
              if (existingQuestion?.options?.[i]?.imageUrl && existingQuestion.options[i].imageUrl.includes('cloudinary.com')) {
                try {
                  await deleteFromCloudinary(existingQuestion.options[i].imageUrl);
                } catch (error) {
                  console.error('Error deleting old option image:', error);
                }
              }

              const uploadResult = await fetchAndUploadToCloudinary(
                options[i].imageUrl,
                'questions/options',
                `option-${Date.now()}-${i}`
              );
              options[i].imageUrl = uploadResult.secure_url;
            }
          }
        }
      }

      const updateData: any = {
        sectionId: req.body.sectionId,
        direction: req.body.direction,
        questionText: req.body.questionText,
        conclusion: req.body.conclusion,
        correctOptionId: req.body.correctOptionId,
        marks: parseInt(req.body.marks) || 1,
        explanationText: req.body.explanationText,
        explanationFormattedText: req.body.explanationFormattedText,
        questionOrder: parseInt(req.body.questionOrder) || 1,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      };
      
      if (directionImageUrl !== undefined) {
        updateData.directionImageUrl = directionImageUrl || undefined;
      }
      
      if (questionImageUrl !== undefined) {
        updateData.questionImageUrl = questionImageUrl || undefined;
      }
      
      if (conclusionImageUrl !== undefined) {
        updateData.conclusionImageUrl = conclusionImageUrl || undefined;
      }
      
      // Only update explanationImageUrls if new images were provided or explicitly cleared
      // Reuse the hasNewExplanationImages variable declared earlier
      const isExplicitlyCleared = req.body.explanationImageUrls === '' || req.body.explanationImageUrls === null || req.body.explanationImageUrls === '[]';
      
      if (hasNewExplanationImages || isExplicitlyCleared) {
        updateData.explanationImageUrls = explanationImageUrls.length > 0 ? explanationImageUrls : [];
      }
      // If neither condition is true, don't update explanationImageUrls (keep existing)
      if (options) {
        updateData.options = options;
      }

      const question = await adminQuestionService.update(id, updateData);
      sendSuccess(res, question, 'Question updated successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get question to delete images from Cloudinary
      const question = await adminQuestionService.getById(id);
      
      // Delete direction image
      if (question?.directionImageUrl) {
        try {
          await deleteFromCloudinary(question.directionImageUrl);
        } catch (error) {
          console.error('Error deleting direction image:', error);
        }
      }

      // Delete question image
      if (question?.questionImageUrl) {
        try {
          await deleteFromCloudinary(question.questionImageUrl);
        } catch (error) {
          console.error('Error deleting question image:', error);
        }
      }

      // Delete conclusion image
      if (question?.conclusionImageUrl) {
        try {
          await deleteFromCloudinary(question.conclusionImageUrl);
        } catch (error) {
          console.error('Error deleting conclusion image:', error);
        }
      }

      // Delete explanation images
      if (question?.explanationImageUrls && Array.isArray(question.explanationImageUrls)) {
        for (const imageUrl of question.explanationImageUrls) {
          if (imageUrl && imageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(imageUrl);
            } catch (error) {
              console.error('Error deleting explanation image:', error);
            }
          }
        }
      }

      // Delete option images
      if (question?.options && Array.isArray(question.options)) {
        for (const option of question.options) {
          if (option.imageUrl) {
            try {
              await deleteFromCloudinary(option.imageUrl);
            } catch (error) {
              console.error('Error deleting option image:', error);
            }
          }
        }
      }

      const result = await adminQuestionService.delete(id);
      sendSuccess(res, result, 'Question deleted successfully.');
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  },

  bulkCreate: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const { questions } = req.body;
      const created = await adminQuestionService.bulkCreate(setId, questions);
      sendSuccess(res, created, 'Questions created successfully.');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

