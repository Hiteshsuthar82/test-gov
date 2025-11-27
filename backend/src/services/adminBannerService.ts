import { Banner } from '../models/Banner';

export const adminBannerService = {
  async getAll() {
    return Banner.find().sort({ sortOrder: 1, createdAt: -1 });
  },

  async getById(id: string) {
    const banner = await Banner.findById(id);
    if (!banner) {
      throw new Error('Banner not found');
    }
    return banner;
  },

  async create(data: {
    imageUrl: string;
    title?: string;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return Banner.create(data);
  },

  async update(id: string, data: Partial<typeof adminBannerService.create extends (...args: any[]) => Promise<infer R> ? R : never>) {
    const banner = await Banner.findByIdAndUpdate(id, data, { new: true });
    if (!banner) {
      throw new Error('Banner not found');
    }
    return banner;
  },

  async delete(id: string) {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      throw new Error('Banner not found');
    }
    return { message: 'Banner deleted' };
  },
};

