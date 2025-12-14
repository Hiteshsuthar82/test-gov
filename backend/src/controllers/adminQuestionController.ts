import { Request, Response } from 'express';
import { adminQuestionService } from '../services/adminQuestionService';
import { sendSuccess, sendError } from '../utils/response';
import { uploadToCloudinary, deleteFromCloudinary, fetchAndUploadToCloudinary } from '../utils/cloudinary';
import { ILanguageContent } from '../models/Question';

// Helper function to process multi-language data from form
function processLanguageData(
  req: Request,
  lang: 'en' | 'hi' | 'gu',
  getFileByFieldname: (fieldname: string) => Express.Multer.File | undefined,
  getFilesByPrefix: (prefix: string) => Express.Multer.File[]
): Promise<ILanguageContent | null> {
  return new Promise(async (resolve) => {
    // Check if language data exists (either as JSON or form fields)
    const langPrefix = `languages.${lang}`;
    const langDataKey = `languages[${lang}]`;
    
    // Try to get as JSON first
    let langData: any = null;
    if (req.body[langDataKey] && typeof req.body[langDataKey] === 'string') {
      try {
        langData = JSON.parse(req.body[langDataKey]);
      } catch {
        langData = null;
      }
    } else if (req.body.languages && req.body.languages[lang]) {
      langData = req.body.languages[lang];
    }

    // If no language data, return null (optional language)
    if (!langData && lang !== 'en') {
      resolve(null);
      return;
    }

    // For English, we need at least questionText
    if (lang === 'en' && !langData && !req.body.questionText) {
      resolve(null);
      return;
    }

    // Process images for this language
      let directionImageUrl: string | undefined;
      let questionImageUrl: string | undefined;
      let conclusionImageUrl: string | undefined;

    // Direction image
    const directionImageFile = getFileByFieldname(`${langPrefix}.directionImage`) || 
                              getFileByFieldname(`languages[${lang}][directionImage]`);
      if (directionImageFile) {
        const uploadResult = await uploadToCloudinary(
          directionImageFile.buffer,
          'questions',
        `direction-${lang}-${Date.now()}`
        );
        directionImageUrl = uploadResult.secure_url;
    } else if (langData?.directionImageUrl || req.body[`${langPrefix}.directionImageUrl`] || req.body[`languages[${lang}][directionImageUrl]`]) {
      const url = langData?.directionImageUrl || req.body[`${langPrefix}.directionImageUrl`] || req.body[`languages[${lang}][directionImageUrl]`];
      if (url && typeof url === 'string' && url.trim()) {
        if (url.includes('cloudinary.com')) {
          directionImageUrl = url;
        } else {
          const uploadResult = await fetchAndUploadToCloudinary(url, 'questions', `direction-${lang}-${Date.now()}`);
          directionImageUrl = uploadResult.secure_url;
        }
        }
      }

    // Question image
    const questionImageFile = getFileByFieldname(`${langPrefix}.questionImage`) || 
                               getFileByFieldname(`languages[${lang}][questionImage]`);
      if (questionImageFile) {
        const uploadResult = await uploadToCloudinary(
          questionImageFile.buffer,
          'questions',
        `question-${lang}-${Date.now()}`
        );
        questionImageUrl = uploadResult.secure_url;
    } else if (langData?.questionImageUrl || req.body[`${langPrefix}.questionImageUrl`] || req.body[`languages[${lang}][questionImageUrl]`]) {
      const url = langData?.questionImageUrl || req.body[`${langPrefix}.questionImageUrl`] || req.body[`languages[${lang}][questionImageUrl]`];
      if (url && typeof url === 'string' && url.trim()) {
        if (url.includes('cloudinary.com')) {
          questionImageUrl = url;
        } else {
          const uploadResult = await fetchAndUploadToCloudinary(url, 'questions', `question-${lang}-${Date.now()}`);
          questionImageUrl = uploadResult.secure_url;
        }
        }
      }

    // Conclusion image
    const conclusionImageFile = getFileByFieldname(`${langPrefix}.conclusionImage`) || 
                                getFileByFieldname(`languages[${lang}][conclusionImage]`);
      if (conclusionImageFile) {
        const uploadResult = await uploadToCloudinary(
          conclusionImageFile.buffer,
          'questions',
        `conclusion-${lang}-${Date.now()}`
        );
        conclusionImageUrl = uploadResult.secure_url;
    } else if (langData?.conclusionImageUrl || req.body[`${langPrefix}.conclusionImageUrl`] || req.body[`languages[${lang}][conclusionImageUrl]`]) {
      const url = langData?.conclusionImageUrl || req.body[`${langPrefix}.conclusionImageUrl`] || req.body[`languages[${lang}][conclusionImageUrl]`];
      if (url && typeof url === 'string' && url.trim()) {
        if (url.includes('cloudinary.com')) {
          conclusionImageUrl = url;
        } else {
          const uploadResult = await fetchAndUploadToCloudinary(url, 'questions', `conclusion-${lang}-${Date.now()}`);
          conclusionImageUrl = uploadResult.secure_url;
        }
      }
    }

    // Process options for this language
    let options: Array<{ optionId: string; text: string; imageUrl?: string }> = [];
    
    // Try to get options from JSON
    if (langData?.options && Array.isArray(langData.options)) {
      options = langData.options;
    } else if (req.body[`${langPrefix}.options`] || req.body[`languages[${lang}][options]`]) {
      let optionsData = req.body[`${langPrefix}.options`] || req.body[`languages[${lang}][options]`];
      if (typeof optionsData === 'string') {
        try {
          options = JSON.parse(optionsData);
        } catch {
          options = [];
        }
      } else if (Array.isArray(optionsData)) {
        options = optionsData;
      }
    }

    // Handle option images
    if (options && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const optionImageField = `${langPrefix}.optionImage_${i}`;
        const optionImageFile = getFileByFieldname(optionImageField) || 
                                getFileByFieldname(`languages[${lang}][optionImage_${i}]`);
        
        const currentOption = options[i];
        if (optionImageFile && currentOption) {
        const uploadResult = await uploadToCloudinary(
            optionImageFile.buffer,
            'questions/options',
            `option-${lang}-${Date.now()}-${i}`
          );
          currentOption.imageUrl = uploadResult.secure_url;
        } else if (currentOption?.imageUrl && typeof currentOption.imageUrl === 'string' && currentOption.imageUrl.trim()) {
          if (!currentOption.imageUrl.includes('cloudinary.com')) {
            const uploadResult = await fetchAndUploadToCloudinary(
              currentOption.imageUrl,
              'questions/options',
              `option-${lang}-${Date.now()}-${i}`
            );
            currentOption.imageUrl = uploadResult.secure_url;
          }
        }
      }
    }

    // Handle explanation images for this language
    let explanationImageUrls: string[] = [];
    
    // Get explanation images from JSON if provided
    if (langData?.explanationImageUrls && Array.isArray(langData.explanationImageUrls)) {
      explanationImageUrls = langData.explanationImageUrls;
    } else if (req.body[`${langPrefix}.explanationImageUrls`] || req.body[`languages[${lang}][explanationImageUrls]`]) {
      let explanationUrlsData = req.body[`${langPrefix}.explanationImageUrls`] || req.body[`languages[${lang}][explanationImageUrls]`];
      if (typeof explanationUrlsData === 'string') {
        try {
          explanationImageUrls = JSON.parse(explanationUrlsData);
          } catch {
          explanationImageUrls = [];
        }
      } else if (Array.isArray(explanationUrlsData)) {
        explanationImageUrls = explanationUrlsData;
      }
    }
    
    // Process explanation image URLs - upload if not Cloudinary
    for (let i = 0; i < explanationImageUrls.length; i++) {
      const url = explanationImageUrls[i];
      if (url && typeof url === 'string' && url.trim() && !url.includes('cloudinary.com')) {
            const uploadResult = await fetchAndUploadToCloudinary(
              url,
              'questions',
          `explanation-${lang}-${Date.now()}-${i}`
        );
        explanationImageUrls[i] = uploadResult.secure_url;
      }
    }

    // Build language content
    const languageContent: ILanguageContent = {
      direction: langData?.direction || req.body[`${langPrefix}.direction`] || req.body[`languages[${lang}][direction]`] || undefined,
      directionFormattedText: langData?.directionFormattedText || req.body[`${langPrefix}.directionFormattedText`] || req.body[`languages[${lang}][directionFormattedText]`] || undefined,
      directionImageUrl,
      questionText: langData?.questionText || req.body[`${langPrefix}.questionText`] || req.body[`languages[${lang}][questionText]`] || req.body.questionText || '',
      questionFormattedText: langData?.questionFormattedText || req.body[`${langPrefix}.questionFormattedText`] || req.body[`languages[${lang}][questionFormattedText]`] || req.body.questionFormattedText || undefined,
      questionImageUrl,
      conclusion: langData?.conclusion || req.body[`${langPrefix}.conclusion`] || req.body[`languages[${lang}][conclusion]`] || undefined,
      conclusionFormattedText: langData?.conclusionFormattedText || req.body[`${langPrefix}.conclusionFormattedText`] || req.body[`languages[${lang}][conclusionFormattedText]`] || undefined,
      conclusionImageUrl,
      options: options.length > 0 ? options : (lang === 'en' ? (req.body.options ? (typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options) : []) : []),
      explanationText: langData?.explanationText || req.body[`${langPrefix}.explanationText`] || req.body[`languages[${lang}][explanationText]`] || undefined,
      explanationFormattedText: langData?.explanationFormattedText || req.body[`${langPrefix}.explanationFormattedText`] || req.body[`languages[${lang}][explanationFormattedText]`] || undefined,
      explanationImageUrls: explanationImageUrls.length > 0 ? explanationImageUrls : undefined,
    };


    resolve(languageContent);
  });
}

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
      
      // Check if multi-language data is provided
      let languages: { en: ILanguageContent; hi?: ILanguageContent; gu?: ILanguageContent } | null = null;
      
      // Try to parse languages from JSON if provided
      if (req.body.languages && typeof req.body.languages === 'string') {
        try {
          languages = JSON.parse(req.body.languages);
        } catch {
          languages = null;
        }
      } else if (req.body.languages && typeof req.body.languages === 'object') {
        languages = req.body.languages;
      }

      // If languages not provided as JSON, process from form fields
      if (!languages) {
        const enData = await processLanguageData(req, 'en', getFileByFieldname, getFilesByPrefix);
        const hiData = await processLanguageData(req, 'hi', getFileByFieldname, getFilesByPrefix);
        const guData = await processLanguageData(req, 'gu', getFileByFieldname, getFilesByPrefix);

        if (enData) {
          languages = {
            en: enData,
            ...(hiData ? { hi: hiData } : {}),
            ...(guData ? { gu: guData } : {}),
          };
        }
      }

      if (!languages || !languages.en) {
        throw new Error('English (en) language content is required');
      }

      // Parse tags
      let tags: string[] = []
      if (req.body.tags) {
        if (typeof req.body.tags === 'string') {
          try {
            tags = JSON.parse(req.body.tags)
          } catch {
            tags = req.body.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          }
        } else if (Array.isArray(req.body.tags)) {
          tags = req.body.tags
        }
      }

      const questionData: any = {
        languages,
        correctOptionId: req.body.correctOptionId,
        marks: parseInt(req.body.marks) || 1,
        questionOrder: parseInt(req.body.questionOrder) || 1,
        tags: tags,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      };

      // Only include sectionId if it's provided and not empty
      if (req.body.sectionId && req.body.sectionId.trim() !== '') {
        questionData.sectionId = req.body.sectionId;
      }

      if (req.body.averageTimeSeconds) {
        questionData.averageTimeSeconds = parseInt(req.body.averageTimeSeconds) || 0;
      }

      const question = await adminQuestionService.create(setId, questionData);
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

      // Check if multi-language data is provided
      let languages: { en?: ILanguageContent; hi?: ILanguageContent; gu?: ILanguageContent } | null = null;
      
      // Try to parse languages from JSON if provided
      if (req.body.languages && typeof req.body.languages === 'string') {
        try {
          languages = JSON.parse(req.body.languages);
          } catch {
          languages = null;
        }
      } else if (req.body.languages && typeof req.body.languages === 'object') {
        languages = req.body.languages;
      }

      // If languages not provided as JSON, process from form fields
      if (!languages) {
        const enData = await processLanguageData(req, 'en', getFileByFieldname, getFilesByPrefix);
        const hiData = await processLanguageData(req, 'hi', getFileByFieldname, getFilesByPrefix);
        const guData = await processLanguageData(req, 'gu', getFileByFieldname, getFilesByPrefix);

        if (enData || hiData || guData) {
          languages = {};
          if (enData) languages.en = enData;
          if (hiData) languages.hi = hiData;
          if (guData) languages.gu = guData;
        }
      }

      // Parse tags
      let tags: string[] | undefined = undefined
      if (req.body.tags !== undefined) {
        if (typeof req.body.tags === 'string') {
          try {
            tags = JSON.parse(req.body.tags)
          } catch {
            tags = req.body.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          }
        } else if (Array.isArray(req.body.tags)) {
          tags = req.body.tags
        }
      }

      const updateData: any = {
        correctOptionId: req.body.correctOptionId,
        marks: parseInt(req.body.marks) || 1,
        averageTimeSeconds: req.body.averageTimeSeconds !== undefined ? parseInt(req.body.averageTimeSeconds) : undefined,
        questionOrder: parseInt(req.body.questionOrder) || 1,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
      };

      if (tags !== undefined) {
        updateData.tags = tags
      }

      // Add languages if provided
      if (languages) {
        updateData.languages = languages;
      }

      // Only include sectionId if it's provided and not empty
      if (req.body.sectionId !== undefined && req.body.sectionId !== null) {
        if (req.body.sectionId && req.body.sectionId.trim() !== '') {
          updateData.sectionId = req.body.sectionId;
        } else {
          // Explicitly set to undefined if empty string is sent
          updateData.sectionId = undefined;
        }
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

      // Delete explanation images from all languages
      if (question?.languages) {
        for (const lang of ['en', 'hi', 'gu'] as const) {
          const langContent = question.languages[lang];
          if (langContent?.explanationImageUrls && Array.isArray(langContent.explanationImageUrls)) {
            for (const imageUrl of langContent.explanationImageUrls) {
          if (imageUrl && imageUrl.includes('cloudinary.com')) {
            try {
              await deleteFromCloudinary(imageUrl);
            } catch (error) {
              console.error('Error deleting explanation image:', error);
                }
              }
            }
          }
        }
      }

      // Delete option images from all languages
      if (question?.languages) {
        for (const lang of ['en', 'hi', 'gu'] as const) {
          const langContent = question.languages[lang];
          if (langContent?.options && Array.isArray(langContent.options)) {
            for (const option of langContent.options) {
          if (option.imageUrl) {
            try {
              await deleteFromCloudinary(option.imageUrl);
            } catch (error) {
              console.error('Error deleting option image:', error);
                }
              }
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

  importPreview: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const file = req.file;
      
      if (!file) {
        return sendError(res, 'Excel file is required', 400);
      }

      // Parse Excel file
      const XLSX = require('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (!data || data.length === 0) {
        return sendError(res, 'Excel file is empty', 400);
      }

      // Get column names from first row
      const firstRow = data[0] as any;
      const excelColumns = Object.keys(firstRow);

      // If fieldMapping is provided in request body, use it; otherwise return columns for mapping
      const fieldMapping = req.body.fieldMapping ? (typeof req.body.fieldMapping === 'string' ? JSON.parse(req.body.fieldMapping) : req.body.fieldMapping) : null;

      // If no mapping provided, return columns for frontend to show mapping dialog
      if (!fieldMapping) {
        return sendSuccess(res, {
          columns: excelColumns,
          needsMapping: true,
        });
      }

      // Get test set to validate sections
      const testSet = await adminQuestionService.getTestSetForValidation(setId);
      const availableSections = testSet?.sections || [];
      const sectionMap = new Map(availableSections.map((s: any) => [s.name.toLowerCase(), s.sectionId]));

      const previewData: any[] = [];
      const errors: string[] = [];

      // Process each row
      data.forEach((row: any, index: number) => {
        const rowNum = index + 2; // +2 because index is 0-based and Excel rows start at 2 (after header)
        const questionData: any = {
          rowNumber: rowNum,
          data: {},
          errors: [],
          warnings: [],
        };

        // Extract data using field mapping
        const q: any = {};
        
        // Common fields
        if (fieldMapping.section && row[fieldMapping.section]) {
          q.section = row[fieldMapping.section].toString().trim();
        }
        if (fieldMapping.questionOrder && row[fieldMapping.questionOrder]) {
          q.questionOrder = row[fieldMapping.questionOrder];
        }
        if (fieldMapping.correctOption && row[fieldMapping.correctOption]) {
          q.correctOption = row[fieldMapping.correctOption].toString().trim().toUpperCase();
        }
        if (fieldMapping.marks && row[fieldMapping.marks]) {
          q.marks = row[fieldMapping.marks];
        }
        if (fieldMapping.averageTime && row[fieldMapping.averageTime]) {
          q.averageTime = row[fieldMapping.averageTime];
        }
        if (fieldMapping.tags && row[fieldMapping.tags]) {
          const tagsStr = row[fieldMapping.tags].toString().trim();
          q.tags = tagsStr ? tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];
        }

        // English fields
        q.eng = {
          direction: fieldMapping['eng-direction'] && row[fieldMapping['eng-direction']] ? row[fieldMapping['eng-direction']].toString().trim() : '',
          question: fieldMapping['eng-question'] && row[fieldMapping['eng-question']] ? row[fieldMapping['eng-question']].toString().trim() : '',
          options: {
            A: fieldMapping['eng-A'] && row[fieldMapping['eng-A']] ? row[fieldMapping['eng-A']].toString().trim() : '',
            B: fieldMapping['eng-B'] && row[fieldMapping['eng-B']] ? row[fieldMapping['eng-B']].toString().trim() : '',
            C: fieldMapping['eng-C'] && row[fieldMapping['eng-C']] ? row[fieldMapping['eng-C']].toString().trim() : '',
            D: fieldMapping['eng-D'] && row[fieldMapping['eng-D']] ? row[fieldMapping['eng-D']].toString().trim() : '',
            E: fieldMapping['eng-E'] && row[fieldMapping['eng-E']] ? row[fieldMapping['eng-E']].toString().trim() : '',
          },
          solutionText: fieldMapping['eng-solutionText'] && row[fieldMapping['eng-solutionText']] ? row[fieldMapping['eng-solutionText']].toString().trim() : '',
        };

        // Hindi fields (optional)
        if (fieldMapping['hn-question'] && row[fieldMapping['hn-question']]) {
          q.hn = {
            direction: fieldMapping['hn-direction'] && row[fieldMapping['hn-direction']] ? row[fieldMapping['hn-direction']].toString().trim() : '',
            question: row[fieldMapping['hn-question']].toString().trim(),
            options: {
              A: fieldMapping['hn-A'] && row[fieldMapping['hn-A']] ? row[fieldMapping['hn-A']].toString().trim() : '',
              B: fieldMapping['hn-B'] && row[fieldMapping['hn-B']] ? row[fieldMapping['hn-B']].toString().trim() : '',
              C: fieldMapping['hn-C'] && row[fieldMapping['hn-C']] ? row[fieldMapping['hn-C']].toString().trim() : '',
              D: fieldMapping['hn-D'] && row[fieldMapping['hn-D']] ? row[fieldMapping['hn-D']].toString().trim() : '',
              E: fieldMapping['hn-E'] && row[fieldMapping['hn-E']] ? row[fieldMapping['hn-E']].toString().trim() : '',
            },
            solutionText: fieldMapping['hn-solutionText'] && row[fieldMapping['hn-solutionText']] ? row[fieldMapping['hn-solutionText']].toString().trim() : '',
          };
        }

        // Gujarati fields (optional)
        if (fieldMapping['guj-question'] && row[fieldMapping['guj-question']]) {
          q.guj = {
            direction: fieldMapping['guj-direction'] && row[fieldMapping['guj-direction']] ? row[fieldMapping['guj-direction']].toString().trim() : '',
            question: row[fieldMapping['guj-question']].toString().trim(),
            options: {
              A: fieldMapping['guj-A'] && row[fieldMapping['guj-A']] ? row[fieldMapping['guj-A']].toString().trim() : '',
              B: fieldMapping['guj-B'] && row[fieldMapping['guj-B']] ? row[fieldMapping['guj-B']].toString().trim() : '',
              C: fieldMapping['guj-C'] && row[fieldMapping['guj-C']] ? row[fieldMapping['guj-C']].toString().trim() : '',
              D: fieldMapping['guj-D'] && row[fieldMapping['guj-D']] ? row[fieldMapping['guj-D']].toString().trim() : '',
              E: fieldMapping['guj-E'] && row[fieldMapping['guj-E']] ? row[fieldMapping['guj-E']].toString().trim() : '',
            },
            solutionText: fieldMapping['guj-solutionText'] && row[fieldMapping['guj-solutionText']] ? row[fieldMapping['guj-solutionText']].toString().trim() : '',
          };
        }

        questionData.data = q;

        // Validate required fields
        if (!q.questionOrder || q.questionOrder.toString().trim() === '') {
          questionData.errors.push('Question Order (QSNo) is required');
        } else {
          const order = parseInt(q.questionOrder.toString());
          if (isNaN(order) || order < 1) {
            questionData.errors.push('Question Order must be a positive number');
          } else {
            q.questionOrder = order;
          }
        }

        // Validate English question (required)
        if (!q.eng || !q.eng.question || q.eng.question.trim() === '') {
          questionData.errors.push('English Question Text (eng-question) is required');
        }

        // Validate English options (at least A, B, C, D required)
        const engOptions = q.eng?.options || {};
        const requiredOptions = ['A', 'B', 'C', 'D'];
        const engOptionTexts: string[] = [];
        
        requiredOptions.forEach((opt) => {
          if (!engOptions[opt] || engOptions[opt].trim() === '') {
            questionData.errors.push(`English Option ${opt} (eng-${opt}) is required`);
          } else {
            engOptionTexts.push(engOptions[opt]);
          }
        });

        // Handle option E (optional)
        if (engOptions.E && engOptions.E.trim() !== '') {
          engOptionTexts.push(engOptions.E);
        }

        // Validate correct option
        if (!q.correctOption || q.correctOption.trim() === '') {
          questionData.errors.push('Correct Option is required');
        } else {
          const correctOpt = q.correctOption.toUpperCase().trim();
          if (!['A', 'B', 'C', 'D', 'E'].includes(correctOpt)) {
            questionData.errors.push('Correct Option must be A, B, C, D, or E');
          } else if (correctOpt === 'E' && (!engOptions.E || engOptions.E.trim() === '')) {
            questionData.errors.push('Correct Option is E but English Option E is not provided');
          } else {
            q.correctOptionId = correctOpt;
          }
        }

        // Validate section
        if (availableSections.length > 0) {
          if (!q.section || q.section.trim() === '') {
            questionData.errors.push('Section is required');
          } else {
            const sectionName = q.section.trim();
            const sectionId = sectionMap.get(sectionName.toLowerCase());
            if (!sectionId) {
              questionData.errors.push(`Section "${sectionName}" not found. Available sections: ${availableSections.map((s: any) => s.name).join(', ')}`);
            } else {
              q.sectionId = sectionId;
              q.sectionName = sectionName;
            }
          }
        } else if (q.section && q.section.trim() !== '') {
          questionData.warnings.push('Section provided but test set has no sections');
        }

        // Parse optional fields
        if (q.marks) {
          const marks = parseFloat(q.marks.toString());
          if (!isNaN(marks) && marks > 0) {
            q.marks = marks;
          } else {
            q.marks = 1;
            questionData.warnings.push('Invalid marks, defaulting to 1');
          }
        } else {
          q.marks = 1;
        }

        if (q.averageTime) {
          const avgTime = parseFloat(q.averageTime.toString());
          if (!isNaN(avgTime) && avgTime >= 0) {
            q.averageTimeSeconds = avgTime;
          } else {
            q.averageTimeSeconds = 0;
          }
        } else {
          q.averageTimeSeconds = 0;
        }

        // Build English options array
        const optionIds = ['A', 'B', 'C', 'D', 'E'];
        q.engOptions = engOptionTexts.map((text, idx) => ({
          optionId: optionIds[idx],
          text: text.trim(),
        }));

        // Build Hindi options array if Hindi data exists
        if (q.hn && q.hn.question) {
          const hnOptions = q.hn.options || {};
          const hnOptionTexts: string[] = [];
          requiredOptions.forEach((opt) => {
            if (hnOptions[opt] && hnOptions[opt].trim() !== '') {
              hnOptionTexts.push(hnOptions[opt]);
            }
          });
          if (hnOptions.E && hnOptions.E.trim() !== '') {
            hnOptionTexts.push(hnOptions.E);
          }
          q.hnOptions = hnOptionTexts.map((text, idx) => ({
            optionId: optionIds[idx],
            text: text.trim(),
          }));
        }

        // Build Gujarati options array if Gujarati data exists
        if (q.guj && q.guj.question) {
          const gujOptions = q.guj.options || {};
          const gujOptionTexts: string[] = [];
          requiredOptions.forEach((opt) => {
            if (gujOptions[opt] && gujOptions[opt].trim() !== '') {
              gujOptionTexts.push(gujOptions[opt]);
            }
          });
          if (gujOptions.E && gujOptions.E.trim() !== '') {
            gujOptionTexts.push(gujOptions.E);
          }
          q.gujOptions = gujOptionTexts.map((text, idx) => ({
            optionId: optionIds[idx],
            text: text.trim(),
          }));
        }

        previewData.push(questionData);
      });

      sendSuccess(res, {
        preview: previewData,
        totalRows: data.length,
        validRows: previewData.filter((q) => q.errors.length === 0).length,
        invalidRows: previewData.filter((q) => q.errors.length > 0).length,
      });
    } catch (error: any) {
      sendError(res, error.message || 'Error parsing Excel file', 400);
    }
  },

  importCreate: async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      let questions = req.body.questions;

      // Parse questions if it's a JSON string (from FormData)
      if (typeof questions === 'string') {
        try {
          questions = JSON.parse(questions);
        } catch (parseError) {
          return sendError(res, 'Invalid questions JSON format', 400);
        }
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return sendError(res, 'Questions array is required', 400);
      }

      // Get test set for validation
      const testSet = await adminQuestionService.getTestSetForValidation(setId);
      const availableSections = testSet?.sections || [];
      const sectionMap = new Map(availableSections.map((s: any) => [s.name.toLowerCase(), s.sectionId]));

      const files = (req.files as Express.Multer.File[]) || [];
      const getFileByFieldname = (fieldname: string): Express.Multer.File | undefined => {
        return files.find((f) => f.fieldname === fieldname);
      };

      const createdQuestions = [];
      const errors: any[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        try {
          // Validate section
          let sectionId: string | undefined;
          if (availableSections.length > 0) {
            if (!q.sectionId) {
              throw new Error('Section ID is required');
            }
            sectionId = q.sectionId;
          }

          // Build languages object from new structure
          const languages: any = {
            en: {
              direction: q.eng?.direction || '',
              directionFormattedText: q.eng?.direction || '',
              questionText: q.eng?.question || '',
              questionFormattedText: q.eng?.question || '',
              options: q.engOptions || [],
              explanationText: q.eng?.solutionText || '',
              explanationFormattedText: q.eng?.solutionText || '',
            },
          }

          // Add Hindi if provided
          if (q.hn && q.hn.question && q.hnOptions && q.hnOptions.length > 0) {
            languages.hi = {
              direction: q.hn.direction || '',
              directionFormattedText: q.hn.direction || '',
              questionText: q.hn.question,
              questionFormattedText: q.hn.question,
              options: q.hnOptions,
              explanationText: q.hn.solutionText || '',
              explanationFormattedText: q.hn.solutionText || '',
            }
          }

          // Add Gujarati if provided
          if (q.guj && q.guj.question && q.gujOptions && q.gujOptions.length > 0) {
            languages.gu = {
              direction: q.guj.direction || '',
              directionFormattedText: q.guj.direction || '',
              questionText: q.guj.question,
              questionFormattedText: q.guj.question,
              options: q.gujOptions,
              explanationText: q.guj.solutionText || '',
              explanationFormattedText: q.guj.solutionText || '',
            }
          }

          // Create question data
          const questionData: any = {
            sectionId,
            languages,
            correctOptionId: q.correctOptionId,
            marks: q.marks || 1,
            averageTimeSeconds: q.averageTimeSeconds || 0,
            tags: q.tags || [],
            questionOrder: q.questionOrder,
            isActive: true,
          };

          const created = await adminQuestionService.create(setId, questionData);
          createdQuestions.push(created);
        } catch (error: any) {
          errors.push({
            rowNumber: q.rowNumber || i + 1,
            error: error.message,
          });
        }
      }

      sendSuccess(res, {
        created: createdQuestions,
        createdCount: createdQuestions.length,
        errors,
        errorCount: errors.length,
      }, `${createdQuestions.length} questions created successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}.`);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

