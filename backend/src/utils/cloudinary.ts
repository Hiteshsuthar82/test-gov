import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { UploadApiResponse } from 'cloudinary';
import https from 'https';
import http from 'http';
import { URL } from 'url';

let isConfigured = false;

// Lazy configuration - only configure when needed
const ensureConfigured = () => {
  if (isConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Error: Cloudinary credentials are missing in environment variables.');
    console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    throw new Error('Cloudinary is not configured. Please set environment variables.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isConfigured = true;
  console.log('Cloudinary configured successfully');
};

/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer
 * @param folder - Folder path in Cloudinary (e.g., 'banners', 'categories', 'questions')
 * @param publicId - Optional public ID for the file
 * @returns Promise with upload result containing secure_url
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<UploadApiResponse> => {
  // Ensure Cloudinary is configured before attempting upload
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          // Provide more helpful error messages
          let errorMessage = error.message || 'Unknown Cloudinary error';
          
          if (error.http_code === 401) {
            if (error.message?.includes('disabled')) {
              errorMessage = 'Cloudinary account is disabled or cloud_name is incorrect. Please check your Cloudinary dashboard and verify your credentials.';
            } else {
              errorMessage = 'Cloudinary authentication failed. Please verify your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are correct.';
            }
          } else if (error.http_code === 400) {
            errorMessage = `Cloudinary upload failed: ${error.message || 'Invalid request'}`;
          }
          
          reject(new Error(errorMessage));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload failed: No result returned from Cloudinary'));
        }
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image (can be full URL or just the public ID)
 * @returns Promise with deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    // Ensure Cloudinary is configured
    ensureConfigured();

    // Extract public ID from URL if full URL is provided
    let extractedPublicId = publicId;
    if (publicId.includes('cloudinary.com')) {
      const parts = publicId.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      extractedPublicId = folder ? `${folder}/${filename.split('.')[0]}` : filename.split('.')[0];
    }

    const result = await cloudinary.uploader.destroy(extractedPublicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Fetch image from URL and upload to Cloudinary
 * @param imageUrl - URL of the image to fetch
 * @param folder - Folder path in Cloudinary
 * @param publicId - Optional public ID for the file
 * @returns Promise with upload result containing secure_url
 */
export const fetchAndUploadToCloudinary = async (
  imageUrl: string,
  folder: string,
  publicId?: string
): Promise<UploadApiResponse> => {
  ensureConfigured();

  try {
    const parsedUrl = new URL(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    // Fetch the image using Node.js built-in modules
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const request = client.get(parsedUrl, (res) => {
        if (res.statusCode && res.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: ${res.statusCode} ${res.statusMessage || 'Unknown error'}`));
          return;
        }
        
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });

    // Upload to Cloudinary
    return await uploadToCloudinary(buffer, folder, publicId);
  } catch (error: any) {
    throw new Error(`Failed to fetch and upload image: ${error.message}`);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export const extractPublicId = (url: string): string | null => {
  try {
    if (!url.includes('cloudinary.com')) {
      return null;
    }
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    return folder ? `${folder}/${filename.split('.')[0]}` : filename.split('.')[0];
  } catch (error) {
    return null;
  }
};

export default cloudinary;

